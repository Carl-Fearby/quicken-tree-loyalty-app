'use client';

import JsBarcode from 'jsbarcode';
import { useEffect, useRef, useState } from 'react';

type View = 'home' | 'book' | 'details' | 'rewards' | 'profile';
type Redemption = { title: string; code: string };

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <i aria-hidden="true" className={`fa-solid ${name} ${className}`.trim()} />;
}

const openingHours = (date: Date) => date.getDay() === 0 ? { open: 7.5, close: 17.5 } : { open: 7.5, close: 20.5 };
const toInputDate = (date: Date) => date.toISOString().slice(0, 10);
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const fromInputDate = (value: string) => new Date(`${value}T12:00:00`);
const availableSlots = (value: string, now = new Date()) => {
  const date = fromInputDate(value); const { open, close } = openingHours(date);
  const sameDay = toInputDate(date) === toInputDate(now);
  const earliest = sameDay ? Math.max(open, Math.ceil((now.getHours() + now.getMinutes() / 60 + 0.01) * 2) / 2) : open;
  const slots: string[] = [];
  for (let hour = earliest; hour <= close; hour += .5) { const h = Math.floor(hour); slots.push(`${String(h).padStart(2, '0')}:${hour % 1 ? '30' : '00'}`); }
  return slots;
};
const nextBookableDate = (now = new Date()) => { const date = new Date(now); for (let i = 0; i < 8; i += 1) { if (availableSlots(toInputDate(date), now).length) return date; date.setDate(date.getDate() + 1); date.setHours(12, 0, 0, 0); } return date; };

