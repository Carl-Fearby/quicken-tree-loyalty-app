import type { BookingDraft } from '../lib/bookingTypes';

type Props = { value: BookingDraft; onChange: (value: BookingDraft) => void };

export function BookingDetailsFields({ value, onChange }: Props) {
  return (
    <>
      <label>
        Guest name
        <input
          required
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
        />
      </label>
      <label>
        Guests
        <select
          value={value.guests}
          onChange={(event) => onChange({ ...value, guests: Number(event.target.value) })}
        >
          {Array.from({ length: 20 }, (_, index) => (
            <option key={index} value={index + 1}>
              {index + 1} {index ? 'guests' : 'guest'}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dietary requirements
        <input
          value={value.dietary}
          placeholder="e.g. No nuts, vegetarian"
          onChange={(event) => onChange({ ...value, dietary: event.target.value })}
        />
      </label>
      <label className="notes">
        Notes
        <textarea
          value={value.notes}
          placeholder="Optional notes"
          onChange={(event) => onChange({ ...value, notes: event.target.value })}
        />
      </label>
    </>
  );
}
