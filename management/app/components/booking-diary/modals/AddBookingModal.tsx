import { useEffect, useState, type FormEvent } from 'react';
import { BookingForm } from '../forms/BookingForm';
import type { BookingDraft, Table } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

type Props = {
  date: string;
  slots: string[];
  kitchenClose?: number;
  tables: Table[];
  value: BookingDraft;
  saving: boolean;
  error?: string;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
};
export function AddBookingModal(props: Props) {
  const [depositRule,setDepositRule]=useState<{required:boolean;amountPence:number;ruleName?:string|null}|null>(null);
  useEffect(()=>{
    if(!props.date||!props.value.time)return;
    let active=true;
    fetch(`/api/deposit-quote?date=${props.date}&time=${props.value.time}&guests=${props.value.guests}&source=backoffice`)
      .then(response=>response.json()).then(quote=>{if(!active)return;setDepositRule(quote);props.onChange({...props.value,depositStatus:quote.required?'demo_paid':'none',depositAmountPence:quote.amountPence});}).catch(()=>undefined);
    return()=>{active=false;};
  },[props.date,props.value.time,props.value.guests]);
  return (
    <ModalShell title="Add booking" onClose={props.onClose}>
      <BookingForm {...props} />
      <section className="booking-protection-panel" aria-label="Booking protection">
        <div>
          <div><strong>Booking protection</strong><p>Choose protection while placing the booking. No real payment or card details are collected.</p></div>
        </div>
        <div className="booking-rule-result"><span>Applied rule</span><strong>{depositRule?.required?depositRule.ruleName||'Deposit required':'No matching deposit rule'}</strong><span>Deposit</span><strong>{depositRule?.required?`£${(depositRule.amountPence/100).toFixed(2)}`:'Not required'}</strong></div>
      </section>
      {!props.slots.length && (
        <p className="dialog-warning">Choose a future date with available booking times.</p>
      )}
      {props.error && <p className="dialog-warning">{props.error}</p>}
      <div className="dialog-actions">
        <button
          className="primary"
          disabled={props.saving || !props.slots.length || !props.value.time}
          onClick={() =>
            document.querySelector<HTMLFormElement>('.booking-dialog form')?.requestSubmit()
          }
        >
          {props.saving ? 'Saving…' : props.slots.length ? 'Create booking' : 'Choose another date'}
        </button>
      </div>
    </ModalShell>
  );
}
