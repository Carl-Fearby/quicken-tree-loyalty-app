import { useState, type FormEvent } from 'react';
import type { Booking } from '../lib/bookingTypes';

export function AttendanceStatusDialog({booking,targetStatus,saving,onClose,onConfirm}:{booking:Booking;targetStatus:'no_show'|'confirmed';saving:boolean;onClose:()=>void;onConfirm:(reason:string)=>void}){
  const [reason,setReason]=useState('');
  const reversal=targetStatus==='confirmed';
  const submit=(event:FormEvent)=>{event.preventDefault();if(reason.trim())onConfirm(reason.trim());};
  return <div className="dialog-layer"><section className="dialog-card attendance-dialog" role="dialog" aria-modal="true" aria-labelledby="attendance-dialog-title">
    <div className="dialog-title-row"><div><p className="eyebrow">ATTENDANCE</p><h2 id="attendance-dialog-title">{reversal?'Reverse no-show':'Mark as no-show'}</h2></div><button type="button" onClick={onClose}>Close</button></div>
    <p>{reversal?`Restore ${booking.name} to a confirmed booking.`:`Record that ${booking.name} did not attend this booking.`}</p>
    <form onSubmit={submit}><label>{reversal?'Reason for reversal':'Reason or contact outcome'}<textarea autoFocus required maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder={reversal?'e.g. Guest was seated under another booking':'e.g. Called guest, no answer'}/></label>
      <div className="dialog-actions"><button type="button" onClick={onClose}>Cancel</button><button className={reversal?'primary':'danger'} disabled={saving||!reason.trim()} type="submit">{saving?'Saving…':reversal?'Restore booking':'Confirm no-show'}</button></div>
    </form>
  </section></div>;
}
