import { useEffect, useState } from 'react';
import type { BookingDraft, Table } from '../lib/bookingTypes';

export function useBookingAvailability({
  date,
  draft,
}: {
  date: string;
  draft: BookingDraft | null;
}) {
  const [tables, setTables] = useState<Table[]>([]);
  useEffect(() => {
    if (!draft?.time) {
      setTables([]);
      return;
    }
    const controller = new AbortController();
    const query = new URLSearchParams({
      date,
      time: draft.time,
      guests: String(draft.guests),
      durationMinutes: String(draft.duration),
    });
    void fetch(`/api/diary/availability?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.message || 'Unable to check table availability.');
        setTables(data.tables || []);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setTables([]);
      });
    return () => controller.abort();
  }, [date, draft?.time, draft?.guests, draft?.duration]);
  return tables;
}
