import type { Table } from '../booking-diary/lib/bookingTypes';
import { RoundedSelect } from '../ui/RoundedSelect';

export function RestaurantTablesSettings({
  tables,
  onChange,
}: {
  tables: Table[];
  onChange: (tables: Table[]) => void;
}) {
  const number = (name: string) => Number(name.replace(/\D/g, '')) || '';
  const update = (index: number, key: 'number' | 'seats', value: string) =>
    onChange(
      tables.map((table, current) =>
        current === index
          ? {
              ...table,
              [key === 'number' ? 'name' : 'seats']:
                key === 'number' ? `Table ${value}` : Number(value),
            }
          : table,
      ),
    );
  return (
    <div className="table-settings-editor">
      <div className="diary-table-settings">
        {tables.map((table, index) => (
          <div className="diary-table-setting" key={table.id}>
            <label>
              Number
              <input
                aria-label="Table number"
                type="number"
                min="1"
                value={number(table.name)}
                onChange={(event) => update(index, 'number', event.target.value)}
              />
            </label>
            <label>
              Seats
              <RoundedSelect
                value={table.seats}
                ariaLabel="Seats"
                options={Array.from({ length: 20 }, (_, seats) => ({
                  value: seats + 1,
                  label: String(seats + 1),
                }))}
                onChange={(seats) => update(index, 'seats', String(seats))}
              />
            </label>
            <button
              type="button"
              className="remove-table"
              aria-label={`Remove table ${number(table.name)}`}
              onClick={() => onChange(tables.filter((_, current) => current !== index))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        className="add-table-row"
        type="button"
        onClick={() =>
          onChange([...tables, { id: -Date.now(), name: `Table ${tables.length + 1}`, seats: 2 }])
        }
      >
        + Add table
      </button>
    </div>
  );
}
