import styles from './styles.module.css';
import {Icon} from '../../Icon';
import type {CartLine} from '../CartScreen';

export function OrderSummaryScreen({booking, lines, total, onBack}: {booking: { guests: string; time: string; date: string }; lines: CartLine[]; total: number; onBack: () => void}) {
    return <div className={styles.root}>
        <button className="topBack" onClick={onBack}><Icon name="fa-chevron-left"/> Bookings</button>
        <p className="eyebrow">Order placed</p>
        <h1>Your<br/>order.</h1>
        <p className={styles.booking}><Icon name="fa-calendar-check"/> Ready for your booking at {booking.time} · {booking.guests}</p>
        <div className={styles.lines}>{lines.map(line => <article className={styles.line} key={line.name}>
            <div><b>{line.name}</b><p>{line.description}</p></div>
            <span>{line.quantity} × £{line.price.toFixed(2)}</span>
        </article>)}</div>
        <section className={styles.total}><span>Total paid</span><b>£{total.toFixed(2)}</b></section>
        <p className={styles.paid}><Icon name="fa-circle-check"/> Paid by Apple Pay</p>
    </div>;
}
