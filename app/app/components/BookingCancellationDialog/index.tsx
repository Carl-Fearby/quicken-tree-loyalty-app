import styles from './styles.module.css';
import {Icon} from '../Icon';

export function BookingCancellationDialog({hasOrder, onCancel, onConfirm}: {hasOrder: boolean; onCancel: () => void; onConfirm: () => void}) {
    return <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby="booking-cancellation-title">
        <section className={styles.panel}>
            <i><Icon name="fa-circle-exclamation"/></i>
            <p className="eyebrow">{hasOrder ? 'Order already placed' : 'Cancel booking'}</p>
            <h2 id="booking-cancellation-title">{hasOrder ? <>Cancel this<br/>booking?</> : <>Are you sure you want<br/>to cancel?</>}</h2>
            <p>{hasOrder ? 'You have already ordered on this booking. Cancelling will not refund your order — please contact us for help.' : 'Your reservation will be removed from the app. You can make a new booking whenever you are ready.'}</p>
            <div className={styles.actions}><button onClick={onCancel}>Cancel</button><button onClick={onConfirm}>OK</button></div>
        </section>
    </div>;
}
