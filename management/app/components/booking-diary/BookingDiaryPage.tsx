'use client';
import { FormEvent, useState } from 'react';
import { BookingList } from './BookingList';
import { DiaryGrid } from './DiaryGrid';
import { AddBookingModal } from './modals/AddBookingModal';
import { AssignTableModal } from './modals/AssignTableModal';
import { EditBookingModal } from './modals/EditBookingModal';
import { OrderDetailsModal } from './modals/OrderDetailsModal';
import { CalendarModal } from './modals/CalendarModal';
import { CancelBookingDialog } from './modals/CancelBookingDialog';
import { useBookingAvailability } from './hooks/useBookingAvailability';
import { useBookingDiary } from './hooks/useBookingDiary';
type Table = { id: number; name: string; seats: number };
type Booking = {
  id: string;
  name: string;
  time: string;
  guests: number;
  experience: string;
  status: string;
  notes?: string;
  dietaryNeeds?: string[];
  assignedTableName?: string;
  assignedTableIds?: number[];
  durationMinutes?: number;
};
type Diary = {
  date: string;
  tables: Table[];
  bookings: Booking[];
  openingHours: { open: number; close: number } | null;
  bookingSettings: { defaultDurationMinutes: number };
};
type Draft = {
  name: string;
  guests: number;
  time: string;
  duration: number;
  experience: string;
  dietary: string;
  notes: string;
  tableIds: number[];
};
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
export default function BookingDiaryPage() {
  const [date, setDate] = useState(today),
    [draft, setDraft] = useState<Draft | null>(null),
    [editing, setEditing] = useState<Booking | null>(null),
    [assigning, setAssigning] = useState<Booking | null>(null),
    [orderDetails, setOrderDetails] = useState<Booking | null>(null),
    [calendarOpen, setCalendarOpen] = useState(false),
    [cancelling, setCancelling] = useState<Booking | null>(null),
    [saving, setSaving] = useState(false);
  const { bookings: active, diary, error, load, setError, slots } = useBookingDiary(date);
  const candidates = useBookingAvailability({
    bookings: active,
    draft,
    slots,
    tables: diary?.tables ?? [],
  });
  const begin = () =>
    setDraft({
      name: '',
      guests: 2,
      time: slots[0] || '',
      duration: diary?.bookingSettings.defaultDurationMinutes || 90,
      experience: 'Table',
      dietary: '',
      notes: '',
      tableIds: [],
    });
  const save = async (event: FormEvent, existing?: Booking) => {
    event.preventDefault();
    const value = existing
      ? {
          name: existing.name,
          guests: existing.guests,
          time: existing.time.slice(0, 5),
          duration: existing.durationMinutes || 90,
          experience: existing.experience,
          dietary: (existing.dietaryNeeds || []).join(', '),
          notes: existing.notes || '',
          tableIds: existing.assignedTableIds || [],
        }
      : draft;
    if (!value) return;
    setSaving(true);
    try {
      const response = await fetch(
          existing ? `/api/diary/bookings/${existing.id}` : '/api/diary/bookings',
          {
            method: existing ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date,
              time: value.time,
              name: value.name,
              guests: value.guests,
              durationMinutes: value.duration,
              experience: value.experience,
              notes: value.notes,
              dietaryNeeds: value.dietary
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              tableIds: value.tableIds,
            }),
          },
        ),
        body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to save booking.');
      setDraft(null);
      setEditing(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save booking.');
    } finally {
      setSaving(false);
    }
  };
  const cancelBooking = async () => {
    if (!cancelling) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/diary/bookings/${cancelling.id}/cancel`, {
        method: 'POST',
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to cancel booking.');
      setCancelling(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to cancel booking.');
    } finally {
      setSaving(false);
    }
  };
  const assignTable = async (tableId: number | null) => {
    if (!assigning) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/diary/bookings/${assigning.id}/assignment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          durationMinutes:
            assigning.durationMinutes || diary?.bookingSettings.defaultDurationMinutes || 90,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to assign table.');
      setAssigning(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to assign table.');
    } finally {
      setSaving(false);
    }
  };
  const shift = (days: number) =>
    setDate((value) => {
      const next = new Date(`${value}T12:00:00`);
      next.setDate(next.getDate() + days);
      return next.toISOString().slice(0, 10);
    });
  const existingCandidates = (
    value: Draft,
    source: Diary | null,
    bookings: Booking[],
    times: string[],
  ) =>
    source
      ? source.tables.filter(
          (table) =>
            table.seats >= value.guests &&
            !bookings.some(
              (booking) =>
                (booking.assignedTableIds || []).includes(table.id) &&
                times.indexOf(value.time) <
                  times.indexOf(booking.time.slice(0, 5)) +
                    Math.ceil((booking.durationMinutes || 90) / 30) &&
                times.indexOf(booking.time.slice(0, 5)) <
                  times.indexOf(value.time) + Math.ceil(value.duration / 30),
            ),
        )
      : [];
  return (
    <>
      <header>
        <a className="brand" href="/">
          <b>QT</b>
          <span>
            QUICKEN TREE<small>BACK-OFFICE</small>
          </span>
        </a>
        <nav className="global-tabs">
          <button className="global-tab" aria-selected>
            Booking diary
          </button>
          <button className="global-tab">Settings</button>
        </nav>
        <label className="theme-switch">
          Dark mode
          <input type="checkbox" />
        </label>
      </header>
      <main id="booking-workspace">
        <div className="diary-toolbar">
          <div>
            <p className="eyebrow">BOOKING MANAGEMENT</p>
            <h1>Booking diary</h1>
          </div>
        </div>
        <div className="diary-summary-row">
          <p id="diary-summary">
            {diary
              ? `${diary.tables.length} tables · ${active.length} active bookings · ${active.reduce((total, booking) => total + booking.guests, 0)} guests`
              : 'Loading diary…'}
          </p>
          <div className="diary-controls">
            <button onClick={() => shift(-1)}>←</button>
            <button
              className="date-picker-trigger"
              type="button"
              onClick={() => setCalendarOpen(true)}
            >
              Date {new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB')}
            </button>
            <button onClick={() => shift(1)}>→</button>
            <button onClick={() => setDate(today())}>Today</button>
            <button onClick={() => void load()}>Refresh</button>
            <button className="danger" onClick={begin}>
              + Add booking
            </button>
          </div>
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="diary-layout">
          <BookingList
            bookings={active}
            onSelect={setEditing}
            onAssign={setAssigning}
            onViewOrder={setOrderDetails}
          />
          <DiaryGrid
            bookings={active}
            slots={slots}
            tables={diary?.tables ?? []}
            onSelect={setEditing}
          />
        </div>
      </main>
      {draft && (
        <AddBookingModal
          date={date}
          slots={slots}
          tables={candidates}
          value={draft}
          saving={saving}
          onChange={setDraft}
          onDateChange={setDate}
          onClose={() => setDraft(null)}
          onSubmit={(event) => void save(event)}
        />
      )}
      {editing && (
        <EditBookingModal
          booking={editing}
          date={date}
          slots={slots}
          tables={existingCandidates(
            {
              name: editing.name,
              guests: editing.guests,
              time: editing.time.slice(0, 5),
              duration: editing.durationMinutes || 90,
              experience: editing.experience,
              dietary: (editing.dietaryNeeds || []).join(', '),
              notes: editing.notes || '',
              tableIds: editing.assignedTableIds || [],
            },
            diary,
            active,
            slots,
          )}
          value={{
            name: editing.name,
            guests: editing.guests,
            time: editing.time.slice(0, 5),
            duration: editing.durationMinutes || 90,
            experience: editing.experience,
            dietary: (editing.dietaryNeeds || []).join(', '),
            notes: editing.notes || '',
            tableIds: editing.assignedTableIds || [],
          }}
          saving={saving}
          onChange={(value) =>
            setEditing({
              ...editing,
              name: value.name,
              guests: value.guests,
              time: value.time,
              durationMinutes: value.duration,
              experience: value.experience,
              dietaryNeeds: value.dietary.split(',').filter(Boolean),
              notes: value.notes,
              assignedTableIds: value.tableIds,
            })
          }
          onDateChange={setDate}
          onClose={() => setEditing(null)}
          onRequestCancel={() => {
            setCancelling(editing);
            setEditing(null);
          }}
          onSubmit={(event) => void save(event, editing)}
        />
      )}
      {assigning && (
        <AssignTableModal
          booking={assigning}
          tables={diary?.tables ?? []}
          onAssign={(tableId) => void assignTable(tableId)}
          onClose={() => setAssigning(null)}
        />
      )}
      {orderDetails && (
        <OrderDetailsModal booking={orderDetails} onClose={() => setOrderDetails(null)} />
      )}
      {calendarOpen && (
        <CalendarModal date={date} onChange={setDate} onClose={() => setCalendarOpen(false)} />
      )}
      {cancelling && (
        <CancelBookingDialog
          booking={cancelling}
          onClose={() => setCancelling(null)}
          onCancel={() => void cancelBooking()}
        />
      )}
    </>
  );
}
