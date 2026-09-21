-- Opaque bearer tokens are retained so staff can reprint QR codes.
create table if not exists reward_tokens (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  token text not null unique,
  label text not null default '' check (length(label) <= 120),
  points integer not null check (points between 0 and 1000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 months'),
  redeemed_at timestamptz,
  redeemed_by uuid references members(id),
  check (expires_at > created_at),
  check ((redeemed_at is null) = (redeemed_by is null))
);
create index if not exists reward_tokens_created on reward_tokens(created_at desc);
create unique index if not exists loyalty_ledger_reward_reference
  on loyalty_ledger(reference_type, reference_id)
  where reference_type in ('reward_token', 'manual_reward');

-- Future authenticated app redemption must call this in the same transaction.
-- A conditional update serializes competing claims; failed credits roll it back.
create or replace function claim_reward_token(p_token text, p_member_id uuid)
returns integer language plpgsql as $$
declare reward reward_tokens%rowtype;
begin
  update reward_tokens set redeemed_at = now(), redeemed_by = p_member_id
    where token = p_token and redeemed_at is null and expires_at > clock_timestamp()
    returning * into reward;
  if not found then
    raise exception 'Reward is invalid, expired or already used.' using errcode = 'P0001';
  end if;
  insert into loyalty_accounts(member_id, points) values(p_member_id, reward.points)
    on conflict(member_id) do update set points = loyalty_accounts.points + excluded.points, updated_at = now();
  insert into loyalty_ledger(member_id, points_delta, reason, reference_type, reference_id)
    values(p_member_id, reward.points, 'QR reward: ' || coalesce(nullif(reward.label, ''), 'Reward points'), 'reward_token', reward.id::text);
  return reward.points;
end;
$$;
