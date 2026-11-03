alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check(status in ('pending','confirmed','arrived','seated','cancelled','completed','no_show'));

create table if not exists booking_status_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  member_id uuid references members(id) on delete set null,
  from_status text not null,
  to_status text not null,
  reason text,
  actor_user_id uuid references management_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists booking_status_events_booking_created
  on booking_status_events(booking_id,created_at desc);
create index if not exists booking_status_events_member_created
  on booking_status_events(member_id,created_at desc);

create table if not exists booking_reminder_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  channel text not null check(channel in ('email','sms','push')),
  status text not null check(status in ('queued','delivered','failed')),
  initiated_by uuid references management_users(id) on delete set null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists booking_reminder_events_booking_created
  on booking_reminder_events(booking_id,created_at desc);

insert into booking_system_settings(setting_key,integer_value) values
  ('booking_reminder_first_hours',24),
  ('booking_reminder_final_hours',2)
on conflict(setting_key) do nothing;

insert into management_permission_definitions(permission_key,label,description,levels,position) values
  ('configuration.attendance','Attendance and reminders','Manage reminder timings and no-show review settings.',array['none','write'],14)
on conflict(permission_key) do update set
  label=excluded.label,description=excluded.description,levels=excluded.levels,position=excluded.position;

update management_permission_definitions set position=15 where permission_key='configuration.hours';
update management_permission_definitions set position=16 where permission_key='configuration.menu';
update management_permission_definitions set position=17 where permission_key='configuration.symbols';
update management_permission_definitions set position=18 where permission_key='configuration.rewards';
update management_permission_definitions set position=19 where permission_key='configuration.users';
update management_permission_definitions set position=20 where permission_key='configuration.database';

insert into management_user_permissions(user_id,permission_key,access_level)
select u.id,'configuration.attendance',case when u.role='admin' then 'write' when u.configuration_access then 'write' else 'none' end
from management_users u
on conflict(user_id,permission_key) do nothing;
