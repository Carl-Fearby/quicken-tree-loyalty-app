import { useEffect, useMemo } from 'react';
import type { BookingDraft } from '../lib/bookingTypes';
import { durationLabel, durations, today } from '../lib/bookingTimes';
import { DatePicker } from '../../ui/DatePicker';
import { RoundedSelect } from '../../ui/RoundedSelect';

type Props = {
  date: string;
  slots: string[];
  value: BookingDraft;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
};

export function BookingScheduleFields({ date, slots, value, onChange, onDateChange }: Props) {
  const availableSlots = useMemo(() => {
    if (!slots.length) return [];
    const now = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date());
    const closingMinutes =
      Number(slots.at(-1)!.slice(0, 2)) * 60 + Number(slots.at(-1)!.slice(3)) + 30;
    return slots.filter((slot) => {
      const minutes = Number(slot.slice(0, 2)) * 60 + Number(slot.slice(3));
      return (date !== today() || slot > now) && minutes + value.duration <= closingMinutes;
    });
  }, [date, slots, value.duration]);

  useEffect(() => {
    if (availableSlots.length && !availableSlots.includes(value.time))
      onChange({ ...value, time: availableSlots[0] });
  }, [availableSlots, onChange, value]);

  return (
    <>
      <label>
        Date
        <DatePicker ariaLabel="Booking date" date={date} onChange={onDateChange} />
      </label>
      <label>
        Time
        <RoundedSelect
          ariaLabel="Time"
          value={value.time}
          options={availableSlots.map((slot) => ({ value: slot, label: slot }))}
          onChange={(time) => onChange({ ...value, time: String(time) })}
        />
      </label>
      <label>
        Booking length
        <RoundedSelect
          ariaLabel="Booking length"
          value={value.duration}
          options={durations.map((duration) => ({
            value: duration,
            label: durationLabel(duration),
          }))}
          onChange={(duration) => onChange({ ...value, duration: Number(duration) })}
        />
      </label>
      <label>
        Experience
        <RoundedSelect
          ariaLabel="Experience"
          value={value.experience}
          options={['Table', 'Afternoon Tea', 'Bottomless Brunch'].map((item) => ({
            value: item,
            label: item,
          }))}
          onChange={(experience) => onChange({ ...value, experience: String(experience) })}
        />
      </label>
    </>
  );
}
