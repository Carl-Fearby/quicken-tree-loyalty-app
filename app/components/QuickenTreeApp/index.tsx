'use client';

import {useEffect, useState} from 'react';
import appointmentsData from '../../data/appointments.json';
import bookingsData from '../../data/bookings.json';
import menuData from '../../data/menu.json';
import pointsData from '../../data/points-and-tier.json';
import profileData from '../../data/profile.json';
import rewardsData from '../../data/rewards.json';
import {Header} from '../Header';
import {Icon} from '../Icon';
import {RedemptionPass, type Redemption} from '../RedemptionPass';
import {UpcomingBookings} from '../UpcomingBookings';
import {WingOptionsDialog} from '../WingOptionsDialog';
import {HomeScreen} from '../screens/HomeScreen';
import {CartScreen} from '../screens/CartScreen';
import {MenuScreen} from '../screens/MenuScreen';
import {BookingScreen} from '../screens/BookingScreen';
import {AppNavigationProvider} from '../../contexts/AppNavigation';
import {LoyaltyApp} from '../LoyaltyApp';

type View = 'home' | 'book' | 'details' | 'checkout' | 'bookings' | 'menu' | 'cart' | 'rewards' | 'profile';
type Booking = {
    id: string;
    date: string;
    time: string;
    guests: string;
    experience?: string;
    price?: number;
    total?: number;
    name: string;
    email: string;
    notes: string
};

const bookingStorageKey = bookingsData.storageKey;
const profileStorageKey = profileData.storageKey;
const experiencePrices = Object.fromEntries(appointmentsData.experiences.map(experience => [experience.name, experience.price])) as Record<'Table' | 'Afternoon Tea' | 'Bottomless Brunch', number>;
const dietaryTags: Record<string, string[]> = menuData.dietaryTags;
const dietaryTagNames: Record<string, string> = menuData.dietaryTagNames;
type MenuSection = { title: string; items: ReadonlyArray<readonly [string, string, string]> };
const menuItems = menuData.menuItems as unknown as Record<'Breakfast' | 'Main Menu' | 'Sunday Lunch' | 'Drinks', MenuSection[]>;
const menuCategories = menuData.categories.map(category => {
    const source = menuItems[category.source as keyof typeof menuItems];
    return {
        label: category.label,
        sections: category.sections ? category.sections.map(index => source[index]) : source,
        service: menuData.serviceMessages[category.service as keyof typeof menuData.serviceMessages]
    };
});
const allMenuSections = Object.values(menuItems).flat() as MenuSection[];

const openingHours = (date: Date) => date.getDay() === 0 ? appointmentsData.openingHours.sunday : appointmentsData.openingHours.weekday;
const toInputDate = (date: Date) => date.toISOString().slice(0, 10);
const formatDate = (date: Date) => date.toLocaleDateString('en-GB', {weekday: 'long', day: 'numeric', month: 'long'});
const fromInputDate = (value: string) => new Date(`${value}T12:00:00`);
const availableSlots = (value: string, now = new Date()) => {
    const date = fromInputDate(value);
    const {open, close} = openingHours(date);
    const sameDay = toInputDate(date) === toInputDate(now);
    const earliest = sameDay ? Math.max(open, Math.ceil((now.getHours() + now.getMinutes() / 60 + 0.01) * 2) / 2) : open;
    const slots: string[] = [];
    for (let hour = earliest; hour <= close; hour += .5) {
        const h = Math.floor(hour);
        slots.push(`${String(h).padStart(2, '0')}:${hour % 1 ? '30' : '00'}`);
    }
    return slots;
};
const nextBookableDate = (now = new Date()) => {
    const date = new Date(now);
    for (let i = 0; i < 8; i += 1) {
        if (availableSlots(toInputDate(date), now).length) return date;
        date.setDate(date.getDate() + 1);
        date.setHours(12, 0, 0, 0);
    }
    return date;
};
const priceValue = (price: string) => Number(price.match(/£([\d.]+)/)?.[1] ?? 0);

