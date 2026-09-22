import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { createServer as createNetServer } from 'node:net';
import postgres from 'postgres';
import { seedDemoFixtures } from './demo-fixtures.js';

const adminUrl = process.env.DEMO_DB_ADMIN_URL;
const template = process.env.DEMO_TEMPLATE_DATABASE || 'pace_demo_template';
const port = Number(process.env.PORT || 4201);
const lifetime = 45 * 60 * 1000;
const maxSessions = 12;
const sessions = new Map();
const attempts = new Map();
let pending = 0;
if (!adminUrl || !/^[a-z][a-z0-9_]*$/.test(template))
  throw Error('Set DEMO_DB_ADMIN_URL and a safe template name.');

const admin = postgres(adminUrl, { max: 2, ssl: false });
const cookieName = 'pace_demo_session';
const cookie = (token, maxAge) => `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
const databaseName = () => `pace_demo_s_${Date.now()}_${randomBytes(6).toString('hex')}`;
const databaseUrl = (name) => {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
};
const quoteName = (name) => `"${name}"`;
const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const parseCookies = (header = '') => Object.fromEntries(
  header.split(';').map((part) => part.trim().split('=')).filter(([key]) => key),
);
const sendJson = (res, status, data, extra = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(data));
};
const freePort = () => new Promise((resolve, reject) => {
  const probe = createNetServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const chosen = probe.address().port;
    probe.close(() => resolve(chosen));
  });
});
const waitForApi = async (childPort, child) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) break;
    try {
      await fetch(`http://127.0.0.1:${childPort}/api/auth/session`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw Error('The demo workspace did not start.');
};
const dropSession = async (token, session) => {
  if (session.closing) return session.closing;
  session.expires = 0;
  session.closing = (async () => {
    session.child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 500));
    await admin.unsafe(`DROP DATABASE IF EXISTS ${quoteName(session.database)} WITH (FORCE)`);
    sessions.delete(token);
  })();
  try {
    await session.closing;
  } finally {
    session.closing = null;
  }
};
const createSession = async () => {
  const name = databaseName();
  await admin.unsafe(`CREATE DATABASE ${quoteName(name)} TEMPLATE ${quoteName(template)}`);
  let child;
  try {
    const client = postgres(databaseUrl(name), { max: 2, ssl: false });
    const internalPassword = randomBytes(24).toString('hex');
    try {
      await client`
        insert into management_users(id,email,display_name,password_hash,role,configuration_access,booking_access)
        values(${randomUUID()},'demo@pacevenues.invalid','Demo visitor',${hashPassword(internalPassword)},'admin',true,'write')`;
      await seedDemoFixtures(client);
    } finally {
      await client.end();
    }
    const childPort = await freePort();
    child = spawn(process.execPath, ['server.js'], {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        NODE_ENV: 'production',
        DATABASE_URL: databaseUrl(name),
        DATABASE_SSL: 'disable',
        PORT: String(childPort),
      },
      stdio: ['ignore', 'inherit', 'inherit'],
    });
    await waitForApi(childPort, child);
    const response = await fetch(`http://127.0.0.1:${childPort}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@pacevenues.invalid', password: internalPassword }),
    });
    if (!response.ok) throw Error('The demo workspace could not sign in.');
    const authCookie = response.headers.get('set-cookie');
    if (!authCookie) throw Error('The demo session cookie was not created.');
    const token = randomBytes(32).toString('hex');
    sessions.set(token, { database: name, port: childPort, child, expires: Date.now() + lifetime });
    return { token, authCookie: authCookie.split(';')[0] };
  } catch (error) {
    child?.kill('SIGTERM');
    await admin.unsafe(`DROP DATABASE IF EXISTS ${quoteName(name)} WITH (FORCE)`);
    throw error;
  }
};
const proxy = (req, res, session) => {
  const upstream = http.request({
    hostname: '127.0.0.1', port: session.port, path: req.url, method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${session.port}` },
  }, (response) => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });
  upstream.once('error', () => sendJson(res, 502, { message: 'The demo workspace is unavailable. Start a new session.' }));
  req.pipe(upstream);
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/demo/start' && req.method === 'POST') {
      const origin = req.headers.origin;
      if (origin && new URL(origin).origin !== 'https://backoffice-demo.pacevenues.com')
        return sendJson(res, 403, { message: 'Open the demo from this site.' });
      const previous = sessions.get(parseCookies(req.headers.cookie)[cookieName]);
      if (previous && previous.expires > Date.now()) return sendJson(res, 200, { ok: true });
      const ip = String(req.headers['x-real-ip'] || req.socket.remoteAddress || 'local');
      const attempt = attempts.get(ip) || { count: 0, reset: Date.now() + 15 * 60000 };
      if (attempt.reset < Date.now()) { attempt.count = 0; attempt.reset = Date.now() + 15 * 60000; }
      if (attempt.count >= 3 || sessions.size + pending >= maxSessions)
        return sendJson(res, 429, { message: 'The demo is busy. Please try again shortly.' });
      attempt.count += 1;
      attempts.set(ip, attempt);
      pending += 1;
      let session;
      try {
        session = await createSession();
      } finally {
        pending -= 1;
      }
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': [cookie(session.token, lifetime / 1000), `${session.authCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${lifetime / 1000}`],
      });
    }
    const token = parseCookies(req.headers.cookie)[cookieName];
    const session = sessions.get(token);
    if (session && req.url === '/api/auth/logout' && req.method === 'POST') {
      await dropSession(token, session);
      return sendJson(res, 200, { ok: true }, {
        'Set-Cookie': [cookie('', 0), 'pace_management_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'],
      });
    }
    if (!session || session.expires <= Date.now())
      return sendJson(res, 401, { message: 'Your demo session has ended. Open a fresh workspace.' }, { 'Set-Cookie': cookie('', 0) });
    proxy(req, res, session);
  } catch (error) {
    console.error('Demo gateway:', error.message);
    sendJson(res, 500, { message: 'The demo workspace could not be created. Please try again.' });
  }
});

const templateClient = postgres(databaseUrl(template), { max: 1, ssl: false });
const [marker] = await templateClient`select 1 from demo_template_marker limit 1`;
await templateClient.end();
if (!marker) throw Error('The demo template has not been sanitised.');
const stale = await admin`select datname from pg_database where datname like 'pace_demo_s_%'`;
for (const row of stale)
  if (/^pace_demo_s_[0-9]+_[a-f0-9]{12}$/.test(row.datname))
    await admin.unsafe(`DROP DATABASE ${quoteName(row.datname)} WITH (FORCE)`);
server.listen(port, '127.0.0.1', () => console.log(`Demo gateway listening on ${port}`));
const cleanup = setInterval(() => {
  for (const [token, session] of sessions)
    if (session.expires <= Date.now()) dropSession(token, session).catch(console.error);
}, 60000);
cleanup.unref();
async function stop() {
  server.close();
  clearInterval(cleanup);
  await Promise.all([...sessions].map(([token, session]) => dropSession(token, session)));
  await admin.end();
}
process.on('SIGTERM', () => void stop());
process.on('SIGINT', () => void stop());
