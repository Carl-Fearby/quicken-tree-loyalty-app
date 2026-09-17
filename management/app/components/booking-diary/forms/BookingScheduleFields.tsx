import type { BookingDraft } from '../lib/bookingTypes';
import { durationLabel, durations, today } from '../lib/bookingTimes';

type Props = {
  date: string;
  slots: string[];
  value: BookingDraft;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
};

export function BookingScheduleFields({ date, slots, value, onChange, onDateChange }: Props) {
  return (
    <>
      <label>
        Date
        <input
          type="date"
          value={date}
          min={today()}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </label>
      <label>
        Time
        <select
          value={value.time}
          onChange={(event) => onChange({ ...value, time: event.target.value })}
        >
          {slots.map((slot) => (
            <option key={slot}>{slot}</option>
          ))}
        </select>
      </label>
      <label>
        Booking length
        <select
          value={value.duration}
          onChange={(event) => onChange({ ...value, duration: Number(event.target.value) })}
        >
          {durations.map((duration) => (
            <option key={duration} value={duration}>
              {durationLabel(duration)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Experience
        <select
          value={value.experience}
          onChange={(event) => onChange({ ...value, experience: event.target.value })}
        >
          {['Table', 'Afternoon Tea', 'Bottomless Brunch'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
    </>
  );
}
