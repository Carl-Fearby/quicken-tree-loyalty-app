import { useEffect, useRef, useState } from 'react';
import type { Booking, Table } from './lib/bookingTypes';

type Props = {
  bookings: Booking[];
  date: string;
  slots: string[];
  kitchenClose?: number;
  kitchenOpen?: number;
  tables: Table[];
  onSelect: (booking: Booking) => void;
};

const londonDate = (value: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

const londonMinutes = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const part = (type: 'hour' | 'minute') => Number(parts.find((item) => item.type === type)?.value);
  return part('hour') * 60 + part('minute');
};

const tableColumnWidth = 150;
const slotWidth = 56;

export function DiaryGrid({ bookings, date, slots, kitchenClose, kitchenOpen, tables, onSelect }: Props) {
  const [now, setNow] = useState(() => new Date());
  const scrollRef = useRef<HTMLElement>(null);
  const currentTimeRef = useRef<HTMLDivElement>(null);
  const centredGridKey = useRef('');
  useEffect(() => {
    const update = () => setNow(new Date());
    const timeout = window.setTimeout(update, 60_000 - (Date.now() % 60_000));
    const interval = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const zones = slots.reduce<{ label: string; start: number; end: number }[]>(
    (groups, slot, index) => {
      const minutes = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3));
      const label =
        minutes < (kitchenOpen ?? 0) * 60 || minutes >= (kitchenClose ?? 24) * 60
          ? 'Kitchen closed'
          : minutes < 720
            ? 'Breakfast'
            : minutes < 990
              ? 'Lunch'
              : 'Dinner';
      const current = groups.at(-1);
      if (current?.label === label) current.end = index + 1;
      else groups.push({ label, start: index, end: index + 1 });
      return groups;
    },
    [],
  );
  const startMinutes = slots.length
    ? Number(slots[0].slice(0, 2)) * 60 + Number(slots[0].slice(3))
    : 0;
  const minutesFromStart = londonMinutes(now) - startMinutes;
  const showCurrentTime =
    date === londonDate(now) && minutesFromStart >= 0 && minutesFromStart <= slots.length * 30;
  const currentTimePosition = tableColumnWidth + (minutesFromStart / 30) * slotWidth;
  const gridKey = `${date}:${slots.join(',')}`;

  useEffect(() => {
    if (!showCurrentTime) {
      centredGridKey.current = '';
      return;
    }
    if (centredGridKey.current === gridKey) return;
    const animationFrame = window.requestAnimationFrame(() => {
      const scroll = scrollRef.current;
      const currentTime = currentTimeRef.current;
      if (!scroll || !currentTime) return;
      const scrollBounds = scroll.getBoundingClientRect();
      const currentTimeBounds = currentTime.getBoundingClientRect();
      const timelineCentre =
        scrollBounds.left + tableColumnWidth + (scrollBounds.width - tableColumnWidth) / 2;
      scroll.scrollLeft += currentTimeBounds.left + currentTimeBounds.width / 2 - timelineCentre;
      centredGridKey.current = gridKey;
    });
    return () => window.cancelAnimationFrame(animationFrame);
  }, [currentTimePosition, gridKey, showCurrentTime]);

  return (
    <section className="diary-scroll" ref={scrollRef}>
      <div
        id="diary-grid"
        style={{
          gridTemplateColumns: `${tableColumnWidth}px repeat(${slots.length},${slotWidth}px)`,
        }}
      >
        {showCurrentTime && (
          <div
            aria-label="Current time"
            className="diary-current-time"
            ref={currentTimeRef}
            style={{ left: `${currentTimePosition}px` }}
          />
        )}
        <div
          className="diary-grid-heading diary-table-heading"
          style={{ gridColumn: 1, gridRow: '1 / 3' }}
        >
          Table
        </div>
        {zones.map((zone, zoneIndex) => (
          <div
            className="diary-service-zone"
            data-zone={zone.label.toLowerCase()}
            key={`${zone.label}-${zoneIndex}`}
            style={{ gridColumn: `${zone.start + 2} / ${zone.end + 2}`, gridRow: 1 }}
          >
            <span>{zone.label}</span>
            <i aria-hidden="true" />
          </div>
        ))}
        {slots.map((slot, index) => (
          <div
            className="diary-grid-heading"
            key={slot}
            style={{ gridColumn: index + 2, gridRow: 2 }}
          >
            {slot}
          </div>
        ))}
        {tables.map((table, index) => (
          <div
            className="diary-table-row"
            key={table.id}
            style={{ gridColumn: 1, gridRow: index + 3 }}
          >
            {table.name}
            <small>{table.seats} seats</small>
          </div>
        ))}
        {tables.flatMap((table, index) =>
          slots.map((slot, slotIndex) => {
            const slotMinutes = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3));
            const isClosed = slotMinutes < (kitchenOpen ?? 0) * 60 || slotMinutes >= (kitchenClose ?? 24) * 60;
            return (
              <div
                className={`diary-grid-cell${isClosed ? ' kitchen-closed-cell' : ''}`}
                key={`${table.id}-${slot}`}
                style={{ gridColumn: slotIndex + 2, gridRow: index + 3 }}
              />
            );
          }),
        )}
        {bookings.flatMap((booking) =>
          (booking.assignedTableIds || []).map((tableId) => {
            const row = tables.findIndex((table) => table.id === tableId);
            const start = slots.indexOf(booking.time.slice(0, 5));
            return row < 0 || start < 0 ? null : (
              <button
                key={`${booking.id}-${tableId}`}
                className="booking-block"
                style={{
                  gridColumn: `${start + 2}/${start + 2 + Math.ceil((booking.durationMinutes || 90) / 30)}`,
                  gridRow: row + 3,
                }}
                onClick={() => onSelect(booking)}
              >
                {booking.name}
              </button>
            );
          }),
        )}
      </div>
    </section>
  );
}
