'use client';

import {useEffect, useState} from 'react';
import data from '../../data/payment-cards.json';
import styles from './styles.module.css';
import {Icon} from '../Icon';

export type SavedCard = {id: string; brand: string; last4: string; expiry: string; name: string};
const seeds: SavedCard[] = data.cards.map(({number, ...card}) => card);
function detectBrand(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('4')) return 'Visa';
    if (/^3[47]/.test(digits)) return 'American Express';
    if (/^(6011|65|64[4-9])/.test(digits)) return 'Discover';
    if (/^35(2[89]|[3-8]\d)/.test(digits)) return 'JCB';
    if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
    return '';
}
function passesLuhn(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 12) return false;
    let sum = 0;
    let double = false;
    for (let i = digits.length - 1; i >= 0; i -= 1) {
        let digit = Number(digits[i]);
        if (double) { digit *= 2; if (digit > 9) digit -= 9; }
        sum += digit;
        double = !double;
    }
    return sum % 10 === 0;
}
function hasValidLength(value: string, brand: string) {
    const length = value.replace(/\D/g, '').length;
    if (brand === 'Visa') return [13, 16, 19].includes(length);
    if (brand === 'Mastercard') return length === 16;
    if (brand === 'American Express') return length === 15;
    if (brand === 'Discover') return [16, 19].includes(length);
    if (brand === 'JCB') return length >= 16 && length <= 19;
    return false;
}

function Dropdown({value, placeholder, options, onChange}: {value: string; placeholder: string; options: {value: string; label: string}[]; onChange: (value: string) => void}) {
    const [open, setOpen] = useState(false);
    const label = options.find(option => option.value === value)?.label ?? placeholder;
    return <div className={styles.dropdown}><button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)}>{label}<Icon name="fa-chevron-down"/></button>{open && <div className={styles.dropdownOptions} role="listbox">{options.map(option => <button type="button" key={option.value} role="option" aria-selected={option.value === value} className={option.value === value ? styles.selectedOption : ''} onClick={() => {onChange(option.value); setOpen(false);}}>{option.label}</button>)}</div>}</div>;
}

export function usePaymentCards() {
    const [cards, setCards] = useState<SavedCard[]>(seeds);
    const [ready, setReady] = useState(false);
    useEffect(() => {
        try {
            const stored = localStorage.getItem(data.storageKey);
            if (stored) {
                const parsed: unknown = JSON.parse(stored);
                if (Array.isArray(parsed)) setCards(parsed.filter(card => card && typeof card.id === 'string' && typeof card.brand === 'string' && typeof card.last4 === 'string' && typeof card.expiry === 'string' && typeof card.name === 'string').map(card => ({id: card.id, brand: card.brand, last4: card.last4, expiry: card.expiry, name: card.name})));
            }
        } catch { /* Keep the JSON defaults if browser storage is unavailable. */ }
        setReady(true);
    }, []);
    useEffect(() => {
        if (ready) try { localStorage.setItem(data.storageKey, JSON.stringify(cards)); } catch { /* Session changes remain usable. */ }
    }, [cards, ready]);
    return {cards, setCards, ready};
}

