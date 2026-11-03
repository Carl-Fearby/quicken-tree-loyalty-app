import http from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { rewardsRoute } from './rewards.js';
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import postgres from 'postgres';
import { describe, quote, remove } from './db.js';
if (!process.env.DATABASE_URL) throw Error('Set DATABASE_URL in management/.env first.');
const port = Number(process.env.PORT || 4100);
const createDatabaseClient = (connectionString) => {
  const url = new URL(connectionString);
  const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname);
  return postgres(connectionString, {
    max: 4,
    connect_timeout: 5,
    connection: { statement_timeout: 15000, lock_timeout: 3000, search_path: 'public' },
    ssl:
      process.env.DATABASE_SSL === 'disable'
        ? false
        : process.env.DATABASE_SSL === 'require' || !isLocal
          ? 'require'
          : false,
  });
};
const seededUrl = new URL(process.env.SEEDED_DATABASE_URL || process.env.DATABASE_URL);
if (!process.env.SEEDED_DATABASE_URL) seededUrl.pathname = `${seededUrl.pathname}_seeded`;
const databaseClients = { local: createDatabaseClient(process.env.DATABASE_URL) };
const databaseUrls = { local: process.env.DATABASE_URL, seeded: seededUrl.toString(), remote: process.env.PRODUCTION_DATABASE_URL || '' };
let activeDatabaseTarget = 'local';
let sql = databaseClients.local;
const databaseSwitchEnabled = process.env.NODE_ENV !== 'production';
const runFile = promisify(execFile);
let productionTunnel;
const productionPort = () => Number(new URL(databaseUrls.remote).port);
const canConnect = (port) => new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port });
  socket.setTimeout(1000);
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false));
  socket.once('timeout', () => { socket.destroy(); resolve(false); });
});
const ensureProductionTunnel = async () => {
  const key = process.env.PRODUCTION_SSH_KEY;
  const host = process.env.PRODUCTION_SSH_HOST;
  const port = productionPort();
  const url = new URL(databaseUrls.remote);
  if (!key || !host || !port || url.hostname !== '127.0.0.1')
    throw Error('Configure the Production SSH tunnel and local forwarded database URL.');
  if (productionTunnel && await canConnect(port)) return;
  if (await canConnect(port))
    throw Error('The Production tunnel port is already in use. Stop the other listener and try again.');
  productionTunnel = spawn('ssh', [
    '-N', '-i', key, '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30', '-L', `127.0.0.1:${port}:127.0.0.1:5432`,
    `${process.env.PRODUCTION_SSH_USER || 'root'}@${host}`,
  ], { stdio: 'ignore' });
  productionTunnel.once('error', () => { productionTunnel = undefined; });
  productionTunnel.once('exit', () => { productionTunnel = undefined; });
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await canConnect(port)) return;
    if (!productionTunnel) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error('Could not establish the private tunnel to the Production database.');
};
process.once('exit', () => productionTunnel?.kill());
const activeDatabaseInfo = () => {
  const url = new URL(databaseUrls[activeDatabaseTarget]);
  return {
    target: activeDatabaseTarget,
    label: activeDatabaseTarget === 'local' ? 'Local database' : activeDatabaseTarget === 'seeded' ? 'Seeded test data' : 'Production database',
    database: decodeURIComponent(url.pathname.slice(1)),
    host: url.hostname,
    remoteConfigured: Boolean(databaseUrls.remote),
    seededConfigured: Boolean(databaseUrls.seeded),
  };
};
await sql`alter table menu_item_options add column if not exists price_delta_pence integer`;
await sql`alter table menu_catalogue add column if not exists "dishImages_present" boolean not null default true`;
await sql`update menu_catalogue set "dishImages_present"=true where id='menu' and "dishImages_present"=false`;
await sql`create table if not exists menu_item_images(id text primary key,parent_id text not null references menu_catalogue(id) on delete cascade,position integer not null default 0,map_key text not null unique,image_data text not null)`;
await sql`create table if not exists allergen_tags(id text primary key, parent_id text not null default 'menu', position integer not null default 0, map_key text not null unique, label text not null)`;
await sql`create table if not exists allergen_tag_styles(id text primary key, parent_id text not null default 'menu', position integer not null default 0, map_key text not null unique, color text not null default '', icon text not null default '')`;
await sql`create table if not exists menu_item_allergen_labels(id text primary key, parent_id text not null default 'menu', position integer not null default 0, map_key text not null unique)`;
await sql`create table if not exists menu_item_allergens(id text primary key, parent_id text not null references menu_item_allergen_labels(id) on delete cascade, position integer not null default 0, allergen_code text not null)`;
await sql`alter table kitchen_hours add column if not exists opens_at numeric`;
await sql`update kitchen_hours k set opens_at=o.opens_at from opening_hours o where o.parent_id='appointments' and o.map_key=k.day and k.opens_at is null`;
await sql`create table if not exists feature_flags(feature_key text primary key,enabled boolean not null default true,updated_at timestamptz not null default now())`;
await sql`insert into feature_flags(feature_key,enabled) values('rewards',true) on conflict(feature_key) do nothing`;
await sql`create table if not exists management_users(
  id uuid primary key,
  email text not null unique,
  display_name text not null,
  password_hash text not null,
  role text not null default 'staff' check(role in ('admin','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)`;
