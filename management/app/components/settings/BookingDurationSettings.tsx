import { durationLabel, durations } from '../booking-diary/lib/bookingTimes';
import { RoundedSelect } from '../ui/RoundedSelect';

export function BookingDurationSettings({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="booking-duration-field">
      Default booking length
      <RoundedSelect
        ariaLabel="Default booking length"
        options={durations.map((duration) => ({ value: duration, label: durationLabel(duration) }))}
        value={value}
        onChange={(duration) => onChange(Number(duration))}
      />
    </label>
  );
}
