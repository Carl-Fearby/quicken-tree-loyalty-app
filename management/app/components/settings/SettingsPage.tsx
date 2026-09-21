'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Table } from '../booking-diary/lib/bookingTypes';
import { today } from '../booking-diary/lib/bookingTimes';
import { BookingDurationSettings } from './BookingDurationSettings';
import { DatabaseAccessDialog, DatabaseManagement } from './DatabaseManagement';
import { OpeningHoursSettings, type OpeningHour } from './OpeningHoursSettings';
import { RestaurantTablesSettings } from './RestaurantTablesSettings';
import { SettingsHome } from './SettingsHome';
import { MenuSymbolSettings } from './MenuSymbolSettings';
import { MenuMaintenance } from '../menu-maintenance/MenuMaintenance';
import { Breadcrumbs } from '../ui/Breadcrumbs';

export type SettingsView = 'home' | 'tables' | 'duration' | 'hours' | 'database' | 'menu' | 'menu-symbols';
export function SettingsPage({
  view,
}: {
  view: SettingsView;
}) {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]),
    [duration, setDuration] = useState(90),
    [hours, setHours] = useState<OpeningHour[]>([]),
    [databaseGateOpen, setDatabaseGateOpen] = useState(false),
    [message, setMessage] = useState('');

  const navigate = (nextView: SettingsView) => {
    // Always use Next.js router for file-based routing
    if (nextView === 'home') {
      router.push('/configuration');
    } else {
      router.push(`/configuration/${nextView}`);
    }
  };
  useEffect(() => {
    void fetch(`/api/diary?date=${today()}`)
      .then((response) => response.json())
      .then((data) => {
        setTables(data.tables || []);
        setDuration(data.bookingSettings?.defaultDurationMinutes || 90);
      });
  }, []);
  useEffect(() => {
    if (view === 'hours')
      void fetch('/api/opening-hours')
        .then((response) => response.json())
        .then((data) => setHours(data.hours || []));
  }, [view]);
  const save = async () => {
    setMessage('Saving…');
    const request =
      view === 'tables'
        ? [
            '/api/booking-tables',
            {
              tables: tables.map(({ id, name, seats }) => ({
                id: id > 0 ? id : null,
                number: Number(name.replace(/\D/g, '')) || undefined,
                seats,
              })),
            },
          ]
        : view === 'duration'
          ? ['/api/booking-settings', { defaultDurationMinutes: duration }]
          : ['/api/opening-hours', { hours }];
    const response = await fetch(request[0] as string, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request[1]),
    });
    const body = await response.json();
    setMessage(response.ok ? 'Saved.' : body.message || 'Unable to save settings.');
  };
  if (view === 'home')
    return (
      <>
        <SettingsHome
          onOpen={(nextView) =>
            nextView === 'database' ? setDatabaseGateOpen(true) : navigate(nextView)
          }
        />
        {databaseGateOpen && (
          <DatabaseAccessDialog
            onClose={() => setDatabaseGateOpen(false)}
            onUnlock={() => {
              setDatabaseGateOpen(false);
              navigate('database');
            }}
          />
        )}
      </>
    );
  if (view === 'database') return <DatabaseManagement onBack={() => navigate('home')} />;
  if (view === 'menu') return <MenuMaintenance onBack={() => navigate('home')} />;
  if (view === 'menu-symbols') return <MenuSymbolSettings onBack={() => navigate('home')} />;
  const title =
    view === 'tables'
      ? 'Restaurant tables'
      : view === 'duration'
        ? 'Booking duration'
        : 'Opening & kitchen hours';
  return (
    <section className="settings-page">
      <Breadcrumbs current={title} onSettings={() => navigate('home')} />
      <p className="eyebrow">SYSTEM SETTINGS</p>
      <h1>{title}</h1>
      <p className="settings-intro">
        {view === 'tables'
          ? 'Manage tables available in the booking diary.'
          : view === 'duration'
            ? 'Set the default length used when creating new table bookings.'
            : 'Set venue hours and the kitchen closing time for each day. Bookings must start before the kitchen closes and finish by venue closing.'}
      </p>
      <section className="settings-card">
        {view === 'tables' ? (
          <RestaurantTablesSettings tables={tables} onChange={setTables} />
        ) : view === 'duration' ? (
          <BookingDurationSettings value={duration} onChange={setDuration} />
        ) : (
          <OpeningHoursSettings hours={hours} onChange={setHours} />
        )}
        <div className="settings-actions">
          <p role="status">{message}</p>
          <button className="primary" type="button" onClick={() => void save()}>
            Save changes
          </button>
        </div>
      </section>
    </section>
  );
}
