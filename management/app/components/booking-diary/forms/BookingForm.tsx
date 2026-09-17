import type { FormEvent } from 'react';
import type { BookingDraft, Table } from '../lib/bookingTypes';
import { BookingDetailsFields } from './BookingDetailsFields';
import { BookingScheduleFields } from './BookingScheduleFields';
import { BookingTableFields } from './BookingTableFields';

type Props = {
  date: string;
  slots: string[];
  tables: Table[];
  value: BookingDraft;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function BookingForm({
  date,
  slots,
  tables,
  value,
  onChange,
  onDateChange,
  onSubmit,
}: Props) {
  return (
    <form onSubmit={onSubmit}>
      <div className="booking-fields">
        <BookingDetailsFields value={value} onChange={onChange} />
        <BookingScheduleFields
          date={date}
          slots={slots}
          value={value}
          onChange={onChange}
          onDateChange={onDateChange}
        />
        <BookingTableFields tables={tables} value={value} onChange={onChange} />
      </div>
    </form>
  );
}