export function PaymentCards({cards, onChange}: {cards: SavedCard[]; onChange: (cards: SavedCard[]) => void}) {
    const [adding, setAdding] = useState(false);
    const [number, setNumber] = useState('');
    const [name, setName] = useState('Stephen');
    const [expiry, setExpiry] = useState('12/30');
    const [error, setError] = useState('');
    const [numberTouched, setNumberTouched] = useState(false);
    const clearForm = () => { setNumber(''); setName('Stephen'); setExpiry('12/30'); setError(''); setNumberTouched(false); };
    const expiryParts = expiry.split('/');
    const expiryYears = Array.from({length: 12}, (_, index) => String(new Date().getFullYear() + index).slice(-2));
    const test = data.cards.find(card => card.number === number.replace(/\s/g, ''));
    const detectedBrand = test?.brand ?? detectBrand(number);
    return <section className={`${styles.root} paymentCardsScreen`}>
        <p className="eyebrow">Payment cards</p><h1>Your saved cards</h1>
        <p>Manage the cards available for your bookings and purchases.</p>
        {cards.length === 0 && <p>No saved cards yet.</p>}
        {cards.map(card => <article className={styles.card} key={card.id}>
            <span className={`${styles.brandBadge} ${card.brand.toLowerCase()}`}><img src={`/card-brands/${card.brand.toLowerCase()}.svg`} alt={card.brand}/></span>
            <div><strong>{card.brand} · •••• {card.last4}</strong><small>{card.name} · Expires {card.expiry}</small></div>
            <button type="button" onClick={() => onChange(cards.filter(item => item.id !== card.id))} aria-label={`Remove ${card.brand} ending ${card.last4}`}>Remove</button>
        </article>)}
        {!adding && <button className="cta" type="button" onClick={() => setAdding(true)}>Add payment card</button>}
        {adding && <div className={styles.sheetBackdrop} role="presentation" onClick={event => {if (event.target === event.currentTarget) {setAdding(false); clearForm();}}}>
        <form className={styles.sheet} autoComplete="off" onClick={event => event.stopPropagation()} onSubmit={event => {
            event.preventDefault();
            if (!detectedBrand || !hasValidLength(number, detectedBrand) || !passesLuhn(number)) return setError('Check the card number and try again.');
            const digits = number.replace(/\D/g, '');
            const cardId = `${detectedBrand.toLowerCase().replace(/\s+/g, '-')}-${digits.slice(-4)}`;
            if (cards.some(card => card.id === cardId)) return setError('This card is already saved.');
            if (!name.trim()) return setError('Enter the name on the card.');
            const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiry);
            if (!match || new Date(2000 + Number(match[2]), Number(match[1]), 1) <= new Date()) return setError('Enter a future expiry date as MM/YY.');
            onChange([...cards, {id: cardId, brand: detectedBrand, last4: digits.slice(-4), expiry, name: name.trim()}]);
            setNumber(''); setError(''); setAdding(false);
        }}>
            {/* TODO: restore autocomplete="cc-number" and secure payment-field semantics when production payments are wired up over HTTPS. */}
            <label className="detailLabel">Number<div className={`${styles.numberField} ${detectedBrand && hasValidLength(number, detectedBrand) && passesLuhn(number) ? styles.valid : ''}`}><input name="demo-input" value={number} onChange={event => { const digits = event.target.value.replace(/\D/g, '').slice(0, 19); setNumber(digits.replace(/(.{4})/g, '$1 ').trim()); }} onBlur={() => setNumberTouched(true)} inputMode="numeric" autoComplete="off" maxLength={23} placeholder="0000 0000 0000 0000" required/><span className={styles.detectedBrand}>{detectedBrand && <img src={`/card-brands/${detectedBrand.toLowerCase().replace(/\s+/g, '')}.svg`} alt={detectedBrand}/>}</span></div></label>
            {((numberTouched && !number.replace(/\D/g, '').length) || number.replace(/\D/g, '').length > 0) && <p className={hasValidLength(number, detectedBrand) && passesLuhn(number) && detectedBrand ? styles.luhnValid : styles.luhnInvalid} aria-live="polite">{hasValidLength(number, detectedBrand) && passesLuhn(number) && detectedBrand ? '✓ Card number looks valid' : (number.replace(/\D/g, '').length ? 'Card is invalid' : 'Enter a valid card number')}</p>}
            <label className="detailLabel">Name on card<input value={name} onChange={event => setName(event.target.value)} maxLength={80} required/></label>
            <label className="detailLabel">Expiry (MM/YY)<div className={styles.expiryPicker}><Dropdown value={expiryParts[0] ?? ''} placeholder="Month" options={Array.from({length: 12}, (_, index) => { const month = String(index + 1).padStart(2, '0'); return {value: month, label: month}; })} onChange={month => setExpiry(`${month}/${expiryParts[1] ?? ''}`)}/><Dropdown value={expiryParts[1] ?? ''} placeholder="Year" options={expiryYears.map(year => ({value: year, label: `20${year}`}))} onChange={year => setExpiry(`${expiryParts[0] ?? ''}/${year}`)}/></div></label>
            {error && <p role="alert">{error}</p>}
            <div className={styles.formActions}><button className="cta" type="submit">Save card</button><button className={styles.cancel} type="button" onClick={() => {setAdding(false); clearForm();}}>Cancel</button></div>
        </form></div>}
    </section>;
}

export function PaymentMethodPicker({cards, value, onChange, disabled}: {cards: SavedCard[]; value: string; onChange: (id: string) => void; disabled: boolean}) {
    return <fieldset className={styles.picker} disabled={disabled}><legend>Payment method</legend>
        <label><input type="radio" name="payment-method" checked={value === 'apple-pay'} onChange={() => onChange('apple-pay')}/> Apple Pay (demo)</label>
        {cards.map(card => <label key={card.id}><input type="radio" name="payment-method" checked={value === card.id} onChange={() => onChange(card.id)}/><span>{card.brand} · •••• {card.last4}<small>Expires {card.expiry}</small></span></label>)}
        {!cards.length && <p>Add a test card in Profile → Payment cards.</p>}
    </fieldset>;
}