export default function Home() {
  const [view, setView] = useState<View>('book');
  const [guests, setGuests] = useState('5 Guests');
  const [bookingDate, setBookingDate] = useState(() => toInputDate(nextBookableDate()));
  const [time, setTime] = useState('');
  const [showAllTimes, setShowAllTimes] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1, 12);
  });
  const times = availableSlots(bookingDate);
  const calendarStart = new Date(visibleMonth);
  calendarStart.setDate(1 - ((calendarStart.getDay() + 6) % 7));
  const calendarDays = Array.from({ length: 42 }, (_, offset) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + offset);
    return date;
  });
  const todayValue = toInputDate(new Date());
  useEffect(() => { if (!times.includes(time)) setTime(times[0] ?? ''); }, [bookingDate]);
  const navigate = (next: View) => { setShowDatePicker(false); setView(next); };
  const bookEvent = (date: string) => { setBookingDate(date); setShowAllTimes(false); setShowDatePicker(false); navigate('book'); };

  return <main className="stage"><section className="phone" aria-label="The Quicken Tree loyalty app">
    <div className="status"><span>9:41</span><span className="notch"/><span>●●●</span></div>
    <div className="content" key={view}>
      {view === 'home' && <><p className="eyebrow">Welcome back, Stephen</p><h1>Make every visit<br/>more memorable.</h1><section className="hero"><img src="/brand/quicken-tree-red.png" alt="The Quicken Tree Bar Grill Restaurant"/><span>Eat · Drink<br/>Repeat</span><h2>Your table awaits.</h2><p>At Heart of England Conference Centre</p></section><button className="points" onClick={() => navigate('rewards')}><i>QT</i><span><b>840 points</b><small>160 points until your next reward</small></span><em><Icon name="fa-chevron-right" /></em></button><Header title="Your visit, your way"/><div className="actions"><button className="primary" onClick={() => navigate('book')}><strong><Icon name="fa-calendar-plus" /></strong>Book a table</button><button onClick={() => navigate('rewards')}><strong><Icon name="fa-star" /></strong>Use rewards</button><button><strong><Icon name="fa-bag-shopping" /></strong>Order ahead</button></div><Header title="At The Quicken Tree"/><div className="eventList"><button className="event" onClick={() => bookEvent('2026-09-18')}><time>FRI<b>18</b>SEP</time><div><b>Late Harvest Supper Club</b><p>Four courses, paired wines · 7:30 PM</p></div></button><button className="event festive" onClick={() => bookEvent('2026-12-12')}><time>SAT<b>12</b>DEC</time><div><b>Ho Ho Ho Down</b><p>Christmas party night · food, music and festive drinks</p></div></button><button className="event" onClick={() => bookEvent('2026-12-20')}><time>SUN<b>20</b>DEC</time><div><b>Festive Family Brunch</b><p>Seasonal favourites and treats for the little ones</p></div></button></div></>}
      {view === 'book' && <><p className="eyebrow">Reserve your table</p><h1>Good food starts<br/>right here.</h1><button type="button" className="dateField" aria-expanded={showDatePicker} onClick={() => { setVisibleMonth(new Date(fromInputDate(bookingDate).getFullYear(), fromInputDate(bookingDate).getMonth(), 1, 12)); setShowDatePicker(value => !value); }}><span>{formatDate(fromInputDate(bookingDate))}</span><Icon name="fa-chevron-down" /></button>{showDatePicker && <section className="datePicker" aria-label="Choose a booking date"><header><button type="button" aria-label="Previous month" disabled={visibleMonth.getFullYear() === new Date().getFullYear() && visibleMonth.getMonth() === new Date().getMonth()} onClick={() => setVisibleMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1, 12))}><Icon name="fa-chevron-left" /></button><b>{visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</b><button type="button" aria-label="Next month" onClick={() => setVisibleMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1, 12))}><Icon name="fa-chevron-right" /></button></header><div className="weekdays">{['M','T','W','T','F','S','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendarDays">{calendarDays.map(date => { const value = toInputDate(date); const outsideMonth = date.getMonth() !== visibleMonth.getMonth(); const past = value < todayValue; return <button type="button" key={value} disabled={outsideMonth || past} className={bookingDate === value ? 'selected' : ''} onClick={() => { setBookingDate(value); setShowAllTimes(false); setShowDatePicker(false); }}>{date.getDate()}</button>; })}</div></section>}<div className="chips">{['2 Guests','3 Guests','4 Guests','5 Guests','6+ Guests'].map(x=><button className={guests===x?'selected':''} onClick={()=>setGuests(x)} key={x}>{x}</button>)}</div><div className="sectionTitle">Choose a time <button onClick={() => setShowAllTimes(value => !value)}>{showAllTimes ? 'Show fewer' : 'View all times'}</button></div>{times.length ? <div className="times">{(showAllTimes ? times : times.slice(0, 6)).map(x=><button className={time===x?'selected':''} onClick={()=>setTime(x)} key={x}>{x}</button>)}</div> : <p className="noTimes">No more tables today. Choose another date to see the next available service.</p>}<p className="notice"><b>Member moment</b><br/>Reserve at {time || 'an available time'} and earn double points on your seasonal menu.</p><button className="cta" disabled={!time} onClick={() => navigate('details')}>Continue to details</button></>}
      {view === 'details' && <><p className="eyebrow">Review your booking</p><h1>You are almost<br/>there.</h1><section className="bookingSummary"><p>The Quicken Tree</p><b>{formatDate(fromInputDate(bookingDate))}</b><span>{time} · {guests}</span><small>Heart of England Conference Centre</small></section><label className="detailLabel">Booking name<input placeholder="Your name" /></label><label className="detailLabel">Email address<input type="email" placeholder="you@example.com" /></label><label className="detailLabel">Anything we should know<textarea placeholder="Dietary requirements or occasion" /></label><button className="cta">Request table</button><button className="back" onClick={() => navigate('book')}><Icon name="fa-chevron-left" /> Back to booking</button></>}
      {view === 'rewards' && <><p className="eyebrow">Member rewards</p><h1>A little thank you,<br/>every time you visit.</h1><section className="tier"><img src="/brand/quicken-tree-white.png" alt="The Quicken Tree"/><small>Current tier</small><h2>Quicken Member</h2><p>Priority tables, birthday treats & early event access.</p><div className="progress"><i/></div><footer>840 / 1,000 points to Quicken Gold</footer></section><Header title="Ready for you"/>{[['fa-mug-hot','Complimentary coffee','400 points · with brunch','QT8F4M7R2K9P'],['fa-champagne-glasses','A glass on us','600 points · selected pours','QT3W6N8H5L2D'],['fa-utensils','£10 dining credit','1,000 points · any meal','QT9C4V7B2X6M']].map(([icon,title,meta,code])=><article className="reward" key={title}><i><Icon name={icon} /></i><div><b>{title}</b><p>{meta}</p></div><button onClick={() => setRedemption({ title, code })}>Redeem</button></article>)}</>}
      {view === 'profile' && <><p className="eyebrow">Your Quicken Tree</p><div className="account"><i>S</i><div><b>Stephen</b><small>Quicken Member · since 2024</small></div></div>{['Upcoming bookings','Taste profile','Saved venues','Gift cards & credit','Help & contact'].map(x=><button className="setting" key={x}>{x}<span><Icon name="fa-chevron-right" /></span></button>)}</>}
    </div>
    <nav>{([['home','fa-house','Home'],['book','fa-calendar-plus','Book'],['rewards','fa-star','Rewards'],['profile','fa-circle-user','Profile']] as const).map(([id,icon,label])=><button key={id} onClick={()=>navigate(id)} className={view===id || (view==='details' && id==='book')?'active':''}><Icon name={icon}/>{label}</button>)}</nav>
    {redemption && <RedemptionPass redemption={redemption} onClose={() => setRedemption(null)} />}
  </section></main>;
}
function Header({title}:{title:string}) { return <div className="sectionTitle">{title}<button>View all</button></div>; }
function Field({children}:{children:React.ReactNode}) { return <button className="field">{children}<span>⌄</span></button>; }

function RedemptionPass({ redemption, onClose }: { redemption: Redemption; onClose: () => void }) {
  const barcode = useRef<SVGSVGElement>(null);
  useEffect(() => { if (barcode.current) JsBarcode(barcode.current, redemption.code, { format: 'CODE128', displayValue: false, width: 1.45, height: 58, margin: 0, background: '#ffffff', lineColor: '#111111' }); }, [redemption.code]);
  return <div className="redeemOverlay" role="dialog" aria-modal="true" aria-label="Reward redemption"><section className="redeemPass"><button className="closeRedeem" onClick={onClose} aria-label="Close redemption pass"><Icon name="fa-xmark" /></button><p className="eyebrow">Reward ready</p><h2>{redemption.title}</h2><p className="redeemIntro">Show this barcode to your server to redeem your reward.</p><div className="barcode"><svg ref={barcode} aria-label={`Barcode for ${redemption.code}`} /></div><small>Redemption key</small><strong>{redemption.code}</strong><p className="redeemFine">One-time use · Valid for this visit</p><button className="cta" onClick={onClose}>Done</button></section></div>;
}
