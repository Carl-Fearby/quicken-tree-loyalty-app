'use client';

import { useState } from 'react';
import { today } from '../booking-diary/lib/bookingTimes';

const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const monthLabel = (value: Date) =>
  new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    value,
  );

export function CalendarPopover({
  date,
  onChange,
  onClose,
  allowPast = false,
  yearSelection = false,
  maxDate,
}: {
  date: string;
  onChange: (date: string) => void;
  onClose: () => void;
  allowPast?: boolean;
  yearSelection?: boolean;
  maxDate?: string;
}) {
  const selected = date ? new Date(`${date}T12:00:00Z`) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1)),
  );
  const gridStart = new Date(visibleMonth);
  gridStart.setUTCDate(1 - ((visibleMonth.getUTCDay() + 6) % 7));
  const minimumDate = today();
  const latestYear = Number((maxDate || today()).slice(0, 4));
  const years = Array.from({ length: Math.max(1, latestYear - 1899) }, (_, index) => latestYear - index);
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + index);
    return day;
  });

  const choose = (value: string) => {
    if ((!allowPast && value < minimumDate) || (maxDate && value > maxDate)) return;
    onChange(value);
    onClose();
  };

  return (
    <div aria-label="Choose date" className="date-picker-popover" role="dialog">
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
        {yearSelection ? (
          <span className="calendar-month-year">
            <select aria-label="Month" value={visibleMonth.getUTCMonth()} onChange={(event) => setVisibleMonth(new Date(Date.UTC(visibleMonth.getUTCFullYear(), Number(event.target.value), 1)))}>
              {Array.from({ length: 12 }, (_, month) => <option key={month} value={month}>{new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, month, 1)))}</option>)}
            </select>
            <select aria-label="Year" value={visibleMonth.getUTCFullYear()} onChange={(event) => setVisibleMonth(new Date(Date.UTC(Number(event.target.value), visibleMonth.getUTCMonth(), 1)))}>
              {years.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </span>
        ) : <b>{monthLabel(visibleMonth)}</b>}
        <button
          type="button"
          aria-label="Next month"
          disabled={Boolean(maxDate && isoDate(new Date(Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth() + 1, 1))) > maxDate)}
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
              disabled={(!allowPast && value < minimumDate) || Boolean(maxDate && value > maxDate)}
              aria-current={value === date ? 'date' : undefined}
              className={outsideMonth ? 'outside-month' : undefined}
              onClick={() => choose(value)}
            >
              {day.getUTCDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
