import { today } from './lib/bookingTimes';
import { DatePicker } from '../ui/DatePicker';

type Props = {
  date: string;
  onAdd: () => void;
  onChange: (date: string) => void;
  onRefresh: () => void;
  onShift: (days: number) => void;
};
export function BookingDiaryToolbar({ date, onAdd, onChange, onRefresh, onShift }: Props) {
  return (
    <div className="diary-toolbar">
      <div>
        <p className="eyebrow">BOOKING MANAGEMENT</p>
        <h1>Booking diary</h1>
      </div>
      <div className="diary-controls">
        <button onClick={() => onShift(-1)}>←</button>
        <DatePicker
          allowPast
          ariaLabel="Diary date"
          date={date}
          onChange={onChange}
          prefix="Date"
        />
        <button onClick={() => onShift(1)}>→</button>
        <button onClick={() => onChange(today())}>Today</button>
        <button onClick={onRefresh}>Refresh</button>
        <button className="danger" onClick={onAdd}>
          + Add booking
        </button>
      </div>
    </div>
  );
}
