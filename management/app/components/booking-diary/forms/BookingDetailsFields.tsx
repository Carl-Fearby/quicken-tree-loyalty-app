import type { BookingDraft } from '../lib/bookingTypes';
import { RoundedSelect } from '../../ui/RoundedSelect';

type Props = { value: BookingDraft; onChange: (value: BookingDraft) => void };

export function BookingDetailsFields({ value, onChange }: Props) {
  const hasCustomerProfile = value.customerDietaryNeeds.length || value.customerTastes.length || value.customerTags.length;
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
      <label className="booking-contact-email">
        Contact email
        <input
          type="email"
          value={value.contactEmail}
          placeholder="Optional, used to match a customer"
          onChange={(event) => onChange({ ...value, contactEmail: event.target.value })}
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
      {Boolean(hasCustomerProfile) && <section className="booking-customer-profile" aria-label="Saved customer preferences">
        <div><i className="fa-solid fa-user-check" aria-hidden="true"/><strong>Saved customer profile</strong></div>
        {value.customerDietaryNeeds.length > 0 && <p><b>Dietary and allergens</b><span>{value.customerDietaryNeeds.join(' · ')}</span></p>}
        {value.customerTastes.length > 0 && <p><b>Tastes</b><span>{value.customerTastes.join(' · ')}</span></p>}
        {value.customerTags.length > 0 && <p><b>Tags</b><span>{value.customerTags.join(' · ')}</span></p>}
      </section>}
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
