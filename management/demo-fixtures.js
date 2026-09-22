const guests = [
  ['Amelia Reed', 2, 1],
  ['Daniel Price', 4, 3],
  ['Sophie Patel', 3, 2],
  ['Oliver Hughes', 5, 4],
  ['Maya Ellis', 2, 1],
  ['James Carter', 6, 5],
  ['Isla Morgan', 3, 2],
  ['Theo Bennett', 4, 3],
  ['Aisha Khan', 2, 1],
  ['Noah Clarke', 5, 4],
  ['Freya Wilson', 6, 5],
  ['Luca Evans', 3, 2],
  ['Priya Shah', 4, 3],
  ['Ethan Brooks', 2, 1],
  ['Ava Turner', 5, 4],
  ['Leo Foster', 3, 2],
  ['Zara Ahmed', 6, 5],
  ['Finn Cooper', 2, 1],
];

const bookingCounts = [6, 4, 7, 5, 6, 3, 5];
const slotMinutes = [570, 630, 690, 780, 870, 960, 1020];
const tablesByPartySize = {
  2: [1, 10, 19, 28],
  3: [2, 11, 20, 29],
  4: [3, 12, 21, 30],
  5: [4, 13, 22],
  6: [5, 14, 23],
};
const dishes = [
  ['The Full English', 'Eggs, bacon, toast and mushrooms', 850],
  ['Chicken Wings', 'Large · Hot', 1500],
  ['Pie of the Day', 'Mash', 1800],
  ['Baked Camembert', 'Garlic and herb crumb', 850],
  ['Aubergine Schnitzel', 'With fries', 1700],
  ['Chicken Wings', 'Small · BBQ', 900],
];
const companionNames = [
  'Grace Miller', 'Ben Taylor', 'Nina Roberts', 'Oscar Green', 'Ruby Hall',
  'Sam Walker', 'Ella White', 'Adam Scott', 'Mila Brown', 'Harvey King',
  'Layla Wood', 'Max Harris', 'Hannah Lewis', 'Ravi Singh', 'Chloe Baker',
];

const londonToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export function demoBookingsForDay(dayIndex) {
  const usedTables = new Set();
  return Array.from({ length: bookingCounts[dayIndex % bookingCounts.length] }, (_, index) => {
    const [name, partySize, preferredTableId] = guests[(dayIndex * 7 + index * 5) % guests.length];
    const email = `${name.toLowerCase().replaceAll(' ', '.')}@pacevenues.com`;
    const tableId = [preferredTableId, ...tablesByPartySize[partySize]].find((id) => !usedTables.has(id));
    if (!tableId) throw Error('The demo needs more tables for this party size.');
    usedTables.add(tableId);
    const minutes = slotMinutes[index] + (dayIndex % 2) * 30;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    return { name, email, partySize, tableId, time, orderAhead: (dayIndex + index) % 2 === 1 };
  });
}

export function demoGuestNames(dayIndex, bookingIndex, leadName, partySize) {
  return [leadName, ...Array.from({ length: partySize - 1 }, (_, seat) =>
    companionNames[(dayIndex * 7 + bookingIndex * 5 + seat) % companionNames.length])];
}

export function demoOrderForBooking(dayIndex, bookingIndex, guestNames) {
  const byDish = new Map();
  for (let seat = 0; seat < guestNames.length; seat += 1) {
    const dishIndex = (dayIndex + bookingIndex + seat * 2) % dishes.length;
    if (!byDish.has(dishIndex)) {
      const [name, description, unitPricePence] = dishes[dishIndex];
      byDish.set(dishIndex, { name, description, unitPricePence, seats: [], shared: false });
    }
    byDish.get(dishIndex).seats.push(seat);
  }
  const lines = [
    ...byDish.values(),
    { name: 'Fries', description: 'For the table', unitPricePence: 450, seats: [], shared: true },
  ];
  return {
    lines,
    totalPence: lines.reduce((total, line) => total + line.unitPricePence * (line.seats.length || 1), 0),
  };
}

export async function seedDemoFixtures(sql) {
  const today = londonToday();
  const start = new Date(`${today}T12:00:00Z`);
  await sql.begin(async (tx) => {
    for (let dayIndex = 0; dayIndex < 21; dayIndex += 1) {
      const date = new Date(start.getTime() + (dayIndex - 7) * 86400000).toISOString().slice(0, 10);
      const dailyBookings = demoBookingsForDay(dayIndex);
      for (let index = 0; index < dailyBookings.length; index += 1) {
        const { name, email, partySize, tableId, time, orderAhead } = dailyBookings[index];
        const [member] = await tx`
          insert into members(email,display_name,tier)
          values(${email},${name},'Pace Member')
          on conflict(email) do update set display_name=excluded.display_name
          returning id`;
        await tx`insert into loyalty_accounts(member_id,points) values(${member.id},${(index + 1) * 125}) on conflict(member_id) do nothing`;
        const [booking] = await tx`
          insert into bookings(member_id,booking_date,booking_time,guest_count,experience,status,contact_name,contact_email,notes,booking_duration_minutes,assigned_table_id)
          values(${member.id},${date}::date,${time}::time,${partySize},'Table','confirmed',${name},${email},${orderAhead ? 'Demo booking with order ahead' : 'Demo booking'},90,${tableId})
          returning id`;
        await tx`insert into booking_table_assignments(booking_id,table_id) values(${booking.id},${tableId})`;
        const guestNames = demoGuestNames(dayIndex, index, name, partySize);
        const bookingGuests = [];
        for (const [seat, guestName] of guestNames.entries()) {
          const [guest] = await tx`
            insert into booking_guests(booking_id,display_name,position)
            values(${booking.id},${guestName},${seat + 1}) returning id`;
          bookingGuests.push(guest);
        }
        if ((dayIndex + index) % 4 === 0) await tx`insert into booking_dietary_needs(booking_id,position,name) values(${booking.id},0,'Vegetarian')`;
        if (!orderAhead) continue;
        const orderPlan = demoOrderForBooking(dayIndex, index, guestNames);
        const [order] = await tx`
          insert into orders(booking_id,status,total_pence,paid_at)
          values(${booking.id},${dayIndex % 2 ? 'paid' : 'draft'},${orderPlan.totalPence},${dayIndex % 2 ? new Date() : null})
          returning id`;
        for (const plannedLine of orderPlan.lines) {
          const [line] = await tx`
            insert into order_lines(order_id,item_name,item_description,unit_price_pence,quantity)
            values(${order.id},${plannedLine.name},${plannedLine.description},${plannedLine.unitPricePence},${plannedLine.seats.length || 1}) returning id`;
          if (plannedLine.shared) {
            await tx`
              insert into order_line_assignments(order_line_id,booking_guest_id,serving_number,is_shared)
              values(${line.id},null,1,true)`;
          } else {
            for (const [serving, seat] of plannedLine.seats.entries()) {
              await tx`
                insert into order_line_assignments(order_line_id,booking_guest_id,serving_number,is_shared)
                values(${line.id},${bookingGuests[seat].id},${serving + 1},false)`;
            }
          }
        }
      }
    }
  });
}
