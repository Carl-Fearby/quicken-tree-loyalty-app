create table if not exists kitchen_hours (
  day text primary key check (day in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  closes_at numeric not null check (closes_at > 0 and closes_at <= 24 and mod(closes_at * 2, 1) = 0)
);
insert into kitchen_hours(day,closes_at) values
('monday',21),('tuesday',21),('wednesday',21),('thursday',21),('friday',21),('saturday',21),('sunday',18)
on conflict(day) do nothing;

create or replace function assert_booking_service_hours(p_date date, p_time time, p_duration integer)
returns void language plpgsql as $$
declare hours record; start_minutes numeric;
begin
  select o.opens_at, o.closes_at, k.closes_at as kitchen_close into hours
    from opening_hours o join kitchen_hours k on k.day=o.map_key
    where o.parent_id='appointments' and o.map_key=lower(trim(to_char(p_date,'Day')));
  start_minutes := extract(hour from p_time)*60 + extract(minute from p_time) + extract(second from p_time)/60;
  if hours is null or start_minutes < hours.opens_at*60
    or start_minutes >= hours.kitchen_close*60
    or start_minutes + p_duration > hours.closes_at*60 then
    raise exception 'Bookings must start during kitchen service and finish before the venue closes.' using errcode='P1001';
  end if;
end;
$$;

create or replace function enforce_booking_service_hours()
returns trigger language plpgsql as $$
begin
  if new.status='cancelled' then return new; end if;
  if TG_OP='UPDATE' then
    if new.booking_date=old.booking_date and new.booking_time=old.booking_time
      and new.booking_duration_minutes=old.booking_duration_minutes
      and old.status<>'cancelled' then return new; end if;
  end if;
  perform assert_booking_service_hours(new.booking_date,new.booking_time,new.booking_duration_minutes);
  return new;
end;
$$;
drop trigger if exists bookings_service_hours on bookings;
create trigger bookings_service_hours before insert or update of booking_date,booking_time,booking_duration_minutes,status
on bookings for each row execute function enforce_booking_service_hours();
