import {useState} from 'react';
import styles from './styles.module.css';
import {Icon} from '../Icon';

export function BookingCancellationDialog({hasOrder, bookingDate, bookingTime, depositAmount, cancellationCutoffHours, onCancel, onConfirm}: {hasOrder: boolean; bookingDate: string; bookingTime: string; depositAmount?: number; cancellationCutoffHours: number; onCancel: () => void; onConfirm: (reason: string) => void}) {
    const [reason, setReason] = useState('Plans changed');
    const cutoff = new Date(`${bookingDate}T${bookingTime}:00`);
    cutoff.setHours(cutoff.getHours() - cancellationCutoffHours);
    const late = new Date() >= cutoff;
    const depositMessage = depositAmount ? late
        ? `This is inside the ${cancellationCutoffHours}-hour cancellation window. Your £${depositAmount.toFixed(2)} deposit will be retained.`
        : `Your £${depositAmount.toFixed(2)} booking deposit will be refunded.` : '';
    return <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby="booking-cancellation-title">
        <section className={styles.panel}>
            <i><Icon name="fa-circle-exclamation"/></i>
            <p className="eyebrow">{hasOrder ? 'Order already placed' : 'Cancel booking'}</p>
            <h2 id="booking-cancellation-title">{hasOrder ? <>Cancel this<br/>booking?</> : <>Are you sure you want<br/>to cancel?</>}</h2>
            <p>{[hasOrder ? 'You have already ordered on this booking. Cancelling will not refund your order — please contact us for help.' : 'Your reservation will be cancelled.' , depositMessage].filter(Boolean).join(' ')}</p>
            <label className={styles.reason}><span>Reason</span><select value={reason} onChange={(event) => setReason(event.target.value)}><option>Plans changed</option><option>Illness or emergency</option><option>Duplicate booking</option><option>Other</option></select></label>
            <div className={styles.actions}><button onClick={onCancel}>Keep booking</button><button onClick={() => onConfirm(reason)}>Cancel booking</button></div>
        </section>
    </div>;
}
