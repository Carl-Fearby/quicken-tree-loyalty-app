alter table kitchen_hours
  add column if not exists opens_at numeric;

update kitchen_hours k
set opens_at = o.opens_at
from opening_hours o
where o.parent_id='appointments' and o.map_key=k.day and (k.opens_at is null or k.opens_at < 0 or k.opens_at > 24);

update kitchen_hours
set opens_at = closes_at
where opens_at is null;

alter table kitchen_hours
  alter column opens_at set not null;

alter table kitchen_hours
  drop constraint if exists kitchen_hours_opens_at_check;

alter table kitchen_hours
  add constraint kitchen_hours_opens_at_check check (opens_at >= 0 and opens_at <= 24 and mod(opens_at * 2, 1) = 0);

alter table kitchen_hours
  drop constraint if exists kitchen_hours_closes_at_check;

alter table kitchen_hours
  add constraint kitchen_hours_closes_at_check check (closes_at > 0 and closes_at <= 24 and mod(closes_at * 2, 1) = 0);

alter table kitchen_hours
  drop constraint if exists kitchen_hours_service_window_check;

alter table kitchen_hours
  add constraint kitchen_hours_service_window_check check (opens_at < closes_at);

create or replace function assert_booking_service_hours(p_date date, p_time time, p_duration integer)
returns void language plpgsql as $$
declare hours record; start_minutes numeric;
begin
  select o.opens_at, o.closes_at, k.opens_at as kitchen_open, k.closes_at as kitchen_close into hours
    from opening_hours o join kitchen_hours k on k.day=o.map_key
    where o.parent_id='appointments' and o.map_key=lower(trim(to_char(p_date,'Day')));
  start_minutes := extract(hour from p_time)*60 + extract(minute from p_time) + extract(second from p_time)/60;
  if hours is null or start_minutes < hours.kitchen_open*60
    or start_minutes >= hours.kitchen_close*60
    or start_minutes + p_duration > hours.closes_at*60 then
    raise exception 'Bookings must start during kitchen service and finish before the venue closes.' using errcode='P1001';
  end if;
end;
$$;