await sql`create unique index if not exists management_users_email_lower on management_users(lower(email))`;
await sql`create table if not exists management_sessions(
  id uuid primary key,
  user_id uuid not null references management_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
)`;
await sql`create index if not exists management_sessions_expiry on management_sessions(expires_at)`;
await sql`alter table members add column if not exists phone text`;
await sql`create table if not exists customer_notes(id uuid primary key default gen_random_uuid(),member_id uuid not null references members(id) on delete cascade,body text not null check(char_length(body) between 1 and 2000),created_by uuid references management_users(id) on delete set null,created_at timestamptz not null default now())`;
await sql`create index if not exists customer_notes_member_created on customer_notes(member_id,created_at desc)`;
await sql`create table if not exists customer_tag_definitions(id uuid primary key default gen_random_uuid(),name text not null,color text not null default '#566474',created_by uuid references management_users(id) on delete set null,created_at timestamptz not null default now())`;
await sql`create unique index if not exists customer_tag_definitions_name_lower on customer_tag_definitions(lower(name))`;
await sql`create table if not exists customer_tags(member_id uuid not null references members(id) on delete cascade,tag_id uuid not null references customer_tag_definitions(id) on delete cascade,assigned_by uuid references management_users(id) on delete set null,assigned_at timestamptz not null default now(),primary key(member_id,tag_id))`;
await sql`create table if not exists customer_consents(member_id uuid not null references members(id) on delete cascade,channel text not null check(channel in ('email','sms','push')),purpose text not null default 'marketing',status text not null check(status in ('unknown','opted_in','opted_out')),source text not null,wording_version text,updated_by uuid references management_users(id) on delete set null,updated_at timestamptz not null default now(),primary key(member_id,channel,purpose))`;
await sql`create table if not exists customer_audit_events(id uuid primary key default gen_random_uuid(),member_id uuid references members(id) on delete set null,actor_user_id uuid references management_users(id) on delete set null,action text not null,entity_type text not null,entity_id text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now())`;
await sql`create index if not exists customer_audit_member_created on customer_audit_events(member_id,created_at desc)`;
await sql`create table if not exists customer_segments(id uuid primary key default gen_random_uuid(),name text not null,definition jsonb not null default '{}'::jsonb,created_by uuid references management_users(id) on delete set null,archived boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
await sql`create unique index if not exists customer_segments_name_lower on customer_segments(lower(name)) where archived=false`;
await sql`alter table bookings add column if not exists deposit_status text not null default 'none'`;
await sql`alter table bookings add column if not exists deposit_amount_pence integer not null default 0`;
await sql`alter table bookings drop constraint if exists bookings_deposit_status_check`;
await sql`alter table bookings add constraint bookings_deposit_status_check check(deposit_status in ('none','demo_required','demo_paid','demo_card_guarantee','demo_refunded'))`;
await sql`alter table bookings drop constraint if exists bookings_status_check`;
await sql`alter table bookings add constraint bookings_status_check check(status in ('pending','confirmed','arrived','seated','cancelled','completed','no_show'))`;
await sql`create table if not exists booking_status_events(id uuid primary key default gen_random_uuid(),booking_id uuid not null references bookings(id) on delete cascade,member_id uuid references members(id) on delete set null,from_status text not null,to_status text not null,reason text,actor_user_id uuid references management_users(id) on delete set null,created_at timestamptz not null default now())`;
await sql`create index if not exists booking_status_events_booking_created on booking_status_events(booking_id,created_at desc)`;
await sql`create index if not exists booking_status_events_member_created on booking_status_events(member_id,created_at desc)`;
await sql`create table if not exists booking_reminder_events(id uuid primary key default gen_random_uuid(),booking_id uuid not null references bookings(id) on delete cascade,channel text not null check(channel in ('email','sms','push')),status text not null check(status in ('queued','delivered','failed')),initiated_by uuid references management_users(id) on delete set null,created_at timestamptz not null default now(),delivered_at timestamptz)`;
await sql`create index if not exists booking_reminder_events_booking_created on booking_reminder_events(booking_id,created_at desc)`;
await sql`create table if not exists communication_templates(id uuid primary key default gen_random_uuid(),template_key text not null unique,name text not null,channel text not null check(channel in ('email','sms','push')),category text not null check(category in ('transactional','marketing')),subject text,body text not null,active boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
await sql`create table if not exists communication_deliveries(id uuid primary key default gen_random_uuid(),template_id uuid references communication_templates(id) on delete set null,member_id uuid references members(id) on delete set null,booking_id uuid references bookings(id) on delete set null,channel text not null check(channel in ('email','sms','push')),category text not null check(category in ('transactional','marketing')),recipient text not null,subject text,body text not null,status text not null check(status in ('scheduled','queued','sent','delivered','failed','suppressed')),scheduled_at timestamptz,sent_at timestamptz,delivered_at timestamptz,failure_reason text,provider text not null default 'demo',initiated_by uuid references management_users(id) on delete set null,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now())`;
await sql`create index if not exists communication_deliveries_created on communication_deliveries(created_at desc)`;
await sql`create index if not exists communication_deliveries_member_created on communication_deliveries(member_id,created_at desc)`;
await sql`create index if not exists communication_deliveries_booking_created on communication_deliveries(booking_id,created_at desc)`;
await sql`insert into communication_templates(template_key,name,channel,category,subject,body) values('booking-confirmation','Booking confirmation','email','transactional','Your booking at {{venueName}}','Hi {{guestName}}, your table for {{guestCount}} is confirmed for {{bookingDate}} at {{bookingTime}}.'),('booking-reminder','Booking reminder','email','transactional','Your booking is coming up','Hi {{guestName}}, this is a reminder for your booking at {{venueName}} on {{bookingDate}} at {{bookingTime}}.'),('waitlist-ready','Table ready','sms','transactional',null,'Hi {{guestName}}, your table at {{venueName}} is ready.'),('reward-expiry','Reward expiring','push','marketing','Your reward expires soon','Your {{rewardName}} reward expires on {{expiryDate}}.') on conflict(template_key) do nothing`;
await sql`alter table booking_system_settings drop constraint if exists booking_system_settings_integer_value_check`;
await sql`alter table booking_system_settings add constraint booking_system_settings_integer_value_check check(integer_value between 0 and 10080)`;
await sql`insert into booking_system_settings(setting_key,integer_value) values('free_cancellation_hours',24) on conflict(setting_key) do nothing`;
await sql`alter table bookings add column if not exists cancelled_at timestamptz`;
await sql`alter table bookings add column if not exists cancellation_source text`;
await sql`alter table bookings add column if not exists cancellation_reason text`;
await sql`alter table bookings add column if not exists cancellation_outcome text`;
await sql`alter table orders add column if not exists deposit_credit_pence integer not null default 0`;
await sql`alter table orders add column if not exists paid_pence integer not null default 0`;
await sql`insert into booking_system_settings(setting_key,integer_value) values('deposits_enabled',1) on conflict(setting_key) do nothing`;
await sql`insert into booking_system_settings(setting_key,integer_value) values('booking_reminder_first_hours',24),('booking_reminder_final_hours',2) on conflict(setting_key) do nothing`;
await sql`create table if not exists booking_deposit_rules(id uuid primary key default gen_random_uuid(),name text not null,active boolean not null default true,channel text not null default 'both' check(channel in ('app','backoffice','both')),min_party_size integer not null default 1 check(min_party_size between 1 and 20),max_party_size integer,days smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],starts_at time not null default '00:00',ends_at time not null default '23:59:59',amount_pence integer not null check(amount_pence between 0 and 100000),priority integer not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
await sql`insert into booking_deposit_rules(name,channel,min_party_size,days,starts_at,ends_at,amount_pence,priority) select 'Standard booking deposit','both',1,array[0,1,2,3,4,5,6]::smallint[],'00:00','23:59:59',1000,0 where not exists(select 1 from booking_deposit_rules)`;
await sql.unsafe(`create or replace function resolve_booking_deposit(service_date date,service_time time,party_size integer,booking_channel text) returns table(rule_id uuid,rule_name text,amount_pence integer) language sql stable as $$ select r.id,r.name,r.amount_pence from booking_deposit_rules r where coalesce((select integer_value=1 from booking_system_settings where setting_key='deposits_enabled'),false) and r.active and r.channel in ('both',booking_channel) and party_size>=r.min_party_size and (r.max_party_size is null or party_size<=r.max_party_size) and extract(dow from service_date)::smallint=any(r.days) and service_time>=r.starts_at and service_time<=r.ends_at order by r.priority desc,r.created_at,r.id limit 1 $$`);
await sql`create table if not exists waitlist_entries(id uuid primary key default gen_random_uuid(),member_id uuid references members(id) on delete set null,service_date date not null,guest_name text not null,contact_email text,contact_phone text,party_size integer not null check(party_size between 1 and 20),status text not null default 'waiting' check(status in ('waiting','nearly_ready','ready','seated','cancelled','expired')),priority integer not null default 0,quoted_wait_minutes integer check(quoted_wait_minutes between 0 and 360),notes text,assigned_table_id integer references booking_tables(id) on delete set null,seated_booking_id uuid references bookings(id) on delete set null,created_by uuid references management_users(id) on delete set null,created_at timestamptz not null default now(),updated_at timestamptz not null default now())`;
await sql`create index if not exists waitlist_service_status on waitlist_entries(service_date,status,priority desc,created_at)`;
await sql`alter table management_users add column if not exists configuration_access boolean not null default false`;
await sql`alter table management_users add column if not exists booking_access text not null default 'read'`;
await sql`alter table management_users drop constraint if exists management_users_booking_access_check`;
await sql`alter table management_users add constraint management_users_booking_access_check check(booking_access in ('none','read','write'))`;
await sql`update management_users set configuration_access=true,booking_access='write' where role='admin'`;
await sql`create table if not exists management_permission_definitions(
  permission_key text primary key,
  label text not null,
  description text not null,
  levels text[] not null,
  position integer not null default 0
)`;
await sql`create table if not exists management_user_permissions(
  user_id uuid not null references management_users(id) on delete cascade,
  permission_key text not null references management_permission_definitions(permission_key) on delete cascade,
  access_level text not null,
  primary key(user_id,permission_key)
)`;
await sql`insert into management_permission_definitions(permission_key,label,description,levels,position) values
  ('bookings','Booking diary','View or manage bookings and table assignments.',array['none','read','write'],0),
  ('customers','Customer CRM','View customer profiles or manage notes, tags, consent and contact details.',array['none','read','write'],1),
  ('rewards','Rewards','Create rewards and add points to customers.',array['none','write'],2),
  ('configuration.tables','Restaurant tables','Manage restaurant tables and capacities.',array['none','write'],10),
  ('configuration.duration','Booking duration','Manage the default booking duration.',array['none','write'],11),
  ('configuration.cancellation','Cancellation policy','Manage cancellation cutoffs and deposit outcomes.',array['none','write'],12),
  ('configuration.deposits','Deposit rules','Manage booking deposit requirements and rule criteria.',array['none','write'],13),
  ('configuration.attendance','Attendance and reminders','Manage reminder timings and no-show review settings.',array['none','write'],14),
  ('configuration.communications','Communications centre','Manage message templates, delivery history and test sends.',array['none','write'],15),
  ('configuration.hours','Opening & kitchen hours','Manage venue and kitchen hours.',array['none','write'],16),
  ('configuration.menu','Menu maintenance','Manage menus, sections, dishes and availability.',array['none','write'],17),
  ('configuration.symbols','Dietary & allergen symbols','Manage dietary and allergen keys.',array['none','write'],18),
  ('configuration.rewards','Rewards settings','Turn customer rewards on or off.',array['none','write'],19),
  ('configuration.users','User management','Create users and delegate permissions.',array['none','write'],20),
  ('configuration.database','Database management','Inspect and modify database records.',array['none','write'],21)
  on conflict(permission_key) do update set label=excluded.label,description=excluded.description,levels=excluded.levels,position=excluded.position`;
await sql`delete from management_permission_definitions where permission_key in ('configuration','users')`;
await sql`insert into management_users(id,email,display_name,password_hash,role,configuration_access,booking_access)
  select ${randomUUID()},'carlfearby@me.com','Carl Fearby','scrypt:d6df8a5f0b2895143f2ea76558990501:f874205f60ebbb25b77d86d9ada6ef8c733d11f95400e3990b008e29af47f9c795414ad658238c11d79193fdbd796a741c5ada0c6c3ffe622fd7fcde119a47e4','admin',true,'write'
  where not exists(select 1 from management_users)`;
await sql`insert into management_user_permissions(user_id,permission_key,access_level)
  select u.id,d.permission_key,
    case
      when u.role='admin' then d.levels[array_length(d.levels,1)]
      when d.permission_key='bookings' then u.booking_access
      when d.permission_key like 'configuration.%' and u.configuration_access then 'write'
      else 'none'
    end
  from management_users u cross join management_permission_definitions d
  on conflict(user_id,permission_key) do nothing`;
const allergenDefaults = [
  ['g', 'Gluten'],
  ['cr', 'Crustaceans'],
  ['e', 'Eggs'],
  ['f', 'Fish'],
  ['p', 'Peanuts'],
  ['s', 'Soybeans'],
  ['m', 'Milk'],
  ['n', 'Nuts'],
  ['c', 'Celery'],
  ['md', 'Mustard'],
  ['se', 'Sesame'],
  ['sd', 'Sulphites'],
  ['l', 'Lupin'],
  ['mo', 'Molluscs'],
];
const allergenPresentation = {
  g: { color: '#e4c45b', icon: 'fa-wheat-awn' },
  cr: { color: '#f38a31', icon: 'fa-shrimp' },
  e: { color: '#7ccfd0', icon: 'fa-egg' },
  f: { color: '#55bd80', icon: 'fa-fish' },
  p: { color: '#f47b2c', icon: 'fa-seedling' },
  s: { color: '#b975d3', icon: 'fa-leaf' },
  m: { color: '#82cfd2', icon: 'fa-bottle-water' },
  n: { color: '#d8585d', icon: 'fa-cookie-bite' },
  c: { color: '#82cfd2', icon: 'fa-carrot' },
  md: { color: '#d2a63a', icon: 'fa-bottle-droplet' },
  se: { color: '#f49a2d', icon: 'fa-jar-wheat' },
  sd: { color: '#82cfd2', icon: 'fa-bottle-droplet' },
  l: { color: '#83b75c', icon: 'fa-seedling' },
  mo: { color: '#d64d50', icon: 'fa-fan' },
};
for (const [position, [code, label]] of allergenDefaults.entries())
  await sql`insert into allergen_tags(id,parent_id,position,map_key,label) values(${randomUUID()},'menu',${position},${code},${label}) on conflict(map_key) do update set label=excluded.label, position=excluded.position`;
for (const [position, [code]] of allergenDefaults.entries()) {
  const presentation = allergenPresentation[code];
  await sql`update allergen_tag_styles set color=coalesce(nullif(color,''),${presentation.color}), icon=coalesce(nullif(icon,''),${presentation.icon}), position=${position} where map_key=${code}`;
  await sql`insert into allergen_tag_styles(id,parent_id,position,map_key,color,icon) select ${randomUUID()},'menu',${position},${code},${presentation.color},${presentation.icon} where not exists(select 1 from allergen_tag_styles where map_key=${code})`;
}
const bumpMenuContentRevision = async (transaction = sql) => {
  await transaction`update content_revisions set version=version+1,updated_at=clock_timestamp() where dataset_key='menu'`;
  await transaction`update content_generation set version=version+1,updated_at=clock_timestamp() where id=true`;
};
async function readJson(req, limit = 16384) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > limit) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON.'), { status: 400 });
  }
}
const sessionCookie = 'pace_management_session';
const sessionLifetimeSeconds = 60 * 60 * 12;
const secureCookie = process.env.NODE_ENV === 'production' ? '; Secure' : '';
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
};
const passwordMatches = (password, stored) => {
  const [scheme, salt, encoded] = String(stored).split(':');
  if (scheme !== 'scrypt' || !salt || !encoded) return false;
  const expected = Buffer.from(encoded, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
const parseCookies = (header = '') =>
  Object.fromEntries(
    header.split(';').map((part) => part.trim().split('=').map(decodeURIComponent)).filter(([key]) => key),
  );
const clearSessionCookie =
  `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie}`;
const authUser = async (req) => {
  const token = parseCookies(req.headers.cookie)[sessionCookie];
  if (!token) return null;
  const [user] = await sql`
    select u.id,u.email,u.display_name as "displayName",u.role,u.active,
      case when u.role='admin' then true else u.configuration_access end as "configurationAccess",
      case when u.role='admin' then 'write' else u.booking_access end as "bookingAccess"
    from management_sessions s join management_users u on u.id=s.user_id
    where s.token_hash=${hashToken(token)} and s.expires_at>now() and u.active=true`;
  if (!user) return null;
  user.permissions = await effectivePermissions(user.id, user.role);
  user.configurationAccess = Object.entries(user.permissions).some(
    ([key, level]) => key.startsWith('configuration.') && level !== 'none',
  );
  user.bookingAccess = user.permissions.bookings || 'none';
  return user;
};
const permissionDefinitions = async () =>
  sql`select permission_key as "key",label,description,levels,position from management_permission_definitions order by position,permission_key`;
const effectivePermissions = async (userId, role) => {
  const definitions = await permissionDefinitions();
  if (role === 'admin')
    return Object.fromEntries(definitions.map((definition) => [definition.key, definition.levels.at(-1)]));
  const rows = await sql`select permission_key as "key",access_level as level from management_user_permissions where user_id=${userId}`;
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.level]));
  return Object.fromEntries(
    definitions.map((definition) => [
      definition.key,
      definition.levels.includes(stored[definition.key]) ? stored[definition.key] : 'none',
    ]),
  );
};
const permissionRank = (definition, level) => definition.levels.indexOf(level);
const validateDelegatedPermissions = async (requested, actor, role) => {
  const definitions = await permissionDefinitions();
  if (role === 'admin' && actor.role !== 'admin')
    throw Object.assign(new Error('Only an administrator can create or promote administrators.'), { status: 403 });
  const permissions = {};
  for (const definition of definitions) {
    const level = role === 'admin' ? definition.levels.at(-1) : requested?.[definition.key] || 'none';
    if (!definition.levels.includes(level))
      throw Object.assign(new Error(`Choose a valid ${definition.label} permission.`), { status: 400 });
    const actorLevel = actor.permissions[definition.key] || 'none';
    if (actor.role !== 'admin' && permissionRank(definition, level) > permissionRank(definition, actorLevel))
      throw Object.assign(new Error(`You cannot grant ${definition.label} access above your own.`), { status: 403 });
    permissions[definition.key] = level;
  }
  if (role !== 'admin' && Object.values(permissions).every((level) => level === 'none'))
    throw Object.assign(new Error('Give the user access to at least one function.'), { status: 400 });
  return { definitions, permissions };
};
const savePermissions = async (transaction, userId, permissions) => {
  for (const [key, level] of Object.entries(permissions))
    await transaction`insert into management_user_permissions(user_id,permission_key,access_level) values(${userId},${key},${level}) on conflict(user_id,permission_key) do update set access_level=excluded.access_level`;
};
const userFields = (body, requirePassword = false) => {
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const role = body?.role === 'admin' ? 'admin' : body?.role === 'staff' ? 'staff' : '';
  const bookingAccess = ['none', 'read', 'write'].includes(body?.bookingAccess)
    ? body.bookingAccess
    : 'none';
  const configurationAccess = body?.configurationAccess === true;
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254)
    throw Object.assign(new Error('Enter a valid email address.'), { status: 400 });
  if (!displayName || displayName.length > 100)
    throw Object.assign(new Error('Enter a name of up to 100 characters.'), { status: 400 });
  if (!role) throw Object.assign(new Error('Choose Admin or Staff.'), { status: 400 });
  if ((requirePassword || password) && (password.length < 12 || password.length > 128))
    throw Object.assign(new Error('Passwords must be between 12 and 128 characters.'), { status: 400 });
  return {
    email,
    displayName,
    password,
    role,
    active: body?.active !== false,
    configurationAccess: role === 'admin' ? true : configurationAccess,
    bookingAccess: role === 'admin' ? 'write' : bookingAccess,
    permissions: body?.permissions && typeof body.permissions === 'object' ? body.permissions : {},
  };
};
const itemFields = (body) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const priceLabel = typeof body.priceLabel === 'string' ? body.priceLabel.trim() : '';
  if (!name || name.length > 120)
    throw Object.assign(new Error('Enter an item name of up to 120 characters.'), { status: 400 });
  if (description.length > 1000)
    throw Object.assign(new Error('Description must be 1,000 characters or fewer.'), {
      status: 400,
    });
  if (priceLabel.length > 40)
    throw Object.assign(new Error('Price label must be 40 characters or fewer.'), { status: 400 });
  return { name, description, priceLabel };
};
const itemImage = (body) => {
  const image = body?.imageData;
  if (image === undefined) return undefined;
  if (image === null || image === '') return null;
  if (typeof image !== 'string' || image.length > 400000 || (!/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(image) && !/^\/dish-images\/[a-z-]+\.webp$/.test(image)))
    throw Object.assign(new Error('Choose a valid dish image under 300 KB.'), { status: 400 });
  return image;
};
const saveItemImage = async (transaction, itemName, image) => {
  if (image === undefined) return;
  if (image === null) {
    await transaction`delete from menu_item_images where parent_id='menu' and map_key=${itemName}`;
  } else {
    await transaction`insert into menu_item_images(id,parent_id,position,map_key,image_data) values(${randomUUID()},'menu',0,${itemName},${image}) on conflict(map_key) do update set image_data=excluded.image_data`;
  }
  await bumpMenuContentRevision(transaction);
};
const itemDietaryTags = (body) => {
  if (!Array.isArray(body.dietaryTags)) return [];
  const tags = [...new Set(body.dietaryTags.map((tag) => String(tag).trim()).filter(Boolean))];
  if (tags.length > 12 || tags.some((tag) => tag.length > 20))
    throw Object.assign(new Error('Dietary tags are invalid.'), { status: 400 });
  return tags;
};
const itemAllergens = (body) => {
  if (!Array.isArray(body.allergens)) return [];
  const allergens = [...new Set(body.allergens.map((allergen) => String(allergen).trim()).filter(Boolean))];
  if (allergens.length > 20 || allergens.some((allergen) => allergen.length > 20))
    throw Object.assign(new Error('Allergen keys are invalid.'), { status: 400 });
  return allergens;
};
const tagDefinitions = (body, key) => {
  if (!Array.isArray(body?.[key])) return [];
  if (body[key].length > 40)
    throw Object.assign(new Error('Use 40 symbols or fewer.'), { status: 400 });
  const seen = new Set();
  return body[key].map((entry) => {
    const code = typeof entry.code === 'string' ? entry.code.trim() : '';
    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    const color = typeof entry.color === 'string' ? entry.color.trim() : '';
    const icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
    if (!code || code.length > 20 || !/^[a-z0-9]+$/i.test(code))
      throw Object.assign(new Error('Symbol codes must use letters and numbers only.'), { status: 400 });
    if (seen.has(code.toLowerCase()))
      throw Object.assign(new Error(`Duplicate symbol code: ${code}.`), { status: 400 });
    seen.add(code.toLowerCase());
    if (!label || label.length > 80)
      throw Object.assign(new Error('Every symbol needs a label of up to 80 characters.'), { status: 400 });
    if (color && !/^#[0-9a-f]{6}$/i.test(color))
      throw Object.assign(new Error('Allergen colours must be hex values like #e4c45b.'), { status: 400 });
    if (icon && !/^fa-[a-z0-9-]+$/i.test(icon))
      throw Object.assign(new Error('Font Awesome icon names must look like fa-wheat-awn.'), { status: 400 });
    return { code, label, color, icon };
  });
};
const itemOptionGroups = (body) => {
  if (!Array.isArray(body.optionGroups)) return [];
  if (body.optionGroups.length > 12)
    throw Object.assign(new Error('Use 12 option groups or fewer.'), { status: 400 });
  return body.optionGroups.map((group) => {
    const label = typeof group.label === 'string' ? group.label.trim() : '';
    const minSelections = Number(group.minSelections);
    const maxSelections = Number(group.maxSelections);
    const options = Array.isArray(group.options) ? group.options : [];
    if (!label || label.length > 80)
      throw Object.assign(new Error('Every option group needs a label.'), { status: 400 });
    if (!Number.isSafeInteger(minSelections) || !Number.isSafeInteger(maxSelections) || minSelections < 0 || maxSelections < 1 || minSelections > maxSelections)
      throw Object.assign(new Error('Option group selection limits are invalid.'), { status: 400 });
    if (!options.length || options.length > 40)
      throw Object.assign(new Error('Every option group needs between 1 and 40 options.'), { status: 400 });
    return {
      label,
      minSelections,
      maxSelections,
      options: options.map((option) => {
        const optionLabel = typeof option.label === 'string' ? option.label.trim() : '';
        const priceDeltaPence = option.priceDeltaPence === null || option.priceDeltaPence === undefined || option.priceDeltaPence === ''
          ? null
          : Number(option.priceDeltaPence);
        if (!optionLabel || optionLabel.length > 80)
          throw Object.assign(new Error('Every option needs a label.'), { status: 400 });
        if (priceDeltaPence !== null && !Number.isSafeInteger(priceDeltaPence))
          throw Object.assign(new Error('Option price differences must be whole pence.'), { status: 400 });
        return { label: optionLabel, priceDeltaPence };
      }),
    };
  });
};
const saveItemDietaryTags = async (transaction, itemName, tags) => {
  await transaction`delete from menu_item_dietary_labels where parent_id='menu' and map_key=${itemName}`;
  if (!tags.length) return;
  const labelId = randomUUID();
  await transaction`insert into menu_item_dietary_labels(id,parent_id,position,map_key) values(${labelId},'menu',0,${itemName})`;
  for (const [position, tag] of tags.entries())
    await transaction`insert into menu_item_dietary_tags(id,parent_id,position,tag_code) values(${randomUUID()},${labelId},${position},${tag})`;
};
const saveItemAllergens = async (transaction, itemName, allergens) => {
  await transaction`delete from menu_item_allergen_labels where parent_id='menu' and map_key=${itemName}`;
  if (!allergens.length) return;
  const labelId = randomUUID();
  await transaction`insert into menu_item_allergen_labels(id,parent_id,position,map_key) values(${labelId},'menu',0,${itemName})`;
  for (const [position, allergen] of allergens.entries())
    await transaction`insert into menu_item_allergens(id,parent_id,position,allergen_code) values(${randomUUID()},${labelId},${position},${allergen})`;
};
const saveItemOptions = async (transaction, itemName, groups) => {
  await transaction`delete from menu_item_option_sets where parent_id='menu' and map_key=${itemName}`;
  if (!groups.length) return;
  const setId = randomUUID();
  await transaction`insert into menu_item_option_sets(id,parent_id,position,map_key) values(${setId},'menu',0,${itemName})`;
  for (const [groupPosition, group] of groups.entries()) {
    const groupId = randomUUID();
    await transaction`insert into menu_item_option_groups(id,parent_id,position,label,min_selections,max_selections) values(${groupId},${setId},${groupPosition},${group.label},${group.minSelections},${group.maxSelections})`;
    for (const [optionPosition, option] of group.options.entries())
      await transaction`insert into menu_item_options(id,parent_id,position,label,price_delta_pence) values(${randomUUID()},${groupId},${optionPosition},${option.label},${option.priceDeltaPence})`;
  }
};
const londonDateTime = () => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};
const renderCommunication = (value, variables = {}) => String(value || '').replace(/{{(\w+)}}/g, (_match,key) => variables[key] ?? `{{${key}}}`);
const loginAttempts = new Map();
const server = http.createServer(async (req, res) => {
  const json = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  try {
    // This development manager listens only on 127.0.0.1 below. Browser-origin
    // checks are therefore redundant and can incorrectly reject valid local
    // requests when localhost resolves differently between browser and server.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname === '/api/development/database-target' && req.method === 'GET') {
      if (!databaseSwitchEnabled) return json(404, { message: 'Not found.' });
      return json(200, activeDatabaseInfo());
    }
    if (url.pathname === '/api/development/database-target' && req.method === 'PUT') {
      if (!databaseSwitchEnabled) return json(404, { message: 'Not found.' });
      const body = await readJson(req);
      const target = ['local','seeded','remote'].includes(body?.target) ? body.target : '';
      if (!target) return json(400, { message: 'Choose the local, seeded or production database.' });
      if (target === 'remote' && !databaseUrls.remote)
        return json(400, { message: 'Set PRODUCTION_DATABASE_URL in management/.env first.' });
      if (target === 'remote') await ensureProductionTunnel();
      if (!databaseClients[target]) databaseClients[target] = createDatabaseClient(databaseUrls[target]);
      await databaseClients[target]`select current_database()`;
      sql = databaseClients[target];
      activeDatabaseTarget = target;
      res.setHeader('Set-Cookie', clearSessionCookie);
      return json(200, activeDatabaseInfo());
    }
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const key = req.socket.remoteAddress || 'local';
      const attempt = loginAttempts.get(key) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
      if (attempt.resetAt <= Date.now()) {
        attempt.count = 0;
        attempt.resetAt = Date.now() + 15 * 60 * 1000;
      }
      if (attempt.count >= 10)
        return json(429, { message: 'Too many sign-in attempts. Try again later.' });
      const body = await readJson(req);
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body?.password === 'string' ? body.password : '';
      const [user] = await sql`select id,email,display_name as "displayName",password_hash as "passwordHash",role,active,configuration_access as "configurationAccess",booking_access as "bookingAccess" from management_users where lower(email)=${email}`;
      if (!user?.active || !passwordMatches(password, user.passwordHash)) {
        attempt.count += 1;
        loginAttempts.set(key, attempt);
        return json(401, { message: 'Email or password is incorrect.' });
      }
      loginAttempts.delete(key);
      const token = randomBytes(32).toString('hex');
      await sql`delete from management_sessions where expires_at<=now()`;
      await sql`insert into management_sessions(id,user_id,token_hash,expires_at) values(${randomUUID()},${user.id},${hashToken(token)},now()+interval '12 hours')`;
      res.setHeader('Set-Cookie', `${sessionCookie}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}${secureCookie}`);
      return json(200, { user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role, configurationAccess: user.role === 'admin' || user.configurationAccess, bookingAccess: user.role === 'admin' ? 'write' : user.bookingAccess } });
    }
    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      const token = parseCookies(req.headers.cookie)[sessionCookie];
      if (token) await sql`delete from management_sessions where token_hash=${hashToken(token)}`;
      res.setHeader('Set-Cookie', clearSessionCookie);
      return json(200, { ok: true });
    }
    const currentUser = await authUser(req);
    if (url.pathname === '/api/auth/session' && req.method === 'GET') {
      if (!currentUser) return json(401, { message: 'Sign in required.' });
      return json(200, { user: currentUser });
    }
    if (url.pathname.startsWith('/api/') && !currentUser) {
      res.setHeader('Set-Cookie', clearSessionCookie);
      return json(401, { message: 'Sign in required.' });
    }
    if (url.pathname === '/api/development/refresh-production' && req.method === 'POST') {
      if (!databaseSwitchEnabled) return json(404, { message: 'Not found.' });
      if (currentUser.role !== 'admin' && currentUser.permissions?.['configuration.database'] !== 'write')
        return json(403, { message: 'Database management access required.' });
      if (!databaseUrls.remote)
        return json(400, { message: 'Set PRODUCTION_DATABASE_URL in management/.env first.' });
      if (activeDatabaseTarget !== 'local')
        return json(409, { message: 'Switch to the Local database before refreshing Production.' });
      const body = await readJson(req);
      if (body?.confirmation !== 'PRODUCTION')
        return json(400, { message: 'Type PRODUCTION to confirm the replacement.' });
      await ensureProductionTunnel();
      const dumpFile = join(tmpdir(), `pace-local-${randomUUID()}.dump`);
      const backupDir = join(process.cwd(), 'backups');
      await mkdir(backupDir, { recursive: true, mode: 0o700 });
      const productionBackup = join(backupDir, `production-before-refresh-${new Date().toISOString().replace(/[:.]/g, '-')}.dump`);
      try {
        await runFile('pg_dump', [
          '--format=custom', '--no-owner', '--no-privileges',
          `--dbname=${databaseUrls.remote}`, `--file=${productionBackup}`,
        ], { timeout: 5 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 });
        await runFile('pg_dump', [
          '--format=custom', '--no-owner', '--no-privileges',
          `--dbname=${databaseUrls.local}`, `--file=${dumpFile}`,
        ], { timeout: 5 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 });
        await runFile('pg_restore', [
          '--clean', '--if-exists', '--no-owner', '--no-privileges', '--exit-on-error', '--single-transaction',
          `--dbname=${databaseUrls.remote}`, dumpFile,
        ], { timeout: 10 * 60 * 1000, maxBuffer: 8 * 1024 * 1024 });
        return json(200, { ok: true, message: 'Production now matches the local database. A pre-refresh backup was saved locally.' });
      } finally {
        await rm(dumpFile, { force: true });
      }
    }
    if (url.pathname === '/api/auth/change-password' && req.method === 'POST') {
      const body = await readJson(req);
      const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
      const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';
      if (newPassword.length < 12 || newPassword.length > 128)
        return json(400, { message: 'New password must be between 12 and 128 characters.' });
      if (currentPassword === newPassword)
        return json(400, { message: 'Choose a new password that is different from your current password.' });
      const [credentials] = await sql`select password_hash as "passwordHash" from management_users where id=${currentUser.id}`;
      if (!credentials || !passwordMatches(currentPassword, credentials.passwordHash))
        return json(400, { message: 'Current password is incorrect.' });
      await sql`update management_users set password_hash=${hashPassword(newPassword)},updated_at=now() where id=${currentUser.id}`;
      const currentToken = parseCookies(req.headers.cookie)[sessionCookie];
      await sql`delete from management_sessions where user_id=${currentUser.id} and token_hash<>${hashToken(currentToken)}`;
      return json(200, { ok: true });
    }
    const bookingAccess = currentUser?.role === 'admin' ? 'write' : currentUser?.bookingAccess;
    const hasPermission = (key, level = 'write') => {
      if (currentUser?.role === 'admin') return true;
      return currentUser?.permissions?.[key] === level;
    };
    const canReadCustomers = () => hasPermission('customers', 'read') || hasPermission('customers', 'write');
    const auditCustomer = (transaction, memberId, action, entityType, entityId, metadata = {}) =>
      transaction`insert into customer_audit_events(member_id,actor_user_id,action,entity_type,entity_id,metadata) values(${memberId},${currentUser.id},${action},${entityType},${entityId ?? null},${transaction.json(metadata)})`;
    let requiredConfigurationPermission = null;
    if (url.pathname.startsWith('/api/features/') && req.method !== 'GET') requiredConfigurationPermission = 'configuration.rewards';
    else if (url.pathname.startsWith('/api/opening-hours')) requiredConfigurationPermission = 'configuration.hours';
    else if (url.pathname === '/api/booking-settings') {
      if (!hasPermission('configuration.tables') && !hasPermission('configuration.duration') && !hasPermission('configuration.cancellation'))
        return json(403, { message: 'Booking configuration access required.' });
    }
    else if (url.pathname.startsWith('/api/deposit-rules')) requiredConfigurationPermission = 'configuration.deposits';
    else if (url.pathname.startsWith('/api/attendance-settings')) requiredConfigurationPermission = 'configuration.attendance';
    else if (url.pathname.startsWith('/api/communications')) requiredConfigurationPermission = 'configuration.communications';
    else if (url.pathname.startsWith('/api/booking-tables')) requiredConfigurationPermission = 'configuration.tables';
    else if (url.pathname.startsWith('/api/menu-tags')) requiredConfigurationPermission = 'configuration.symbols';
    else if (url.pathname.startsWith('/api/menu')) requiredConfigurationPermission = 'configuration.menu';
    else if (url.pathname.startsWith('/api/tables')) requiredConfigurationPermission = 'configuration.database';
    if (requiredConfigurationPermission && !hasPermission(requiredConfigurationPermission))
      return json(403, { message: 'You do not have access to this configuration function.' });
    if (url.pathname.startsWith('/api/diary')) {
      if (bookingAccess === 'none') return json(403, { message: 'Booking access required.' });
      if (req.method !== 'GET' && bookingAccess !== 'write')
        return json(403, { message: 'Read and write booking access required.' });
    }
    if (url.pathname.startsWith('/api/waitlist')) {
      if (bookingAccess === 'none') return json(403, { message: 'Booking access required.' });
      if (req.method !== 'GET' && bookingAccess !== 'write') return json(403, { message: 'Read and write booking access required.' });
    }
    if (url.pathname === '/api/users' && req.method === 'GET') {
      if (!hasPermission('configuration.users')) return json(403, { message: 'User management access required.' });
      const rows = await sql`select id,email,display_name as "displayName",role,active,created_at as "createdAt",updated_at as "updatedAt" from management_users order by active desc,display_name,email`;
      const users = await Promise.all(rows.map(async (user) => ({...user, permissions: await effectivePermissions(user.id,user.role)})));
      return json(200, {
        users,
        currentUser: { id: currentUser.id, role: currentUser.role, permissions: currentUser.permissions },
        permissionDefinitions: await permissionDefinitions(),
      });
    }
    if (url.pathname === '/api/users' && req.method === 'POST') {
      if (!hasPermission('configuration.users')) return json(403, { message: 'User management access required.' });
      const fields = userFields(await readJson(req), true);
      const delegated = await validateDelegatedPermissions(fields.permissions, currentUser, fields.role);
      const id = randomUUID();
      const [user] = await sql.begin(async (transaction) => {
        const [created] = await transaction`insert into management_users(id,email,display_name,password_hash,role,active,configuration_access,booking_access) values(${id},${fields.email},${fields.displayName},${hashPassword(fields.password)},${fields.role},${fields.active},false,'none') returning id,email,display_name as "displayName",role,active,created_at as "createdAt",updated_at as "updatedAt"`;
        await savePermissions(transaction,id,delegated.permissions);
        return [created];
      });
      user.permissions = delegated.permissions;
      return json(201, { user });
    }
    const userMatch = url.pathname.match(/^\/api\/users\/([0-9a-f-]{36})$/i);
    if (userMatch && req.method === 'PUT') {
      if (!hasPermission('configuration.users')) return json(403, { message: 'User management access required.' });
      const id = userMatch[1];
      const fields = userFields(await readJson(req));
      const [existing] = await sql`select id,role,active from management_users where id=${id}`;
      if (!existing) return json(404, { message: 'User not found.' });
      const delegatedDefinitions = await permissionDefinitions();
      const existingPermissions = await effectivePermissions(id, existing.role);
      if (currentUser.role !== 'admin' && (existing.role === 'admin' || Object.entries(existingPermissions).some(([key,level]) => {
        const definition = delegatedDefinitions.find((item) => item.key === key);
        return definition && permissionRank(definition,level) > permissionRank(definition,currentUser.permissions[key] || 'none');
      }))) return json(403, { message: 'You cannot manage a user with permissions above your own.' });
      const delegated = await validateDelegatedPermissions(fields.permissions, currentUser, fields.role);
      if (id === currentUser.id && (!fields.active || fields.role !== existing.role))
        return json(400, { message: 'You cannot disable or change the role of your own account.' });
      if (existing.role === 'admin' && existing.active && (!fields.active || fields.role !== 'admin')) {
        const [count] = await sql`select count(*)::integer as count from management_users where role='admin' and active=true`;
        if (count.count <= 1) return json(400, { message: 'At least one active administrator is required.' });
      }
      const passwordHash = fields.password ? hashPassword(fields.password) : null;
      const [user] = await sql.begin(async (transaction) => {
        const [saved] = await transaction`update management_users set email=${fields.email},display_name=${fields.displayName},role=${fields.role},active=${fields.active},password_hash=coalesce(${passwordHash},password_hash),updated_at=now() where id=${id} returning id,email,display_name as "displayName",role,active,created_at as "createdAt",updated_at as "updatedAt"`;
        await savePermissions(transaction,id,delegated.permissions);
        return [saved];
      });
      user.permissions = delegated.permissions;
      if (!fields.active) await sql`delete from management_sessions where user_id=${id}`;
      else if (passwordHash) {
        const currentToken = parseCookies(req.headers.cookie)[sessionCookie];
        if (id === currentUser.id && currentToken)
          await sql`delete from management_sessions where user_id=${id} and token_hash<>${hashToken(currentToken)}`;
        else await sql`delete from management_sessions where user_id=${id}`;
      }
      return json(200, { user });
    }
    if (userMatch && req.method === 'DELETE') {
      if (!hasPermission('configuration.users')) return json(403, { message: 'User management access required.' });
      const id = userMatch[1];
      if (id === currentUser.id) return json(400, { message: 'You cannot delete your own account.' });
      const [existing] = await sql`select role,active from management_users where id=${id}`;
      if (!existing) return json(404, { message: 'User not found.' });
      if (currentUser.role !== 'admin' && existing.role === 'admin')
        return json(403, { message: 'Only an administrator can delete an administrator.' });
      if (currentUser.role !== 'admin') {
        const definitions = await permissionDefinitions();
        const targetPermissions = await effectivePermissions(id, existing.role);
        if (Object.entries(targetPermissions).some(([key,level]) => {
          const definition = definitions.find((item) => item.key === key);
          return definition && permissionRank(definition,level) > permissionRank(definition,currentUser.permissions[key] || 'none');
        })) return json(403, { message: 'You cannot delete a user with permissions above your own.' });
      }
      if (existing.role === 'admin' && existing.active) {
        const [count] = await sql`select count(*)::integer as count from management_users where role='admin' and active=true`;
        if (count.count <= 1) return json(400, { message: 'At least one active administrator is required.' });
      }
      await sql`delete from management_users where id=${id}`;
      return json(200, { ok: true });
    }
    if (url.pathname === '/api/features/rewards' && req.method === 'GET') {
      const [feature] = await sql`select enabled from feature_flags where feature_key='rewards'`;
      return json(200, { enabled: feature?.enabled ?? true });
    }
    if (url.pathname === '/api/features/rewards' && req.method === 'PUT') {
      const body = await readJson(req);
      if (typeof body?.enabled !== 'boolean')
        return json(400, { message: 'Rewards enabled must be true or false.' });
      await sql`insert into feature_flags(feature_key,enabled,updated_at) values('rewards',${body.enabled},now()) on conflict(feature_key) do update set enabled=excluded.enabled,updated_at=excluded.updated_at`;
      return json(200, { enabled: body.enabled });
    }
    if (url.pathname === '/api/customers' && req.method === 'GET') {
      if (!canReadCustomers()) return json(403, { message: 'Customer access required.' });
      const search = (url.searchParams.get('q') || '').trim().slice(0, 120);
      const rows =
        await sql`select m.id,m.display_name as name,m.email,m.phone,m.member_since as "memberSince",
        m.tier,m.created_at as "createdAt",coalesce(a.points,0) as points,
        count(b.id)::integer as "bookingCount",max(b.booking_date) as "lastBookingDate"
        from members m
        left join loyalty_accounts a on a.member_id=m.id
        left join bookings b on b.member_id=m.id and b.status<>'cancelled'
        where ${search === ''} or m.display_name ilike ${'%' + search + '%'} or m.email ilike ${'%' + search + '%'} or m.phone ilike ${'%' + search + '%'}
          or exists(select 1 from bookings search_booking where search_booking.member_id=m.id and search_booking.id::text ilike ${'%' + search + '%'})
        group by m.id,a.points
        order by m.created_at desc,m.display_name
        limit 200`;
      return json(200, { customers: rows });
    }
    if (url.pathname === '/api/customer-segments' && req.method === 'GET') {
      if (!canReadCustomers()) return json(403, { message: 'Customer access required.' });
      const segments = await sql`select s.id,s.name,s.definition,s.created_at as "createdAt",s.updated_at as "updatedAt",coalesce(u.display_name,'Former staff user') as "createdBy" from customer_segments s left join management_users u on u.id=s.created_by where s.archived=false order by s.updated_at desc,s.name`;
      return json(200, { segments });
    }
    const segmentPreview = async (definition) => {
      const operator = definition?.operator === 'or' ? 'or' : 'and';
      const raw = definition?.filters && typeof definition.filters === 'object' ? definition.filters : {};
      const filters = {
        minVisits: Math.max(0, Math.min(1000, Number(raw.minVisits) || 0)),
        visitedWithinDays: Math.max(0, Math.min(3650, Number(raw.visitedWithinDays) || 0)),
        minPoints: Math.max(0, Math.min(10000000, Number(raw.minPoints) || 0)),
        tag: typeof raw.tag === 'string' ? raw.tag.trim().slice(0,50) : '',
        dietary: typeof raw.dietary === 'string' ? raw.dietary.trim().slice(0,100) : '',
        channel: ['email','sms','push'].includes(raw.channel) ? raw.channel : '',
      };
      const active = Object.entries(filters).filter(([,value]) => value !== '' && value !== 0);
      const rows = await sql`select m.id,m.display_name as name,m.email,m.phone,coalesce(a.points,0)::integer as points,count(b.id) filter(where b.status not in ('cancelled','no_show') and (b.booking_date+b.booking_time)<=now())::integer as "visitCount",max(b.booking_date+b.booking_time) filter(where b.status not in ('cancelled','no_show') and (b.booking_date+b.booking_time)<=now()) as "lastVisitAt",coalesce((select json_agg(d.name) from customer_tags t join customer_tag_definitions d on d.id=t.tag_id where t.member_id=m.id),'[]') as tags,coalesce((select json_agg(n.name) from member_dietary_needs n where n.member_id=m.id),'[]') as dietary,coalesce((select json_object_agg(c.channel,c.status) from customer_consents c where c.member_id=m.id and c.purpose='marketing'),'{}') as consents from members m left join loyalty_accounts a on a.member_id=m.id left join bookings b on b.member_id=m.id group by m.id,a.points order by m.display_name limit 1000`;
      const now = Date.now();
      const members = rows.map((row) => {
        const checks = [];
        if (filters.minVisits) checks.push({ label:`At least ${filters.minVisits} visits`, pass:row.visitCount >= filters.minVisits });
        if (filters.visitedWithinDays) checks.push({ label:`Visited within ${filters.visitedWithinDays} days`, pass:Boolean(row.lastVisitAt) && now-new Date(row.lastVisitAt).getTime() <= filters.visitedWithinDays*86400000 });
        if (filters.minPoints) checks.push({ label:`At least ${filters.minPoints} points`, pass:row.points >= filters.minPoints });
        if (filters.tag) checks.push({ label:`Tag: ${filters.tag}`, pass:row.tags.some((tag) => tag.toLowerCase()===filters.tag.toLowerCase()) });
        if (filters.dietary) checks.push({ label:`Preference: ${filters.dietary}`, pass:row.dietary.some((item) => item.toLowerCase().includes(filters.dietary.toLowerCase())) });
        const matches = checks.length === 0 || (operator === 'and' ? checks.every((item) => item.pass) : checks.some((item) => item.pass));
        const hasContact = filters.channel === 'email' ? Boolean(row.email) : filters.channel === 'sms' ? Boolean(row.phone) : true;
        const consent = filters.channel ? row.consents?.[filters.channel] : null;
        const eligibility = !filters.channel ? 'eligible' : !hasContact ? 'unreachable' : consent === 'opted_in' ? 'eligible' : 'suppressed';
        return { id:row.id,name:row.name,email:row.email,visitCount:row.visitCount,points:row.points,matches,eligibility,reasons:checks.map((item)=>`${item.pass?'Matches':'Does not match'}: ${item.label}`) };
      }).filter((member) => member.matches);
      return { definition:{operator,filters}, counts:{ matched:members.length,eligible:members.filter((m)=>m.eligibility==='eligible').length,suppressed:members.filter((m)=>m.eligibility==='suppressed').length,unreachable:members.filter((m)=>m.eligibility==='unreachable').length }, members:members.slice(0,100) };
    };
    if (url.pathname === '/api/customer-segments/preview' && req.method === 'POST') {
      if (!canReadCustomers()) return json(403, { message: 'Customer access required.' });
      return json(200, await segmentPreview(await readJson(req)));
    }
    if (url.pathname === '/api/customer-segments' && req.method === 'POST') {
      if (!hasPermission('customers')) return json(403, { message: 'Customer write access required.' });
      const body = await readJson(req), name = typeof body?.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 80) return json(400, { message: 'Enter a segment name of up to 80 characters.' });
      const preview = await segmentPreview(body.definition || {});
      try {
        const [segment] = await sql`insert into customer_segments(name,definition,created_by) values(${name},${sql.json(preview.definition)},${currentUser.id}) returning id,name,definition,created_at as "createdAt",updated_at as "updatedAt"`;
        return json(201, { segment });
      } catch (error) {
        return json(error.code === '23505' ? 409 : 500, { message:error.code === '23505' ? 'A segment with this name already exists.' : 'Unable to save segment.' });
      }
    }
    const customerMatch = url.pathname.match(/^\/api\/customers\/([0-9a-f-]{36})$/i);
    if (customerMatch && req.method === 'GET') {
      if (!canReadCustomers()) return json(403, { message: 'Customer access required.' });
      const memberId = customerMatch[1];
      const [customer] = await sql`select m.id,m.display_name as name,m.email,m.phone,m.member_since as "memberSince",m.tier,m.created_at as "createdAt",coalesce(a.points,0) as points,coalesce((select json_agg(name order by position) from member_tastes where member_id=m.id),'[]') as tastes,coalesce((select json_agg(name order by position) from member_dietary_needs where member_id=m.id),'[]') as "dietaryNeeds",(select count(*)::integer from bookings where member_id=m.id and status='completed') as "completedVisits",(select count(*)::integer from bookings where member_id=m.id and status='no_show') as "noShowCount",(select count(*)::integer from bookings where member_id=m.id and status='cancelled') as "cancellationCount" from members m left join loyalty_accounts a on a.member_id=m.id where m.id=${memberId}`;
      if (!customer) return json(404, { message: 'Customer not found.' });
      const [bookings, loyalty, notes, tags, tagDefinitions, consents, audit] = await Promise.all([
        sql`select id,booking_date::text as date,booking_time::text as time,guest_count as guests,experience,status,total_pence as "totalPence",notes,created_at as "createdAt" from bookings where member_id=${memberId} order by booking_date desc,booking_time desc limit 100`,
        sql`select id,points_delta as "pointsDelta",reason,reference_type as "referenceType",reference_id as "referenceId",created_at as "createdAt" from loyalty_ledger where member_id=${memberId} order by created_at desc limit 100`,
        sql`select n.id,n.body,n.created_at as "createdAt",coalesce(u.display_name,'Former staff user') as "createdBy" from customer_notes n left join management_users u on u.id=n.created_by where n.member_id=${memberId} order by n.created_at desc`,
        sql`select d.id,d.name,d.color,t.assigned_at as "assignedAt",'manual' as source from customer_tags t join customer_tag_definitions d on d.id=t.tag_id where t.member_id=${memberId} order by d.name`,
        sql`select id,name,color from customer_tag_definitions order by name`,
        sql`select channel,purpose,status,source,wording_version as "wordingVersion",updated_at as "updatedAt" from customer_consents where member_id=${memberId} order by channel,purpose`,
        sql`select e.id,e.action,e.entity_type as "entityType",e.entity_id as "entityId",e.metadata,e.created_at as "createdAt",e.actor_user_id as "actorUserId",coalesce(u.display_name,'System') as actor from customer_audit_events e left join management_users u on u.id=e.actor_user_id where e.member_id=${memberId} order by e.created_at desc limit 100`,
      ]);
      const bookingActor = (bookingId) => {
        const event = audit.find((item) => item.entityType === 'booking' && item.entityId === bookingId);
        return event ? { actorType:'staff', actor:event.actor } : { actorType:'customer', actor:'Customer' };
      };
      const completedVisits = bookings.filter((item) => !['cancelled','no_show'].includes(item.status) && new Date(`${item.date}T${item.time}`) < new Date());
      const visitsIn90Days = completedVisits.filter((item) => new Date(`${item.date}T${item.time}`) >= new Date(Date.now() - 90 * 86400000)).length;
      const lastVisit = completedVisits[0];
      const automaticTags = [
        visitsIn90Days >= 4 && { id:'auto-regular', name:'Regular', color:'#2f8f57', source:'automatic', reason:`${visitsIn90Days} visits in the last 90 days` },
        (completedVisits.length >= 10 || customer.points >= 1000) && { id:'auto-vip', name:'VIP', color:'#a66a16', source:'automatic', reason:completedVisits.length >= 10 ? `${completedVisits.length} completed visits` : `${customer.points} loyalty points` },
        lastVisit && new Date(`${lastVisit.date}T${lastVisit.time}`) < new Date(Date.now() - 60 * 86400000) && { id:'auto-lapsed', name:'Lapsed', color:'#8a5362', source:'automatic', reason:`Last visit was ${new Date(`${lastVisit.date}T${lastVisit.time}`).toLocaleDateString('en-GB')}` },
      ].filter(Boolean);
      const tagEvaluation = {
        completedVisits: completedVisits.length,
        visitsIn90Days,
        points: Number(customer.points),
        lastVisitAt: lastVisit ? `${lastVisit.date}T${lastVisit.time}` : null,
      };
      const activity = [
        ...bookings.map((item) => ({ id: `booking-${item.id}`, type: 'booking', title: `${item.status === 'cancelled' ? 'Cancelled' : item.status === 'no_show' ? 'No-show' : item.status === 'completed' ? 'Completed visit' : 'Booking'} · ${item.experience}`, detail: `${item.guests} guests at ${item.time.slice(0,5)}`, occurredAt: `${item.date}T${item.time}`, ...bookingActor(item.id) })),
        ...loyalty.map((item) => ({ id: `loyalty-${item.id}`, type: 'loyalty', title: item.pointsDelta >= 0 ? `${item.pointsDelta} points added` : `${Math.abs(item.pointsDelta)} points used`, detail: item.reason, occurredAt: item.createdAt, actorType:item.reason.toLowerCase().includes('manual')?'staff':item.pointsDelta<0?'customer':'system', actor:item.reason.toLowerCase().includes('manual')?'Staff user':item.pointsDelta<0?'Customer':'Pace' })),
        ...notes.map((item) => ({ id: `note-${item.id}`, type: 'note', title: 'Staff note added', detail: item.body, occurredAt: item.createdAt, actorType:'staff', actor:item.createdBy })),
        ...audit.map((item) => ({ id: `audit-${item.id}`, type: 'audit', title: item.action.replaceAll('_',' '), detail: item.metadata?.reason || (item.metadata?.fields?.length ? `Changed ${item.metadata.fields.join(', ')}` : item.metadata?.name || item.entityType.replaceAll('_',' ')), occurredAt: item.createdAt, actorType:item.metadata?.source==='customer'?'customer':item.actorUserId?'staff':'system', actor:item.metadata?.source==='customer'?'Customer':item.actor })),
      ].sort((a,b) => new Date(b.occurredAt).getTime()-new Date(a.occurredAt).getTime()).slice(0,150);
      return json(200, { customer, bookings, loyalty, notes, tags:[...automaticTags,...tags], tagDefinitions, tagEvaluation, consents, activity, canWrite: hasPermission('customers') });
    }
    if (customerMatch && req.method === 'PATCH') {
      if (!hasPermission('customers')) return json(403, { message: 'Customer write access required.' });
      const memberId = customerMatch[1], body = await readJson(req);
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
      if (!name || name.length > 100 || (email && !/^\S+@\S+\.\S+$/.test(email)) || email.length > 254 || phone.length > 40)
        return json(400, { message: 'Enter valid customer contact details.' });
      try {
        const [customer] = await sql.begin(async transaction => {
          const [saved] = await transaction`update members set display_name=${name},email=${email || null},phone=${phone || null},updated_at=now() where id=${memberId} returning id,display_name as name,email,phone`;
          if (!saved) throw Object.assign(new Error('Customer not found.'), { status: 404 });
          await auditCustomer(transaction,memberId,'customer_profile_updated','customer',memberId,{ fields:['name','email','phone'] });
          return [saved];
        });
        return json(200, { customer });
      } catch (error) {
        return json(error.code === '23505' ? 409 : (error.status ?? 500), { message: error.code === '23505' ? 'That email address already belongs to another customer.' : error.message });
      }
    }
    const customerActionMatch = url.pathname.match(/^\/api\/customers\/([0-9a-f-]{36})\/(notes|tags|consents)$/i);
    if (customerActionMatch && req.method === 'POST') {
      if (!hasPermission('customers')) return json(403, { message: 'Customer write access required.' });
      const [,memberId,action] = customerActionMatch, body = await readJson(req);
      const [member] = await sql`select id from members where id=${memberId}`;
      if (!member) return json(404, { message: 'Customer not found.' });
      if (action === 'notes') {
        const note = typeof body?.body === 'string' ? body.body.trim() : '';
        if (!note || note.length > 2000) return json(400, { message: 'Enter a note of up to 2,000 characters.' });
        const [saved] = await sql.begin(async transaction => {
          const [created] = await transaction`insert into customer_notes(member_id,body,created_by) values(${memberId},${note},${currentUser.id}) returning id,body,created_at as "createdAt"`;
          await auditCustomer(transaction,memberId,'customer_note_added','customer_note',created.id);
          return [created];
        });
        return json(201, { note: { ...saved, createdBy: currentUser.displayName } });
      }
      if (action === 'tags') {
        const name = typeof body?.name === 'string' ? body.name.trim() : '';
        const color = /^#[0-9a-f]{6}$/i.test(body?.color || '') ? body.color : '#566474';
        if (!name || name.length > 50) return json(400, { message: 'Enter a tag name of up to 50 characters.' });
        const [tag] = await sql.begin(async transaction => {
          const [definition] = await transaction`insert into customer_tag_definitions(name,color,created_by) values(${name},${color},${currentUser.id}) on conflict(lower(name)) do update set name=excluded.name returning id,name,color`;
          await transaction`insert into customer_tags(member_id,tag_id,assigned_by) values(${memberId},${definition.id},${currentUser.id}) on conflict do nothing`;
          await auditCustomer(transaction,memberId,'customer_tag_assigned','customer_tag',definition.id,{ name:definition.name });
          return [definition];
        });
        return json(201, { tag });
      }
      const channel = ['email','sms','push'].includes(body?.channel) ? body.channel : '';
      const status = ['unknown','opted_in','opted_out'].includes(body?.status) ? body.status : '';
      if (!channel || !status) return json(400, { message: 'Choose a valid channel and consent status.' });
      const [consent] = await sql.begin(async transaction => {
        const [saved] = await transaction`insert into customer_consents(member_id,channel,purpose,status,source,wording_version,updated_by,updated_at) values(${memberId},${channel},'marketing',${status},'backoffice',${String(body?.wordingVersion || 'staff-recorded-v1')},${currentUser.id},now()) on conflict(member_id,channel,purpose) do update set status=excluded.status,source=excluded.source,wording_version=excluded.wording_version,updated_by=excluded.updated_by,updated_at=now() returning channel,purpose,status,source,wording_version as "wordingVersion",updated_at as "updatedAt"`;
        await auditCustomer(transaction,memberId,'customer_consent_updated','customer_consent',channel,{ channel,status });
        return [saved];
      });
      return json(200, { consent });
    }
    const customerTagMatch = url.pathname.match(/^\/api\/customers\/([0-9a-f-]{36})\/tags\/([0-9a-f-]{36})$/i);
    if (customerTagMatch && req.method === 'DELETE') {
      if (!hasPermission('customers')) return json(403, { message: 'Customer write access required.' });
      const [,memberId,tagId] = customerTagMatch;
      await sql.begin(async transaction => {
        const removed = await transaction`delete from customer_tags where member_id=${memberId} and tag_id=${tagId} returning tag_id`;
        if (!removed.length) throw Object.assign(new Error('Customer tag not found.'), { status:404 });
        await auditCustomer(transaction,memberId,'customer_tag_removed','customer_tag',tagId);
      });
      return json(200, { ok:true });
    }
    if (url.pathname === '/api/waitlist' && req.method === 'GET') {
      const date=url.searchParams.get('date')||'';
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json(400,{message:'Choose a valid service date.'});
      const [entries,tables]=await Promise.all([
        sql`select w.id,w.service_date::text as date,w.guest_name as name,w.contact_email as "contactEmail",w.contact_phone as "contactPhone",w.party_size as "partySize",w.status,w.priority,w.quoted_wait_minutes as "quotedWaitMinutes",w.notes,w.assigned_table_id as "assignedTableId",bt.name as "assignedTableName",w.created_at as "createdAt",coalesce((select json_agg(n.name order by n.position) from member_dietary_needs n where n.member_id=w.member_id),'[]') as preferences from waitlist_entries w left join booking_tables bt on bt.id=w.assigned_table_id where w.service_date=${date}::date order by case w.status when 'ready' then 0 when 'nearly_ready' then 1 when 'waiting' then 2 else 3 end,w.priority desc,w.created_at`,
        sql`select id,name,seat_count as seats from booking_tables order by table_number`,
      ]);
      return json(200,{entries,tables});
    }
    if (url.pathname === '/api/waitlist' && req.method === 'POST') {
      const body=await readJson(req),date=typeof body?.date==='string'?body.date:'',name=typeof body?.name==='string'?body.name.trim():'',email=typeof body?.contactEmail==='string'?body.contactEmail.trim().toLowerCase():'',phone=typeof body?.contactPhone==='string'?body.contactPhone.trim():'',partySize=Number(body?.partySize),quoted=body?.quotedWaitMinutes===''||body?.quotedWaitMinutes==null?null:Number(body.quotedWaitMinutes),notes=typeof body?.notes==='string'?body.notes.trim():'';
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!name||name.length>120||!Number.isInteger(partySize)||partySize<1||partySize>20||(quoted!==null&&(!Number.isInteger(quoted)||quoted<0||quoted>360))||(email&&!/^\S+@\S+\.\S+$/.test(email))) return json(400,{message:'Provide valid waitlist details.'});
      const [entry]=await sql.begin(async transaction=>{
        const [member]=email?await transaction`select id from members where lower(email)=${email} limit 1`:[];
        const [created]=await transaction`insert into waitlist_entries(member_id,service_date,guest_name,contact_email,contact_phone,party_size,quoted_wait_minutes,notes,created_by) values(${member?.id??null},${date}::date,${name},${email||null},${phone||null},${partySize},${quoted},${notes||null},${currentUser.id}) returning id`;
        if(member) await auditCustomer(transaction,member.id,'waitlist_joined','waitlist_entry',created.id,{partySize,quotedWaitMinutes:quoted});
        return [created];
      });
      return json(201,{entry});
    }
    const waitlistMatch=url.pathname.match(/^\/api\/waitlist\/([0-9a-f-]{36})$/i);
    if(waitlistMatch&&req.method==='PUT'){
      const body=await readJson(req),status=['waiting','nearly_ready','ready','cancelled','expired'].includes(body?.status)?body.status:null,priority=body?.priority===undefined?null:Number(body.priority),assignedTableId=body?.assignedTableId===undefined?null:Number(body.assignedTableId);
      if(!status&&priority===null&&assignedTableId===null)return json(400,{message:'Choose a valid waitlist update.'});
      const [entry]=await sql`update waitlist_entries set status=coalesce(${status},status),priority=coalesce(${Number.isInteger(priority)?priority:null},priority),assigned_table_id=coalesce(${Number.isInteger(assignedTableId)?assignedTableId:null},assigned_table_id),updated_at=now() where id=${waitlistMatch[1]} returning id,status,priority`;
      return entry?json(200,{entry}):json(404,{message:'Waitlist entry not found.'});
    }
    const waitlistSeatMatch=url.pathname.match(/^\/api\/waitlist\/([0-9a-f-]{36})\/seat$/i);
    if(waitlistSeatMatch&&req.method==='POST'){
      const body=await readJson(req),time=typeof body?.time==='string'?body.time:'',tableId=Number(body?.tableId);
      if(!/^\d{2}:\d{2}$/.test(time)||!Number.isSafeInteger(tableId))return json(400,{message:'Choose a table and seating time.'});
      try{
        const [booking]=await sql.begin(async transaction=>{
          const [entry]=await transaction`select * from waitlist_entries where id=${waitlistSeatMatch[1]} for update`;
          if(!entry||!['waiting','nearly_ready','ready'].includes(entry.status))throw Object.assign(new Error('This party is no longer waiting.'),{status:409});
          const [table]=await transaction`select id,name,seat_count from booking_tables where id=${tableId}`;
          if(!table||table.seat_count<entry.party_size)throw Object.assign(new Error('Choose a table with enough seats.'),{status:409});
          const [created]=await transaction`insert into bookings(member_id,booking_date,booking_time,guest_count,experience,status,contact_name,contact_email,notes,booking_duration_minutes,assigned_table_id) values(${entry.member_id},${entry.service_date},${time}::time,${entry.party_size},'Walk-in','confirmed',${entry.guest_name},${entry.contact_email},${entry.notes},90,${tableId}) returning id`;
          await transaction`insert into booking_table_assignments(booking_id,table_id) values(${created.id},${tableId})`;
          await transaction`insert into booking_guests(booking_id,display_name,position) values(${created.id},${entry.guest_name},1)`;
          await transaction`update waitlist_entries set status='seated',assigned_table_id=${tableId},seated_booking_id=${created.id},updated_at=now() where id=${entry.id}`;
          if(entry.member_id)await auditCustomer(transaction,entry.member_id,'waitlist_seated','booking',created.id,{table:table.name});
          return [created];
        });
        return json(201,{booking});
      }catch(error){return json(error.status??(error.code==='P1001'?409:500),{message:error.message||'Unable to seat this party.'});}
    }
    if (url.pathname.startsWith('/api/rewards')) {
      if (!hasPermission('rewards')) return json(403, { message: 'Rewards access required.' });
      const [feature] = await sql`select enabled from feature_flags where feature_key='rewards'`;
      if (feature && !feature.enabled)
        return json(404, { message: 'Rewards are disabled for this venue.' });
    }
    if (await rewardsRoute({ req, res, url, sql, json, readJson })) return;
    if (url.pathname === '/api/diary' && req.method === 'GET') {
      const date = url.searchParams.get('date');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date)))
        return json(400, { message: 'Choose a valid diary date.' });
      const bookings =
        await sql`select b.id,b.booking_time::text as time,b.contact_name as name,b.contact_email as "contactEmail",b.guest_count as guests,b.experience,b.status,b.deposit_status as "depositStatus",b.deposit_amount_pence as "depositAmountPence",b.notes,coalesce((select json_agg(name order by position) from booking_dietary_needs where booking_id=b.id),'[]') as "dietaryNeeds",coalesce((select json_agg(name order by position) from member_dietary_needs where member_id=b.member_id),'[]') as "customerDietaryNeeds",coalesce((select json_agg(name order by position) from member_tastes where member_id=b.member_id),'[]') as "customerTastes",coalesce((select json_agg(d.name order by d.name) from customer_tags t join customer_tag_definitions d on d.id=t.tag_id where t.member_id=b.member_id),'[]') as "customerTags",b.assigned_table_id as "assignedTableId",bt.name as "assignedTableName",b.booking_duration_minutes as "durationMinutes" from bookings b left join booking_tables bt on bt.id=b.assigned_table_id where b.booking_date=${date}::date order by b.booking_time,b.created_at`;
      const tableAssignments =
        await sql`select bta.booking_id as "bookingId",bt.id as "tableId",bt.name as "tableName" from booking_table_assignments bta join booking_tables bt on bt.id=bta.table_id join bookings b on b.id=bta.booking_id where b.booking_date=${date}::date order by bt.table_number`;
      const orders =
        await sql`select o.id,o.booking_id as "bookingId",o.status,o.total_pence as "totalPence",o.deposit_credit_pence as "depositCreditPence",o.paid_pence as "paidPence",o.paid_at as "paidAt" from orders o join bookings b on b.id=o.booking_id where b.booking_date=${date}::date`;
      const lines =
        await sql`select l.id,l.order_id as "orderId",l.item_name as name,l.item_description as description,l.unit_price_pence as "unitPricePence",l.quantity from order_lines l join orders o on o.id=l.order_id join bookings b on b.id=o.booking_id where b.booking_date=${date}::date order by l.created_at`;
      const assignments =
        await sql`select a.order_line_id as "orderLineId",a.serving_number as "servingNumber",a.is_shared as "isShared",g.display_name as "guestName" from order_line_assignments a join order_lines l on l.id=a.order_line_id join orders o on o.id=l.order_id join bookings b on b.id=o.booking_id left join booking_guests g on g.id=a.booking_guest_id where b.booking_date=${date}::date order by a.serving_number`;
      const reminders = await sql`select distinct on (r.booking_id) r.booking_id as "bookingId",r.channel,r.status,r.created_at as "createdAt",r.delivered_at as "deliveredAt" from booking_reminder_events r join bookings b on b.id=r.booking_id where b.booking_date=${date}::date order by r.booking_id,r.created_at desc`;
      const ordersByBooking = new Map(
        orders.map((order) => [
          order.bookingId,
          {
            status: order.status,
            totalPence: order.totalPence,
            paidAt: order.paidAt,
            lines: lines
              .filter((line) => line.orderId === order.id)
              .map((line) => ({
                ...line,
                assignments: assignments.filter((assignment) => assignment.orderLineId === line.id),
              })),
          },
        ]),
      );
      for (const booking of bookings) {
        const assigned = tableAssignments.filter(
          (assignment) => assignment.bookingId === booking.id,
        );
        booking.assignedTableIds = assigned.map((assignment) => assignment.tableId);
        booking.assignedTableNames = assigned.map((assignment) => assignment.tableName);
        if (assigned.length) {
          booking.assignedTableId = assigned[0].tableId;
          booking.assignedTableName = assigned
            .map((assignment) => assignment.tableName)
            .join(' + ');
        }
        booking.orderAhead = ordersByBooking.get(booking.id) ?? null;
        booking.lastReminder = reminders.find((reminder)=>reminder.bookingId===booking.id) ?? null;
      }
      const day = new Date(date + 'T12:00:00Z').getUTCDay();
      const hourKey = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][day];
      const [hours] =
        await sql`select o.opens_at,o.closes_at,coalesce(k.opens_at,o.opens_at) as kitchen_open,k.closes_at as kitchen_close from opening_hours o join kitchen_hours k on k.day=o.map_key where o.parent_id='appointments' and o.map_key=${hourKey} limit 1`;
      const tables =
        await sql`select id,name,table_number as number,seat_count as seats from booking_tables order by table_number`;
      const [setting] =
        await sql`select integer_value as "defaultDurationMinutes" from booking_system_settings where setting_key='default_booking_duration_minutes'`;
      const [cancellationSetting] =
        await sql`select integer_value as "cancellationCutoffHours" from booking_system_settings where setting_key='free_cancellation_hours'`;
      const [attendanceSummary] = await sql`select
        count(*) filter(where status='completed')::integer as completed,
        count(*) filter(where status='no_show')::integer as "noShows",
        count(*) filter(where status='cancelled' and cancellation_outcome='retained')::integer as cancelled,
        count(*) filter(where status in ('confirmed','arrived') and booking_date+booking_time+make_interval(mins=>booking_duration_minutes)<now())::integer as "needsReview"
        from bookings where booking_date between current_date-89 and current_date`;
      return json(200, {
        date,
        openingHours: hours
          ? {
              open: Number(hours.opens_at),
              close: Number(hours.closes_at),
              kitchenOpen: Number(hours.kitchen_open),
              kitchenClose: Number(hours.kitchen_close),
            }
          : null,
        tables,
        bookings,
        bookingSettings: {
          defaultDurationMinutes: Number(setting?.defaultDurationMinutes ?? 90),
          cancellationCutoffHours: Number(cancellationSetting?.cancellationCutoffHours ?? 24),
        },
        attendanceSummary,
      });
    }
    if (url.pathname === '/api/diary/availability' && req.method === 'GET') {
      const date = url.searchParams.get('date') || '';
      const time = url.searchParams.get('time') || '';
      const guests = Number(url.searchParams.get('guests'));
      const durationMinutes = Number(url.searchParams.get('durationMinutes'));
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        !/^\d{2}:\d{2}$/.test(time) ||
        !Number.isInteger(guests) ||
        guests < 1 ||
        guests > 20 ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 30 ||
        durationMinutes > 360 ||
        durationMinutes % 15
      )
        return json(400, { message: 'Provide valid booking availability details.' });
      await sql`select assert_booking_service_hours(${date}::date,${time}::time,${durationMinutes})`;
      const tables =
        await sql`select bt.id,bt.name,bt.seat_count as seats from booking_tables bt where bt.seat_count>=${guests} and not exists(select 1 from bookings b join booking_table_assignments bta on bta.booking_id=b.id where bta.table_id=bt.id and b.booking_date=${date}::date and b.status not in ('cancelled','no_show') and b.booking_time<(${time}::time+make_interval(mins=>${durationMinutes})) and (b.booking_time+make_interval(mins=>b.booking_duration_minutes))>${time}::time) order by bt.seat_count,bt.table_number`;
      return json(200, { tables });
    }
    if (url.pathname === '/api/diary/bookings' && req.method === 'POST') {
      const body = await readJson(req);
      const date = typeof body?.date === 'string' ? body.date : '';
      const time = typeof body?.time === 'string' ? body.time : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim().toLowerCase() : '';
      const experience =
        typeof body?.experience === 'string' && body.experience.trim()
          ? body.experience.trim()
          : 'Table';
      const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
      const dietaryNeeds = Array.isArray(body?.dietaryNeeds)
        ? body.dietaryNeeds
            .map((need) => (typeof need === 'string' ? need.trim() : ''))
            .filter(Boolean)
        : [];
      const tableIds = Array.isArray(body?.tableIds)
        ? body.tableIds.map(Number)
        : body?.tableId === null || body?.tableId === undefined || body?.tableId === ''
          ? []
          : [Number(body.tableId)];
      const guests = Number(body?.guests);
      const durationMinutes = Number(body?.durationMinutes);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        !/^\d{2}:\d{2}$/.test(time) ||
        !name ||
        name.length > 120 ||
        (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) ||
        contactEmail.length > 254 ||
        dietaryNeeds.some((need) => need.length > 100) ||
        !Number.isInteger(guests) ||
        guests < 1 ||
        guests > 20 ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 30 ||
        durationMinutes > 360 ||
        durationMinutes % 15 ||
        tableIds.length > 4 ||
        new Set(tableIds).size !== tableIds.length ||
        tableIds.some((tableId) => !Number.isSafeInteger(tableId) || tableId < 1)
      )
        return json(400, { message: 'Provide valid booking details.' });
      if (`${date}T${time}` <= londonDateTime())
        return json(409, { message: 'Bookings can only be created for a future time.' });
      const day = new Date(date + 'T12:00:00Z').getUTCDay();
      const hourKey = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][day];
      const [hours] =
        await sql`select opens_at,closes_at from opening_hours where parent_id='appointments' and map_key=${hourKey}`;
      await sql`select assert_booking_service_hours(${date}::date,${time}::time,${durationMinutes})`;
      const startMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      if (
        !hours ||
        startMinutes < Number(hours.opens_at) * 60 ||
        startMinutes + durationMinutes > Number(hours.closes_at) * 60
      )
        return json(409, {
          message: 'This booking falls outside the opening hours for the selected day.',
        });
      const booking = await sql.begin(async (transaction) => {
        const [matchedMember] = contactEmail
          ? await transaction`select id from members where lower(email)=${contactEmail} limit 1`
          : [];
        const [depositRule] = await transaction`select * from resolve_booking_deposit(${date}::date,${time}::time,${guests},'backoffice')`;
        const depositAmountPence = Number(depositRule?.amount_pence ?? 0);
        const depositStatus = depositAmountPence ? 'demo_paid' : 'none';
        const selected = (
          await transaction`select id,name,seat_count as seats from booking_tables order by table_number`
        ).filter((table) => tableIds.includes(table.id));
        if (selected.length !== tableIds.length)
          throw Object.assign(new Error('A suggested table is no longer available.'), {
            status: 409,
          });
        if (selected.reduce((total, table) => total + table.seats, 0) < guests)
          throw Object.assign(new Error('The selected tables do not have enough combined seats.'), {
            status: 409,
          });
        for (const table of selected) {
          const [conflict] =
            await transaction`select b.id from bookings b join booking_table_assignments bta on bta.booking_id=b.id where bta.table_id=${table.id} and b.booking_date=${date}::date and b.status not in ('cancelled','no_show') and b.booking_time < (${time}::time+make_interval(mins=>${durationMinutes})) and (b.booking_time+make_interval(mins=>b.booking_duration_minutes)) > ${time}::time limit 1`;
          if (conflict)
            throw Object.assign(new Error(`${table.name} is no longer available for this time.`), {
              status: 409,
            });
        }
        const [created] =
          await transaction`insert into bookings(member_id,booking_date,booking_time,guest_count,experience,contact_name,contact_email,notes,booking_duration_minutes,assigned_table_id,deposit_status,deposit_amount_pence) values(${matchedMember?.id ?? null},${date}::date,${time}::time,${guests},${experience},${name},${contactEmail || null},${notes || null},${durationMinutes},${selected[0]?.id ?? null},${depositStatus},${depositAmountPence}) returning id,booking_date::text as date,booking_time::text as time,guest_count as guests,contact_name as name,contact_email as "contactEmail",experience,status,deposit_status as "depositStatus",deposit_amount_pence as "depositAmountPence",booking_duration_minutes as "durationMinutes"`;
        for (const table of selected)
          await transaction`insert into booking_table_assignments(booking_id,table_id) values(${created.id},${table.id})`;
        await transaction`insert into booking_guests(booking_id,display_name,position) values(${created.id},${name},1)`;
        for (const [position, need] of dietaryNeeds.entries())
          await transaction`insert into booking_dietary_needs(booking_id,position,name) values(${created.id},${position},${need})`;
        if (matchedMember) await auditCustomer(transaction,matchedMember.id,'booking_created','booking',created.id,{ source:'backoffice' });
        return created;
      });
      return json(201, booking);
    }
    const bookingMatch = url.pathname.match(/^\/api\/diary\/bookings\/([0-9a-f-]{36})$/i);
    if (bookingMatch && req.method === 'PUT') {
      const body = await readJson(req);
      const date = typeof body?.date === 'string' ? body.date : '';
      const time = typeof body?.time === 'string' ? body.time : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail.trim().toLowerCase() : '';
      const experience =
        typeof body?.experience === 'string' && body.experience.trim()
          ? body.experience.trim()
          : 'Table';
      const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
      const dietaryNeeds = Array.isArray(body?.dietaryNeeds)
        ? body.dietaryNeeds
            .map((need) => (typeof need === 'string' ? need.trim() : ''))
            .filter(Boolean)
        : [];
      const guests = Number(body?.guests);
      const durationMinutes = Number(body?.durationMinutes);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        !/^\d{2}:\d{2}$/.test(time) ||
        !name ||
        name.length > 120 ||
        (contactEmail && !/^\S+@\S+\.\S+$/.test(contactEmail)) ||
        contactEmail.length > 254 ||
        dietaryNeeds.some((need) => need.length > 100) ||
        !Number.isInteger(guests) ||
        guests < 1 ||
        guests > 20 ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 30 ||
        durationMinutes > 360 ||
        durationMinutes % 15
      )
        return json(400, { message: 'Provide valid booking details.' });
      if (`${date}T${time}` <= londonDateTime())
        return json(409, { message: 'Bookings can only be moved to a future time.' });
      const day = new Date(date + 'T12:00:00Z').getUTCDay();
      const hourKey = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][day];
      const [hours] =
        await sql`select opens_at,closes_at from opening_hours where parent_id='appointments' and map_key=${hourKey}`;
      await sql`select assert_booking_service_hours(${date}::date,${time}::time,${durationMinutes})`;
      const startMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      if (
        !hours ||
        startMinutes < Number(hours.opens_at) * 60 ||
        startMinutes + durationMinutes > Number(hours.closes_at) * 60
      )
        return json(409, {
          message: 'This booking falls outside the opening hours for the selected day.',
        });
      try {
        const updated = await sql.begin(async (transaction) => {
          const [booking] =
            await transaction`select id,member_id from bookings where id=${bookingMatch[1]}::uuid for update`;
          if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          const assigned =
            await transaction`select bt.id,bt.name,bt.seat_count as seats from booking_table_assignments bta join booking_tables bt on bt.id=bta.table_id where bta.booking_id=${booking.id}`;
          if (assigned.length && assigned.reduce((total, table) => total + table.seats, 0) < guests)
            throw Object.assign(
              new Error(
                'The currently assigned table(s) do not have enough seats for this guest count. Change the table assignment first.',
              ),
              { status: 409 },
            );
          for (const table of assigned) {
            const [conflict] =
              await transaction`select b.id from bookings b join booking_table_assignments bta on bta.booking_id=b.id where bta.table_id=${table.id} and b.booking_date=${date}::date and b.status not in ('cancelled','no_show') and b.id<>${booking.id} and b.booking_time < (${time}::time+make_interval(mins=>${durationMinutes})) and (b.booking_time+make_interval(mins=>b.booking_duration_minutes)) > ${time}::time limit 1`;
            if (conflict)
              throw Object.assign(new Error(`${table.name} is already occupied for this time.`), {
                status: 409,
              });
          }
          const [saved] =
            await transaction`update bookings set booking_date=${date}::date,booking_time=${time}::time,guest_count=${guests},experience=${experience},contact_name=${name},contact_email=${contactEmail || null},notes=${notes || null},booking_duration_minutes=${durationMinutes},updated_at=now() where id=${booking.id} returning id,booking_date::text as date,booking_time::text as time,guest_count as guests,contact_name as name,contact_email as "contactEmail",experience,status,notes,booking_duration_minutes as "durationMinutes"`;
          await transaction`delete from booking_dietary_needs where booking_id=${booking.id}`;
          for (const [position, need] of dietaryNeeds.entries())
            await transaction`insert into booking_dietary_needs(booking_id,position,name) values(${booking.id},${position},${need})`;
          await transaction`update booking_guests set display_name=${name} where id=(select id from booking_guests where booking_id=${booking.id} order by position,id limit 1)`;
          if (booking.member_id) await auditCustomer(transaction,booking.member_id,'booking_updated','booking',booking.id,{ source:'backoffice' });
          return saved;
        });
        return json(200, updated);
      } catch (error) {
        return json(error.code === 'P1001' ? 409 : (error.status ?? 500), {
          message: error.message ?? 'Unable to save this booking.',
        });
      }
    }
    const attendanceMatch=url.pathname.match(/^\/api\/diary\/bookings\/([0-9a-f-]{36})\/status$/i);
    if(attendanceMatch&&req.method==='POST'){
      const body=await readJson(req),target=['confirmed','arrived','seated','completed','no_show'].includes(body?.status)?body.status:'',reason=typeof body?.reason==='string'?body.reason.trim().slice(0,500):'';
      if(!target)return json(400,{message:'Choose a valid attendance status.'});
      const [booking]=await sql.begin(async transaction=>{
        const [current]=await transaction`select id,member_id,status,deposit_status,deposit_amount_pence from bookings where id=${attendanceMatch[1]}::uuid for update`;
        if(!current)throw Object.assign(new Error('Booking not found.'),{status:404});
        if(current.status==='cancelled')throw Object.assign(new Error('A cancelled booking cannot be changed to an attendance status.'),{status:409});
        if(current.status===target)throw Object.assign(new Error(`Booking is already ${target.replaceAll('_',' ')}.`),{status:409});
        const reversing=current.status==='no_show'&&target==='confirmed';
        if((target==='no_show'||reversing)&&!reason)throw Object.assign(new Error(reversing?'Enter a reason for reversing the no-show.':'Enter a reason or contact outcome for the no-show.'),{status:400});
        if(current.status==='no_show'&&!reversing)throw Object.assign(new Error('Reverse the no-show before choosing another attendance status.'),{status:409});
        if(target==='confirmed'&&!reversing)throw Object.assign(new Error('Only a no-show can be restored to confirmed.'),{status:409});
        const outcome=target==='no_show'&&current.deposit_status==='demo_paid'?'retained':null;
        const [saved]=await transaction`update bookings set status=${target},cancellation_outcome=coalesce(${outcome},cancellation_outcome),updated_at=now() where id=${current.id} returning id,status,deposit_status as "depositStatus",deposit_amount_pence as "depositAmountPence",cancellation_outcome as "cancellationOutcome"`;
        await transaction`insert into booking_status_events(booking_id,member_id,from_status,to_status,reason,actor_user_id) values(${current.id},${current.member_id},${current.status},${target},${reason||null},${currentUser.id})`;
        if(current.member_id)await auditCustomer(transaction,current.member_id,reversing?'booking_no_show_reversed':`booking_${target}`,'booking',current.id,{fromStatus:current.status,toStatus:target,reason:reason||null,depositOutcome:outcome});
        return [saved];
      });
      return json(200,{booking});
    }
    const reminderMatch=url.pathname.match(/^\/api\/diary\/bookings\/([0-9a-f-]{36})\/reminder$/i);
    if(reminderMatch&&req.method==='POST'){
      const body=await readJson(req),channel=['email','sms','push'].includes(body?.channel)?body.channel:'email';
      const [reminder]=await sql.begin(async transaction=>{
        const [booking]=await transaction`select id,member_id,status,contact_name,contact_email,booking_date::text as date,booking_time::text as time,guest_count from bookings where id=${reminderMatch[1]}::uuid`;
        if(!booking)throw Object.assign(new Error('Booking not found.'),{status:404});
        if(['cancelled','completed','no_show'].includes(booking.status))throw Object.assign(new Error('Reminders can only be sent for an active booking.'),{status:409});
        if(channel==='email'&&!booking.contact_email)throw Object.assign(new Error('This booking has no email address.'),{status:409});
        const [template]=await transaction`select id,channel,category,subject,body from communication_templates where template_key='booking-reminder' and active=true`;
        if(!template)throw Object.assign(new Error('The booking reminder template is unavailable.'),{status:409});
        const variables={guestName:booking.contact_name,guestCount:String(booking.guest_count),venueName:'Quicken Tree',bookingDate:new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-GB',{dateStyle:'long'}),bookingTime:booking.time.slice(0,5)};
        await transaction`insert into communication_deliveries(template_id,member_id,booking_id,channel,category,recipient,subject,body,status,sent_at,delivered_at,provider,initiated_by,metadata) values(${template.id},${booking.member_id},${booking.id},${channel},${template.category},${booking.contact_email},${renderCommunication(template.subject,variables)||null},${renderCommunication(template.body,variables)},'delivered',now(),now(),'demo',${currentUser.id},${transaction.json({variables,source:'booking_reminder'})})`;
        const [created]=await transaction`insert into booking_reminder_events(booking_id,channel,status,initiated_by,delivered_at) values(${booking.id},${channel},'delivered',${currentUser.id},now()) returning id,channel,status,created_at as "createdAt",delivered_at as "deliveredAt"`;
        if(booking.member_id)await auditCustomer(transaction,booking.member_id,'booking_reminder_sent','booking',booking.id,{channel,status:'delivered',deliveryMode:'demo'});
        return [created];
      });
      return json(201,{reminder,deliveryMode:'demo'});
    }
    const protectionMatch=url.pathname.match(/^\/api\/diary\/bookings\/([0-9a-f-]{36})\/protection$/i);
    if(protectionMatch&&req.method==='PUT'){
      const body=await readJson(req),depositStatus=['none','demo_required','demo_paid','demo_card_guarantee','demo_refunded'].includes(body?.depositStatus)?body.depositStatus:null,amount=body?.depositAmountPence===undefined?null:Number(body.depositAmountPence);
      if(!depositStatus)return json(400,{message:'Choose a valid booking protection update.'});
      if(amount!==null&&(!Number.isInteger(amount)||amount<0||amount>1000000))return json(400,{message:'Enter a valid deposit amount.'});
      const [booking]=await sql.begin(async transaction=>{
        const [saved]=await transaction`update bookings set deposit_status=coalesce(${depositStatus},deposit_status),deposit_amount_pence=case when ${depositStatus}='none' then 0 else coalesce(${amount},deposit_amount_pence) end,updated_at=now() where id=${protectionMatch[1]} returning id,member_id,deposit_status as "depositStatus",deposit_amount_pence as "depositAmountPence",status,cancellation_outcome as "cancellationOutcome"`;
        if(!saved)throw Object.assign(new Error('Booking not found.'),{status:404});
        if(saved.member_id)await auditCustomer(transaction,saved.member_id,'booking_protection_updated','booking',saved.id,{depositStatus:saved.depositStatus,depositAmountPence:saved.depositAmountPence,status:saved.status,cancellationOutcome:saved.cancellationOutcome});
        return [saved];
      });
      return json(200,{booking});
    }
    const cancelBookingMatch = url.pathname.match(
      /^\/api\/diary\/bookings\/([0-9a-f-]{36})\/cancel$/i,
    );
    if (cancelBookingMatch && req.method === 'POST') {
      const body = await readJson(req);
      const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : '';
      const booking = await sql.begin(async (transaction) => {
        const [current] = await transaction`select id,member_id,booking_date,booking_time,deposit_status,deposit_amount_pence from bookings where id=${cancelBookingMatch[1]}::uuid and status<>'cancelled' for update`;
        if (!current) return null;
        const [policy] = await transaction`select integer_value as hours from booking_system_settings where setting_key='free_cancellation_hours'`;
        const [timing] = await transaction`select now() >= (${current.booking_date}::date+${current.booking_time}::time-make_interval(hours=>${Number(policy?.hours ?? 24)})) as late`;
        const outcome = current.deposit_status === 'demo_paid' ? (timing.late ? 'retained' : 'refunded') : 'not_applicable';
        const depositStatus = outcome === 'refunded' ? 'demo_refunded' : current.deposit_status;
        const [saved] = await transaction`update bookings set status='cancelled',deposit_status=${depositStatus},cancelled_at=now(),cancellation_source='staff',cancellation_reason=${reason || null},cancellation_outcome=${outcome},updated_at=now() where id=${current.id} returning id,status,deposit_status as "depositStatus",deposit_amount_pence as "depositAmountPence",cancellation_outcome as "cancellationOutcome"`;
        if (current.member_id) await auditCustomer(transaction,current.member_id,'booking_cancelled','booking',current.id,{source:'staff',reason:reason || null,outcome,depositStatus});
        return saved;
      });
      return booking ? json(200, booking) : json(404, { message: 'Active booking not found.' });
    }
    if(url.pathname==='/api/attendance-settings'&&req.method==='GET'){
      const rows=await sql`select setting_key,integer_value from booking_system_settings where setting_key in ('booking_reminder_first_hours','booking_reminder_final_hours')`;
      const values=Object.fromEntries(rows.map(row=>[row.setting_key,Number(row.integer_value)]));
      return json(200,{firstReminderHours:values.booking_reminder_first_hours??24,finalReminderHours:values.booking_reminder_final_hours??2,deliveryMode:'demo'});
    }
    if(url.pathname==='/api/attendance-settings'&&req.method==='PUT'){
      const body=await readJson(req),first=Number(body?.firstReminderHours),final=Number(body?.finalReminderHours);
      if(!Number.isInteger(first)||first<1||first>168||!Number.isInteger(final)||final<1||final>48||final>=first)return json(400,{message:'Set a first reminder from 1 to 168 hours and a smaller final reminder from 1 to 48 hours.'});
      await sql.begin(async transaction=>{await transaction`insert into booking_system_settings(setting_key,integer_value) values('booking_reminder_first_hours',${first}) on conflict(setting_key) do update set integer_value=excluded.integer_value`;await transaction`insert into booking_system_settings(setting_key,integer_value) values('booking_reminder_final_hours',${final}) on conflict(setting_key) do update set integer_value=excluded.integer_value`;});
      return json(200,{firstReminderHours:first,finalReminderHours:final,deliveryMode:'demo'});
    }
    if(url.pathname==='/api/communications'&&req.method==='GET'){
      const [templates,deliveries]=await Promise.all([
        sql`select id,template_key as "templateKey",name,channel,category,subject,body,active,created_at as "createdAt",updated_at as "updatedAt" from communication_templates order by category,channel,name`,
        sql`select d.id,t.name as "templateName",d.channel,d.category,d.recipient,d.status,d.provider,d.failure_reason as "failureReason",d.created_at as "createdAt",d.delivered_at as "deliveredAt" from communication_deliveries d left join communication_templates t on t.id=d.template_id order by d.created_at desc limit 250`,
      ]);
      return json(200,{templates,deliveries,provider:'demo'});
    }
    if(url.pathname==='/api/communications/templates'&&req.method==='POST'){
      const body=await readJson(req),name=typeof body?.name==='string'?body.name.trim():'New message template',channel=['email','sms','push'].includes(body?.channel)?body.channel:'email',category=['transactional','marketing'].includes(body?.category)?body.category:'transactional',templateKey=`custom-${randomUUID()}`;
      const [template]=await sql`insert into communication_templates(template_key,name,channel,category,subject,body) values(${templateKey},${name.slice(0,100)},${channel},${category},${channel==='sms'?null:'New message'},'Hi {{guestName}},') returning id,template_key as "templateKey",name,channel,category,subject,body,active`;
      return json(201,{template});
    }
    const communicationTemplateMatch=url.pathname.match(/^\/api\/communications\/templates\/([0-9a-f-]{36})$/i);
    if(communicationTemplateMatch&&req.method==='PUT'){
      const body=await readJson(req),name=typeof body?.name==='string'?body.name.trim():'',channel=['email','sms','push'].includes(body?.channel)?body.channel:'',category=['transactional','marketing'].includes(body?.category)?body.category:'',subject=typeof body?.subject==='string'?body.subject.trim():'',messageBody=typeof body?.body==='string'?body.body.trim():'';
      if(!name||name.length>100||!channel||!category||!messageBody||messageBody.length>4000||subject.length>200)return json(400,{message:'Provide a valid template name, channel, type and message.'});
      const [template]=await sql`update communication_templates set name=${name},channel=${channel},category=${category},subject=${channel==='sms'?null:subject||null},body=${messageBody},active=${body?.active!==false},updated_at=now() where id=${communicationTemplateMatch[1]} returning id,template_key as "templateKey",name,channel,category,subject,body,active`;
      return template?json(200,{template}):json(404,{message:'Template not found.'});
    }
    if(url.pathname==='/api/communications/test'&&req.method==='POST'){
      const body=await readJson(req),recipient=typeof body?.recipient==='string'?body.recipient.trim():'';
      if(!recipient||recipient.length>254||!/^[0-9a-f-]{36}$/i.test(body?.templateId||''))return json(400,{message:'Choose a template and enter a test recipient.'});
      const [template]=await sql`select id,name,channel,category,subject,body,active from communication_templates where id=${body.templateId}::uuid`;
      if(!template)return json(404,{message:'Template not found.'});
      if(!template.active)return json(409,{message:'Activate the template before sending it.'});
      const [member]=template.channel==='email'?await sql`select id from members where lower(email)=lower(${recipient}) limit 1`:template.channel==='sms'?await sql`select id from members where phone=${recipient} limit 1`:[];
      const [consent]=member&&template.category==='marketing'?await sql`select status from customer_consents where member_id=${member.id} and channel=${template.channel} and purpose='marketing'`:[];
      const status=template.category==='marketing'&&consent?.status!=='opted_in'?'suppressed':'delivered';
      const variables={guestName:'Carl Fearby',guestCount:'4',venueName:'Quicken Tree',bookingDate:'30 September 2026',bookingTime:'19:00',rewardName:'Complimentary coffee',expiryDate:'31 October 2026'};
      const [delivery]=await sql`insert into communication_deliveries(template_id,member_id,channel,category,recipient,subject,body,status,sent_at,delivered_at,failure_reason,provider,initiated_by,metadata) values(${template.id},${member?.id??null},${template.channel},${template.category},${recipient},${renderCommunication(template.subject,variables)||null},${renderCommunication(template.body,variables)},${status},${status==='delivered'?new Date():null},${status==='delivered'?new Date():null},${status==='suppressed'?'Marketing consent is not opted in.':null},'demo',${currentUser.id},${sql.json({test:true,variables})}) returning id,status,channel,category,recipient,provider,created_at as "createdAt"`;
      if(member)await auditCustomer(sql,member.id,status==='suppressed'?'communication_suppressed':'communication_delivered','communication_delivery',delivery.id,{template:template.name,channel:template.channel,status,test:true});
      return json(201,{delivery});
    }
    const retryCommunicationMatch=url.pathname.match(/^\/api\/communications\/deliveries\/([0-9a-f-]{36})\/retry$/i);
    if(retryCommunicationMatch&&req.method==='POST'){
      const [delivery]=await sql`update communication_deliveries set status='delivered',failure_reason=null,sent_at=now(),delivered_at=now(),provider='demo' where id=${retryCommunicationMatch[1]} and status in ('failed','queued') returning id,status,delivered_at as "deliveredAt"`;
      return delivery?json(200,{delivery}):json(409,{message:'Only failed or queued messages can be retried.'});
    }
    if (url.pathname === '/api/opening-hours' && req.method === 'GET') {
      const hours =
        await sql`select o.map_key as "day",o.opens_at as open,o.closes_at as close,coalesce(k.opens_at,o.opens_at) as "kitchenOpen",k.closes_at as "kitchenClose" from opening_hours o join kitchen_hours k on k.day=o.map_key where o.parent_id='appointments' order by o.position`;
      return json(200, {
        hours: hours.map((hour) => ({
          ...hour,
          open: Number(hour.open),
          close: Number(hour.close),
          kitchenOpen: Number(hour.kitchenOpen),
          kitchenClose: Number(hour.kitchenClose),
        })),
      });
    }
    if (url.pathname === '/api/opening-hours' && req.method === 'PUT') {
      const body = await readJson(req, 16384);
      const hours = body?.hours;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (
        !Array.isArray(hours) ||
        hours.length !== 7 ||
        hours.some(
          (hour) =>
            !days.includes(hour?.day) ||
            !Number.isFinite(hour?.open) ||
            !Number.isFinite(hour?.close) ||
            !Number.isFinite(hour?.kitchenOpen) ||
            hour.open < 0 ||
            hour.open > 24 ||
            hour.close <= hour.open ||
            hour.close > 24 ||
            hour.kitchenOpen < hour.open ||
            hour.kitchenOpen >= hour.kitchenClose ||
            !Number.isFinite(hour.kitchenClose) ||
            hour.kitchenClose <= hour.kitchenOpen ||
            hour.kitchenClose > hour.close ||
            !Number.isInteger(hour.open * 2) ||
            !Number.isInteger(hour.close * 2) ||
            !Number.isInteger(hour.kitchenOpen * 2) ||
            !Number.isInteger(hour.kitchenClose * 2),
        )
      )
        return json(400, {
          message:
            'Provide valid opening and kitchen hours for every day. Kitchen hours must be within venue hours, and kitchen close must be after kitchen open.',
        });
      if (new Set(hours.map((hour) => hour.day)).size !== 7)
        return json(400, { message: 'Each day needs one opening-hours record.' });
      await sql.begin(async (transaction) => {
        for (const [position, day] of days.entries()) {
          const hour = hours.find((value) => value.day === day);
          await transaction`update kitchen_hours set opens_at=${hour.kitchenOpen},closes_at=${hour.kitchenClose} where day=${day}`;
          await transaction`update opening_hours set position=${position},opens_at=${hour.open},closes_at=${hour.close} where parent_id='appointments' and map_key=${day}`;
        }
      });
      return json(200, { hours: days.map((day) => hours.find((hour) => hour.day === day)) });
    }
    if (url.pathname === '/api/booking-settings' && req.method === 'GET') {
      const tables = await sql`select id,name,seat_count as seats from booking_tables order by table_number`;
      const [setting] = await sql`select integer_value as "defaultDurationMinutes" from booking_system_settings where setting_key='default_booking_duration_minutes'`;
      const [cancellationSetting] = await sql`select integer_value as "cancellationCutoffHours" from booking_system_settings where setting_key='free_cancellation_hours'`;
      return json(200, {
        tables,
        defaultDurationMinutes: Number(setting?.defaultDurationMinutes ?? 90),
        cancellationCutoffHours: Number(cancellationSetting?.cancellationCutoffHours ?? 24),
      });
    }
    if (url.pathname === '/api/deposit-rules' && req.method === 'GET') {
      const [setting] = await sql`select integer_value from booking_system_settings where setting_key='deposits_enabled'`;
      const rules = await sql`select id,name,active,channel,min_party_size as "minPartySize",max_party_size as "maxPartySize",days,starts_at::text as "startsAt",ends_at::text as "endsAt",amount_pence as "amountPence",priority from booking_deposit_rules order by priority desc,created_at,id`;
      return json(200,{enabled:Number(setting?.integer_value??1)===1,rules:rules.map(rule=>({...rule,startsAt:rule.startsAt.slice(0,5),endsAt:rule.endsAt.slice(0,5)}))});
    }
    if (url.pathname === '/api/deposit-rules' && req.method === 'PUT') {
      if (!hasPermission('configuration.deposits')) return json(403,{message:'Deposit rules access required.'});
      const body=await readJson(req,65536),rules=body?.rules;
      if(typeof body?.enabled!=='boolean'||!Array.isArray(rules)||rules.length>50)return json(400,{message:'Provide valid deposit rules.'});
      const valid=rules.every(rule=>typeof rule?.name==='string'&&rule.name.trim().length>0&&rule.name.trim().length<=100&&typeof rule.active==='boolean'&&['app','backoffice','both'].includes(rule.channel)&&Number.isInteger(rule.minPartySize)&&rule.minPartySize>=1&&rule.minPartySize<=20&&(rule.maxPartySize===null||(Number.isInteger(rule.maxPartySize)&&rule.maxPartySize>=rule.minPartySize&&rule.maxPartySize<=20))&&Array.isArray(rule.days)&&rule.days.length>0&&rule.days.every(day=>Number.isInteger(day)&&day>=0&&day<=6)&&/^\d{2}:\d{2}$/.test(rule.startsAt)&&/^\d{2}:\d{2}$/.test(rule.endsAt)&&rule.startsAt<=rule.endsAt&&Number.isInteger(rule.amountPence)&&rule.amountPence>=0&&rule.amountPence<=100000&&Number.isInteger(rule.priority));
      if(!valid)return json(400,{message:'Check each rule has a name, source, guest range, day, time range and valid amount.'});
      await sql.begin(async transaction=>{await transaction`insert into booking_system_settings(setting_key,integer_value) values('deposits_enabled',${body.enabled?1:0}) on conflict(setting_key) do update set integer_value=excluded.integer_value`;await transaction`delete from booking_deposit_rules`;for(const rule of rules)await transaction`insert into booking_deposit_rules(name,active,channel,min_party_size,max_party_size,days,starts_at,ends_at,amount_pence,priority) values(${rule.name.trim()},${rule.active},${rule.channel},${rule.minPartySize},${rule.maxPartySize},${rule.days},${rule.startsAt}::time,${rule.endsAt}::time,${rule.amountPence},${rule.priority})`;});
      const saved=await sql`select id,name,active,channel,min_party_size as "minPartySize",max_party_size as "maxPartySize",days,starts_at::text as "startsAt",ends_at::text as "endsAt",amount_pence as "amountPence",priority from booking_deposit_rules order by priority desc,created_at,id`;
      return json(200,{enabled:body.enabled,rules:saved.map(rule=>({...rule,startsAt:rule.startsAt.slice(0,5),endsAt:rule.endsAt.slice(0,5)}))});
    }
    if (url.pathname === '/api/deposit-quote' && req.method === 'GET') {
      const date=url.searchParams.get('date')||'',time=url.searchParams.get('time')||'',guests=Number(url.searchParams.get('guests')),source=url.searchParams.get('source')==='app'?'app':'backoffice';
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||!Number.isInteger(guests)||guests<1||guests>20)return json(400,{message:'Provide valid booking criteria.'});
      const [rule]=await sql`select * from resolve_booking_deposit(${date}::date,${time}::time,${guests},${source})`;
      return json(200,{required:Boolean(rule),amountPence:Number(rule?.amount_pence??0),ruleId:rule?.rule_id??null,ruleName:rule?.rule_name??null});
    }
    if (url.pathname === '/api/booking-settings' && req.method === 'PUT') {
      const body = await readJson(req);
      if (body?.cancellationCutoffHours !== undefined) {
        if (!hasPermission('configuration.cancellation')) return json(403,{message:'Cancellation policy access required.'});
        const hours = Number(body.cancellationCutoffHours);
        if (!Number.isInteger(hours) || hours < 0 || hours > 168)
          return json(400, { message: 'Choose a cancellation window from 0 to 168 hours.' });
        await sql`insert into booking_system_settings(setting_key,integer_value) values('free_cancellation_hours',${hours}) on conflict(setting_key) do update set integer_value=excluded.integer_value`;
        return json(200, { cancellationCutoffHours: hours });
      }
      const minutes = Number(body?.defaultDurationMinutes);
      if (!hasPermission('configuration.duration')) return json(403,{message:'Booking duration access required.'});
      if (!Number.isInteger(minutes) || minutes < 30 || minutes > 360 || minutes % 15)
        return json(400, {
          message: 'Choose a booking duration from 30 minutes to 6 hours, in 15-minute steps.',
        });
      await sql`insert into booking_system_settings(setting_key,integer_value) values('default_booking_duration_minutes',${minutes}) on conflict(setting_key) do update set integer_value=excluded.integer_value`;
      return json(200, { defaultDurationMinutes: minutes });
    }
    const bookingAssignmentMatch = url.pathname.match(
      /^\/api\/diary\/bookings\/([0-9a-f-]{36})\/assignment$/i,
    );
    if (bookingAssignmentMatch && req.method === 'PUT') {
      const body = await readJson(req);
      const tableId = body?.tableId === null ? null : Number(body?.tableId);
      if (tableId !== null && (!Number.isSafeInteger(tableId) || tableId < 1))
        return json(400, { message: 'Choose a valid table.' });
      try {
        const assignment = await sql.begin(async (transaction) => {
          const [booking] =
            await transaction`select id,booking_date,booking_time,guest_count,booking_duration_minutes from bookings where id=${bookingAssignmentMatch[1]}::uuid for update`;
          if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          const durationMinutes =
            body?.durationMinutes === undefined
              ? booking.booking_duration_minutes
              : Number(body.durationMinutes);
          if (
            !Number.isInteger(durationMinutes) ||
            durationMinutes < 30 ||
            durationMinutes > 360 ||
            durationMinutes % 15
          )
            throw Object.assign(
              new Error('Choose a booking length from 30 minutes to 6 hours, in 15-minute steps.'),
              { status: 400 },
            );
          if (tableId === null) {
            await transaction`delete from booking_table_assignments where booking_id=${booking.id}`;
            await transaction`update bookings set assigned_table_id=null,booking_duration_minutes=${durationMinutes},updated_at=now() where id=${booking.id}`;
            return { tableId: null, tableName: null, durationMinutes };
          }
          const [table] =
            await transaction`select id,name,seat_count as seats from booking_tables where id=${tableId}`;
          if (!table) throw Object.assign(new Error('Table not found.'), { status: 404 });
          if (table.seats < booking.guest_count)
            throw Object.assign(
              new Error(
                `${table.name} has ${table.seats} seats, but this booking needs ${booking.guest_count}.`,
              ),
              { status: 409 },
            );
          const [conflict] =
            await transaction`select b.id from bookings b join booking_table_assignments bta on bta.booking_id=b.id where bta.table_id=${tableId} and b.booking_date=${booking.booking_date} and b.status not in ('cancelled','no_show') and b.id<>${booking.id} and b.booking_time < (${booking.booking_time}+make_interval(mins=>${durationMinutes})) and (b.booking_time+make_interval(mins=>b.booking_duration_minutes)) > ${booking.booking_time} limit 1`;
          if (conflict)
            throw Object.assign(
              new Error(`${table.name} is already occupied for this booking time.`),
              { status: 409 },
            );
          await transaction`delete from booking_table_assignments where booking_id=${booking.id}`;
          await transaction`insert into booking_table_assignments(booking_id,table_id) values(${booking.id},${tableId})`;
          await transaction`update bookings set assigned_table_id=${tableId},booking_duration_minutes=${durationMinutes},updated_at=now() where id=${booking.id}`;
          return { tableId: table.id, tableName: table.name, durationMinutes };
        });
        return json(200, assignment);
      } catch (error) {
        return json(error.code === 'P1001' ? 409 : (error.status ?? 500), {
          message: error.message ?? 'Unable to assign this table.',
        });
      }
    }
    const bookingTableMatch = url.pathname.match(/^\/api\/booking-tables\/(\d+)$/);
    if (url.pathname === '/api/booking-tables' && req.method === 'PUT') {
      const body = await readJson(req, 65536);
      const tables = body?.tables;
      if (!Array.isArray(tables) || tables.length > 100)
        return json(400, { message: 'Provide up to 100 tables.' });
      const normalised = tables.map((table) => ({
        id: table?.id === null || table?.id === undefined ? null : Number(table.id),
        number: Number(table?.number),
        seats: Number(table?.seats),
      }));
      if (
        normalised.some(
          (table) =>
            (table.id !== null && (!Number.isSafeInteger(table.id) || table.id < 1)) ||
            !Number.isInteger(table.number) ||
            table.number < 1 ||
            table.number > 2147483647 ||
            !Number.isInteger(table.seats) ||
            table.seats < 2 ||
            table.seats > 10,
        )
      )
        return json(400, { message: 'Every table needs a unique positive number and 2–10 seats.' });
      if (new Set(normalised.map((table) => table.number)).size !== normalised.length)
        return json(400, { message: 'Table numbers must be unique.' });
      try {
        const saved = await sql.begin(async (transaction) => {
          const current = await transaction`select id from booking_tables order by id`;
          const currentIds = new Set(current.map((table) => table.id));
          const suppliedIds = normalised
            .filter((table) => table.id !== null)
            .map((table) => table.id);
          if (
            new Set(suppliedIds).size !== suppliedIds.length ||
            suppliedIds.some((id) => !currentIds.has(id))
          )
            throw Object.assign(
              new Error('The table list is out of date. Refresh and try again.'),
              { status: 409 },
            );
          const removed = current.filter((table) => !suppliedIds.includes(table.id));
          // Move existing rows out of the way first, so swapping two table numbers is valid.
          for (const [index, table] of normalised.entries())
            if (table.id !== null)
              await transaction`update booking_tables set table_number=${2000000000 + index} where id=${table.id}`;
          for (const table of removed)
            await transaction`delete from booking_tables where id=${table.id}`;
          for (const table of normalised) {
            const name = 'Table ' + table.number;
            if (table.id === null)
              await transaction`insert into booking_tables(name,table_number,seat_count) values(${name},${table.number},${table.seats})`;
            else
              await transaction`update booking_tables set name=${name},table_number=${table.number},seat_count=${table.seats} where id=${table.id}`;
          }
          return transaction`select id,name,table_number as number,seat_count as seats from booking_tables order by table_number`;
        });
        return json(200, { tables: saved });
      } catch (error) {
        if (error.code === '23505')
          return json(409, { message: 'That table number is already in use.' });
        if (error.code === '23503')
          return json(409, { message: 'A table with bookings cannot be removed.' });
        throw error;
      }
    }
    if (
      (url.pathname === '/api/booking-tables' && req.method === 'POST') ||
      (bookingTableMatch && ['PUT', 'DELETE'].includes(req.method))
    ) {
      const id = bookingTableMatch ? Number(bookingTableMatch[1]) : null;
      if (id !== null && (!Number.isSafeInteger(id) || id < 1 || id > 2147483647))
        return json(400, { message: 'Invalid table ID.' });
      try {
        if (req.method === 'DELETE') {
          const [table] = await sql`delete from booking_tables where id=${id} returning id`;
          return table ? json(200, table) : json(404, { message: 'Booking table not found.' });
        }
        const body = await readJson(req);
        if (!body || !Number.isInteger(body.seats) || body.seats < 2 || body.seats > 10)
          return json(400, { message: 'Seat count must be a whole number from 2 to 10.' });
        if (!Number.isInteger(body.number) || body.number < 1 || body.number > 2147483647)
          return json(400, { message: 'Enter a positive whole table number.' });
        const name = 'Table ' + body.number;
        const [table] =
          req.method === 'POST'
            ? await sql`insert into booking_tables(name,table_number,seat_count) values(${name},${body.number},${body.seats}) returning id,name,table_number as number,seat_count as seats`
            : await sql`update booking_tables set name=${name},table_number=${body.number},seat_count=${body.seats} where id=${id} returning id,name,table_number as number,seat_count as seats`;
        return table
          ? json(req.method === 'POST' ? 201 : 200, table)
          : json(404, { message: 'Booking table not found.' });
      } catch (error) {
        if (error.code === '23505')
          return json(409, { message: 'That table number is already in use.' });
        if (error.code === '23503')
          return json(409, { message: 'This table is in use and cannot be removed.' });
        throw error;
      }
    }
    if (url.pathname === '/api/tables' && req.method === 'GET') {
      const tables =
        await sql`select tablename as name from pg_tables where schemaname='public' order by tablename`;
      for (const table of tables) {
        const [row] = await sql.unsafe(
          `SELECT count(*)::text AS count FROM public.${quote(table.name)}`,
        );
        table.count = row.count;
      }
      return json(200, {
        database: activeDatabaseInfo().database,
        schema: 'public',
        tables,
      });
    }
    if (url.pathname === '/api/menu' && req.method === 'GET') {
      const menus = await sql`select id,map_key as name,position from menus order by position`;
      const sections =
        await sql`select id,parent_id as "menuId",title,position from menu_sections order by parent_id,position`;
      const items =
        await sql`select items.id,items.parent_id as "sectionId",items.name,items.description,items.price_label as "priceLabel",items.position,images.image_data as "imageData" from menu_items items left join menu_item_images images on images.map_key=items.name order by items.parent_id,items.position`;
      const dietaryTags =
        await sql`select labels.map_key as "itemName",tags.tag_code as "tagCode",definitions.label from menu_item_dietary_labels labels join menu_item_dietary_tags tags on tags.parent_id=labels.id left join dietary_tags definitions on definitions.map_key=tags.tag_code order by labels.position,tags.position`;
      const dietaryTagDefinitions =
        await sql`select map_key as code,label from dietary_tags order by position,map_key`;
      const allergenTags =
        (await sql`select labels.map_key as "itemName",allergens.allergen_code as code,definitions.label from menu_item_allergen_labels labels join menu_item_allergens allergens on allergens.parent_id=labels.id left join allergen_tags definitions on definitions.map_key=allergens.allergen_code order by labels.position,allergens.position`).map(
          (tag) => ({ ...tag, ...allergenPresentation[tag.code] }),
        );
      const allergenDefinitions =
        (await sql`select map_key as code,label from allergen_tags order by position,map_key`).map(
          (definition) => ({ ...definition, ...allergenPresentation[definition.code] }),
        );
      const unavailableItems =
        await sql`select item_name as "itemName" from menu_unavailable_items order by position`;
      const optionRows =
        await sql`select sets.map_key as "itemName",groups.id as "groupId",groups.label as "groupLabel",groups.min_selections as "minSelections",groups.max_selections as "maxSelections",groups.position as "groupPosition",options.label as "optionLabel",options.price_delta_pence as "priceDeltaPence",options.position as "optionPosition" from menu_item_option_sets sets join menu_item_option_groups groups on groups.parent_id=sets.id join menu_item_options options on options.parent_id=groups.id order by sets.map_key,groups.position,options.position`;
      const itemOptions = Object.values(optionRows.reduce((sets, row) => {
        const set = (sets[row.itemName] ??= { itemName: row.itemName, groups: [] });
        let group = set.groups.find((entry) => entry.id === row.groupId);
        if (!group) {
          group = { id: row.groupId, label: row.groupLabel, minSelections: row.minSelections, maxSelections: row.maxSelections, options: [] };
          set.groups.push(group);
        }
        group.options.push({ label: row.optionLabel, priceDeltaPence: row.priceDeltaPence });
        return sets;
      }, {}));
      const categories =
        await sql`select id,label,menu_name as "menuName",service_name as "serviceName",sections_present as "sectionsPresent",position from menu_categories order by position`;
      const categorySections =
        await sql`select parent_id as "categoryId",section_position as "sectionPosition",position from menu_category_sections order by parent_id,position`;
      return json(200, {
        menus,
        sections,
        items,
        dietaryTags,
        dietaryTagDefinitions,
        allergenTags,
        allergenDefinitions,
        unavailableItems,
        itemOptions,
        categories,
        categorySections,
      });
    }
    if (url.pathname === '/api/menu-tags' && req.method === 'GET') {
      const dietaryTags =
        await sql`select tags.map_key as code,tags.label,coalesce(usage.count,0)::int as "usageCount" from dietary_tags tags left join (select tag_code,count(*)::int from menu_item_dietary_tags group by tag_code) usage on usage.tag_code=tags.map_key order by tags.position,tags.map_key`;
      const allergenTags =
        await sql`select tags.map_key as code,tags.label,coalesce(styles.color,'') as color,coalesce(styles.icon,'') as icon,coalesce(usage.count,0)::int as "usageCount" from allergen_tags tags left join allergen_tag_styles styles on styles.map_key=tags.map_key left join (select allergen_code,count(*)::int from menu_item_allergens group by allergen_code) usage on usage.allergen_code=tags.map_key order by tags.position,tags.map_key`;
      return json(200, { dietaryTags, allergenTags });
    }
    if (url.pathname === '/api/menu-tags' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      const body = await readJson(req, 32768);
      const dietaryTags = tagDefinitions(body, 'dietaryTags');
      const allergenTags = tagDefinitions(body, 'allergenTags');
      const currentDietaryUsage =
        await sql`select tag_code as code,count(*)::int as count from menu_item_dietary_tags group by tag_code`;
      const currentAllergenUsage =
        await sql`select allergen_code as code,count(*)::int as count from menu_item_allergens group by allergen_code`;
      const nextDietaryCodes = new Set(dietaryTags.map((tag) => tag.code));
      const nextAllergenCodes = new Set(allergenTags.map((tag) => tag.code));
      const blockedDietary = currentDietaryUsage.filter((tag) => tag.count > 0 && !nextDietaryCodes.has(tag.code));
      const blockedAllergens = currentAllergenUsage.filter((tag) => tag.count > 0 && !nextAllergenCodes.has(tag.code));
      if (blockedDietary.length || blockedAllergens.length)
        return json(400, {
          message: `Cannot remove symbols assigned to dishes: ${[...blockedDietary, ...blockedAllergens].map((tag) => tag.code).join(', ')}.`,
        });
      await sql.begin(async (transaction) => {
        await transaction`delete from dietary_tags where parent_id='menu'`;
        for (const [position, tag] of dietaryTags.entries())
          await transaction`insert into dietary_tags(id,parent_id,position,map_key,label) values(${randomUUID()},'menu',${position},${tag.code},${tag.label})`;
        await transaction`delete from allergen_tags where parent_id='menu'`;
        await transaction`delete from allergen_tag_styles where parent_id='menu'`;
        for (const [position, tag] of allergenTags.entries()) {
          await transaction`insert into allergen_tags(id,parent_id,position,map_key,label) values(${randomUUID()},'menu',${position},${tag.code},${tag.label})`;
          await transaction`insert into allergen_tag_styles(id,parent_id,position,map_key,color,icon) values(${randomUUID()},'menu',${position},${tag.code},${tag.color || '#d8585d'},${tag.icon || 'fa-circle-info'})`;
        }
        await bumpMenuContentRevision(transaction);
      });
      return json(200, { ok: true });
    }
    const availabilityMatch = url.pathname.match(/^\/api\/menu\/items\/([^/]+)\/out-of-stock$/);
    if (availabilityMatch && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (typeof body.outOfStock !== 'boolean')
        return json(400, { message: 'outOfStock must be true or false.' });
      const itemId = decodeURIComponent(availabilityMatch[1]);
      const [item] = await sql`select id,name from menu_items where id=${itemId}`;
      if (!item) return json(404, { message: 'Menu item not found.' });
      await sql.begin(async (transaction) => {
        await transaction`delete from menu_unavailable_items where item_name=${item.name}`;
        if (body.outOfStock) {
          const [last] =
            await transaction`select coalesce(max(position),-1)::integer as position from menu_unavailable_items`;
          await transaction`insert into menu_unavailable_items(id,parent_id,position,map_key,item_name) values(${randomUUID()},'menu',${last.position + 1},${item.id},${item.name})`;
        }
      });
      return json(200, { id: item.id, outOfStock: body.outOfStock });
    }
    if (url.pathname === '/api/menu' && req.method === 'POST') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 80)
        return json(400, { message: 'Enter a menu name of up to 80 characters.' });
      const menu = await sql.begin(async (transaction) => {
        const [existing] = await transaction`select id from menus where map_key=${name}`;
        if (existing)
          throw Object.assign(new Error('A menu with this name already exists.'), { status: 409 });
        const [last] =
          await transaction`select coalesce(max(position),-1)::integer as position from menus`;
        const [lastCategory] =
          await transaction`select coalesce(max(position),-1)::integer as position from menu_categories`;
        const id = randomUUID();
        await transaction`insert into menus(id,parent_id,position,map_key) values(${id},'menu',${last.position + 1},${name})`;
        await transaction`insert into menu_categories(id,parent_id,position,label,menu_name,service_name,sections_present) values(${randomUUID()},'menu',${lastCategory.position + 1},${name},${name},${name},false)`;
        return { id, name, position: last.position + 1 };
      });
      return json(201, menu);
    }
    if (url.pathname === '/api/menu/categories/order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (!Array.isArray(body.categoryIds) || body.categoryIds.some((id) => typeof id !== 'string'))
        return json(400, { message: 'categoryIds must be an ordered list.' });
      await sql.begin(async (transaction) => {
        const categories =
          await transaction`select id from menu_categories where parent_id='menu' order by position`;
        const existing = new Set(categories.map((category) => category.id));
        if (
          body.categoryIds.length !== categories.length ||
          body.categoryIds.some((id) => !existing.has(id)) ||
          new Set(body.categoryIds).size !== categories.length
        )
          throw Object.assign(
            new Error('The category list is out of date. Refresh and try again.'),
            { status: 409 },
          );
        for (const [index, id] of body.categoryIds.entries())
          await transaction`update menu_categories set position=${1000 + index} where id=${id}`;
        for (const [index, id] of body.categoryIds.entries())
          await transaction`update menu_categories set position=${index} where id=${id}`;
      });
      return json(200, { categoryIds: body.categoryIds });
    }
    if (url.pathname === '/api/menu/sections/order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (!Array.isArray(body.sectionIds) || body.sectionIds.some((id) => typeof id !== 'string'))
        return json(400, { message: 'sectionIds must be an ordered list.' });
      await sql.begin(async (transaction) => {
        const sections =
          await transaction`select id,parent_id from menu_sections where id=any(${body.sectionIds}) order by position`;
        const parentId = sections[0]?.parent_id;
        const [total] = parentId
          ? await transaction`select count(*)::integer as count from menu_sections where parent_id=${parentId}`
          : [{ count: 0 }];
        if (
          sections.length !== body.sectionIds.length ||
          Number(total.count) !== body.sectionIds.length ||
          new Set(sections.map((section) => section.id)).size !== body.sectionIds.length ||
          new Set(sections.map((section) => section.parent_id)).size !== 1
        )
          throw Object.assign(
            new Error('Drag the complete section list for one menu. Refresh and try again.'),
            { status: 409 },
          );
        for (const [index, id] of body.sectionIds.entries())
          await transaction`update menu_sections set position=${1000 + index} where id=${id}`;
        for (const [index, id] of body.sectionIds.entries())
          await transaction`update menu_sections set position=${index} where id=${id}`;
      });
      return json(200, { sectionIds: body.sectionIds });
    }
    if (url.pathname === '/api/menu/sections' && req.method === 'POST') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      const categoryId = typeof body.categoryId === 'string' ? body.categoryId : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!categoryId || !name || name.length > 80)
        return json(400, { message: 'Enter a sub-menu name of up to 80 characters.' });
      const section = await sql.begin(async (transaction) => {
        const [category] =
          await transaction`select id,menu_name,sections_present from menu_categories where id=${categoryId}`;
        if (!category)
          throw Object.assign(new Error('The selected menu no longer exists.'), { status: 404 });
        const [menu] = await transaction`select id from menus where map_key=${category.menu_name}`;
        if (!menu) throw Object.assign(new Error('The menu source is missing.'), { status: 409 });
        const [last] =
          await transaction`select coalesce(max(position),-1)::integer as position from menu_sections where parent_id=${menu.id}`;
        const id = randomUUID();
        const position = last.position + 1;
        await transaction`insert into menu_sections(id,parent_id,position,title) values(${id},${menu.id},${position},${name})`;
        if (category.sections_present) {
          const [mapping] =
            await transaction`select coalesce(max(position),-1)::integer as position from menu_category_sections where parent_id=${category.id}`;
          await transaction`insert into menu_category_sections(id,parent_id,position,section_position) values(${randomUUID()},${category.id},${mapping.position + 1},${position})`;
        }
        return { id, name, position };
      });
      return json(201, section);
    }
    if (url.pathname === '/api/menu/items' && req.method === 'POST') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      const body = await readJson(req, 450000);
      const sectionId = typeof body.sectionId === 'string' ? body.sectionId : '';
      const fields = itemFields(body);
      const image = itemImage(body);
      const dietaryTags = itemDietaryTags(body);
      const allergens = itemAllergens(body);
      const optionGroups = itemOptionGroups(body);
      const item = await sql.begin(async (transaction) => {
        const [section] = await transaction`select id from menu_sections where id=${sectionId}`;
        if (!section)
          throw Object.assign(new Error('The selected section no longer exists.'), { status: 404 });
        const [duplicate] = await transaction`select id from menu_items where name=${fields.name}`;
        if (duplicate)
          throw Object.assign(new Error('Item names must be unique across the menu catalogue.'), {
            status: 409,
          });
        const [last] =
          await transaction`select coalesce(max(position),-1)::integer as position from menu_items where parent_id=${sectionId}`;
        const id = randomUUID();
        await transaction`insert into menu_items(id,parent_id,position,name,description,price_label) values(${id},${sectionId},${last.position + 1},${fields.name},${fields.description},${fields.priceLabel})`;
        await saveItemDietaryTags(transaction, fields.name, dietaryTags);
        await saveItemAllergens(transaction, fields.name, allergens);
        await saveItemOptions(transaction, fields.name, optionGroups);
        await saveItemImage(transaction, fields.name, image);
        return { id, sectionId, position: last.position + 1, ...fields };
      });
      return json(201, item);
    }
    const itemMatch = url.pathname.match(/^\/api\/menu\/items\/([^/]+)$/);
    if (itemMatch && itemMatch[1] !== 'order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      const itemId = decodeURIComponent(itemMatch[1]);
      const body = await readJson(req, 450000);
      const fields = itemFields(body);
      const image = itemImage(body);
      const dietaryTags = itemDietaryTags(body);
      const allergens = itemAllergens(body);
      const optionGroups = itemOptionGroups(body);
      const item = await sql.begin(async (transaction) => {
        const [current] =
          await transaction`select id,name from menu_items where id=${itemId} for update`;
        if (!current) throw Object.assign(new Error('Menu item not found.'), { status: 404 });
        const [duplicate] =
          await transaction`select id from menu_items where name=${fields.name} and id<>${itemId}`;
        if (duplicate)
          throw Object.assign(new Error('Item names must be unique across the menu catalogue.'), {
            status: 409,
          });
        if (current.name !== fields.name) {
          await transaction`update menu_item_dietary_labels set map_key=${fields.name} where map_key=${current.name}`;
          await transaction`update menu_item_allergen_labels set map_key=${fields.name} where map_key=${current.name}`;
          await transaction`update menu_item_availability set map_key=${fields.name} where map_key=${current.name}`;
          await transaction`update menu_unavailable_items set item_name=${fields.name} where item_name=${current.name}`;
          await transaction`update menu_item_option_sets set map_key=${fields.name} where map_key=${current.name}`;
          await transaction`update menu_item_images set map_key=${fields.name} where map_key=${current.name}`;
        }
        const [updated] =
          await transaction`update menu_items set name=${fields.name},description=${fields.description},price_label=${fields.priceLabel} where id=${itemId} returning id,parent_id as "sectionId",position,name,description,price_label as "priceLabel"`;
        await saveItemDietaryTags(transaction, fields.name, dietaryTags);
        await saveItemAllergens(transaction, fields.name, allergens);
        await saveItemOptions(transaction, fields.name, optionGroups);
        await saveItemImage(transaction, fields.name, image);
        return updated;
      });
      return json(200, item);
    }
    if (itemMatch && req.method === 'DELETE') {
      const itemId = decodeURIComponent(itemMatch[1]);
      await sql.begin(async (transaction) => {
        const [item] =
          await transaction`select id,name from menu_items where id=${itemId} for update`;
        if (!item) throw Object.assign(new Error('Menu item not found.'), { status: 404 });
        await transaction`delete from menu_item_dietary_labels where map_key=${item.name}`;
        await transaction`delete from menu_item_allergen_labels where map_key=${item.name}`;
        await transaction`delete from menu_item_availability where map_key=${item.name}`;
        await transaction`delete from menu_unavailable_items where item_name=${item.name}`;
        await transaction`delete from menu_item_option_sets where map_key=${item.name}`;
        await transaction`delete from menu_item_images where map_key=${item.name}`;
        await transaction`delete from menu_items where id=${itemId}`;
      });
      return json(200, { id: itemId, deleted: true });
    }
    if (url.pathname === '/api/menu/items/order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      const body = await readJson(req);
      if (!Array.isArray(body.itemIds) || body.itemIds.some((id) => typeof id !== 'string'))
        return json(400, { message: 'itemIds must be an ordered list.' });
      await sql.begin(async (transaction) => {
        const items =
          await transaction`select id,parent_id from menu_items where id=any(${body.itemIds}) order by position`;
        const parentId = items[0]?.parent_id;
        const [total] = parentId
          ? await transaction`select count(*)::integer as count from menu_items where parent_id=${parentId}`
          : [{ count: 0 }];
        if (
          items.length !== body.itemIds.length ||
          Number(total.count) !== body.itemIds.length ||
          new Set(items.map((item) => item.id)).size !== body.itemIds.length ||
          new Set(items.map((item) => item.parent_id)).size !== 1
        )
          throw Object.assign(
            new Error('Drag the complete item list for one section. Refresh and try again.'),
            { status: 409 },
          );
        for (const [index, id] of body.itemIds.entries())
          await transaction`update menu_items set position=${1000 + index} where id=${id}`;
        for (const [index, id] of body.itemIds.entries())
          await transaction`update menu_items set position=${index} where id=${id}`;
      });
      return json(200, { itemIds: body.itemIds });
    }
    const match = url.pathname.match(/^\/api\/tables\/([^/]+)$/);
    if (!match) return json(404, { message: 'Not found.' });
    const name = decodeURIComponent(match[1]);
    const meta = await describe(sql, name);
    if (req.method === 'GET') {
      const page = Number(url.searchParams.get('page') || 0);
      if (!Number.isSafeInteger(page) || page < 0 || page > 1000000)
        return json(400, { message: 'Invalid page.' });
      const cols = meta.columns.map((c) => quote(c.name)).join(',');
      const order = meta.primaryKey.length ? meta.primaryKey.map(quote).join(',') : 'ctid';
      const rows = await sql.unsafe(
        `SELECT ${cols} FROM public.${quote(name)} ORDER BY ${order} LIMIT 50 OFFSET $1`,
        [page * 50],
      );
      const [total] = await sql.unsafe(`SELECT count(*)::text AS count FROM public.${quote(name)}`);
      return json(200, { ...meta, rows, count: total.count, page });
    }
    if (req.method === 'DELETE') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (body.confirm !== name || typeof body.all !== 'boolean')
        return json(400, { message: 'Confirm the exact table name.' });
      return json(200, await remove(sql, name, body.key, body.all));
    }
    json(405, { message: 'Method not allowed.' });
  } catch (error) {
    console.error(error.message);
    json(error.code === 'P1001' || error.code === '23505' || error.code === '23503' ? 409 : error.status || 500, {
      message:
        error.status || error.code === 'P1001'
          ? error.message
          : error.code === '23505'
            ? 'That email address is already assigned to a user.'
          : error.code === '23503'
            ? 'Related rows prevent this deletion. Nothing was deleted.'
            : 'Database request failed. Check the database connection and server log.',
    });
  }
});
server.listen(port, '127.0.0.1', () => console.log(`PostgreSQL manager: http://localhost:${port}`));
async function stop() {
  server.close();
  await Promise.all(Object.values(databaseClients).map((client) => client.end({ timeout: 3 })));
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
