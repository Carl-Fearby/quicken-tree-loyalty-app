import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Booking, Diary } from '../lib/bookingTypes';

export function useBookingDiary(date: string, enabled = true) {
  const [diary, setDiary] = useState<Diary | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      setError('');
      const response = await fetch(`/api/diary?date=${date}`);
      if (response.status === 401 && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        setDiary(null);
        window.location.replace('/login');
        return;
      }
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to load booking diary.');
      setDiary(body);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load booking diary.');
    }
  }, [date, enabled]);
  useEffect(() => {
    void load();
  }, [load]);
  const currentDiary = diary?.date === date && enabled ? diary : null;
  const bookings = useMemo(
    () => currentDiary?.bookings.filter((booking: Booking) => booking.status !== 'cancelled') ?? [],
    [currentDiary],
  );
  const slots = useMemo(() => {
    if (!currentDiary?.openingHours) return [];
    const allSlots = Array.from(
      { length: (currentDiary.openingHours.close - currentDiary.openingHours.open) * 2 },
      (_, index) => {
        const minutes = currentDiary.openingHours!.open * 60 + index * 30;
        return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
      },
    );
    return allSlots;
  }, [currentDiary]);
  return { bookings, diary: currentDiary, error, load, setError, slots };
}
