alter table booking_tables add column if not exists table_number integer;
update booking_tables set table_number=id where table_number is null;
alter table booking_tables alter column table_number set not null;
create unique index if not exists booking_tables_number_unique on booking_tables(table_number);
do $$ begin
 if not exists(select 1 from pg_constraint where conname='booking_tables_number_positive' and conrelid='booking_tables'::regclass) then
  alter table booking_tables add constraint booking_tables_number_positive check(table_number>0);
 end if;
end $$;
create sequence if not exists booking_tables_id_seq owned by booking_tables.id;
alter table booking_tables alter column id set default nextval('booking_tables_id_seq');
select setval('booking_tables_id_seq', greatest(coalesce((select max(id) from booking_tables),0), (select last_value from booking_tables_id_seq)), true);
