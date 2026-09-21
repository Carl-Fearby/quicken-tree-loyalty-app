import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

test(
  'kitchen defaults, configurable cutoffs, and booking write protection',
  { skip: !process.env.MANAGEMENT_INTEGRATION },
  async () => {
    const schema = `kitchen_test_${randomUUID().replaceAll('-', '')}`;
    const url = new URL(process.env.DATABASE_URL);
    const options = { ssl: ['localhost', '127.0.0.1'].includes(url.hostname) ? false : 'require' };
    const admin = postgres(process.env.DATABASE_URL, options);
    const sql = postgres(process.env.DATABASE_URL, {
      ...options,
      connection: { search_path: schema },
    });
    try {
      await admin.unsafe(`create schema ${schema}`);
      await sql.unsafe(`create table opening_hours(parent_id text, map_key text, opens_at numeric, closes_at numeric);
      create table bookings(id integer primary key,booking_date date,booking_time time,booking_duration_minutes integer,status text default 'confirmed');
      insert into opening_hours select 'appointments',day,9,24 from unnest(array['monday','tuesday','wednesday','thursday','friday','saturday','sunday']) as day;`);
      const migration = await readFile(
        new URL('../../backend/migrations/014_kitchen_hours.sql', import.meta.url),
        'utf8',
      );
      await sql.unsafe(migration);
      const [sunday] =
        await sql`select closes_at::int as close from kitchen_hours where day='sunday'`;
      assert.equal(sunday.close, 18);
      assert.equal(
        (await sql`select closes_at::int as close from kitchen_hours where day='friday'`)[0].close,
        21,
      );
      await sql`insert into bookings values(1,'2030-01-07','20:30',90,'confirmed')`;
      for (const [date, time] of [
        ['2030-01-07', '21:00'],
        ['2030-01-07', '22:00'],
        ['2030-01-06', '18:00'],
        ['2030-01-07', '08:30'],
      ]) {
        await assert.rejects(
          sql`insert into bookings values(2,${date},${time},90,'confirmed')`,
          (error) => error.code === 'P1001',
        );
      }
      await sql`insert into bookings values(3,'2030-01-06','17:30',90,'confirmed')`;
      await assert.rejects(
        sql`update bookings set booking_time='18:00' where id=3`,
        (error) => error.code === 'P1001',
      );
      await assert.rejects(
        sql`update bookings set booking_duration_minutes=300 where id=1`,
        (error) => error.code === 'P1001',
      );
      await sql`update kitchen_hours set closes_at=20 where day='monday'`;
      await sql.unsafe(migration);
      assert.equal(
        (await sql`select closes_at::int as close from kitchen_hours where day='monday'`)[0].close,
        20,
      );
      await assert.rejects(
        sql`select assert_booking_service_hours('2030-01-07','20:00',90)`,
        (error) => error.code === 'P1001',
      );
      await sql`update bookings set status='cancelled' where id=1`;
      await assert.rejects(
        sql`update bookings set status='confirmed' where id=1`,
        (error) => error.code === 'P1001',
      );
      assert.equal((await sql`select count(*)::int as count from bookings`)[0].count, 2);
    } finally {
      await sql.end();
      await admin.unsafe(`drop schema if exists ${schema} cascade`);
      await admin.end();
    }
  },
);
