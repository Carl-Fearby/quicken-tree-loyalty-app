import styles from './styles.module.css';
import {Icon} from '../Icon';

export type UpcomingBooking = {
    id: string;
    date: string;
    time: string;
    guests: string;
    experience?: string;
    bottomlessBrunchMeal?: string;
    bottomlessBrunchUpgrade?: boolean
};

export function UpcomingBookings({bookings, onOpen, formatDate}: {
    bookings: UpcomingBooking[];
    onOpen: () => void;
    formatDate: (date: string) => string
}) {
    if (!bookings.length) return null;
    return <section className={`${styles.root} homeBookings`}>
        <div className="sectionTitle">Upcoming bookings <button onClick={onOpen}>View all</button></div>
        {bookings.slice(0, 2).map(booking => <button className="homeBooking" key={booking.id} onClick={onOpen}><Icon
            name="fa-calendar-check"/><span><b>{formatDate(booking.date)}</b><small>{booking.experience ?? 'Table'}{booking.bottomlessBrunchMeal ? ` · ${booking.bottomlessBrunchMeal}` : ''}{booking.bottomlessBrunchUpgrade ? ' · Drinks upgrade' : ''} · {booking.time} · {booking.guests}</small></span><Icon
            name="fa-chevron-right"/></button>)}</section>;
}
