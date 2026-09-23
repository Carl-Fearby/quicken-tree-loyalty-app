'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarPopover } from './CalendarPopover';

const displayDate = (value: string, placeholder: string) =>
  value ? new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`)) : placeholder;

export function DatePicker({
  date,
  onChange,
  ariaLabel = 'Choose date',
  prefix,
  align = 'left',
  allowPast = false,
  yearSelection = false,
  maxDate,
  placeholder = 'Select date',
}: {
  date: string;
  onChange: (date: string) => void;
  ariaLabel?: string;
  prefix?: string;
  align?: 'left' | 'right';
  allowPast?: boolean;
  yearSelection?: boolean;
  maxDate?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  return (
    <div className={`date-picker date-picker--${align}`} ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className="date-picker-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        {prefix && <span>{prefix}</span>}
        <span>{displayDate(date, placeholder)}</span>
      </button>
      {open && (
        <CalendarPopover
          allowPast={allowPast}
          yearSelection={yearSelection}
          maxDate={maxDate}
          date={date}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
