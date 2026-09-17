import type { Booking } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

export function CancelBookingDialog({
  booking,
  onCancel,
  onClose,
}: {
  booking: Booking;
  onCancel: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell title="Cancel booking" onClose={onClose}>
      <p>
        Cancel the booking for <strong>{booking.name}</strong>?
      </p>
      <p className="dialog-warning">This will remove the booking from the diary.</p>
      <div className="dialog-actions">
        <button onClick={onClose}>Keep booking</button>
        <button className="danger" onClick={onCancel}>
          Cancel booking
        </button>
      </div>
    </ModalShell>
  );
}
