import type { Booking, Table } from './lib/bookingTypes';

type Props = {
  bookings: Booking[];
  slots: string[];
  tables: Table[];
  onSelect: (booking: Booking) => void;
};

export function DiaryGrid({ bookings, slots, tables, onSelect }: Props) {
  return (
    <section className="diary-scroll">
      <div id="diary-grid" style={{ gridTemplateColumns: `150px repeat(${slots.length},64px)` }}>
        <div className="diary-grid-heading diary-table-heading">Table</div>
        {slots.map((slot) => (
          <div className="diary-grid-heading" key={slot}>
            {slot}
          </div>
        ))}
        {tables.map((table, index) => (
          <div
            className="diary-table-row"
            key={table.id}
            style={{ gridColumn: 1, gridRow: index + 2 }}
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
              style={{ gridColumn: slotIndex + 2, gridRow: index + 2 }}
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
                  gridRow: row + 2,
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
