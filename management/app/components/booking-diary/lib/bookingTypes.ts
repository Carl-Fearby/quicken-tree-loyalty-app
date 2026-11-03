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
  depositCreditPence?: number;
  paidPence?: number;
  paidAt?: string | null;
  lines: OrderAheadLine[];
};

export type Booking = {
  id: string;
  name: string;
  contactEmail?: string | null;
  time: string;
  guests: number;
  experience: string;
  status: string;
  depositStatus?: string;
  depositAmountPence?: number;
  notes?: string;
  dietaryNeeds?: string[];
  customerDietaryNeeds?: string[];
  customerTastes?: string[];
  customerTags?: string[];
  assignedTableName?: string;
  assignedTableIds?: number[];
  durationMinutes?: number;
  orderAhead?: OrderAhead | null;
  lastReminder?: { channel:string; status:string; createdAt:string; deliveredAt?:string|null } | null;
};

export type Diary = {
  date: string;
  tables: Table[];
  bookings: Booking[];
  openingHours: { open: number; close: number; kitchenOpen: number; kitchenClose: number } | null;
  bookingSettings: { defaultDurationMinutes: number; cancellationCutoffHours: number };
  attendanceSummary: { completed: number; noShows: number; cancelled: number; needsReview: number };
};

export type BookingDraft = {
  name: string;
  contactEmail: string;
  guests: number;
  time: string;
  duration: number;
  experience: string;
  dietary: string;
  customerDietaryNeeds: string[];
  customerTastes: string[];
  customerTags: string[];
  notes: string;
  tableIds: number[];
  depositStatus: 'none' | 'demo_paid' | 'demo_card_guarantee';
  depositAmountPence: number;
};
