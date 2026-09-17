-- Applied transactionally by migrate-relational-content.ts after content verification.
create table member_tastes (
 member_id uuid not null references members(id) on delete cascade,
 position integer not null check(position>=0),
 name text not null,
 primary key(member_id,position)
);
create table member_dietary_needs (
 member_id uuid not null references members(id) on delete cascade,
 position integer not null check(position>=0),
 name text not null,
 primary key(member_id,position)
);
create table booking_dietary_needs (
 booking_id uuid not null references bookings(id) on delete cascade,
 position integer not null check(position>=0),
 name text not null,
 primary key(booking_id,position)
);
insert into member_tastes select member_id, ordinality-1,value from member_preferences cross join lateral jsonb_array_elements_text(tastes) with ordinality;
insert into member_dietary_needs select member_id, ordinality-1,value from member_preferences cross join lateral jsonb_array_elements_text(dietary_needs) with ordinality;
insert into booking_dietary_needs select id, ordinality-1,value from bookings cross join lateral jsonb_array_elements_text(dietary_needs) with ordinality;
alter table member_preferences drop column tastes, drop column dietary_needs;
alter table bookings drop column dietary_needs;
