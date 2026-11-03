'use client';
import { useRouter } from 'next/navigation';
import { FormEvent, type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';

type ConsentStatus = 'unknown' | 'opted_in' | 'opted_out';
type CrmData = {
  customer: { id:string; name:string; email:string|null; phone:string|null; memberSince:string; tier:string; points:number; tastes:string[]; dietaryNeeds:string[]; completedVisits:number; noShowCount:number; cancellationCount:number };
  bookings: { id:string; date:string; time:string; guests:number; experience:string; status:string; totalPence:number }[];
  notes: { id:string; body:string; createdAt:string; createdBy:string }[];
  tags: { id:string; name:string; color:string; source:'manual'|'automatic'; reason?:string }[];
  tagDefinitions: { id:string; name:string; color:string }[];
  tagEvaluation: { completedVisits:number; visitsIn90Days:number; points:number; lastVisitAt:string|null };
  consents: { channel:string; status:ConsentStatus; updatedAt:string }[];
  activity: { id:string; type:string; title:string; detail:string; occurredAt:string; actorType:'customer'|'staff'|'system'; actor:string }[];
  canWrite:boolean;
};
const channels = ['email','sms','push'] as const;
const dateTime = (value:string) => new Date(value).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short'});

export function CustomerDetailPage({ customerId }: { customerId:string }) {
  const router = useRouter();
  const [data,setData] = useState<CrmData|null>(null), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [profile,setProfile] = useState({name:'',email:'',phone:''}), [note,setNote] = useState(''), [tag,setTag] = useState('');
  const load = useCallback(async () => {
    const response = await fetch(`/api/customers/${customerId}`,{cache:'no-store'}), body = await response.json();
    if(!response.ok) throw Error(body.message || 'Unable to load customer.');
    setData(body); setProfile({name:body.customer.name,email:body.customer.email || '',phone:body.customer.phone || ''});
  },[customerId]);
  useEffect(()=>{ load().catch(problem=>setError(problem instanceof Error ? problem.message : 'Unable to load customer.')); },[load]);
  const consent = useMemo(()=>Object.fromEntries(channels.map(channel=>[channel,data?.consents.find(item=>item.channel===channel)?.status || 'unknown'])),[data]);
  const request = async (path:string,method:string,body?:unknown) => {
    setBusy(true); setError('');
    try { const response=await fetch(path,{method,headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})}), result=await response.json(); if(!response.ok) throw Error(result.message || 'Unable to save customer.'); await load(); }
    catch(problem){ setError(problem instanceof Error ? problem.message : 'Unable to save customer.'); }
    finally { setBusy(false); }
  };
  if(!data) return <section className="settings-page"><Breadcrumbs current="Customer profile" parent="Customers" onParent={()=>router.push('/customers')} showSettings={false}/><p>{error || 'Loading customer…'}</p></section>;
  const {customer,canWrite}=data;
  return <section className="settings-page customer-detail-page">
    <Breadcrumbs current={customer.name} parent="Customers" onParent={()=>router.push('/customers')} showSettings={false}/>
    <div className="customer-detail-heading"><div><p className="eyebrow">CUSTOMER PROFILE</p><h1>{customer.name}</h1><p>{customer.tier} · member since {new Date(customer.memberSince).toLocaleDateString('en-GB',{dateStyle:'medium'})}</p></div><div><span>Loyalty balance</span><strong>{customer.points.toLocaleString()} points</strong></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="customer-detail-grid">
      <div className="customer-detail-main">
        <section className="settings-card"><div className="customer-section-heading"><div><h2>Contact and service profile</h2><p>Account details and guest-controlled preferences.</p></div></div>
          <form className="customer-profile-form" onSubmit={(event:FormEvent)=>{event.preventDefault();void request(`/api/customers/${customerId}`,'PATCH',profile)}}>
            <label>Name<input disabled={!canWrite} value={profile.name} onChange={e=>setProfile({...profile,name:e.target.value})}/></label>
            <label>Email<input disabled={!canWrite} type="email" value={profile.email} onChange={e=>setProfile({...profile,email:e.target.value})}/></label>
            <label>Phone<input disabled={!canWrite} type="tel" value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label>
            {canWrite && <button className="primary" disabled={busy}>Save profile</button>}
          </form>
        </section>
        <section className="settings-card customer-activity-card"><div className="customer-section-heading"><div><h2>Activity</h2><p>Bookings, loyalty activity, notes and staff changes.</p></div></div><div className="customer-activity"><div className="customer-activity-header" aria-hidden="true"><span>Activity</span><span>Details</span><span>Changed by</span><span>Date and time</span></div>{data.activity.map(item=><article key={item.id}><div className="customer-activity-kind"><span className={`activity-dot ${item.type}`}/><strong>{item.title}</strong></div><p>{item.detail}</p><span className={`customer-activity-actor ${item.actorType}`}><i aria-hidden="true" className={`fa-solid ${item.actorType==='customer'?'fa-user':item.actorType==='staff'?'fa-user-tie':'fa-gears'}`}/><span>{item.actor}</span></span><time dateTime={item.occurredAt}>{dateTime(item.occurredAt)}</time></article>)}{!data.activity.length&&<p>No activity recorded yet.</p>}</div></section>
      </div>
      <aside className="customer-detail-side">
        <section className="settings-card"><h2>Visit record</h2><dl className="customer-visit-record"><div><dt>Completed visits</dt><dd>{customer.completedVisits}</dd></div><div><dt>No-shows</dt><dd>{customer.noShowCount}</dd></div><div><dt>Cancellations</dt><dd>{customer.cancellationCount}</dd></div></dl></section>
        <section className="settings-card"><h2>Preferences</h2><dl className="customer-preferences"><div><dt>Dietary needs and allergens</dt><dd>{customer.dietaryNeeds.join(', ') || 'None recorded'}</dd></div><div><dt>Tastes</dt><dd>{customer.tastes.join(', ') || 'None recorded'}</dd></div></dl></section>
        <section className="settings-card"><h2>Tags</h2><div className="customer-tags">{data.tags.map(item=><span key={item.id} title={item.reason || 'Added by staff'} style={{'--tag-color':item.color} as CSSProperties}>{item.source==='automatic'&&<i className="fa-solid fa-bolt" aria-label="Automatic tag"/>}{item.name}{canWrite&&item.source==='manual'&&<button aria-label={`Remove ${item.name}`} title={`Remove ${item.name}`} disabled={busy} onClick={()=>void request(`/api/customers/${customerId}/tags/${item.id}`,'DELETE')}>×</button>}</span>)}{!data.tags.length&&<p>No manual or automatic tags.</p>}</div>{data.tags.some(item=>item.source==='automatic')?<div className="automatic-tag-reasons">{data.tags.filter(item=>item.source==='automatic').map(item=><p key={item.id}><strong>{item.name}:</strong> {item.reason}</p>)}</div>:<div className="automatic-tag-progress"><strong>Automatic tag progress</strong><p><span>Regular</span><span>{Math.min(data.tagEvaluation.visitsIn90Days,4)} of 4 visits in 90 days</span></p><p><span>VIP</span><span>{Math.min(data.tagEvaluation.completedVisits,10)} of 10 visits · {Math.min(data.tagEvaluation.points,1000).toLocaleString()} of 1,000 points</span></p><p><span>Lapsed</span><span>{data.tagEvaluation.lastVisitAt?'Applies 60 days after the last visit':'Applies after a first visit'}</span></p></div>}{canWrite&&<form className="customer-inline-form" onSubmit={(event)=>{event.preventDefault();if(tag.trim())void request(`/api/customers/${customerId}/tags`,'POST',{name:tag,color:'#566474'}).then(()=>setTag(''))}}><input list="customer-tag-options" placeholder="Add or create tag" value={tag} onChange={e=>setTag(e.target.value)}/><datalist id="customer-tag-options">{data.tagDefinitions.map(item=><option key={item.id} value={item.name}/>)}</datalist><button disabled={busy}>Add</button></form>}</section>
        <section className="settings-card"><h2>Marketing consent</h2><div className="customer-consents">{channels.map(channel=><label key={channel}><span>{channel.toUpperCase()}</span><select disabled={!canWrite||busy} value={consent[channel]} onChange={e=>void request(`/api/customers/${customerId}/consents`,'POST',{channel,status:e.target.value})}><option value="unknown">Not recorded</option><option value="opted_in">Opted in</option><option value="opted_out">Opted out</option></select></label>)}</div><p className="consent-note">Account and booking messages remain separate from marketing consent.</p></section>
        <section className="settings-card customer-notes-card"><h2>Staff notes</h2>{canWrite&&<form className="customer-note-form" onSubmit={(event)=>{event.preventDefault();if(note.trim())void request(`/api/customers/${customerId}/notes`,'POST',{body:note}).then(()=>setNote(''))}}><textarea maxLength={2000} placeholder="Add a service note" value={note} onChange={e=>setNote(e.target.value)}/><button disabled={busy}>Add note</button></form>}<div className="customer-notes">{data.notes.map(item=><article key={item.id}><p>{item.body}</p><small><i aria-hidden="true" className="fa-solid fa-user-tie"/> {item.createdBy} · {dateTime(item.createdAt)}</small></article>)}{!data.notes.length&&<p>No staff notes.</p>}</div></section>
      </aside>
    </div>
  </section>;
}
