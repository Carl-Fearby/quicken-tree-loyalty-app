import type { Booking, Table } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

type Props = {
  booking: Booking;
  tables: Table[];
  onAssign: (tableId: number | null) => void;
  onClose: () => void;
};

export function AssignTableModal({ booking, tables, onAssign, onClose }: Props) {
  const matching = tables.filter((table) => table.seats >= booking.guests);
  return (
    <ModalShell title="Assign a table" onClose={onClose}>
      <p>
        {booking.name} · {booking.guests} guests · {booking.time.slice(0, 5)}
      </p>
      <div className="table-assignment-options">
        {booking.assignedTableIds?.length ? (
          <button className="clear-table-assignment" type="button" onClick={() => onAssign(null)}>
            Remove table assignment
          </button>
        ) : null}
        {matching.length ? (
          matching.map((table) => (
            <button
              className="table-assignment-option"
              type="button"
              key={table.id}
              onClick={() => onAssign(table.id)}
            >
              {table.name} · {table.seats} seats
            </button>
          ))
        ) : (
          <p>No tables have enough seats for this booking.</p>
        )}
      </div>
    </ModalShell>
  );
}
