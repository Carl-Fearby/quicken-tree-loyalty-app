import type { FormEvent } from 'react';
import type { BookingDraft, Table } from '../lib/bookingTypes';
import { BookingDetailsFields } from './BookingDetailsFields';
import { BookingScheduleFields } from './BookingScheduleFields';
import { BookingTableFields } from './BookingTableFields';

type Props = {
  date: string;
  slots: string[];
  kitchenClose?: number;
  tables: Table[];
  value: BookingDraft;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onSubmit: (event: FormEvent) => void;
  readOnly?: boolean;
  preserveCurrentSchedule?: boolean;
};

export function BookingForm({
  date,
  slots,
  kitchenClose,
  tables,
  value,
  onChange,
  onDateChange,
  onSubmit,
  readOnly = false,
  preserveCurrentSchedule = false,
}: Props) {
  return (
    <form onSubmit={onSubmit}>
      <fieldset className="booking-fields booking-fields-set" disabled={readOnly}>
        <BookingDetailsFields value={value} onChange={onChange} />
        <BookingScheduleFields
          date={date}
          slots={slots}
          kitchenClose={kitchenClose}
          value={value}
          onChange={onChange}
          onDateChange={onDateChange}
          preserveCurrentSelection={preserveCurrentSchedule}
        />
        <BookingTableFields tables={tables} value={value} onChange={onChange} />
      </fieldset>
    </form>
  );
}
