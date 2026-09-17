import styles from '../WingOptionsDialog/styles.module.css';
import {Icon} from '../Icon';

export function WingsWednesdayDialog({onClose,onAdd}:{onClose:()=>void;onAdd:(item:string,quantity:number)=>void}){
 return <div className={`${styles.root} wingSizeOverlay`} role="dialog" aria-modal="true" aria-label="Choose Wings Wednesday flavour"><section className="wingSizePrompt"><button className="closeRedeem" onClick={onClose} aria-label="Close wings picker"><Icon name="fa-xmark"/></button><p className="eyebrow">Wings Wednesday</p><div className="wingChoiceContent"><h2>Choose a<br/>flavour.</h2><p>A minimum of five wings is required. Add more in your basket.</p>{[['BBQ','Crispy onions and coleslaw'],['Hot','Fresh chilli and spring onions']].map(([flavour,description])=><button key={flavour} onClick={()=>onAdd(`Wings Wednesday · ${flavour}`,5)}><span><b>{flavour}</b><small>{description}</small></span><strong>£5.00</strong><Icon name="fa-chevron-right"/></button>)}</div></section></div>;
}
