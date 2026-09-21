export type Table = { id: number; name: string; seats: number };

export type OrderAheadLine = {
  id: string;
  name: string;
  description?: string | null;
  unitPricePence: number;
  quantity: number;
  assignments?: { servingNumber: number; isShared: boolean; guestName?: string | null }[];
};

export type OrderAhead = {
  status: string;
  totalPence: number;
  paidAt?: string | null;
  lines: OrderAheadLine[];
};

export type Booking = {
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
  orderAhead?: OrderAhead | null;
};

export type Diary = {
  date: string;
  tables: Table[];
  bookings: Booking[];
  openingHours: { open: number; close: number; kitchenOpen: number; kitchenClose: number } | null;
  bookingSettings: { defaultDurationMinutes: number };
};

export type BookingDraft = {
  name: string;
  guests: number;
  time: string;
  duration: number;
  experience: string;
  dietary: string;
  notes: string;
  tableIds: number[];
};
