'use client';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';

export function AttendanceSettings({onBack}:{onBack:()=>void}) {
  const [firstHours,setFirstHours]=useState(24);
  const [finalHours,setFinalHours]=useState(2);
  const [message,setMessage]=useState('');
  useEffect(()=>{void fetch('/api/attendance-settings').then(r=>r.json()).then(body=>{setFirstHours(Number(body.firstReminderHours??24));setFinalHours(Number(body.finalReminderHours??2));});},[]);
  const save=async()=>{setMessage('Saving…');const response=await fetch('/api/attendance-settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({firstReminderHours:firstHours,finalReminderHours:finalHours})});const body=await response.json();setMessage(response.ok?'Saved.':body.message||'Unable to save reminder settings.');};
  return <section className="settings-page attendance-settings">
    <Breadcrumbs current="Attendance and reminders" onSettings={onBack}/>
    <p className="eyebrow">BOOKING SETTINGS</p><h1>Attendance and reminders</h1>
    <p className="settings-intro">Set the booking reminder schedule and support the venue’s arrival and no-show workflow.</p>
    <section className="settings-card attendance-settings-card">
      <div><h2>Reminder schedule</h2><p>Messages are demo-ready until an email, SMS or push provider is connected.</p></div>
      <div className="attendance-setting-fields">
        <label>First reminder<input type="number" min="1" max="168" value={firstHours} onChange={e=>setFirstHours(Number(e.target.value))}/><small>Hours before the booking</small></label>
        <label>Final reminder<input type="number" min="1" max="48" value={finalHours} onChange={e=>setFinalHours(Number(e.target.value))}/><small>Hours before the booking</small></label>
      </div>
      <div className="settings-actions"><p role="status">{message}</p><button className="primary" type="button" onClick={()=>void save()}>Save changes</button></div>
    </section>
  </section>;
}
