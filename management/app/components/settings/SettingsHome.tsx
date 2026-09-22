import type { SettingsView } from './SettingsPage';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { useManagementUser } from '../../contexts/ManagementAuth';

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
    'Configure open hours',
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
    'rewards',
    'Rewards settings',
    'Control reward availability across the back office and customer loyalty app.',
    'Open rewards settings',
  ],
  [
    'users',
    'Users',
    'Manage back-office users, roles, passwords and access.',
    'Manage users',
  ],
  [
    'database',
    'Database management',
    'Inspect database tables and make controlled record-level changes.',
    'Open database management',
  ],
] as const;

export function SettingsHome({ onOpen }: Props) {
  const user = useManagementUser();
  const permissionByView: Partial<Record<SettingsView, string>> = {
    tables: 'configuration.tables',
    duration: 'configuration.duration',
    hours: 'configuration.hours',
    menu: 'configuration.menu',
    'menu-symbols': 'configuration.symbols',
    rewards: 'configuration.rewards',
    users: 'configuration.users',
    database: 'configuration.database',
  };
  return (
    <section className="settings-home">
      <Breadcrumbs current="System settings" />
      <p className="eyebrow">BACK-OFFICE SETTINGS</p>
      <h1>System settings</h1>
      <p className="settings-intro">
        Configure this venue across bookings, menus, data and member experiences.
      </p>
      <div className="settings-options">
        {options.filter(([view]) => user.permissions[permissionByView[view] || ''] !== 'none').map(([view, title, copy, action]) => (
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
