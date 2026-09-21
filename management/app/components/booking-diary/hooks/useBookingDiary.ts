import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Booking, Diary } from '../lib/bookingTypes';

export function useBookingDiary(date: string) {
  const [diary, setDiary] = useState<Diary | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setError('');
      const response = await fetch(`/api/diary?date=${date}`);
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to load booking diary.');
      setDiary(body);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load booking diary.');
    }
  }, [date]);
  useEffect(() => {
    void load();
  }, [load]);
  const bookings = useMemo(
    () => diary?.bookings.filter((booking: Booking) => booking.status !== 'cancelled') ?? [],
    [diary],
  );
  const slots = useMemo(() => {
    if (!diary?.openingHours) return [];
    const allSlots = Array.from(
      { length: (diary.openingHours.close - diary.openingHours.open) * 2 },
      (_, index) => {
        const minutes = diary.openingHours!.open * 60 + index * 30;
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      },
    );
    return allSlots;
  }, [diary]);
  return { bookings, diary, error, load, setError, slots };
}
