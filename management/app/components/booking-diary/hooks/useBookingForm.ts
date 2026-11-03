import { useState } from 'react';
import type { Booking, BookingDraft } from '../lib/bookingTypes';

export const toDraft = (booking: Booking): BookingDraft => ({
  name: booking.name,
  contactEmail: booking.contactEmail || '',
  guests: booking.guests,
  time: booking.time.slice(0, 5),
  duration: booking.durationMinutes || 90,
  experience: booking.experience,
  dietary: (booking.dietaryNeeds || []).join(', '),
  customerDietaryNeeds: booking.customerDietaryNeeds || [],
  customerTastes: booking.customerTastes || [],
  customerTags: booking.customerTags || [],
  notes: booking.notes || '',
  tableIds: booking.assignedTableIds || [],
  depositStatus: 'none',
  depositAmountPence: 0,
});

export function useBookingForm() {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const open = (initial: BookingDraft) => setDraft(initial);
  const close = () => setDraft(null);
  return { close, draft, open, setDraft };
}
