import styles from './styles.module.css';
import {Icon} from '../../Icon';
import type {CartLine, OrderGuestDetails} from '../CartScreen';

export function OrderSummaryScreen({booking, lines, total, guestDetails, onBack}: {booking: { guests: string; time: string; date: string }; lines: CartLine[]; total: number; guestDetails?: OrderGuestDetails; onBack: () => void}) {
    const servings = lines.flatMap(line => Array.from({length: line.quantity}, (_, index) => ({...line, quantity: 1, guest: guestDetails?.assignments[line.name]?.[index] ?? 'To share'})));
    const groups = [...new Set(servings.map(serving => serving.guest))].map(guest => ({guest, lines: servings.filter(serving => serving.guest === guest)}));
    return <div className={styles.root}>
        <button className="topBack" onClick={onBack}><Icon name="fa-chevron-left"/> Bookings</button>
        <p className="eyebrow">Order placed</p>
        <h1>Your<br/>order.</h1>
        <p className={styles.booking}><Icon name="fa-calendar-check"/> Ready for your booking at {booking.time} · {booking.guests}</p>
        <div className={styles.lines}>{groups.map(group => <section className={styles.group} key={group.guest}>{groups.length > 1 && <p className={styles.guest}>{group.guest}</p>}{group.lines.map((line, index) => <article className={styles.line} key={`${group.guest}-${line.name}-${index}`}>
            <div><b>{line.name}</b><p>{line.description}</p></div>
            <span>£{line.price.toFixed(2)}</span>
        </article>)}</section>)}</div>
        <section className={styles.total}><span>Total paid</span><b>£{total.toFixed(2)}</b></section>
        <p className={styles.paid}><Icon name="fa-circle-check"/> Paid by Apple Pay</p>
    </div>;
}
