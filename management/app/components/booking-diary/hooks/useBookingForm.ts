import { useState } from 'react';
import type { Booking, BookingDraft } from '../lib/bookingTypes';

export const toDraft = (booking: Booking): BookingDraft => ({
  name: booking.name,
  guests: booking.guests,
  time: booking.time.slice(0, 5),
  duration: booking.durationMinutes || 90,
  experience: booking.experience,
  dietary: (booking.dietaryNeeds || []).join(', '),
  notes: booking.notes || '',
  tableIds: booking.assignedTableIds || [],
});

export function useBookingForm() {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const open = (initial: BookingDraft) => setDraft(initial);
  const close = () => setDraft(null);
  return { close, draft, open, setDraft };
}
