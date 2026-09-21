'use client';

import { useEffect, useRef, useState } from 'react';

type SelectValue = string | number;
type Option = { value: SelectValue; label: string };

export function RoundedSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: SelectValue;
  options: Option[];
  onChange: (value: SelectValue) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => String(option.value) === String(value));

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
    <div className="rounded-select" ref={ref}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="rounded-select-trigger"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || 'Choose an option'}</span>
        <span aria-hidden="true" className="rounded-select-chevron" />
      </button>
      {open && (
        <div aria-label={ariaLabel} className="rounded-select-menu" role="listbox">
          {options.map((option) => {
            const active = String(option.value) === String(value);
            return (
              <button
                aria-selected={active}
                className="rounded-select-option"
                key={String(option.value)}
                role="option"
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
