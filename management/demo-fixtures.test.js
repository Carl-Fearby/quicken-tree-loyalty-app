import assert from 'node:assert/strict';
import test from 'node:test';
import { demoBookingsForDay, demoGuestNames, demoOrderForBooking } from './demo-fixtures.js';

test('nearby demo dates have different booking schedules', () => {
  const schedules = Array.from({ length: 21 }, (_, day) => demoBookingsForDay(day));
  for (const [day, bookings] of schedules.entries()) {
    assert.ok(bookings.length >= 3);
    assert.equal(new Set(bookings.map((booking) => booking.email)).size, bookings.length);
    assert.ok(bookings.every((booking) => /^[a-z]+\.[a-z]+@pacevenues\.com$/.test(booking.email)));
    assert.ok(bookings.some((booking) => booking.orderAhead));
    assert.ok(bookings.every((booking) => booking.partySize <= ((booking.tableId - 1) % 9) + 2));
    assert.equal(new Set(bookings.map((booking) => booking.tableId)).size, bookings.length);
    assert.ok(bookings.every((booking) => Number(booking.time.slice(3)) % 30 === 0));
    assert.deepEqual(bookings.map((booking) => booking.time),
      [...bookings.map((booking) => booking.time)].sort());
    if (day > 0) assert.notDeepEqual(bookings, schedules[day - 1]);
  }
});

test('demo orders include multiple items and named servings for each guest', () => {
  for (let day = 0; day < 21; day += 1) {
    for (const [index, booking] of demoBookingsForDay(day).entries()) {
      if (!booking.orderAhead) continue;
      const names = demoGuestNames(day, index, booking.name, booking.partySize);
      const order = demoOrderForBooking(day, index, names);
      assert.equal(new Set(names).size, booking.partySize);
      assert.ok(order.lines.length >= 3);
      assert.equal(order.lines.filter((line) => line.shared).length, 1);
      assert.deepEqual(order.lines.flatMap((line) => line.seats).sort((a, b) => a - b),
        Array.from({ length: booking.partySize }, (_, seat) => seat));
      assert.equal(order.totalPence,
        order.lines.reduce((total, line) => total + line.unitPricePence * (line.seats.length || 1), 0));
    }
  }
});
