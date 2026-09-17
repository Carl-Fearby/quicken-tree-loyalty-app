import type { FormEvent } from 'react';
import { BookingForm } from '../forms/BookingForm';
import type { BookingDraft, Table } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

type Props = {
  date: string;
  slots: string[];
  tables: Table[];
  value: BookingDraft;
  saving: boolean;
  error?: string;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};
export function AddBookingModal(props: Props) {
  return (
    <ModalShell title="Add booking" onClose={props.onClose}>
      <BookingForm {...props} />
      {!props.slots.length && (
        <p className="dialog-warning">Choose a future date with available booking times.</p>
      )}
      {props.error && <p className="dialog-warning">{props.error}</p>}
      <div className="dialog-actions">
        <button
          className="primary"
          disabled={props.saving || !props.slots.length}
          onClick={() =>
            document.querySelector<HTMLFormElement>('.booking-dialog form')?.requestSubmit()
          }
        >
          {props.saving ? 'Saving…' : props.slots.length ? 'Create booking' : 'Choose another date'}
        </button>
      </div>
    </ModalShell>
  );
}
