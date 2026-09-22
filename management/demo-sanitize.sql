-- Run only in an unserved demo template database, never in production.
truncate table members, bookings, management_users, staff_users,
  reward_tokens, reward_redemptions, content_generation,
  content_revisions, menu_notifications restart identity cascade;

update profile_defaults
set name = 'Demo Guest', email = 'guest@demo.invalid', member_since = '2024-01-01';
update profile_venue
set name = 'Pace Demo Venue', location = 'Demo location';
update venue_contacts
set phone = '00000000000', email = 'hello@demo.invalid';
update rewards set code = 'DEMO-' || id;
update feature_flags set enabled = true where feature_key = 'rewards';

create table demo_template_marker(id integer primary key check(id = 1));
insert into demo_template_marker(id) values(1);

do $$
begin
  if exists(select 1 from members)
    or exists(select 1 from bookings)
    or exists(select 1 from management_users)
    or exists(select 1 from staff_users)
    or exists(select 1 from reward_tokens)
    or exists(select 1 from reward_redemptions)
  then
    raise exception 'Demo template still contains private operational records';
  end if;
end $$;
