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
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};
export function AddBookingModal(props: Props) {
  return (
    <ModalShell title="Add booking" onClose={props.onClose}>
      <BookingForm {...props} />
      <div className="dialog-actions">
        <button
          className="danger"
          disabled={props.saving}
          onClick={() =>
            document.querySelector<HTMLFormElement>('.booking-dialog form')?.requestSubmit()
          }
        >
          {props.saving ? 'Saving…' : 'Create booking'}
        </button>
      </div>
    </ModalShell>
  );
}
