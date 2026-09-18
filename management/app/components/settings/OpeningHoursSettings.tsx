export type OpeningHour = { day: string; open: number; close: number; kitchenClose: number };
const days = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
];
const times = Array.from({ length: 49 }, (_, index) => index / 2);
const label = (value: number) =>
  value === 24
    ? 'Midnight'
    : new Intl.DateTimeFormat('en-GB', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
      })
        .format(new Date(Date.UTC(2000, 0, 1, Math.floor(value), (value % 1) * 60)))
        .replace(' ', '')
        .toLowerCase();
export function OpeningHoursSettings({
  hours,
  onChange,
}: {
  hours: OpeningHour[];
  onChange: (hours: OpeningHour[]) => void;
}) {
  const valueFor = (day: string) =>
    hours.find((hour) => hour.day === day) || {
      day,
      open: 9,
      close: 21,
      kitchenClose: day === 'sunday' ? 18 : 21,
    };
  const update = (day: string, key: 'open' | 'close' | 'kitchenClose', value: number) =>
    onChange(
      days.map(([id]) => {
        const item = valueFor(id);
        return id === day ? { ...item, [key]: value } : item;
      }),
    );
  return (
    <div className="opening-hours-editor">
      {days.map(([id, title]) => {
        const hour = valueFor(id);
        return (
          <div className="opening-hours-row" key={id}>
            <strong>{title}</strong>
            <label>
              Open
              <RoundedSelect
                ariaLabel={`${title} opening time`}
                value={hour.open}
                options={times
                  .filter((time) => time < hour.close)
                  .map((time) => ({ value: time, label: label(time) }))}
                onChange={(time) => update(id, 'open', Number(time))}
              />
            </label>
            <label>
              Venue closes
              <RoundedSelect
                ariaLabel={`${title} closing time`}
                value={hour.close}
                options={times
                  .filter((time) => time > hour.open)
                  .map((time) => ({ value: time, label: label(time) }))}
                onChange={(time) => update(id, 'close', Number(time))}
              />
            </label>
            <label>
              Kitchen closes
              <RoundedSelect
                ariaLabel={`${title} kitchen closing time`}
                value={hour.kitchenClose}
                options={times
                  .filter((time) => time > hour.open && time <= hour.close)
                  .map((time) => ({ value: time, label: label(time) }))}
                onChange={(time) => update(id, 'kitchenClose', Number(time))}
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
import { RoundedSelect } from '../ui/RoundedSelect';
