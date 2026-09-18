import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import {
  defaultExpiry,
  rewardFields,
  addManualPoints,
  rewardsRoute,
  generateRewardCode,
} from '../rewards.js';

test('staff codes use an uppercase prefix and unambiguous letters and numbers', () => {
  for (let i = 0; i < 100; i++) {
    const code = generateRewardCode();
    assert.match(code, /^QT[A-HJ-NP-Z2-9]{12}$/);
    assert.match(code.slice(2), /[A-Z]/);
    assert.match(code.slice(2), /[2-9]/);
  }
});

test('boundaries, invalid dates and calendar-month expiry', () => {
  assert.equal(defaultExpiry(new Date('2026-11-30T12:00:00Z')), '2027-02-28');
  assert.equal(defaultExpiry(new Date('2027-11-30T12:00:00Z')), '2028-02-29');
  for (const points of [0, 1000])
    assert.equal(rewardFields({ points, requestId: randomUUID() }).points, points);
  for (const points of [-1, 1001, 1.5, '100', null])
    assert.throws(() => rewardFields({ points, requestId: randomUUID() }), /whole number/);
  for (const expiresOn of ['2020-01-01', '2030-02-30', '', 'no'])
    assert.throws(
      () => rewardFields({ points: 100, requestId: randomUUID(), expiresOn }),
      /expiry/,
    );
  assert.throws(() => rewardFields({ points: 0, requestId: randomUUID() }, true), /whole number/);
});

test(
  'persistence, PNG, idempotent credits, concurrent claims, expiry and rollback',
  { skip: !process.env.MANAGEMENT_INTEGRATION },
  async () => {
    const schema = `rewards_test_${randomUUID().replaceAll('-', '')}`;
    const url = new URL(process.env.DATABASE_URL);
    const options = {
      max: 4,
      ssl: ['localhost', '127.0.0.1'].includes(url.hostname) ? false : 'require',
    };
    const admin = postgres(process.env.DATABASE_URL, options);
    const sql = postgres(process.env.DATABASE_URL, {
      ...options,
      connection: { search_path: schema },
    });
    try {
      await admin.unsafe(`create schema ${schema}`);
      await sql.unsafe(`create table members(id uuid primary key, display_name text, email text);
      create table loyalty_accounts(member_id uuid primary key references members(id), points integer not null default 0, updated_at timestamptz default now());
      create table loyalty_ledger(id uuid primary key default gen_random_uuid(), member_id uuid references members(id), points_delta integer, reason text, reference_type text, reference_id text, created_at timestamptz default now());`);
      await sql.unsafe(
        await readFile(
          new URL('../../backend/migrations/012_reward_tokens.sql', import.meta.url),
          'utf8',
        ),
      );
      const memberId = randomUUID();
      await sql`insert into members(id,display_name) values(${memberId},'Test customer')`;
      const fields = rewardFields(
        { memberId, points: 100, reason: 'Test credit', requestId: randomUUID() },
        true,
      );
      assert.deepEqual(
        await Promise.all([addManualPoints(sql, fields), addManualPoints(sql, fields)]),
        [{ points: 100 }, { points: 100 }],
      );
      await assert.rejects(addManualPoints(sql, { ...fields, points: 200 }), /already been used/);
      let response;
      const invoke = async (method, path, body) => {
        await rewardsRoute({
          req: { method },
          res: {
            writeHead: (status, headers) => {
              response = { status, headers };
            },
            end: (data) => {
              response.data = data;
            },
          },
          url: new URL(path, 'http://localhost'),
          sql,
          json: (status, data) => {
            response = { status, data };
          },
          readJson: async () => body,
        });
        return response;
      };
      const body = { points: 1000, label: 'Test reward', requestId: randomUUID() };
      const created = await invoke('POST', '/api/rewards/tokens', body);
      assert.match(created.data.code, /^QT[A-HJ-NP-Z2-9]{12}$/);
      assert.equal(
        (await invoke('GET', '/api/rewards/tokens')).data.tokens[0].code,
        created.data.code,
      );
      assert.equal(created.data.id, (await invoke('POST', '/api/rewards/tokens', body)).data.id);
      const png = await invoke('GET', `/api/rewards/tokens/${created.data.id}/qr`);
      assert.equal(png.headers['Content-Type'], 'image/png');
      assert.equal(png.data.subarray(1, 4).toString(), 'PNG');
      const [reward] =
        await sql`select token,redeemed_at from reward_tokens where id=${created.data.id}`;
      assert.equal(reward.redeemed_at, null);
      assert.equal(reward.token, created.data.code);
      const claims = await Promise.allSettled([
        sql`select claim_reward_token(${reward.token},${memberId})`,
        sql`select claim_reward_token(${reward.token},${memberId})`,
      ]);
      assert.equal(claims.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(
        (await sql`select points from loyalty_accounts where member_id=${memberId}`)[0].points,
        1100,
      );
      assert.equal((await sql`select count(*)::int as count from loyalty_ledger`)[0].count, 2);
      await sql`insert into reward_tokens(request_id,token,points,created_at,expires_at) values(${randomUUID()},'expired',10,now()-interval '2 days',now()-interval '1 day')`;
      await assert.rejects(sql`select claim_reward_token('expired',${memberId})`, /expired/);
      await assert.rejects(sql`select claim_reward_token('unknown',${memberId})`, /invalid/);
      await sql`insert into reward_tokens(request_id,token,points) values(${randomUUID()},'zero',0)`;
      assert.equal(
        (await sql`select claim_reward_token('zero',${memberId}) as points`)[0].points,
        0,
      );
      await sql`insert into reward_tokens(request_id,token,points) values(${randomUUID()},'rollback',50)`;
      await assert.rejects(sql`select claim_reward_token('rollback',${randomUUID()})`);
      assert.equal(
        (await sql`select redeemed_at from reward_tokens where token='rollback'`)[0].redeemed_at,
        null,
      );
    } finally {
      await sql.end();
      await admin.unsafe(`drop schema if exists ${schema} cascade`);
      await admin.end();
    }
  },
);
