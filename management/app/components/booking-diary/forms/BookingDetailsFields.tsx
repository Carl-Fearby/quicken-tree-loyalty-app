import type { BookingDraft } from '../lib/bookingTypes';
import { RoundedSelect } from '../../ui/RoundedSelect';

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
        <RoundedSelect
          ariaLabel="Guests"
          value={value.guests}
          options={Array.from({ length: 20 }, (_, index) => ({
            value: index + 1,
            label: `${index + 1} ${index ? 'guests' : 'guest'}`,
          }))}
          onChange={(guests) => onChange({ ...value, guests: Number(guests) })}
        />
      </label>
      <label className="dietary">
        Dietary requirements
        <textarea
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
