import type { CSSProperties } from 'react';
import type { Table } from './lib/bookingTypes';

export function DiaryTableRow({ table, row }: { table: Table; row: number }) {
  return (
    <div className="diary-table-row" style={{ gridColumn: 1, gridRow: row } as CSSProperties}>
      {table.name}
      <small>{table.seats} seats</small>
    </div>
  );
}
