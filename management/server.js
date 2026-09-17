import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { describe, quote, remove } from './db.js';
if (!process.env.DATABASE_URL) throw Error('Set DATABASE_URL in management/.env first.');
const port = Number(process.env.PORT || 4100);
const dbUrl = new URL(process.env.DATABASE_URL);
const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(dbUrl.hostname);
const sql = postgres(process.env.DATABASE_URL, {
  max: 4,
  connect_timeout: 5,
  connection: { statement_timeout: 15000, lock_timeout: 3000 },
  ssl:
    process.env.DATABASE_SSL === 'disable'
      ? false
      : process.env.DATABASE_SSL === 'require' || !local
        ? 'require'
        : false,
});
const files = {
  '/theme.js': ['theme.js', 'text/javascript'],
  '/theme.css': ['theme.css', 'text/css'],
  '/database-gate.js': ['database-gate.js', 'text/javascript'],
  '/': ['index.html', 'text/html'],
  '/app.js': ['app.js', 'text/javascript'],
  '/style.css': ['style.css', 'text/css'],
  '/workspace.css': ['workspace.css', 'text/css'],
  '/menu-polish.css': ['menu-polish.css', 'text/css'],
};
files['/diary.js'] = ['diary.js', 'text/javascript'];
files['/diary.css'] = ['diary.css', 'text/css'];
async function readJson(req, limit = 16384) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > limit) throw Object.assign(new Error('Request too large.'), { status: 413 });
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error('Invalid JSON.'), { status: 400 });
  }
}
const itemFields = (body) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const priceLabel = typeof body.priceLabel === 'string' ? body.priceLabel.trim() : '';
  if (!name || name.length > 120)
    throw Object.assign(new Error('Enter an item name of up to 120 characters.'), { status: 400 });
  if (description.length > 1000)
    throw Object.assign(new Error('Description must be 1,000 characters or fewer.'), {
      status: 400,
    });
  if (priceLabel.length > 40)
    throw Object.assign(new Error('Price label must be 40 characters or fewer.'), { status: 400 });
  return { name, description, priceLabel };
};
const londonDateTime = () => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};
const server = http.createServer(async (req, res) => {
  const json = (status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  try {
    // This development manager listens only on 127.0.0.1 below. Browser-origin
    // checks are therefore redundant and can incorrectly reject valid local
    // requests when localhost resolves differently between browser and server.
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const url = new URL(req.url, `http://localhost:${port}`);
    if (req.method === 'GET' && url.pathname === '/fontawesome.css') {
      res.writeHead(200, { 'Content-Type': 'text/css', 'Cache-Control': 'no-store' });
      return res.end(
        await readFile(
          new URL(
            '../app/node_modules/@fortawesome/fontawesome-free/css/all.min.css',
            import.meta.url,
          ),
        ),
      );
    }
    if (
      req.method === 'GET' &&
      url.pathname.startsWith('/webfonts/') &&
      /^[a-z0-9-]+\.woff2$/i.test(url.pathname.slice(10))
    ) {
      res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'no-store' });
      return res.end(
        await readFile(
          new URL(
            `../app/node_modules/@fortawesome/fontawesome-free/webfonts/${url.pathname.slice(10)}`,
            import.meta.url,
          ),
        ),
      );
    }
    if (req.method === 'GET' && files[url.pathname]) {
      const [file, type] = files[url.pathname];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      return res.end(await readFile(new URL(`public/${file}`, import.meta.url)));
    }
    if (url.pathname === '/api/diary' && req.method === 'GET') {
      const date = url.searchParams.get('date');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || Number.isNaN(Date.parse(date)))
        return json(400, { message: 'Choose a valid diary date.' });
      const bookings =
        await sql`select b.id,b.booking_time::text as time,b.contact_name as name,b.guest_count as guests,b.experience,b.status,b.notes,coalesce((select json_agg(name order by position) from booking_dietary_needs where booking_id=b.id),'[]') as "dietaryNeeds",b.assigned_table_id as "assignedTableId",bt.name as "assignedTableName",b.booking_duration_minutes as "durationMinutes" from bookings b left join booking_tables bt on bt.id=b.assigned_table_id where b.booking_date=${date}::date order by b.booking_time,b.created_at`;
      const tableAssignments =
        await sql`select bta.booking_id as "bookingId",bt.id as "tableId",bt.name as "tableName" from booking_table_assignments bta join booking_tables bt on bt.id=bta.table_id join bookings b on b.id=bta.booking_id where b.booking_date=${date}::date order by bt.table_number`;
      const orders =
        await sql`select o.id,o.booking_id as "bookingId",o.status,o.total_pence as "totalPence",o.paid_at as "paidAt" from orders o join bookings b on b.id=o.booking_id where b.booking_date=${date}::date`;
      const lines =
        await sql`select l.id,l.order_id as "orderId",l.item_name as name,l.item_description as description,l.unit_price_pence as "unitPricePence",l.quantity from order_lines l join orders o on o.id=l.order_id join bookings b on b.id=o.booking_id where b.booking_date=${date}::date order by l.created_at`;
      const assignments =
        await sql`select a.order_line_id as "orderLineId",a.serving_number as "servingNumber",a.is_shared as "isShared",g.display_name as "guestName" from order_line_assignments a join order_lines l on l.id=a.order_line_id join orders o on o.id=l.order_id join bookings b on b.id=o.booking_id left join booking_guests g on g.id=a.booking_guest_id where b.booking_date=${date}::date order by a.serving_number`;
      const ordersByBooking = new Map(
        orders.map((order) => [
          order.bookingId,
          {
            status: order.status,
            totalPence: order.totalPence,
            paidAt: order.paidAt,
            lines: lines
              .filter((line) => line.orderId === order.id)
              .map((line) => ({
                ...line,
                assignments: assignments.filter((assignment) => assignment.orderLineId === line.id),
              })),
          },
        ]),
      );
      for (const booking of bookings) {
        const assigned = tableAssignments.filter(
          (assignment) => assignment.bookingId === booking.id,
        );
        booking.assignedTableIds = assigned.map((assignment) => assignment.tableId);
        booking.assignedTableNames = assigned.map((assignment) => assignment.tableName);
        if (assigned.length) {
          booking.assignedTableId = assigned[0].tableId;
          booking.assignedTableName = assigned
            .map((assignment) => assignment.tableName)
            .join(' + ');
        }
        booking.orderAhead = ordersByBooking.get(booking.id) ?? null;
      }
      const day = new Date(date + 'T12:00:00Z').getUTCDay();
      const hourKey = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][day];
      const [hours] =
        await sql`select opens_at,closes_at from opening_hours where map_key=${hourKey} limit 1`;
      const tables =
        await sql`select id,name,table_number as number,seat_count as seats from booking_tables order by table_number`;
      const [setting] =
        await sql`select integer_value as "defaultDurationMinutes" from booking_system_settings where setting_key='default_booking_duration_minutes'`;
      return json(200, {
        date,
        openingHours: hours
          ? { open: Number(hours.opens_at), close: Number(hours.closes_at) }
          : null,
        tables,
        bookings,
        bookingSettings: { defaultDurationMinutes: Number(setting?.defaultDurationMinutes ?? 90) },
      });
    }
    if (url.pathname === '/api/diary/bookings' && req.method === 'POST') {
      const body = await readJson(req);
      const date = typeof body?.date === 'string' ? body.date : '';
      const time = typeof body?.time === 'string' ? body.time : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const experience =
        typeof body?.experience === 'string' && body.experience.trim()
          ? body.experience.trim()
          : 'Table';
      const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
      const dietaryNeeds = Array.isArray(body?.dietaryNeeds)
        ? body.dietaryNeeds
            .map((need) => (typeof need === 'string' ? need.trim() : ''))
            .filter(Boolean)
        : [];
      const tableIds = Array.isArray(body?.tableIds)
        ? body.tableIds.map(Number)
        : body?.tableId === null || body?.tableId === undefined || body?.tableId === ''
          ? []
          : [Number(body.tableId)];
      const guests = Number(body?.guests);
      const durationMinutes = Number(body?.durationMinutes);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        !/^\d{2}:\d{2}$/.test(time) ||
        !name ||
        name.length > 120 ||
        dietaryNeeds.some((need) => need.length > 100) ||
        !Number.isInteger(guests) ||
        guests < 1 ||
        guests > 20 ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 30 ||
        durationMinutes > 360 ||
        durationMinutes % 15 ||
        tableIds.length > 4 ||
        new Set(tableIds).size !== tableIds.length ||
        tableIds.some((tableId) => !Number.isSafeInteger(tableId) || tableId < 1)
      )
        return json(400, { message: 'Provide valid booking details.' });
      if (`${date}T${time}` <= londonDateTime())
        return json(409, { message: 'Bookings can only be created for a future time.' });
      const day = new Date(date + 'T12:00:00Z').getUTCDay();
      const hourKey = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][day];
      const [hours] =
        await sql`select opens_at,closes_at from opening_hours where parent_id='appointments' and map_key=${hourKey}`;
      const startMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      if (
        !hours ||
        startMinutes < Number(hours.opens_at) * 60 ||
        startMinutes + durationMinutes > Number(hours.closes_at) * 60
      )
        return json(409, {
          message: 'This booking falls outside the opening hours for the selected day.',
        });
      const booking = await sql.begin(async (transaction) => {
        const selected = (
          await transaction`select id,name,seat_count as seats from booking_tables order by table_number`
        ).filter((table) => tableIds.includes(table.id));
        if (selected.length !== tableIds.length)
          throw Object.assign(new Error('A suggested table is no longer available.'), {
            status: 409,
          });
        if (selected.reduce((total, table) => total + table.seats, 0) < guests)
          throw Object.assign(new Error('The selected tables do not have enough combined seats.'), {
            status: 409,
          });
        for (const table of selected) {
          const [conflict] =
            await transaction`select b.id from bookings b join booking_table_assignments bta on bta.booking_id=b.id where bta.table_id=${table.id} and b.booking_date=${date}::date and b.status<>'cancelled' and b.booking_time < (${time}::time+make_interval(mins=>${durationMinutes})) and (b.booking_time+make_interval(mins=>b.booking_duration_minutes)) > ${time}::time limit 1`;
          if (conflict)
            throw Object.assign(new Error(`${table.name} is no longer available for this time.`), {
              status: 409,
            });
        }
        const [created] =
          await transaction`insert into bookings(booking_date,booking_time,guest_count,experience,contact_name,notes,booking_duration_minutes,assigned_table_id) values(${date}::date,${time}::time,${guests},${experience},${name},${notes || null},${durationMinutes},${selected[0]?.id ?? null}) returning id,booking_date::text as date,booking_time::text as time,guest_count as guests,contact_name as name,experience,status,booking_duration_minutes as "durationMinutes"`;
        for (const table of selected)
          await transaction`insert into booking_table_assignments(booking_id,table_id) values(${created.id},${table.id})`;
        await transaction`insert into booking_guests(booking_id,display_name,position) values(${created.id},${name},1)`;
        for (const [position, need] of dietaryNeeds.entries())
          await transaction`insert into booking_dietary_needs(booking_id,position,name) values(${created.id},${position},${need})`;
        return created;
      });
      return json(201, booking);
    }
    const bookingMatch = url.pathname.match(/^\/api\/diary\/bookings\/([0-9a-f-]{36})$/i);
    if (bookingMatch && req.method === 'PUT') {
      const body = await readJson(req);
      const date = typeof body?.date === 'string' ? body.date : '';
      const time = typeof body?.time === 'string' ? body.time : '';
      const name = typeof body?.name === 'string' ? body.name.trim() : '';
      const experience =
        typeof body?.experience === 'string' && body.experience.trim()
          ? body.experience.trim()
          : 'Table';
      const notes = typeof body?.notes === 'string' ? body.notes.trim() : '';
      const dietaryNeeds = Array.isArray(body?.dietaryNeeds)
        ? body.dietaryNeeds
            .map((need) => (typeof need === 'string' ? need.trim() : ''))
            .filter(Boolean)
        : [];
      const guests = Number(body?.guests);
      const durationMinutes = Number(body?.durationMinutes);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(Date.parse(date)) ||
        !/^\d{2}:\d{2}$/.test(time) ||
        !name ||
        name.length > 120 ||
        dietaryNeeds.some((need) => need.length > 100) ||
        !Number.isInteger(guests) ||
        guests < 1 ||
        guests > 20 ||
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 30 ||
        durationMinutes > 360 ||
        durationMinutes % 15
      )
        return json(400, { message: 'Provide valid booking details.' });
      if (`${date}T${time}` <= londonDateTime())
        return json(409, { message: 'Bookings can only be moved to a future time.' });
      const day = new Date(date + 'T12:00:00Z').getUTCDay();
      const hourKey = [
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ][day];
      const [hours] =
        await sql`select opens_at,closes_at from opening_hours where parent_id='appointments' and map_key=${hourKey}`;
      const startMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      if (
        !hours ||
        startMinutes < Number(hours.opens_at) * 60 ||
        startMinutes + durationMinutes > Number(hours.closes_at) * 60
      )
        return json(409, {
          message: 'This booking falls outside the opening hours for the selected day.',
        });
      try {
        const updated = await sql.begin(async (transaction) => {
          const [booking] =
            await transaction`select id from bookings where id=${bookingMatch[1]}::uuid for update`;
          if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          const assigned =
            await transaction`select bt.id,bt.name,bt.seat_count as seats from booking_table_assignments bta join booking_tables bt on bt.id=bta.table_id where bta.booking_id=${booking.id}`;
          if (assigned.length && assigned.reduce((total, table) => total + table.seats, 0) < guests)
            throw Object.assign(
              new Error(
                'The currently assigned table(s) do not have enough seats for this guest count. Change the table assignment first.',
              ),
              { status: 409 },
            );
          for (const table of assigned) {
            const [conflict] =
              await transaction`select b.id from bookings b join booking_table_assignments bta on bta.booking_id=b.id where bta.table_id=${table.id} and b.booking_date=${date}::date and b.status<>'cancelled' and b.id<>${booking.id} and b.booking_time < (${time}::time+make_interval(mins=>${durationMinutes})) and (b.booking_time+make_interval(mins=>b.booking_duration_minutes)) > ${time}::time limit 1`;
            if (conflict)
              throw Object.assign(new Error(`${table.name} is already occupied for this time.`), {
                status: 409,
              });
          }
          const [saved] =
            await transaction`update bookings set booking_date=${date}::date,booking_time=${time}::time,guest_count=${guests},experience=${experience},contact_name=${name},notes=${notes || null},booking_duration_minutes=${durationMinutes},updated_at=now() where id=${booking.id} returning id,booking_date::text as date,booking_time::text as time,guest_count as guests,contact_name as name,experience,status,notes,booking_duration_minutes as "durationMinutes"`;
          await transaction`delete from booking_dietary_needs where booking_id=${booking.id}`;
          for (const [position, need] of dietaryNeeds.entries())
            await transaction`insert into booking_dietary_needs(booking_id,position,name) values(${booking.id},${position},${need})`;
          await transaction`update booking_guests set display_name=${name} where id=(select id from booking_guests where booking_id=${booking.id} order by position,id limit 1)`;
          return saved;
        });
        return json(200, updated);
      } catch (error) {
        return json(error.status ?? 500, {
          message: error.message ?? 'Unable to save this booking.',
        });
      }
    }
    const cancelBookingMatch = url.pathname.match(
      /^\/api\/diary\/bookings\/([0-9a-f-]{36})\/cancel$/i,
    );
    if (cancelBookingMatch && req.method === 'POST') {
      const [booking] =
        await sql`update bookings set status='cancelled',updated_at=now() where id=${cancelBookingMatch[1]}::uuid and status<>'cancelled' returning id,status`;
      return booking ? json(200, booking) : json(404, { message: 'Active booking not found.' });
    }
    if (url.pathname === '/api/opening-hours' && req.method === 'GET') {
      const hours =
        await sql`select map_key as "day",opens_at as open,closes_at as close from opening_hours where parent_id='appointments' order by position`;
      return json(200, {
        hours: hours.map((hour) => ({
          ...hour,
          open: Number(hour.open),
          close: Number(hour.close),
        })),
      });
    }
    if (url.pathname === '/api/opening-hours' && req.method === 'PUT') {
      const body = await readJson(req, 16384);
      const hours = body?.hours;
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      if (
        !Array.isArray(hours) ||
        hours.length !== 7 ||
        hours.some(
          (hour) =>
            !days.includes(hour?.day) ||
            !Number.isFinite(hour?.open) ||
            !Number.isFinite(hour?.close) ||
            hour.open < 0 ||
            hour.open > 24 ||
            hour.close <= hour.open ||
            hour.close > 24,
        )
      )
        return json(400, { message: 'Provide valid opening hours for every day.' });
      if (new Set(hours.map((hour) => hour.day)).size !== 7)
        return json(400, { message: 'Each day needs one opening-hours record.' });
      await sql.begin(async (transaction) => {
        for (const [position, day] of days.entries()) {
          const hour = hours.find((value) => value.day === day);
          await transaction`update opening_hours set position=${position},opens_at=${hour.open},closes_at=${hour.close} where parent_id='appointments' and map_key=${day}`;
        }
      });
      return json(200, { hours: days.map((day) => hours.find((hour) => hour.day === day)) });
    }
    if (url.pathname === '/api/booking-settings' && req.method === 'PUT') {
      const body = await readJson(req);
      const minutes = Number(body?.defaultDurationMinutes);
      if (!Number.isInteger(minutes) || minutes < 30 || minutes > 360 || minutes % 15)
        return json(400, {
          message: 'Choose a booking duration from 30 minutes to 6 hours, in 15-minute steps.',
        });
      await sql`insert into booking_system_settings(setting_key,integer_value) values('default_booking_duration_minutes',${minutes}) on conflict(setting_key) do update set integer_value=excluded.integer_value`;
      return json(200, { defaultDurationMinutes: minutes });
    }
    const bookingAssignmentMatch = url.pathname.match(
      /^\/api\/diary\/bookings\/([0-9a-f-]{36})\/assignment$/i,
    );
    if (bookingAssignmentMatch && req.method === 'PUT') {
      const body = await readJson(req);
      const tableId = body?.tableId === null ? null : Number(body?.tableId);
      if (tableId !== null && (!Number.isSafeInteger(tableId) || tableId < 1))
        return json(400, { message: 'Choose a valid table.' });
      try {
        const assignment = await sql.begin(async (transaction) => {
          const [booking] =
            await transaction`select id,booking_date,booking_time,guest_count,booking_duration_minutes from bookings where id=${bookingAssignmentMatch[1]}::uuid for update`;
          if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
          const durationMinutes =
            body?.durationMinutes === undefined
              ? booking.booking_duration_minutes
              : Number(body.durationMinutes);
          if (
            !Number.isInteger(durationMinutes) ||
            durationMinutes < 30 ||
            durationMinutes > 360 ||
            durationMinutes % 15
          )
            throw Object.assign(
              new Error('Choose a booking length from 30 minutes to 6 hours, in 15-minute steps.'),
              { status: 400 },
            );
          if (tableId === null) {
            await transaction`delete from booking_table_assignments where booking_id=${booking.id}`;
            await transaction`update bookings set assigned_table_id=null,booking_duration_minutes=${durationMinutes},updated_at=now() where id=${booking.id}`;
            return { tableId: null, tableName: null, durationMinutes };
          }
          const [table] =
            await transaction`select id,name,seat_count as seats from booking_tables where id=${tableId}`;
          if (!table) throw Object.assign(new Error('Table not found.'), { status: 404 });
          if (table.seats < booking.guest_count)
            throw Object.assign(
              new Error(
                `${table.name} has ${table.seats} seats, but this booking needs ${booking.guest_count}.`,
              ),
              { status: 409 },
            );
          const [conflict] =
            await transaction`select b.id from bookings b join booking_table_assignments bta on bta.booking_id=b.id where bta.table_id=${tableId} and b.booking_date=${booking.booking_date} and b.status<>'cancelled' and b.id<>${booking.id} and b.booking_time < (${booking.booking_time}+make_interval(mins=>${durationMinutes})) and (b.booking_time+make_interval(mins=>b.booking_duration_minutes)) > ${booking.booking_time} limit 1`;
          if (conflict)
            throw Object.assign(
              new Error(`${table.name} is already occupied for this booking time.`),
              { status: 409 },
            );
          await transaction`delete from booking_table_assignments where booking_id=${booking.id}`;
          await transaction`insert into booking_table_assignments(booking_id,table_id) values(${booking.id},${tableId})`;
          await transaction`update bookings set assigned_table_id=${tableId},booking_duration_minutes=${durationMinutes},updated_at=now() where id=${booking.id}`;
          return { tableId: table.id, tableName: table.name, durationMinutes };
        });
        return json(200, assignment);
      } catch (error) {
        return json(error.status ?? 500, {
          message: error.message ?? 'Unable to assign this table.',
        });
      }
    }
    const bookingTableMatch = url.pathname.match(/^\/api\/booking-tables\/(\d+)$/);
    if (url.pathname === '/api/booking-tables' && req.method === 'PUT') {
      const body = await readJson(req, 65536);
      const tables = body?.tables;
      if (!Array.isArray(tables) || tables.length > 100)
        return json(400, { message: 'Provide up to 100 tables.' });
      const normalised = tables.map((table) => ({
        id: table?.id === null || table?.id === undefined ? null : Number(table.id),
        number: Number(table?.number),
        seats: Number(table?.seats),
      }));
      if (
        normalised.some(
          (table) =>
            (table.id !== null && (!Number.isSafeInteger(table.id) || table.id < 1)) ||
            !Number.isInteger(table.number) ||
            table.number < 1 ||
            table.number > 2147483647 ||
            !Number.isInteger(table.seats) ||
            table.seats < 2 ||
            table.seats > 10,
        )
      )
        return json(400, { message: 'Every table needs a unique positive number and 2–10 seats.' });
      if (new Set(normalised.map((table) => table.number)).size !== normalised.length)
        return json(400, { message: 'Table numbers must be unique.' });
      try {
        const saved = await sql.begin(async (transaction) => {
          const current = await transaction`select id from booking_tables order by id`;
          const currentIds = new Set(current.map((table) => table.id));
          const suppliedIds = normalised
            .filter((table) => table.id !== null)
            .map((table) => table.id);
          if (
            new Set(suppliedIds).size !== suppliedIds.length ||
            suppliedIds.some((id) => !currentIds.has(id))
          )
            throw Object.assign(
              new Error('The table list is out of date. Refresh and try again.'),
              { status: 409 },
            );
          const removed = current.filter((table) => !suppliedIds.includes(table.id));
          // Move existing rows out of the way first, so swapping two table numbers is valid.
          for (const [index, table] of normalised.entries())
            if (table.id !== null)
              await transaction`update booking_tables set table_number=${2000000000 + index} where id=${table.id}`;
          for (const table of removed)
            await transaction`delete from booking_tables where id=${table.id}`;
          for (const table of normalised) {
            const name = 'Table ' + table.number;
            if (table.id === null)
              await transaction`insert into booking_tables(name,table_number,seat_count) values(${name},${table.number},${table.seats})`;
            else
              await transaction`update booking_tables set name=${name},table_number=${table.number},seat_count=${table.seats} where id=${table.id}`;
          }
          return transaction`select id,name,table_number as number,seat_count as seats from booking_tables order by table_number`;
        });
        return json(200, { tables: saved });
      } catch (error) {
        if (error.code === '23505')
          return json(409, { message: 'That table number is already in use.' });
        if (error.code === '23503')
          return json(409, { message: 'A table with bookings cannot be removed.' });
        throw error;
      }
    }
    if (
      (url.pathname === '/api/booking-tables' && req.method === 'POST') ||
      (bookingTableMatch && ['PUT', 'DELETE'].includes(req.method))
    ) {
      const id = bookingTableMatch ? Number(bookingTableMatch[1]) : null;
      if (id !== null && (!Number.isSafeInteger(id) || id < 1 || id > 2147483647))
        return json(400, { message: 'Invalid table ID.' });
      try {
        if (req.method === 'DELETE') {
          const [table] = await sql`delete from booking_tables where id=${id} returning id`;
          return table ? json(200, table) : json(404, { message: 'Booking table not found.' });
        }
        const body = await readJson(req);
        if (!body || !Number.isInteger(body.seats) || body.seats < 2 || body.seats > 10)
          return json(400, { message: 'Seat count must be a whole number from 2 to 10.' });
        if (!Number.isInteger(body.number) || body.number < 1 || body.number > 2147483647)
          return json(400, { message: 'Enter a positive whole table number.' });
        const name = 'Table ' + body.number;
        const [table] =
          req.method === 'POST'
            ? await sql`insert into booking_tables(name,table_number,seat_count) values(${name},${body.number},${body.seats}) returning id,name,table_number as number,seat_count as seats`
            : await sql`update booking_tables set name=${name},table_number=${body.number},seat_count=${body.seats} where id=${id} returning id,name,table_number as number,seat_count as seats`;
        return table
          ? json(req.method === 'POST' ? 201 : 200, table)
          : json(404, { message: 'Booking table not found.' });
      } catch (error) {
        if (error.code === '23505')
          return json(409, { message: 'That table number is already in use.' });
        if (error.code === '23503')
          return json(409, { message: 'This table is in use and cannot be removed.' });
        throw error;
      }
    }
    if (url.pathname === '/api/tables' && req.method === 'GET') {
      const tables =
        await sql`select tablename as name from pg_tables where schemaname='public' order by tablename`;
      for (const table of tables) {
        const [row] = await sql.unsafe(
          `SELECT count(*)::text AS count FROM public.${quote(table.name)}`,
        );
        table.count = row.count;
      }
      return json(200, {
        database: decodeURIComponent(dbUrl.pathname.slice(1)),
        schema: 'public',
        tables,
      });
    }
    if (url.pathname === '/api/menu' && req.method === 'GET') {
      const menus = await sql`select id,map_key as name,position from menus order by position`;
      const sections =
        await sql`select id,parent_id as "menuId",title,position from menu_sections order by parent_id,position`;
      const items =
        await sql`select id,parent_id as "sectionId",name,description,price_label as "priceLabel",position from menu_items order by parent_id,position`;
      const dietaryTags =
        await sql`select labels.map_key as "itemName",tags.tag_code as "tagCode",definitions.label from menu_item_dietary_labels labels join menu_item_dietary_tags tags on tags.parent_id=labels.id left join dietary_tags definitions on definitions.map_key=tags.tag_code order by labels.position,tags.position`;
      const unavailableItems =
        await sql`select item_name as "itemName" from menu_unavailable_items order by position`;
      const categories =
        await sql`select id,label,menu_name as "menuName",service_name as "serviceName",sections_present as "sectionsPresent",position from menu_categories order by position`;
      const categorySections =
        await sql`select parent_id as "categoryId",section_position as "sectionPosition",position from menu_category_sections order by parent_id,position`;
      return json(200, {
        menus,
        sections,
        items,
        dietaryTags,
        unavailableItems,
        categories,
        categorySections,
      });
    }
    const availabilityMatch = url.pathname.match(/^\/api\/menu\/items\/([^/]+)\/out-of-stock$/);
    if (availabilityMatch && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (typeof body.outOfStock !== 'boolean')
        return json(400, { message: 'outOfStock must be true or false.' });
      const itemId = decodeURIComponent(availabilityMatch[1]);
      const [item] = await sql`select id,name from menu_items where id=${itemId}`;
      if (!item) return json(404, { message: 'Menu item not found.' });
      await sql.begin(async (transaction) => {
        await transaction`delete from menu_unavailable_items where item_name=${item.name}`;
        if (body.outOfStock) {
          const [last] =
            await transaction`select coalesce(max(position),-1)::integer as position from menu_unavailable_items`;
          await transaction`insert into menu_unavailable_items(id,parent_id,position,map_key,item_name) values(${randomUUID()},'menu',${last.position + 1},${item.id},${item.name})`;
        }
      });
      return json(200, { id: item.id, outOfStock: body.outOfStock });
    }
    if (url.pathname === '/api/menu' && req.method === 'POST') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 80)
        return json(400, { message: 'Enter a menu name of up to 80 characters.' });
      const menu = await sql.begin(async (transaction) => {
        const [existing] = await transaction`select id from menus where map_key=${name}`;
        if (existing)
          throw Object.assign(new Error('A menu with this name already exists.'), { status: 409 });
        const [last] =
          await transaction`select coalesce(max(position),-1)::integer as position from menus`;
        const [lastCategory] =
          await transaction`select coalesce(max(position),-1)::integer as position from menu_categories`;
        const id = randomUUID();
        await transaction`insert into menus(id,parent_id,position,map_key) values(${id},'menu',${last.position + 1},${name})`;
        await transaction`insert into menu_categories(id,parent_id,position,label,menu_name,service_name,sections_present) values(${randomUUID()},'menu',${lastCategory.position + 1},${name},${name},${name},false)`;
        return { id, name, position: last.position + 1 };
      });
      return json(201, menu);
    }
    if (url.pathname === '/api/menu/categories/order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (!Array.isArray(body.categoryIds) || body.categoryIds.some((id) => typeof id !== 'string'))
        return json(400, { message: 'categoryIds must be an ordered list.' });
      await sql.begin(async (transaction) => {
        const categories =
          await transaction`select id from menu_categories where parent_id='menu' order by position`;
        const existing = new Set(categories.map((category) => category.id));
        if (
          body.categoryIds.length !== categories.length ||
          body.categoryIds.some((id) => !existing.has(id)) ||
          new Set(body.categoryIds).size !== categories.length
        )
          throw Object.assign(
            new Error('The category list is out of date. Refresh and try again.'),
            { status: 409 },
          );
        for (const [index, id] of body.categoryIds.entries())
          await transaction`update menu_categories set position=${1000 + index} where id=${id}`;
        for (const [index, id] of body.categoryIds.entries())
          await transaction`update menu_categories set position=${index} where id=${id}`;
      });
      return json(200, { categoryIds: body.categoryIds });
    }
    if (url.pathname === '/api/menu/sections/order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (!Array.isArray(body.sectionIds) || body.sectionIds.some((id) => typeof id !== 'string'))
        return json(400, { message: 'sectionIds must be an ordered list.' });
      await sql.begin(async (transaction) => {
        const sections =
          await transaction`select id,parent_id from menu_sections where id=any(${body.sectionIds}) order by position`;
        const parentId = sections[0]?.parent_id;
        const [total] = parentId
          ? await transaction`select count(*)::integer as count from menu_sections where parent_id=${parentId}`
          : [{ count: 0 }];
        if (
          sections.length !== body.sectionIds.length ||
          Number(total.count) !== body.sectionIds.length ||
          new Set(sections.map((section) => section.id)).size !== body.sectionIds.length ||
          new Set(sections.map((section) => section.parent_id)).size !== 1
        )
          throw Object.assign(
            new Error('Drag the complete section list for one menu. Refresh and try again.'),
            { status: 409 },
          );
        for (const [index, id] of body.sectionIds.entries())
          await transaction`update menu_sections set position=${1000 + index} where id=${id}`;
        for (const [index, id] of body.sectionIds.entries())
          await transaction`update menu_sections set position=${index} where id=${id}`;
      });
      return json(200, { sectionIds: body.sectionIds });
    }
    if (url.pathname === '/api/menu/sections' && req.method === 'POST') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 4096) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      const categoryId = typeof body.categoryId === 'string' ? body.categoryId : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!categoryId || !name || name.length > 80)
        return json(400, { message: 'Enter a sub-menu name of up to 80 characters.' });
      const section = await sql.begin(async (transaction) => {
        const [category] =
          await transaction`select id,menu_name,sections_present from menu_categories where id=${categoryId}`;
        if (!category)
          throw Object.assign(new Error('The selected menu no longer exists.'), { status: 404 });
        const [menu] = await transaction`select id from menus where map_key=${category.menu_name}`;
        if (!menu) throw Object.assign(new Error('The menu source is missing.'), { status: 409 });
        const [last] =
          await transaction`select coalesce(max(position),-1)::integer as position from menu_sections where parent_id=${menu.id}`;
        const id = randomUUID();
        const position = last.position + 1;
        await transaction`insert into menu_sections(id,parent_id,position,title) values(${id},${menu.id},${position},${name})`;
        if (category.sections_present) {
          const [mapping] =
            await transaction`select coalesce(max(position),-1)::integer as position from menu_category_sections where parent_id=${category.id}`;
          await transaction`insert into menu_category_sections(id,parent_id,position,section_position) values(${randomUUID()},${category.id},${mapping.position + 1},${position})`;
        }
        return { id, name, position };
      });
      return json(201, section);
    }
    if (url.pathname === '/api/menu/items' && req.method === 'POST') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      const body = await readJson(req);
      const sectionId = typeof body.sectionId === 'string' ? body.sectionId : '';
      const fields = itemFields(body);
      const item = await sql.begin(async (transaction) => {
        const [section] = await transaction`select id from menu_sections where id=${sectionId}`;
        if (!section)
          throw Object.assign(new Error('The selected section no longer exists.'), { status: 404 });
        const [duplicate] = await transaction`select id from menu_items where name=${fields.name}`;
        if (duplicate)
          throw Object.assign(new Error('Item names must be unique across the menu catalogue.'), {
            status: 409,
          });
        const [last] =
          await transaction`select coalesce(max(position),-1)::integer as position from menu_items where parent_id=${sectionId}`;
        const id = randomUUID();
        await transaction`insert into menu_items(id,parent_id,position,name,description,price_label) values(${id},${sectionId},${last.position + 1},${fields.name},${fields.description},${fields.priceLabel})`;
        return { id, sectionId, position: last.position + 1, ...fields };
      });
      return json(201, item);
    }
    const itemMatch = url.pathname.match(/^\/api\/menu\/items\/([^/]+)$/);
    if (itemMatch && itemMatch[1] !== 'order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      const itemId = decodeURIComponent(itemMatch[1]);
      const fields = itemFields(await readJson(req));
      const item = await sql.begin(async (transaction) => {
        const [current] =
          await transaction`select id,name from menu_items where id=${itemId} for update`;
        if (!current) throw Object.assign(new Error('Menu item not found.'), { status: 404 });
        const [duplicate] =
          await transaction`select id from menu_items where name=${fields.name} and id<>${itemId}`;
        if (duplicate)
          throw Object.assign(new Error('Item names must be unique across the menu catalogue.'), {
            status: 409,
          });
        if (current.name !== fields.name) {
          await transaction`update menu_item_dietary_labels set map_key=${fields.name} where map_key=${current.name}`;
          await transaction`update menu_item_availability set map_key=${fields.name} where map_key=${current.name}`;
          await transaction`update menu_unavailable_items set item_name=${fields.name} where item_name=${current.name}`;
          await transaction`update menu_item_option_sets set map_key=${fields.name} where map_key=${current.name}`;
        }
        const [updated] =
          await transaction`update menu_items set name=${fields.name},description=${fields.description},price_label=${fields.priceLabel} where id=${itemId} returning id,parent_id as "sectionId",position,name,description,price_label as "priceLabel"`;
        return updated;
      });
      return json(200, item);
    }
    if (itemMatch && req.method === 'DELETE') {
      const itemId = decodeURIComponent(itemMatch[1]);
      await sql.begin(async (transaction) => {
        const [item] =
          await transaction`select id,name from menu_items where id=${itemId} for update`;
        if (!item) throw Object.assign(new Error('Menu item not found.'), { status: 404 });
        await transaction`delete from menu_item_dietary_labels where map_key=${item.name}`;
        await transaction`delete from menu_item_availability where map_key=${item.name}`;
        await transaction`delete from menu_unavailable_items where item_name=${item.name}`;
        await transaction`delete from menu_item_option_sets where map_key=${item.name}`;
        await transaction`delete from menu_items where id=${itemId}`;
      });
      return json(200, { id: itemId, deleted: true });
    }
    if (url.pathname === '/api/menu/items/order' && req.method === 'PUT') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      const body = await readJson(req);
      if (!Array.isArray(body.itemIds) || body.itemIds.some((id) => typeof id !== 'string'))
        return json(400, { message: 'itemIds must be an ordered list.' });
      await sql.begin(async (transaction) => {
        const items =
          await transaction`select id,parent_id from menu_items where id=any(${body.itemIds}) order by position`;
        const parentId = items[0]?.parent_id;
        const [total] = parentId
          ? await transaction`select count(*)::integer as count from menu_items where parent_id=${parentId}`
          : [{ count: 0 }];
        if (
          items.length !== body.itemIds.length ||
          Number(total.count) !== body.itemIds.length ||
          new Set(items.map((item) => item.id)).size !== body.itemIds.length ||
          new Set(items.map((item) => item.parent_id)).size !== 1
        )
          throw Object.assign(
            new Error('Drag the complete item list for one section. Refresh and try again.'),
            { status: 409 },
          );
        for (const [index, id] of body.itemIds.entries())
          await transaction`update menu_items set position=${1000 + index} where id=${id}`;
        for (const [index, id] of body.itemIds.entries())
          await transaction`update menu_items set position=${index} where id=${id}`;
      });
      return json(200, { itemIds: body.itemIds });
    }
    const match = url.pathname.match(/^\/api\/tables\/([^/]+)$/);
    if (!match) return json(404, { message: 'Not found.' });
    const name = decodeURIComponent(match[1]);
    const meta = await describe(sql, name);
    if (req.method === 'GET') {
      const page = Number(url.searchParams.get('page') || 0);
      if (!Number.isSafeInteger(page) || page < 0 || page > 1000000)
        return json(400, { message: 'Invalid page.' });
      const cols = meta.columns.map((c) => quote(c.name)).join(',');
      const order = meta.primaryKey.length ? meta.primaryKey.map(quote).join(',') : 'ctid';
      const rows = await sql.unsafe(
        `SELECT ${cols} FROM public.${quote(name)} ORDER BY ${order} LIMIT 50 OFFSET $1`,
        [page * 50],
      );
      const [total] = await sql.unsafe(`SELECT count(*)::text AS count FROM public.${quote(name)}`);
      return json(200, { ...meta, rows, count: total.count, page });
    }
    if (req.method === 'DELETE') {
      if (req.headers['content-type'] !== 'application/json')
        return json(415, { message: 'JSON required.' });
      let raw = '';
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 16384) return json(413, { message: 'Request too large.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return json(400, { message: 'Invalid JSON.' });
      }
      if (body.confirm !== name || typeof body.all !== 'boolean')
        return json(400, { message: 'Confirm the exact table name.' });
      return json(200, await remove(sql, name, body.key, body.all));
    }
    json(405, { message: 'Method not allowed.' });
  } catch (error) {
    console.error(error.message);
    json(error.status || 500, {
      message: error.status
        ? error.message
        : error.code === '23503'
          ? 'Related rows prevent this deletion. Nothing was deleted.'
          : 'Database request failed. Check the database connection and server log.',
    });
  }
});
server.listen(port, '127.0.0.1', () => console.log(`PostgreSQL manager: http://localhost:${port}`));
async function stop() {
  server.close();
  await sql.end({ timeout: 3 });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
