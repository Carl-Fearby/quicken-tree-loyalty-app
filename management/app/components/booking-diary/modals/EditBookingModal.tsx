import type { FormEvent } from 'react';
import { BookingForm } from '../forms/BookingForm';
import type { Booking, BookingDraft, Table } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

type Props = {
  booking: Booking;
  date: string;
  slots: string[];
  kitchenClose?: number;
  tables: Table[];
  value: BookingDraft;
  saving: boolean;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onClose: () => void;
  onRequestCancel: () => void;
  onViewOrder: () => void;
  onSubmit: (event: FormEvent) => void;
  readOnly?: boolean;
};
export function EditBookingModal(props: Props) {
  return (
    <ModalShell title={props.readOnly ? 'Booking details' : 'Edit booking'} onClose={props.onClose}>
      <BookingForm {...props} />
      <div className="dialog-actions">
        {props.booking.orderAhead && (
          <button type="button" onClick={props.onViewOrder}>
            View order
          </button>
        )}
        {!props.readOnly && <button className="booking-cancel-trigger" type="button" onClick={props.onRequestCancel}>
          Cancel this booking…
        </button>}
        {!props.readOnly && <button
          className="primary"
          disabled={props.saving || !props.value.time}
          onClick={() =>
            document.querySelector<HTMLFormElement>('.booking-dialog form')?.requestSubmit()
          }
        >
          {props.saving ? 'Saving…' : 'Save booking'}
        </button>}
      </div>
    </ModalShell>
  );
}
