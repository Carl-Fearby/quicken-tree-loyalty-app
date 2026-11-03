import { useState } from 'react';
import type { Booking } from '../lib/bookingTypes';
import { RoundedSelect } from '../../ui/RoundedSelect';
import { ModalShell } from './ModalShell';

export function CancelBookingDialog({
  booking,
  date,
  cancellationCutoffHours,
  onCancel,
  onClose,
}: {
  booking: Booking;
  date: string;
  cancellationCutoffHours: number;
  onCancel: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('Guest plans changed');
  const cutoff = new Date(`${date}T${booking.time.slice(0, 5)}:00`);
  cutoff.setHours(cutoff.getHours() - cancellationCutoffHours);
  const late = new Date() >= cutoff;
  const hasDeposit = booking.depositStatus === 'demo_paid' && Boolean(booking.depositAmountPence);
  return (
    <ModalShell title="Cancel booking" onClose={onClose}>
      <p>
        Cancel the booking for <strong>{booking.name}</strong>?
      </p>
      <p className="dialog-warning">
        {hasDeposit
          ? late
            ? `This is inside the ${cancellationCutoffHours}-hour cancellation window. The £${((booking.depositAmountPence || 0) / 100).toFixed(2)} deposit will be retained.`
            : `The £${((booking.depositAmountPence || 0) / 100).toFixed(2)} deposit will be refunded.`
          : 'This will remove the booking from the diary.'}
      </p>
      <label className="booking-cancellation-reason">
        Cancellation reason
        <RoundedSelect
          ariaLabel="Cancellation reason"
          value={reason}
          options={['Guest plans changed', 'Illness or emergency', 'Duplicate booking', 'Venue cancellation', 'Other'].map((label) => ({ value: label, label }))}
          onChange={(value) => setReason(String(value))}
        />
      </label>
      <div className="dialog-actions">
        <button onClick={onClose}>Keep booking</button>
        <button className="danger" onClick={() => onCancel(reason)}>
          Cancel booking
        </button>
      </div>
    </ModalShell>
  );
}
