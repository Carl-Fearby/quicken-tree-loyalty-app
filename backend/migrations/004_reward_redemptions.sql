create table if not exists reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  reward_code text not null,
  reward_title text not null,
  points_spent integer not null check (points_spent > 0),
  status text not null default 'issued' check (status in ('issued', 'redeemed', 'cancelled', 'expired')),
  issued_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create index if not exists reward_redemptions_member_issued on reward_redemptions(member_id, issued_at desc);
