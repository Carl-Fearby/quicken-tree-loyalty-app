import { randomInt } from 'node:crypto';
import QRCode from 'qrcode';
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Twelve random characters (60 bits) plus the venue prefix. Avoid I/O/0/1
// so a printed code is easy to transcribe. Keep existing issued tokens intact.
export function generateRewardCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix;
  do {
    suffix = Array.from({ length: 12 }, () => alphabet[randomInt(alphabet.length)]).join('');
  } while (!/[A-Z]/.test(suffix) || !/[2-9]/.test(suffix));
  return `QT${suffix}`;
}
export function defaultExpiry(now = new Date()) {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 3);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}
export function rewardFields(body, manual = false) {
  if (
    !body ||
    !Number.isInteger(body.points) ||
    body.points < (manual ? 1 : 0) ||
    body.points > 1000
  )
    fail(`Enter a whole number from ${manual ? 1 : 0} to 1,000 points.`);
  if (!uuid.test(body.requestId || '')) fail('A valid request ID is required.');
  if (manual) {
    if (!uuid.test(body.memberId || '')) fail('Choose a customer.');
    if (typeof body.reason !== 'string' || !body.reason.trim() || body.reason.trim().length > 500)
      fail('Enter a reason of up to 500 characters.');
    return { ...body, reason: body.reason.trim() };
  }
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (label.length > 120) fail('Reward name must be 120 characters or fewer.');
  const date = body.expiresOn ?? defaultExpiry();
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    fail('Choose a valid expiry date.');
  const expiry = new Date(`${date}T23:59:59.999Z`);
  if (
    !Number.isFinite(expiry.getTime()) ||
    expiry.toISOString().slice(0, 10) !== date ||
    expiry <= new Date()
  )
    fail('Choose an expiry date today or later.');
  return { points: body.points, requestId: body.requestId, label, expiresAt: expiry.toISOString() };
}
export async function addManualPoints(sql, fields) {
  return sql.begin(async (tx) => {
    const [member] = await tx`select id from members where id=${fields.memberId} for update`;
    if (!member) fail('Customer not found.', 404);
    const [entry] =
      await tx`insert into loyalty_ledger(member_id,points_delta,reason,reference_type,reference_id)
      values(${fields.memberId},${fields.points},${fields.reason},'manual_reward',${fields.requestId})
      on conflict do nothing returning id`;
    if (!entry) {
      const [previous] =
        await tx`select member_id,points_delta,reason from loyalty_ledger where reference_type='manual_reward' and reference_id=${fields.requestId}`;
      if (
        !previous ||
        previous.member_id !== fields.memberId ||
        previous.points_delta !== fields.points ||
        previous.reason !== fields.reason
      )
        fail('This request ID has already been used.', 409);
    } else {
      await tx`insert into loyalty_accounts(member_id,points) values(${fields.memberId},${fields.points})
        on conflict(member_id) do update set points=loyalty_accounts.points+excluded.points,updated_at=now()`;
    }
    const [account] =
      await tx`select points from loyalty_accounts where member_id=${fields.memberId}`;
    return { points: account.points };
  });
}
export async function rewardsRoute({ req, res, url, sql, json, readJson }) {
  if (!url.pathname.startsWith('/api/rewards')) return false;
  if (url.pathname === '/api/rewards/tokens' && req.method === 'GET') {
    const rows =
      await sql`select id,token as code,label,points,created_at as "createdAt",expires_at as "expiresAt",redeemed_at as "redeemedAt",
      case when redeemed_at is not null then 'Used' when expires_at<=now() then 'Expired' else 'Active' end as status
      from reward_tokens order by created_at desc limit 500`;
    json(200, { tokens: rows });
  } else if (url.pathname === '/api/rewards/tokens' && req.method === 'POST') {
    const fields = rewardFields(await readJson(req));
    const [row] = await sql`insert into reward_tokens(request_id,token,label,points,expires_at)
      values(${fields.requestId},${generateRewardCode()},${fields.label},${fields.points},${fields.expiresAt})
      on conflict(request_id) do update set request_id=excluded.request_id
      returning id,token as code,label,points,expires_at as "expiresAt"`;
    if (
      row.label !== fields.label ||
      row.points !== fields.points ||
      new Date(row.expiresAt).toISOString() !== fields.expiresAt
    )
      fail('This request ID has already been used.', 409);
    json(201, row);
  } else if (
    /^\/api\/rewards\/tokens\/[0-9a-f-]{36}\/qr$/.test(url.pathname) &&
    req.method === 'GET'
  ) {
    const id = url.pathname.split('/')[4];
    if (!uuid.test(id)) fail('Invalid reward ID.');
    const [row] = await sql`select token from reward_tokens where id=${id}`;
    if (!row) fail('Reward not found.', 404);
    // Versioned app payload: the token carries no editable points or customer data.
    const png = await QRCode.toBuffer(`quicken-tree:reward:v1:${row.token}`, {
      width: 640,
      margin: 4,
      errorCorrectionLevel: 'M',
    });
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      ...(url.searchParams.has('download')
        ? { 'Content-Disposition': `attachment; filename="reward-${id}.png"` }
        : {}),
    });
    res.end(png);
  } else if (url.pathname === '/api/rewards/customers' && req.method === 'GET') {
    const search = (url.searchParams.get('q') || '').trim().slice(0, 120);
    const rows =
      await sql`select m.id,m.display_name as name,m.email,coalesce(a.points,0) as points from members m
      left join loyalty_accounts a on a.member_id=m.id
      where m.display_name ilike ${'%' + search + '%'} or m.email ilike ${'%' + search + '%'}
      order by m.display_name,m.id limit 50`;
    json(200, { customers: rows });
  } else if (url.pathname === '/api/rewards/points' && req.method === 'POST') {
    json(200, await addManualPoints(sql, rewardFields(await readJson(req), true)));
  } else if (url.pathname === '/api/rewards/history' && req.method === 'GET') {
    const rows =
      await sql`select l.id,m.display_name as name,l.points_delta as points,l.reason,l.created_at as "createdAt"
      from loyalty_ledger l join members m on m.id=l.member_id
      where reference_type in ('manual_reward','reward_token') order by l.created_at desc limit 100`;
    json(200, { entries: rows });
  } else json(404, { message: 'Not found.' });
  return true;
}
