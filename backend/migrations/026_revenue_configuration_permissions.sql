insert into management_permission_definitions(permission_key,label,description,levels,position) values
  ('configuration.cancellation','Cancellation policy','Manage cancellation cutoffs and deposit outcomes.',array['none','write'],12),
  ('configuration.deposits','Deposit rules','Manage booking deposit requirements and rule criteria.',array['none','write'],13)
on conflict(permission_key) do update set label=excluded.label,description=excluded.description,levels=excluded.levels,position=excluded.position;

update management_permission_definitions set position=14 where permission_key='configuration.hours';
update management_permission_definitions set position=15 where permission_key='configuration.menu';
update management_permission_definitions set position=16 where permission_key='configuration.symbols';
update management_permission_definitions set position=17 where permission_key='configuration.rewards';
update management_permission_definitions set position=18 where permission_key='configuration.users';
update management_permission_definitions set position=19 where permission_key='configuration.database';

insert into management_user_permissions(user_id,permission_key,access_level)
select u.id,d.permission_key,case when u.role='admin' then 'write' when u.configuration_access then 'write' else 'none' end
from management_users u
join management_permission_definitions d on d.permission_key in ('configuration.cancellation','configuration.deposits')
on conflict(user_id,permission_key) do nothing;