export function QuickenTreeApp({dark: controlledDark}: {dark?: boolean}) {
    const [view, setView] = useState<View>('home');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [themeReady, setThemeReady] = useState(false);
    const [menuCategory, setMenuCategory] = useState('Breakfasts');
    const [bookingName, setBookingName] = useState(profileData.default.name);
    const [bookingEmail, setBookingEmail] = useState('');
    const [bookingNotes, setBookingNotes] = useState('');
    const [profilePanel, setProfilePanel] = useState<'details' | 'taste' | 'venues' | 'gifts' | 'help' | null>(null);
    const [profileName, setProfileName] = useState(profileData.default.name);
    const [profileEmail, setProfileEmail] = useState(profileData.default.email);
    const [tasteProfile, setTasteProfile] = useState<string[]>(profileData.default.tastes);
    const [giftCode, setGiftCode] = useState('');
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileLoaded, setProfileLoaded] = useState(false);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [bookingsOrigin, setBookingsOrigin] = useState<'home' | 'profile'>('home');
    const [bookingsLoaded, setBookingsLoaded] = useState(false);
    const [orderAheadBooking, setOrderAheadBooking] = useState<Booking | null>(null);
    const [menuSearch, setMenuSearch] = useState('');
    const [preOrderItems, setPreOrderItems] = useState<Record<string, number>>({});
    const [wingSizePrompt, setWingSizePrompt] = useState(false);
    const [wingSize, setWingSize] = useState<'Small' | 'Large' | null>(null);
    const [guests, setGuests] = useState('5 Guests');
    const [bookingExperience, setBookingExperience] = useState<'Table' | 'Afternoon Tea' | 'Bottomless Brunch'>('Table');
    const [bookingDate, setBookingDate] = useState(() => toInputDate(nextBookableDate()));
    const [time, setTime] = useState('');
    const [showAllTimes, setShowAllTimes] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [paymentState, setPaymentState] = useState<'idle' | 'processing'>('idle');
    const [checkoutMode, setCheckoutMode] = useState<'booking' | 'order'>('booking');
    const [redemption, setRedemption] = useState<Redemption | null>(null);
    const [isClosingRedemption, setIsClosingRedemption] = useState(false);
    const [visibleMonth, setVisibleMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1, 12);
    });
    const times = availableSlots(bookingDate);
    const bookingTimes = bookingExperience === 'Bottomless Brunch' ? (fromInputDate(bookingDate).getDay() === 0 ? [] : times.filter(slot => slot >= '12:00' && slot <= '19:30')) : bookingExperience === 'Afternoon Tea' ? times.filter(slot => slot >= '12:00' && slot <= '17:00') : times;
    const experiencePrice = experiencePrices[bookingExperience];
    const guestCount = parseInt(guests, 10);
    const bookingTotal = experiencePrice * guestCount;
    const calendarStart = new Date(visibleMonth);
    calendarStart.setDate(1 - ((calendarStart.getDay() + 6) % 7));
    const calendarDays = Array.from({length: 42}, (_, offset) => {
        const date = new Date(calendarStart);
        date.setDate(calendarStart.getDate() + offset);
        return date;
    });
    const todayValue = toInputDate(new Date());
    const selectedMenuCategory = menuCategories.find(category => category.label === menuCategory) ?? menuCategories[0];
    const filteredMenuSections = selectedMenuCategory.sections.map(section => ({
        ...section,
        items: section.items.filter(([name, description]) => `${name} ${description}`.toLowerCase().includes(menuSearch.trim().toLowerCase()))
    })).filter(section => section.items.length);
    const preOrderCount = Object.values(preOrderItems).reduce((total, quantity) => total + quantity, 0);
    const preOrderTotal = Object.entries(preOrderItems).reduce((total, [name, quantity]) => {
        const item = allMenuSections.flatMap(section => section.items).find(([itemName]) => name.startsWith(itemName));
        const price = name.includes('· Small ·') ? 6.99 : name.includes('· Large ·') ? 12.15 : item ? priceValue(item[2]) : 0;
        return total + price * quantity;
    }, 0);
    const preOrderLines = Object.entries(preOrderItems).flatMap(([name, quantity]) => {
        const item = allMenuSections.flatMap(section => section.items).find(([itemName]) => name.startsWith(itemName));
        const price = name.includes('· Small ·') ? 6.99 : name.includes('· Large ·') ? 12.15 : item ? priceValue(item[2]) : 0;
        return item ? [{name, description: item[1], price, quantity}] : [];
    });
    useEffect(() => {
        if (!bookingTimes.includes(time)) setTime(bookingTimes[0] ?? '');
    }, [bookingDate, bookingExperience]);
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(bookingStorageKey);
            if (stored) setBookings(JSON.parse(stored));
        } catch {
            setBookings([]);
        } finally {
            setBookingsLoaded(true);
        }
    }, []);
    useEffect(() => {
        if (bookingsLoaded) window.localStorage.setItem(bookingStorageKey, JSON.stringify(bookings));
    }, [bookings, bookingsLoaded]);
    useEffect(() => {
        if (!orderAheadBooking) return;
        const key = `quicken-tree-order-ahead-${orderAheadBooking.id}`;
        if (Object.keys(preOrderItems).length) window.localStorage.setItem(key, JSON.stringify(preOrderItems));
        else window.localStorage.removeItem(key);
    }, [orderAheadBooking, preOrderItems]);
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem(profileStorageKey);
            if (stored) {
                const profile = JSON.parse(stored);
                setProfileName(profile.name || profileData.default.name);
                setProfileEmail(profile.email || profileData.default.email);
                setTasteProfile(Array.isArray(profile.tastes) ? profile.tastes : profileData.default.tastes);
            }
        } finally {
            setProfileLoaded(true);
        }
    }, []);
    useEffect(() => {
        if (profileLoaded) window.localStorage.setItem(profileStorageKey, JSON.stringify({
            name: profileName,
            email: profileEmail,
            tastes: tasteProfile
        }));
    }, [profileName, profileEmail, tasteProfile, profileLoaded]);
    useEffect(() => {
        if (controlledDark !== undefined) {
            setIsDarkMode(controlledDark);
            setThemeReady(true);
            return;
        }
        setIsDarkMode(window.localStorage.getItem('quicken-tree-dark-mode') === 'true');
        setThemeReady(true);
    }, [controlledDark]);
    useEffect(() => {
        if (controlledDark === undefined && themeReady) window.localStorage.setItem('quicken-tree-dark-mode', String(isDarkMode));
    }, [controlledDark, isDarkMode, themeReady]);
    const navigate = (next: View, preserveOrderAhead = false) => {
        setShowDatePicker(false);
        if (next !== 'profile') setProfilePanel(null);
        if (next === 'menu' && !preserveOrderAhead) {
            setOrderAheadBooking(null);
            setPreOrderItems({});
        }
        setView(next);
    };
    const bookEvent = (date: string) => {
        setBookingExperience('Table');
        setBookingDate(date);
        setShowAllTimes(false);
        setShowDatePicker(false);
        navigate('book');
    };
    const closeRedemption = () => {
        setIsClosingRedemption(true);
        window.setTimeout(() => {
            setRedemption(null);
            setIsClosingRedemption(false);
        }, 220);
    };
    const requestTable = () => {
        if (!time) return;
        const booking: Booking = {
            id: `${Date.now()}`,
            date: bookingDate,
            time,
            guests,
            experience: bookingExperience,
            price: experiencePrice || undefined,
            total: bookingTotal || undefined,
            name: bookingName.trim() || 'Guest',
            email: bookingEmail.trim(),
            notes: bookingNotes.trim()
        };
        setBookings(current => [booking, ...current]);
        setBookingEmail('');
        setBookingNotes('');
        setPaymentState('idle');
        navigate('bookings');
    };
    const continueFromDetails = () => bookingExperience === 'Table' ? requestTable() : (setCheckoutMode('booking'), navigate('checkout'));
    const completeOrder = () => {
        setPaymentState('idle');
        setPreOrderItems({});
        setOrderAheadBooking(null);
        navigate('bookings');
    };
    const payWithApplePay = () => {
        if (paymentState === 'processing') return;
        setPaymentState('processing');
        window.setTimeout(checkoutMode === 'order' ? completeOrder : requestTable, 1450);
    };
    const startOrderAhead = (booking: Booking) => {
        let savedOrder: Record<string, number> = {};
        try {
            savedOrder = JSON.parse(window.localStorage.getItem(`quicken-tree-order-ahead-${booking.id}`) ?? '{}');
        } catch {
            savedOrder = {};
        }
        setOrderAheadBooking(booking);
        setPreOrderItems(savedOrder);
        setMenuSearch('');
        setMenuCategory('Sharers');
        navigate('menu', true);
    };
    const addToOrder = (name: string) => setPreOrderItems(current => ({...current, [name]: (current[name] ?? 0) + 1}));
    const removeFromOrder = (name: string) => setPreOrderItems(current => {
        const next = {...current};
        if (!next[name]) return current;
        if (next[name] === 1) delete next[name]; else next[name] -= 1;
        return next;
    });

    return <AppNavigationProvider value={{
        navigate, openBookings: origin => {
            setBookingsOrigin(origin);
            navigate('bookings');
        }
    }}>
            <LoyaltyApp motion="idle" dark={isDarkMode} embedded={controlledDark !== undefined}>
                        <div className="appSafeArea" aria-hidden="true"/>
                        <div className="content" key={`${view}-${profilePanel ?? 'root'}`}>
                            {view === 'home' && <HomeScreen bookings={bookings} onBookEvent={bookEvent}/>}
                            {view === 'book' && <BookingScreen experience={bookingExperience} prices={experiencePrices}
                                                               price={experiencePrice} total={bookingTotal}
                                                               guestCount={guestCount} date={bookingDate}
                                                               formatDate={value => formatDate(fromInputDate(value))}
                                                               showDatePicker={showDatePicker}
                                                               onToggleDatePicker={() => {
                                                                   setVisibleMonth(new Date(fromInputDate(bookingDate).getFullYear(), fromInputDate(bookingDate).getMonth(), 1, 12));
                                                                   setShowDatePicker(value => !value);
                                                               }} visibleMonth={visibleMonth}
                                                               onPreviousMonth={() => setVisibleMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1, 12))}
                                                               onNextMonth={() => setVisibleMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1, 12))}
                                                               calendarDays={calendarDays} today={todayValue}
                                                               onSelectDate={value => {
                                                                   setBookingDate(value);
                                                                   setShowAllTimes(false);
                                                                   setShowDatePicker(false);
                                                               }} guests={guests} onGuestsChange={setGuests}
                                                               times={bookingTimes} selectedTime={time}
                                                               onTimeChange={setTime} showAllTimes={showAllTimes}
                                                               onToggleTimes={() => setShowAllTimes(value => !value)}
                                                               onExperienceChange={value => {
                                                                   setBookingExperience(value);
                                                                   setShowAllTimes(false);
                                                               }} onContinue={() => navigate('details')}/>}
                            {view === 'details' && <>
                                <button className="topBack" onClick={() => navigate('book')}><Icon
                                    name="fa-chevron-left"/> Back to booking
                                </button>
                                <p className="eyebrow">Review your booking</p><h1>You are almost<br/>there.</h1>
                                <section className="bookingSummary"><p>The Quicken Tree</p>
                                    <b>{formatDate(fromInputDate(bookingDate))}</b><span>{bookingExperience} · {time} · {guests}</span>{experiencePrice > 0 &&
                                        <strong className="bookingPrice">£{experiencePrice.toFixed(2)} per guest ·
                                            £{bookingTotal.toFixed(2)} total</strong>}<small>Heart of England Conference
                                        Centre</small></section>
                                <label className="detailLabel">Booking name<input value={bookingName}
                                                                                  onChange={event => setBookingName(event.target.value)}
                                                                                  placeholder="Your name"/></label><label
                                className="detailLabel">Email address<input value={bookingEmail}
                                                                            onChange={event => setBookingEmail(event.target.value)}
                                                                            type="email" placeholder="you@example.com"/></label><label
                                className="detailLabel">Anything we should know<textarea value={bookingNotes}
                                                                                         onChange={event => setBookingNotes(event.target.value)}
                                                                                         placeholder="Dietary requirements or occasion"/></label>
                                <button className="cta"
                                        onClick={continueFromDetails}>{experiencePrice ? `Continue to payment · £${bookingTotal.toFixed(2)}` : 'Request reservation'}</button>
                            </>}
                            {view === 'checkout' && <>
                                <button className="topBack"
                                        onClick={() => navigate(checkoutMode === 'order' ? 'cart' : 'details')}
                                        disabled={paymentState === 'processing'}><Icon
                                    name="fa-chevron-left"/> {checkoutMode === 'order' ? 'Cart' : 'Back to details'}
                                </button>
                                <p className="eyebrow">Secure checkout</p><h1>{checkoutMode === 'order' ? <>Confirm your<br/>order
                                ahead.</> : <>One last step<br/>to reserve.</>}</h1>
                                <section className="checkoutCard">
                                    <div><span>THE QUICKEN TREE</span><Icon name="fa-wine-glass"/></div>
                                    <b>{checkoutMode === 'order' ? 'Order ahead' : bookingExperience}</b><small>••••
                                    4242</small></section>
                                <section className="checkoutSummary">
                                    <p>{checkoutMode === 'order' ? 'Your order' : bookingExperience}</p>
                                    <span>{checkoutMode === 'order' ? `${preOrderCount} ${preOrderCount === 1 ? 'item' : 'items'}` : `${guestCount} guests × £${experiencePrice.toFixed(2)}`}</span><b>Total
                                    due
                                    today <strong>£{(checkoutMode === 'order' ? preOrderTotal : bookingTotal).toFixed(2)}</strong></b><small>{checkoutMode === 'order' ? 'Your order is sent to the kitchen after payment.' : 'Your reservation is confirmed as soon as payment is complete.'}</small>
                                </section>
                                <button className={`applePay${paymentState === 'processing' ? ' processing' : ''}`}
                                        onClick={payWithApplePay}
                                        disabled={paymentState === 'processing'}>{paymentState === 'processing' ? <><i
                                    className="appleSpinner"/> Processing payment…</> : <>
                                    <span></span> Pay <b>£{(checkoutMode === 'order' ? preOrderTotal : bookingTotal).toFixed(2)}</b></>}</button>
                                <p className="checkoutFine">Demo Apple Pay · no payment is taken.</p></>}
                            {view === 'bookings' && <>
                                <button className="topBack" onClick={() => navigate(bookingsOrigin)}><Icon
                                    name="fa-chevron-left"/> {bookingsOrigin === 'profile' ? 'Profile' : 'Home'}
                                </button>
                                <p className="eyebrow">Your reservations</p><h1>Upcoming<br/>bookings.
                            </h1>{bookings.length ?
                                <div className="bookingList">{bookings.map(booking => <article className="savedBooking"
                                                                                               key={booking.id}><p>The
                                    Quicken Tree</p>
                                    <b>{formatDate(fromInputDate(booking.date))}</b><span>{booking.experience ?? 'Table'} · {booking.time} · {booking.guests}</span>{booking.total ?
                                        <strong className="paidBooking"><Icon name="fa-circle-check"/> Paid ·
                                            £{booking.total.toFixed(2)}
                                        </strong> : null}<small>{booking.name}</small>{parseInt(booking.guests, 10) >= 4 && !booking.total &&
                                        <button className="orderAhead" onClick={() => startOrderAhead(booking)}><Icon
                                            name="fa-utensils"/> Order ahead</button>}</article>)}</div> :
                                <section className="emptyBookings"><Icon name="fa-calendar-plus"/><b>No bookings yet</b>
                                    <p>Your confirmed reservations will appear here.</p>
                                    <button className="cta" onClick={() => navigate('book')}>Book a table</button>
                                </section>}</>}
                            {view === 'menu' && <MenuScreen categories={menuCategories} selectedCategory={menuCategory}
                                                            onCategoryChange={setMenuCategory} search={menuSearch}
                                                            onSearchChange={setMenuSearch}
                                                            sections={filteredMenuSections} dietaryTags={dietaryTags}
                                                            dietaryTagNames={dietaryTagNames}
                                                            orderAheadBooking={orderAheadBooking} onAdd={addToOrder}
                                                            onPromptWings={() => {
                                                                setWingSize(null);
                                                                setWingSizePrompt(true);
                                                            }} onBook={() => navigate('book')}/>}
                            {view === 'cart' &&
                                <CartScreen lines={preOrderLines} total={preOrderTotal} booking={orderAheadBooking}
                                            onBack={() => navigate('menu', true)} onAdd={addToOrder}
                                            onRemove={removeFromOrder} onDelete={name => setPreOrderItems(current => {
                                    const next = {...current};
                                    delete next[name];
                                    return next;
                                })} onEmpty={() => setPreOrderItems({})} onCheckout={() => {
                                    setCheckoutMode('order');
                                    navigate('checkout', true);
                                }}/>}
                            {view === 'rewards' && <><p className="eyebrow">Member rewards</p><h1>A little thank
                                you,<br/>every time you visit.</h1>
                                <section className="tier"><img src="/brand/quicken-tree-white.png"
                                                               alt="The Quicken Tree"/><small>Current tier</small>
                                    <h2>{pointsData.tier}</h2><p>{pointsData.benefits}</p>
                                    <div className="progress"><i/></div>
                                    <footer>{pointsData.points.toLocaleString()} / {pointsData.nextRewardAt.toLocaleString()} points
                                        to Quicken Gold
                                    </footer>
                                </section>
                                <Header title="Ready for you"/>{rewardsData.rewards.map(({icon, title, meta, code}) =>
                                    <article className="reward" key={title}><i><Icon name={icon}/></i>
                                        <div><b>{title}</b><p>{meta}</p></div>
                                        <button onClick={() => {
                                            setIsClosingRedemption(false);
                                            setRedemption({title, code});
                                        }}>Redeem
                                        </button>
                                    </article>)}</>}
                            {view === 'profile' && !profilePanel && <><p className="eyebrow">Your Quicken Tree</p>
                                <button className="account accountButton" onClick={() => setProfilePanel('details')}>
                                    <i>{profileName.slice(0, 1).toUpperCase()}</i>
                                    <div><b>{profileName}</b><small>Quicken Member · since 2024</small></div>
                                    <Icon name="fa-chevron-right"/></button>
                                <button className="setting" onClick={() => {
                                    setBookingsOrigin('profile');
                                    navigate('bookings');
                                }}>Upcoming bookings<span><Icon name="fa-chevron-right"/></span></button>
                                <button className="setting" onClick={() => setProfilePanel('taste')}>Taste profile<span><Icon
                                    name="fa-chevron-right"/></span></button>
                                <button className="setting" onClick={() => setProfilePanel('venues')}>Saved venues<span><Icon
                                    name="fa-chevron-right"/></span></button>
                                <button className="setting" onClick={() => setProfilePanel('gifts')}>Gift cards & credit<span><Icon
                                    name="fa-chevron-right"/></span></button>
                                <button className="setting" onClick={() => setProfilePanel('help')}>Help & contact<span><Icon
                                    name="fa-chevron-right"/></span></button>
                            </>}
                            {view === 'profile' && profilePanel && <>
                                <button className="topBack" onClick={() => setProfilePanel(null)}><Icon
                                    name="fa-chevron-left"/> Profile
                                </button>
                                {profilePanel === 'details' && <><p className="eyebrow">Account details</p><h1>Make
                                    it<br/>yours.</h1><label className="detailLabel">Your name<input value={profileName}
                                                                                                     onChange={event => setProfileName(event.target.value)}/></label><label
                                    className="detailLabel">Email address<input type="email" value={profileEmail}
                                                                                onChange={event => setProfileEmail(event.target.value)}
                                                                                placeholder="you@example.com"/></label>
                                    <button className="cta" onClick={() => {
                                        setProfileSaved(true);
                                        window.setTimeout(() => setProfileSaved(false), 1800);
                                    }}><Icon name="fa-check"/> {profileSaved ? 'Saved' : 'Save changes'}</button>
                                </>}{profilePanel === 'taste' && <><p className="eyebrow">Taste profile</p><h1>Your
                                table,<br/>your taste.</h1><p className="profileIntro">Choose what you enjoy and we’ll
                                make your member offers more relevant.</p>
                                <div
                                    className="tasteChoices">{['Grill favourites', 'Steak & chops', 'Burgers & loaded fries', 'British classics', 'Sunday roasts', 'Seafood', 'Fresh salads', 'Vegetarian dishes', 'Vegan options', 'Gluten-free choices', 'Brunch', 'Afternoon tea', 'Craft beer', 'Cocktails & bubbles', 'Coffee & dessert'].map(taste =>
                                    <button key={taste} className={tasteProfile.includes(taste) ? 'selected' : ''}
                                            onClick={() => setTasteProfile(current => current.includes(taste) ? current.filter(item => item !== taste) : [...current, taste])}>
                                        <Icon name={tasteProfile.includes(taste) ? 'fa-check' : 'fa-plus'}/> {taste}
                                    </button>)}</div>
                            </>}{profilePanel === 'venues' && <><p className="eyebrow">Saved venues</p><h1>Your
                                favourite<br/>place.</h1>
                                <section className="venueCard"><Icon name="fa-location-dot"/>
                                    <div><b>The Quicken Tree</b><p>Heart of England Conference Centre</p><small>Your
                                        preferred venue</small></div>
                                </section>
                            </>}{profilePanel === 'gifts' && <><p className="eyebrow">Gift cards & credit</p><h1>A
                                little extra<br/>for your table.</h1>
                                <section className="creditCard"><small>QUICKEN TREE CREDIT</small><b>£0.00</b><span>No credit available</span>
                                </section>
                                <label className="detailLabel">Add a gift card or credit code<input value={giftCode}
                                                                                                    onChange={event => setGiftCode(event.target.value.toUpperCase())}
                                                                                                    placeholder="QT-XXXX-XXXX"/></label>
                                <button className="cta" disabled={!giftCode} onClick={() => {
                                    setGiftCode('');
                                    setProfileSaved(true);
                                    window.setTimeout(() => setProfileSaved(false), 1800);
                                }}>{profileSaved ? 'Code added' : 'Add code'}</button>
                            </>}{profilePanel === 'help' && <><p className="eyebrow">Help & contact</p><h1>We are
                                here<br/>to help.</h1><p className="profileIntro">For booking changes, dietary
                                requirements or a quick question, get in touch with the team.</p><a
                                className="contactAction" href="tel:01676540444"><Icon name="fa-phone"/> Call The
                                Quicken Tree</a><a className="contactAction" href="mailto:info@quickentree.uk"><Icon
                                name="fa-envelope"/> Email the team</a></>}</>}
                        </div>
                        <nav>{([['home', 'fa-house', 'Home'], ['book', 'fa-calendar-plus', 'Book'], ['menu', 'fa-utensils', 'Menu'], ['rewards', 'fa-star', 'Rewards'], ['profile', 'fa-circle-user', 'Profile']] as const).map(([id, icon, label]) =>
                            <button key={id} onClick={() => navigate(id)}
                                    className={view === id || ((view === 'details' || view === 'checkout') && id === 'book') || (view === 'bookings' && id === 'profile') ? 'active' : ''}>
                                <Icon name={icon}/>{label}</button>)}</nav>
                        {view === 'menu' && orderAheadBooking && <button className="orderCart" disabled={!preOrderCount}
                                                                         onClick={() => navigate('cart', true)}>
                            <span><Icon
                                name="fa-cart-shopping"/></span><strong>{preOrderCount} {preOrderCount === 1 ? 'item' : 'items'}</strong><em>£{preOrderTotal.toFixed(2)}</em>
                        </button>}
                {redemption &&
                    <RedemptionPass redemption={redemption} closing={isClosingRedemption} onClose={closeRedemption}/>} 
                {wingSizePrompt && <WingOptionsDialog size={wingSize} onSizeChange={setWingSize}
                                                      onClose={() => setWingSizePrompt(false)} onAdd={item => {
                    addToOrder(item);
                    setWingSizePrompt(false);
                    setWingSize(null);
                }}/>} 
            </LoyaltyApp>
    </AppNavigationProvider>;
}
