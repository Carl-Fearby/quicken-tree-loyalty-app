import type { Booking, Table } from './lib/bookingTypes';

type Props = {
  bookings: Booking[];
  slots: string[];
  tables: Table[];
  onSelect: (booking: Booking) => void;
};

export function DiaryGrid({ bookings, slots, tables, onSelect }: Props) {
  const zones = slots.reduce<{ label: string; start: number; end: number }[]>(
    (groups, slot, index) => {
      const minutes = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3));
      const label = minutes < 720 ? 'Breakfast' : minutes < 990 ? 'Lunch' : 'Dinner';
      const current = groups.at(-1);
      if (current?.label === label) current.end = index + 1;
      else groups.push({ label, start: index, end: index + 1 });
      return groups;
    },
    [],
  );

  return (
    <section className="diary-scroll">
      <div id="diary-grid" style={{ gridTemplateColumns: `150px repeat(${slots.length},64px)` }}>
        <div
          className="diary-grid-heading diary-table-heading"
          style={{ gridColumn: 1, gridRow: '1 / 3' }}
        >
          Table
        </div>
        {zones.map((zone) => (
          <div
            className="diary-service-zone"
            data-zone={zone.label.toLowerCase()}
            key={zone.label}
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
          slots.map((slot, slotIndex) => (
            <div
              className="diary-grid-cell"
              key={`${table.id}-${slot}`}
              style={{ gridColumn: slotIndex + 2, gridRow: index + 3 }}
            />
          )),
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
