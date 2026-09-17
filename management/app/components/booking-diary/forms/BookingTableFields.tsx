import type { BookingDraft, Table } from '../lib/bookingTypes';

type Props = { tables: Table[]; value: BookingDraft; onChange: (value: BookingDraft) => void };

export function BookingTableFields({ tables, value, onChange }: Props) {
  return (
    <label>
      Suggested table
      <select
        value={value.tableIds[0] || ''}
        onChange={(event) =>
          onChange({ ...value, tableIds: event.target.value ? [Number(event.target.value)] : [] })
        }
      >
        <option value="">Choose after saving</option>
        {tables.map((table) => (
          <option key={table.id} value={table.id}>
            {table.name} · {table.seats} seats
          </option>
        ))}
      </select>
    </label>
  );
}
