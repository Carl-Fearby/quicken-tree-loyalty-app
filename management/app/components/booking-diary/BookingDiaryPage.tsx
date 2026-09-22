'use client';
import { FormEvent, useState } from 'react';
import { BookingList } from './BookingList';
import { DiaryGrid } from './DiaryGrid';
import { AddBookingModal } from './modals/AddBookingModal';
import { AssignTableModal } from './modals/AssignTableModal';
import { EditBookingModal } from './modals/EditBookingModal';
import { OrderDetailsModal } from './modals/OrderDetailsModal';
import { CancelBookingDialog } from './modals/CancelBookingDialog';
import { DatePicker } from '../ui/DatePicker';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { useBookingAvailability } from './hooks/useBookingAvailability';
import { useBookingDiary } from './hooks/useBookingDiary';
import { useManagementUser } from '../../contexts/ManagementAuth';
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
  orderAhead?: {
    status: string;
    totalPence: number;
    paidAt?: string | null;
    lines: {
      id: string;
      name: string;
      description?: string | null;
      unitPricePence: number;
      quantity: number;
      assignments?: { servingNumber: number; isShared: boolean; guestName?: string | null }[];
    }[];
  } | null;
};
type Diary = {
  date: string;
  tables: Table[];
  bookings: Booking[];
  openingHours: { open: number; close: number; kitchenClose: number } | null;
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
  const managementUser = useManagementUser();
  const canWrite = managementUser.bookingAccess === 'write';
  const [date, setDate] = useState(today),
    [bookingDate, setBookingDate] = useState(today),
    [draft, setDraft] = useState<Draft | null>(null),
    [editing, setEditing] = useState<Booking | null>(null),
    [assigning, setAssigning] = useState<Booking | null>(null),
    [orderDetails, setOrderDetails] = useState<Booking | null>(null),
    [cancelling, setCancelling] = useState<Booking | null>(null),
    [saving, setSaving] = useState(false);

  const { bookings: active, diary, error, load, setError, slots } = useBookingDiary(date);
  const modalOpen = draft !== null || editing !== null;
  const { bookings: bookingDayBookings, diary: bookingDay, slots: bookingSlots } =
    useBookingDiary(bookingDate, modalOpen && bookingDate !== date);
  const modalDiary = bookingDate === date ? diary : bookingDay;
  const modalBookings = bookingDate === date ? active : bookingDayBookings;
  const modalSlots = bookingDate === date ? slots : bookingSlots;
  const candidates = useBookingAvailability({
    date: bookingDate,
    draft: modalDiary ? draft : null,
  });
  const begin = () => {
    setBookingDate(date);
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
  };
  const beginEdit = (booking: Booking) => {
    setBookingDate(date);
    setEditing(booking);
  };
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
              date: bookingDate,
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
    currentBookingId?: string,
  ) =>
    source && times.includes(value.time)
      ? source.tables.filter(
          (table) =>
            table.seats >= value.guests &&
            !bookings.some(
              (booking) =>
                booking.id !== currentBookingId &&
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
      <Breadcrumbs
        current="Booking diary"
        showSettings={false}
      />
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
          <DatePicker
            allowPast
            ariaLabel="Diary date"
            date={date}
            onChange={setDate}
            prefix="Date"
          />
          <button onClick={() => shift(1)}>→</button>
          <button onClick={() => setDate(today())}>Today</button>
          <button onClick={() => void load()}>Refresh</button>
          {canWrite && <button className="danger" onClick={begin}>+ Add booking</button>}
        </div>
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="diary-layout">
        <BookingList
          bookings={active}
          onSelect={beginEdit}
          onAssign={setAssigning}
          onViewOrder={setOrderDetails}
          canWrite={canWrite}
        />
        <DiaryGrid
          bookings={active}
          date={date}
          slots={slots}
          kitchenClose={diary?.openingHours?.kitchenClose}
          kitchenOpen={diary?.openingHours?.kitchenOpen}
          tables={diary?.tables ?? []}
          onSelect={beginEdit}
        />
      </div>
      {draft && (
        <AddBookingModal
          date={bookingDate}
          slots={modalSlots}
          kitchenClose={modalDiary?.openingHours?.kitchenClose}
          tables={candidates}
          value={draft}
          saving={saving}
          error={error}
          onChange={setDraft}
          onDateChange={setBookingDate}
          onClose={() => setDraft(null)}
          onSubmit={(event) => void save(event)}
        />
      )}
      {editing && (
        <EditBookingModal
          booking={editing}
          date={bookingDate}
          slots={modalSlots}
          kitchenClose={modalDiary?.openingHours?.kitchenClose}
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
            modalDiary,
            modalBookings,
            modalSlots,
            editing.id,
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
          readOnly={!canWrite}
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
          onDateChange={setBookingDate}
          onClose={() => setEditing(null)}
          onRequestCancel={() => {
            if (!canWrite) return;
            setCancelling(editing);
            setEditing(null);
          }}
          onViewOrder={() => {
            setOrderDetails(editing);
            setEditing(null);
          }}
          onSubmit={(event) => canWrite && void save(event, editing)}
        />
      )}
      {canWrite && assigning && (
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
