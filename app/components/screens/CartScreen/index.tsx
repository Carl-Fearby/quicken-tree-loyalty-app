import {useState} from 'react';
import styles from './styles.module.css';
import { Icon } from '../../Icon';

export type CartLine = { name: string; description: string; price: number; quantity: number };
export type OrderGuestDetails = { names: string[]; assignments: Record<string, string[]> };

export function CartScreen({ lines, total, booking, guestDetails, onGuestDetailsChange, onBack, onAdd, onRemove, onDelete, onEmpty, onCheckout }: { lines: CartLine[]; total: number; booking: { guests: string; time: string; name?: string } | null; guestDetails: OrderGuestDetails; onGuestDetailsChange: (details: OrderGuestDetails) => void; onBack: () => void; onAdd: (name: string) => void; onRemove: (name: string) => void; onDelete: (name: string) => void; onEmpty: () => void; onCheckout: () => void }) {
  const [showAssignments, setShowAssignments] = useState(false);
  const [guestName, setGuestName] = useState('');
  const names = guestDetails.names.length ? guestDetails.names : (booking?.name ? [booking.name] : []);
  const addGuest = () => {
    const name = guestName.trim();
    if (!name || names.includes(name)) return;
    onGuestDetailsChange({...guestDetails, names: [...names, name]});
    setGuestName('');
  };
  const setAssignment = (itemName: string, index: number, value: string) => {
    const assignments = [...(guestDetails.assignments[itemName] ?? Array(lines.find(line => line.name === itemName)?.quantity ?? 0).fill('To share'))];
    assignments[index] = value;
    onGuestDetailsChange({...guestDetails, names, assignments: {...guestDetails.assignments, [itemName]: assignments}});
  };
  return <div className={styles.root}><button className="topBack" onClick={onBack}><Icon name="fa-chevron-left" /> Menu</button><p className="eyebrow">Order ahead</p><h1>Your<br/>basket.</h1>{lines.length ? <><p className="cartBooking"><Icon name="fa-calendar-check" /> Ordering ahead for {booking?.guests} at {booking?.time}</p><div className="cartList">{lines.map(item => <article className="cartItem" key={item.name}><div><b>{item.name}</b><p>{item.description}</p><strong>£{item.price.toFixed(2)}</strong></div><aside><button onClick={() => onRemove(item.name)} aria-label={'Remove one ' + item.name}><Icon name="fa-minus" /></button><b>{item.quantity}</b><button onClick={() => onAdd(item.name)} aria-label={'Add one ' + item.name}><Icon name="fa-plus" /></button></aside><button className="removeCartItem" onClick={() => onDelete(item.name)}>Remove</button></article>)}</div><section className="guestAssignments"><button type="button" className="guestAssignmentsToggle" onClick={() => setShowAssignments(value => !value)}><span><Icon name="fa-users"/><b>Assign dishes to guests</b><small>Optional · leave dishes as sharing if you prefer</small></span><Icon name={showAssignments ? 'fa-chevron-up' : 'fa-chevron-down'}/></button>{showAssignments && <div className="guestAssignmentsPanel"><p>Names are shown on your booking order summary.</p><div className="guestNameEntry"><input value={guestName} onChange={event => setGuestName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addGuest(); } }} placeholder="Guest name"/><button type="button" onClick={addGuest}>Add</button></div>{names.length > 0 && <div className="guestNames">{names.map(name => <span key={name}>{name}</span>)}</div>}<div className="guestItemAssignments">{lines.map(item => <section key={item.name}><b>{item.name}</b>{Array.from({length: item.quantity}, (_, index) => <label key={index}><span>{item.quantity > 1 ? `Item ${index + 1}` : 'Serve to'}</span><select value={guestDetails.assignments[item.name]?.[index] ?? 'To share'} onChange={event => setAssignment(item.name, index, event.target.value)}><option>To share</option>{names.map(name => <option key={name}>{name}</option>)}</select></label>)}</section>)}</div></div>}</section><button className="emptyCart" onClick={onEmpty}>Empty basket</button><section className="cartTotal"><span>Total</span><b>£{total.toFixed(2)}</b></section><button className="applePay" onClick={onCheckout}><span></span> Checkout <b>£{total.toFixed(2)}</b></button><p className="checkoutFine">Demo Apple Pay · no payment is taken.</p></> : <section className="emptyCartState"><Icon name="fa-basket-shopping" /><b>Your basket is empty</b><p>Add dishes from the menu when you are ready.</p><button className="cta" onClick={onBack}>Browse menu</button></section>}</div>;
}
