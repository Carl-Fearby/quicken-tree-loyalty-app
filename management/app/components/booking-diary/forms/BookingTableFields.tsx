import { useEffect } from 'react';
import type { BookingDraft, Table } from '../lib/bookingTypes';
import { RoundedSelect } from '../../ui/RoundedSelect';

type Props = { tables: Table[]; value: BookingDraft; onChange: (value: BookingDraft) => void };

export function BookingTableFields({ tables, value, onChange }: Props) {
  useEffect(() => {
    const current = value.tableIds[0];
    if (tables.length && !tables.some((table) => table.id === current))
      onChange({ ...value, tableIds: [tables[0].id] });
  }, [tables, value, onChange]);

  return (
    <label>
      Suggested table
      <RoundedSelect
        ariaLabel="Suggested table"
        value={value.tableIds[0] || ''}
        options={[
          {
            value: '',
            label: tables.length ? 'Choose a suitable table' : 'No suitable table available',
          },
          ...tables.map((table) => ({
            value: table.id,
            label: `${table.name} · ${table.seats} seats`,
          })),
        ]}
        onChange={(tableId) => onChange({ ...value, tableIds: tableId ? [Number(tableId)] : [] })}
      />
    </label>
  );
}
