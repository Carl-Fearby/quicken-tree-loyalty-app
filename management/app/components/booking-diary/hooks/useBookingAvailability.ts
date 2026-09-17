import { useMemo } from 'react';
import type { Booking, BookingDraft, Table } from '../lib/bookingTypes';

export function useBookingAvailability({
  bookings,
  draft,
  slots,
  tables,
}: {
  bookings: Booking[];
  draft: BookingDraft | null;
  slots: string[];
  tables: Table[];
}) {
  return useMemo(() => {
    if (!draft) return [];
    const start = slots.indexOf(draft.time);
    const length = Math.ceil(draft.duration / 30);
    return tables.filter(
      (table) =>
        table.seats >= draft.guests &&
        !bookings.some(
          (booking) =>
            (booking.assignedTableIds || []).includes(table.id) &&
            start <
              slots.indexOf(booking.time.slice(0, 5)) +
                Math.ceil((booking.durationMinutes || 90) / 30) &&
            slots.indexOf(booking.time.slice(0, 5)) < start + length,
        ),
    );
  }, [bookings, draft, slots, tables]);
}
