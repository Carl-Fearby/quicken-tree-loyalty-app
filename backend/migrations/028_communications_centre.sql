create table if not exists communication_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  channel text not null check(channel in ('email','sms','push')),
  category text not null check(category in ('transactional','marketing')),
  subject text,
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists communication_deliveries (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references communication_templates(id) on delete set null,
  member_id uuid references members(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  channel text not null check(channel in ('email','sms','push')),
  category text not null check(category in ('transactional','marketing')),
  recipient text not null,
  subject text,
  body text not null,
  status text not null check(status in ('scheduled','queued','sent','delivered','failed','suppressed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  provider text not null default 'demo',
  initiated_by uuid references management_users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists communication_deliveries_created on communication_deliveries(created_at desc);
create index if not exists communication_deliveries_member_created on communication_deliveries(member_id,created_at desc);
create index if not exists communication_deliveries_booking_created on communication_deliveries(booking_id,created_at desc);

insert into communication_templates(template_key,name,channel,category,subject,body) values
 ('booking-confirmation','Booking confirmation','email','transactional','Your booking at {{venueName}}','Hi {{guestName}}, your table for {{guestCount}} is confirmed for {{bookingDate}} at {{bookingTime}}.'),
 ('booking-reminder','Booking reminder','email','transactional','Your booking is coming up','Hi {{guestName}}, this is a reminder for your booking at {{venueName}} on {{bookingDate}} at {{bookingTime}}.'),
 ('waitlist-ready','Table ready','sms','transactional',null,'Hi {{guestName}}, your table at {{venueName}} is ready.'),
 ('reward-expiry','Reward expiring','push','marketing','Your reward expires soon','Your {{rewardName}} reward expires on {{expiryDate}}.')
on conflict(template_key) do nothing;

insert into management_permission_definitions(permission_key,label,description,levels,position) values
 ('configuration.communications','Communications centre','Manage message templates, delivery history and test sends.',array['none','write'],15)
on conflict(permission_key) do update set label=excluded.label,description=excluded.description,levels=excluded.levels,position=excluded.position;
update management_permission_definitions set position=16 where permission_key='configuration.hours';
update management_permission_definitions set position=17 where permission_key='configuration.menu';
update management_permission_definitions set position=18 where permission_key='configuration.symbols';
update management_permission_definitions set position=19 where permission_key='configuration.rewards';
update management_permission_definitions set position=20 where permission_key='configuration.users';
update management_permission_definitions set position=21 where permission_key='configuration.database';

insert into management_user_permissions(user_id,permission_key,access_level)
select u.id,'configuration.communications',case when u.role='admin' then 'write' when u.configuration_access then 'write' else 'none' end
from management_users u on conflict(user_id,permission_key) do nothing;
