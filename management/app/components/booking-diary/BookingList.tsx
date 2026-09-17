import type { Booking } from './lib/bookingTypes';
import { BookingCard } from './BookingCard';

type Props = {
  bookings: Booking[];
  onSelect: (booking: Booking) => void;
  onAssign: (booking: Booking) => void;
  onViewOrder: (booking: Booking) => void;
};

export function BookingList({ bookings, onSelect, onAssign, onViewOrder }: Props) {
  return (
    <aside className="diary-bookings">
      <h2>Bookings for the day</h2>
      <p>Seat counts are shown beside each table. Configure tables in Settings.</p>
      {bookings.length ? (
        bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onSelect={onSelect}
            onAssign={onAssign}
            onViewOrder={onViewOrder}
          />
        ))
      ) : (
        <p>No bookings for this date.</p>
      )}
    </aside>
  );
}
