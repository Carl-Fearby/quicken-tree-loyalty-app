import type { FormEvent } from 'react';
import { BookingForm } from '../forms/BookingForm';
import type { Booking, BookingDraft, Table } from '../lib/bookingTypes';
import { ModalShell } from './ModalShell';

type Props = {
  booking: Booking;
  date: string;
  slots: string[];
  kitchenClose?: number;
  tables: Table[];
  value: BookingDraft;
  saving: boolean;
  onChange: (value: BookingDraft) => void;
  onDateChange: (date: string) => void;
  onClose: () => void;
  onRequestCancel: () => void;
  onViewOrder: () => void;
  onSubmit: (event: FormEvent) => void;
  onProtectionChange: (changes: {depositStatus?:string;depositAmountPence?:number}) => void;
  onStatusChange: (status:string) => void;
  onSendReminder: () => void;
  readOnly?: boolean;
  preserveCurrentSchedule?: boolean;
};
export function EditBookingModal(props: Props) {
  return (
    <ModalShell title={props.readOnly ? 'Booking details' : 'Edit booking'} onClose={props.onClose}>
      <BookingForm {...props} />
      <section className="booking-protection-panel" aria-label="Revenue protection">
        <div><div><strong>Deposit and attendance</strong><p>Protection was selected when this booking was placed.</p></div></div>
        <div className="booking-protection-summary"><span>Protection</span><strong>{props.booking.depositStatus==='demo_paid'?`£${((props.booking.depositAmountPence||0)/100).toFixed(2)} deposit paid`:props.booking.depositStatus==='demo_required'?'Deposit required':props.booking.depositStatus==='demo_card_guarantee'?'Card guarantee recorded':props.booking.depositStatus==='demo_refunded'?'Deposit refunded':'None'}</strong><span>Attendance</span><strong>{props.booking.status.replaceAll('_',' ')}</strong></div>
        <div className="booking-reminder-status"><span>Last reminder</span><strong>{props.booking.lastReminder?`${props.booking.lastReminder.channel} · ${props.booking.lastReminder.status}`:'Not sent'}</strong>{!props.readOnly&&!['cancelled','completed','no_show'].includes(props.booking.status)&&<button type="button" disabled={props.saving} onClick={props.onSendReminder}>Send email reminder</button>}</div>
        {!props.readOnly&&<div className="booking-protection-actions">
          {props.booking.depositStatus==='demo_paid'&&<button type="button" disabled={props.saving} onClick={()=>props.onProtectionChange({depositStatus:'demo_refunded',depositAmountPence:props.booking.depositAmountPence||0})}>Refund deposit</button>}
          {props.booking.status==='no_show'?<button type="button" disabled={props.saving} onClick={()=>props.onStatusChange('confirmed')}>Reverse no-show</button>:<>
            {!['arrived','seated','completed'].includes(props.booking.status)&&<button type="button" disabled={props.saving} onClick={()=>props.onStatusChange('arrived')}>Arrived</button>}
            {!['seated','completed'].includes(props.booking.status)&&<button type="button" disabled={props.saving} onClick={()=>props.onStatusChange('seated')}>Seated</button>}
            {props.booking.status!=='completed'&&<button type="button" disabled={props.saving} onClick={()=>props.onStatusChange('completed')}>Completed</button>}
            <button className="danger" type="button" disabled={props.saving} onClick={()=>props.onStatusChange('no_show')}>No-show</button>
          </>}
        </div>}
      </section>
      <div className="dialog-actions">
        {props.booking.orderAhead && (
          <button type="button" onClick={props.onViewOrder}>
            View order
          </button>
        )}
        {!props.readOnly && <button className="booking-cancel-trigger" type="button" onClick={props.onRequestCancel}>
          Cancel this booking…
        </button>}
        {!props.readOnly && <button
          className="primary"
          disabled={props.saving || !props.value.time}
          onClick={() =>
            document.querySelector<HTMLFormElement>('.booking-dialog form')?.requestSubmit()
          }
        >
          {props.saving ? 'Saving…' : 'Save booking'}
        </button>}
      </div>
    </ModalShell>
  );
}
