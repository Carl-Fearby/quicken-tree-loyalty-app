import type { SettingsView } from './SettingsPage';

type Props = { onOpen: (view: SettingsView) => void };

const options = [
  [
    'tables',
    'Restaurant tables',
    'Set table numbers and capacities for the booking diary.',
    'Configure tables',
  ],
  [
    'duration',
    'Booking duration',
    'Set the default length used for new table bookings.',
    'Configure duration',
  ],
  [
    'hours',
    'Opening & kitchen hours',
    'Configure venue hours and daily kitchen closing times.',
    'Configure opening hours',
  ],
  [
    'menu',
    'Menu maintenance',
    'Manage customer menus, sections, dishes, prices and availability.',
    'Open menu maintenance',
  ],
  [
    'menu-symbols',
    'Dietary & allergen symbols',
    'Manage white-label dietary keys, allergen colours and icons.',
    'Edit menu symbols',
  ],
  [
    'database',
    'Database management',
    'Inspect database tables and make controlled record-level changes.',
    'Open database management',
  ],
] as const;

export function SettingsHome({ onOpen }: Props) {
  return (
    <section className="settings-home">
      <p className="eyebrow">BACK-OFFICE SETTINGS</p>
      <h1>System settings</h1>
      <p className="settings-intro">
        Configure this venue across bookings, menus, data and member experiences.
      </p>
      <div className="settings-options">
        {options.map(([view, title, copy, action]) => (
          <section className="settings-card" key={view}>
            <h2>{title}</h2>
            <p>{copy}</p>
            <button type="button" onClick={() => onOpen(view)}>
              {action}
            </button>
          </section>
        ))}
      </div>
    </section>
  );
}
