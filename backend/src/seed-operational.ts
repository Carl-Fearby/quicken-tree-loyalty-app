import {sql} from './db';

await sql.begin(async transaction => {
    const [member] = await transaction<{id: string}[]>`
      insert into members (email, display_name, member_since, tier)
      values ('stephen@demo.quickentree.local', 'Stephen', '2024-01-01', 'Quicken Member')
      on conflict (email) do update set display_name = excluded.display_name, tier = excluded.tier, updated_at = now()
      returning id`;
    await transaction`insert into member_preferences (member_id) values (${member.id}) on conflict (member_id) do nothing`;
    await transaction`insert into loyalty_accounts (member_id, points) values (${member.id}, 840) on conflict (member_id) do nothing`;
    await transaction`insert into loyalty_ledger (member_id, points_delta, reason, reference_type, reference_id) select ${member.id}, 840, 'Demo opening balance', 'migration', 'operational-seed' where not exists (select 1 from loyalty_ledger where member_id = ${member.id} and reference_id = 'operational-seed')`;
});
await sql.end();
