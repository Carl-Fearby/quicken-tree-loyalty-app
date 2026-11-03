'use client';
import { useEffect, useState } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';
import { RoundedSelect } from '../ui/RoundedSelect';

type Rule = {
  id?: string;
  name: string;
  active: boolean;
  channel: 'app' | 'backoffice' | 'both';
  minPartySize: number;
  maxPartySize: number | null;
  days: number[];
  startsAt: string;
  endsAt: string;
  amountPence: number;
  priority: number;
};

const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const blankRule = (): Rule => ({name:'New deposit rule',active:true,channel:'both',minPartySize:1,maxPartySize:null,days:[0,1,2,3,4,5,6],startsAt:'00:00',endsAt:'23:59',amountPence:1000,priority:0});

export function DepositRulesSettings({onBack}:{onBack:()=>void}) {
  const [enabled,setEnabled]=useState(true);
  const [rules,setRules]=useState<Rule[]>([]);
  const [message,setMessage]=useState('');
  useEffect(()=>{void fetch('/api/deposit-rules').then(r=>r.json()).then(body=>{setEnabled(body.enabled!==false);setRules(body.rules||[]);});},[]);
  const change=(index:number,values:Partial<Rule>)=>setRules(current=>current.map((rule,i)=>i===index?{...rule,...values}:rule));
  const save=async()=>{setMessage('Saving…');const response=await fetch('/api/deposit-rules',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled,rules})});const body=await response.json();if(response.ok){setRules(body.rules);setMessage('Saved.');}else setMessage(body.message||'Unable to save rules.');};
  return <section className="settings-page deposit-rules-page">
    <Breadcrumbs current="Deposit rules" onSettings={onBack}/>
    <p className="eyebrow">BOOKING SETTINGS</p><h1>Deposit rules</h1>
    <p className="settings-intro">Apply the first matching rule by priority across customer-app and back-office bookings.</p>
    <section className="settings-card deposit-master"><div><h2>Require booking deposits</h2><p>Turn off to suspend every rule without deleting the configuration.</p></div><label className="theme-switch"><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/><span className="theme-switch-track" aria-hidden="true"><span className="theme-switch-thumb"/></span></label></section>
    <div className="deposit-rule-list">{rules.map((rule,index)=><section className="settings-card deposit-rule" key={rule.id||index}>
      <header><input aria-label="Rule name" value={rule.name} onChange={e=>change(index,{name:e.target.value})}/><label className="check-control"><input type="checkbox" checked={rule.active} onChange={e=>change(index,{active:e.target.checked})}/><span>Active</span></label><button title="Delete rule" aria-label={`Delete ${rule.name}`} onClick={()=>setRules(current=>current.filter((_,i)=>i!==index))}><span className="remove-rule-icon" aria-hidden="true" /></button></header>
      <div className="deposit-rule-fields">
        <label>Booking source<RoundedSelect ariaLabel="Booking source" value={rule.channel} options={[{value:'both',label:'App and back office'},{value:'app',label:'Customer app'},{value:'backoffice',label:'Back office'}]} onChange={value=>change(index,{channel:value as Rule['channel']})}/></label>
        <label>Minimum guests<input type="number" min="1" max="20" value={rule.minPartySize} onChange={e=>change(index,{minPartySize:Number(e.target.value)})}/></label>
        <label>Maximum guests<input type="number" min="1" max="20" placeholder="No maximum" value={rule.maxPartySize??''} onChange={e=>change(index,{maxPartySize:e.target.value?Number(e.target.value):null})}/></label>
        <label>From<input type="time" value={rule.startsAt} onChange={e=>change(index,{startsAt:e.target.value})}/></label>
        <label>Until<input type="time" value={rule.endsAt} onChange={e=>change(index,{endsAt:e.target.value})}/></label>
        <label>Deposit amount<input type="number" min="0" step="0.01" value={(rule.amountPence/100).toFixed(2)} onChange={e=>change(index,{amountPence:Math.round(Number(e.target.value)*100)})}/></label>
        <label>Priority<input type="number" value={rule.priority} onChange={e=>change(index,{priority:Number(e.target.value)})}/></label>
      </div>
      <fieldset className="deposit-rule-days"><legend>Days</legend>{dayNames.map((day,value)=><label key={day}><input type="checkbox" checked={rule.days.includes(value)} onChange={e=>change(index,{days:e.target.checked?[...rule.days,value].sort():rule.days.filter(item=>item!==value)})}/><span><i aria-hidden="true"/>{day}</span></label>)}</fieldset>
    </section>)}</div>
    <div className="settings-actions deposit-rule-actions"><p role="status">{message}</p><button onClick={()=>setRules(current=>[...current,blankRule()])}>+ Add rule</button><button className="primary" onClick={()=>void save()}>Save changes</button></div>
  </section>;
}
