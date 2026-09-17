import type { Booking, Table } from './lib/bookingTypes';

export function BookingSummary({ bookings, tables }: { bookings: Booking[]; tables: Table[] }) {
  return (
    <p id="diary-summary">
      {tables.length} tables · {bookings.length} active bookings ·{' '}
      {bookings.reduce((total, booking) => total + booking.guests, 0)} guests
    </p>
  );
}
