import styles from './styles.module.css';
import {Icon} from '../Icon';

export function PieChoiceDialog({onClose, onAdd}: {onClose: () => void; onAdd: (item: string) => void}) {
  const choices = [['Fries', 'Skinny fries'], ['Chips', 'Triple cooked chips'], ['Mash', 'Creamy mashed potato']];
  return <div className={styles.root} role="dialog" aria-modal="true" aria-label="Choose pie side"><section className={styles.sheet}><button className={styles.close} onClick={onClose} aria-label="Close pie choices"><Icon name="fa-xmark"/></button><p className="eyebrow">Pie of the day</p><h2>Choose your<br/>side.</h2><p className={styles.intro}>Finish your pie with the side you fancy.</p><div className={styles.choices}>{choices.map(([label, detail]) => <button key={label} onClick={() => onAdd(`Pie of the Day · ${label}`)}><span><b>{label}</b><small>{detail}</small></span><Icon name="fa-chevron-right"/></button>)}</div></section></div>;
}
