import { RoundedSelect } from '../ui/RoundedSelect';

const windows = [0, 2, 6, 12, 24, 48, 72];

export function CancellationPolicySettings({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="cancellation-policy-settings">
      <label className="booking-duration-field">
        Free cancellation window
        <RoundedSelect
          ariaLabel="Free cancellation window"
          value={value}
          options={windows.map((hours) => ({
            value: hours,
            label: hours === 0 ? 'Until the booking time' : `${hours} hours before`,
          }))}
          onChange={(hours) => onChange(Number(hours))}
        />
      </label>
      <dl className="policy-outcomes">
        <div><dt>Before the cutoff</dt><dd>Cancel the booking and refund any booking deposit.</dd></div>
        <div><dt>After the cutoff</dt><dd>Cancel the booking and retain any booking deposit.</dd></div>
        <div><dt>Card guarantee</dt><dd>Record the late cancellation outcome for staff follow-up.</dd></div>
      </dl>
    </div>
  );
}
