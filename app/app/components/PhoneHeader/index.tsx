import styles from './styles.module.css';
import { Icon } from '../Icon';
export function PhoneHeader({onClock, light = false, transparent = false}: { onClock: () => void; light?: boolean; transparent?: boolean }) { return <div className={`status${light ? ' statusLight' : ''}${transparent ? ' transparentStatus' : ''} ${styles.root}`}><button className="clock" onClick={onClock} aria-label="Show an event notification">9:41</button><span className="statusMetrics"><Icon name="fa-signal"/><b>100%</b><Icon name="fa-battery-full"/></span></div>; }
