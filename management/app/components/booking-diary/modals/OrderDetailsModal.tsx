import type { Booking } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

export function OrderDetailsModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const order = booking.orderAhead;
  const formatMoney = (pence: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);

  return (
    <ModalShell title="Order ahead" onClose={onClose}>
      <p>
        {booking.name} · {booking.time.slice(0, 5)} · {booking.guests} guests
      </p>
      {order ? (
        <>
          <p className="diary-order-status">{order.status}</p>
          <p className="diary-order-payment">
            Total {formatMoney(order.totalPence)}
            {order.paidAt ? ` · Paid ${new Date(order.paidAt).toLocaleString('en-GB')}` : ''}
          </p>
          <div className="diary-order-lines">
            {order.lines.map((line) => (
              <article key={line.id}>
                <b>
                  {line.quantity} × {line.name}
                </b>
                <strong>{formatMoney(line.unitPricePence * line.quantity)}</strong>
                {line.description ? <p>{line.description}</p> : null}
                {line.assignments?.length ? (
                  <small>
                    {line.assignments
                      .map((assignment) =>
                        assignment.isShared
                          ? `Shared serving ${assignment.servingNumber}`
                          : assignment.guestName || `Serving ${assignment.servingNumber}`,
                      )
                      .join(' · ')}
                  </small>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : (
        <p>No order-ahead is linked to this booking.</p>
      )}
    </ModalShell>
  );
}
