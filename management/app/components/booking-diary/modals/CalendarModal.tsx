import { useState } from 'react';
import { ModalShell } from './ModalShell';

const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const monthLabel = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    value,
  );

export function CalendarModal({
  date,
  onChange,
  onClose,
}: {
  date: string;
  onChange: (date: string) => void;
  onClose: () => void;
}) {
  const selected = new Date(`${date}T12:00:00Z`);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1)),
  );
  const monthStart = visibleMonth;
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(1 - ((monthStart.getUTCDay() + 6) % 7));
  const today = isoDate(new Date());
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + index);
    return day;
  });
  const choose = (value: string) => {
    if (value < today) return;
    onChange(value);
    onClose();
  };

  return (
    <ModalShell title="Choose date" onClose={onClose}>
      <div className="calendar-header">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => {
            const previous = new Date(visibleMonth);
            previous.setUTCMonth(previous.getUTCMonth() - 1);
            setVisibleMonth(previous);
          }}
        >
          ←
        </button>
        <b>{monthLabel(visibleMonth)}</b>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => {
            const next = new Date(visibleMonth);
            next.setUTCMonth(next.getUTCMonth() + 1);
            setVisibleMonth(next);
          }}
        >
          →
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((day) => {
          const value = isoDate(day);
          const outsideMonth = day.getUTCMonth() !== visibleMonth.getUTCMonth();
          return (
            <button
              type="button"
              key={value}
              disabled={value < today}
              aria-current={value === date ? 'date' : undefined}
              className={outsideMonth ? 'outside-month' : undefined}
              onClick={() => choose(value)}
            >
              {day.getUTCDate()}
            </button>
          );
        })}
      </div>
    </ModalShell>
  );
}
