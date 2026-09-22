import type { Booking } from './lib/bookingTypes';

type Props = {
  booking: Booking;
  onSelect: (booking: Booking) => void;
  onAssign: (booking: Booking) => void;
  onViewOrder: (booking: Booking) => void;
  canWrite: boolean;
};

export function BookingCard({ booking, onSelect, onAssign, onViewOrder, canWrite }: Props) {
  const orderTotal = booking.orderAhead
    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
        booking.orderAhead.totalPence / 100,
      )
    : null;

  return (
    <article className="diary-booking">
      <button className="booking-card-main" type="button" onClick={() => onSelect(booking)}>
        <h3>
          {booking.time.slice(0, 5)} · {booking.name}
        </h3>
        <p>
          {booking.guests} guests · {booking.assignedTableName || 'Unassigned'} · {booking.status}
        </p>
      </button>
      {canWrite && <div className="booking-card-actions">
        <button className="booking-table-action" type="button" onClick={() => onAssign(booking)}>
          {booking.assignedTableName ? 'Change table' : 'Assign table'}
        </button>
      </div>}
      {booking.dietaryNeeds?.length ? (
        <p className="diary-dietary">Dietary: {booking.dietaryNeeds.join(', ')}</p>
      ) : null}
      {booking.notes ? <p>{booking.notes}</p> : null}
      {booking.orderAhead ? (
        <section className="diary-order">
          <b>Order ahead · {orderTotal}</b>
          <button type="button" onClick={() => onViewOrder(booking)}>
            View order
          </button>
        </section>
      ) : null}
    </article>
  );
}
