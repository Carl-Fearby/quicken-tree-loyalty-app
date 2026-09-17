import type { FormEvent } from 'react';
import { BookingForm } from '../forms/BookingForm';
import type { Booking, BookingDraft, Table } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

type Props = {
  booking: Booking;
  date: string;
  slots: string[];
  tables: Table[];
  value: BookingDraft;
  saving: boolean;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onClose: () => void;
  onRequestCancel: () => void;
  onSubmit: (event: FormEvent) => void;
};
export function EditBookingModal(props: Props) {
  return (
    <ModalShell title="Edit booking" onClose={props.onClose}>
      <BookingForm {...props} />
      <div className="dialog-actions">
        <button className="booking-cancel-trigger" type="button" onClick={props.onRequestCancel}>
          Cancel this booking…
        </button>
        <button
          className="danger"
          disabled={props.saving}
          onClick={() =>
            document.querySelector<HTMLFormElement>('.booking-dialog form')?.requestSubmit()
          }
        >
          {props.saving ? 'Saving…' : 'Save booking'}
        </button>
      </div>
    </ModalShell>
  );
}
