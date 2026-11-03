alter table orders add column if not exists deposit_credit_pence integer not null default 0;
alter table orders add column if not exists paid_pence integer not null default 0;
alter table orders drop constraint if exists orders_deposit_credit_nonnegative;
alter table orders add constraint orders_deposit_credit_nonnegative check(deposit_credit_pence >= 0);
alter table orders drop constraint if exists orders_paid_pence_nonnegative;
alter table orders add constraint orders_paid_pence_nonnegative check(paid_pence >= 0);
