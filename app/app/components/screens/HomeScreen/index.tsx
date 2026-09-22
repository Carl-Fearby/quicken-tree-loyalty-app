import {useContent} from '../../../lib/use-content';
import styles from './styles.module.css';
import {Header} from '../../Header';
import {Icon} from '../../Icon';
import {UpcomingBookings, type UpcomingBooking} from '../../UpcomingBookings';
import {useAppNavigation} from '../../../contexts/AppNavigation';

type Event = {
    date: string;
    day: string;
    number: string;
    month: string;
    title: string;
    detail: string;
    festive?: boolean
};

export function HomeScreen({bookings, memberName, points, nextRewardAt, rewardsEnabled, onBookEvent, onLogoClick}: {
    bookings: UpcomingBooking[];
    memberName: string;
    points: number;
    nextRewardAt: number;
    rewardsEnabled: boolean;
    onBookEvent: (date: string) => void;
    onLogoClick?: () => void
}) {
    const {navigate, openBookings} = useAppNavigation();
    const content = useContent();
    const events: Event[] = content.events.events.map(event => ({...event, detail: event.description}));
    const pointsUntilReward = Math.max(0, nextRewardAt - points);
    return <div className={styles.root}><p className="eyebrow">Welcome back, {memberName}</p><h1>Make every visit<br/>more
        memorable.</h1>
        <section className="hero">
            <button type="button" className={styles.logoButton} onClick={onLogoClick}
                    aria-label="Show new menu and event news"><img src="/brand/quicken-tree-red.png"
                                                                   alt="The Quicken Tree Bar Grill Restaurant"/>
            </button>
            <span>Eat · Drink<br/>Repeat</span><h2>Your table awaits.</h2><p>At Heart of England Conference Centre</p>
            <div className={styles.heartOfEnglandLogo}><img src="/brand/heart-of-england-white.png"
                                                            alt="Heart of England Conference Centre"/></div>
        </section>
        {rewardsEnabled && <button className="points" onClick={() => navigate('rewards')}>
            <i>QT</i><span><b>{points.toLocaleString()} points</b><small>{pointsUntilReward.toLocaleString()} points until your next reward</small></span><em><Icon
            name="fa-chevron-right"/></em></button>}
        <Header title="Your visit, your way"/>
        <div className="actions">
            <button onClick={() => navigate('book')}><strong><Icon name="fa-calendar-plus"/></strong>Book a table
            </button>
            {rewardsEnabled && <button onClick={() => navigate('rewards')}><strong><Icon name="fa-star"/></strong>Use rewards</button>}
            <button onClick={() => navigate('menu')}><strong><Icon name="fa-utensils"/></strong>View menu</button>
        </div>
        <UpcomingBookings bookings={bookings}
                          formatDate={value => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long'
                          })} onOpen={() => openBookings('home')}/><Header title="At The Quicken Tree"/>
        <div className="eventList">{events.map(event => <button className={`event${event.festive ? ' festive' : ''}`}
                                                                key={event.date}
                                                                onClick={() => onBookEvent(event.date)}>
            <time>{event.day}<b>{event.number}</b>{event.month}</time>
            <div><b>{event.title}</b><p>{event.detail}</p></div>
        </button>)}</div>
    </div>;
}
