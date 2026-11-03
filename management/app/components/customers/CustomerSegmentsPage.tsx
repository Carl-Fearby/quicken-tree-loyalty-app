'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '../ui/Breadcrumbs';

type Filters = { minVisits:number; visitedWithinDays:number; minPoints:number; tag:string; dietary:string; channel:string };
type Segment = { id:string; name:string; definition:{operator:'and'|'or';filters:Filters}; updatedAt:string; createdBy:string };
type Preview = { counts:{matched:number;eligible:number;suppressed:number;unreachable:number}; members:{id:string;name:string;email:string|null;visitCount:number;points:number;eligibility:string;reasons:string[]}[] };
const emptyFilters:Filters = { minVisits:0,visitedWithinDays:0,minPoints:0,tag:'',dietary:'',channel:'' };

export function CustomerSegmentsPage() {
  const router=useRouter();
  const [segments,setSegments]=useState<Segment[]>([]), [name,setName]=useState(''), [operator,setOperator]=useState<'and'|'or'>('and');
  const [filters,setFilters]=useState<Filters>(emptyFilters), [preview,setPreview]=useState<Preview|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const load=async()=>{const response=await fetch('/api/customer-segments',{cache:'no-store'}),body=await response.json();if(!response.ok)throw Error(body.message);setSegments(body.segments);};
  useEffect(()=>{load().catch(problem=>setError(problem instanceof Error?problem.message:'Unable to load segments.'));},[]);
  const runPreview=async(nextFilters=filters,nextOperator=operator)=>{setBusy(true);setError('');try{const response=await fetch('/api/customer-segments/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operator:nextOperator,filters:nextFilters})}),body=await response.json();if(!response.ok)throw Error(body.message);setPreview(body);}catch(problem){setError(problem instanceof Error?problem.message:'Unable to preview segment.');}finally{setBusy(false);}};
  const save=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/customer-segments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,definition:{operator,filters}})}),body=await response.json();if(!response.ok)throw Error(body.message);setName('');await load();}catch(problem){setError(problem instanceof Error?problem.message:'Unable to save segment.');}finally{setBusy(false);}};
  const useSegment=(segment:Segment)=>{setName('');setOperator(segment.definition.operator);setFilters({...emptyFilters,...segment.definition.filters});void runPreview({...emptyFilters,...segment.definition.filters},segment.definition.operator);};
  const numberField=(key:'minVisits'|'visitedWithinDays'|'minPoints',label:string,placeholder:string)=><label>{label}<input type="number" min="0" placeholder={placeholder} value={filters[key]||''} onChange={event=>setFilters({...filters,[key]:Number(event.target.value)})}/></label>;
  return <section className="settings-page segments-page">
    <Breadcrumbs current="Segments" parent="Customers" onParent={()=>router.push('/customers')} showSettings={false}/>
    <div className="customers-heading segments-heading"><div><p className="eyebrow">CUSTOMER AUDIENCES</p><h1>Segments</h1><p className="settings-intro">Build reusable audiences from customer behaviour, preferences and marketing eligibility.</p></div></div>
    {error&&<p className="error-message" role="alert">{error}</p>}
    {segments.length>0&&<section className="saved-segments"><h2>Saved segments</h2><div>{segments.map(segment=><button key={segment.id} onClick={()=>useSegment(segment)}><strong>{segment.name}</strong><span>Updated {new Date(segment.updatedAt).toLocaleDateString('en-GB')} · {segment.createdBy}</span></button>)}</div></section>}
    <div className="segment-workspace">
      <form className="settings-card segment-builder" onSubmit={save}><div className="customer-section-heading"><div><h2>Audience rules</h2><p>Choose how customers qualify for this segment.</p></div><select aria-label="Rule matching" value={operator} onChange={event=>setOperator(event.target.value as 'and'|'or')}><option value="and">Match all rules</option><option value="or">Match any rule</option></select></div>
        {numberField('minVisits','Minimum completed visits','e.g. 3')}
        {numberField('visitedWithinDays','Visited within the last','Days')}
        {numberField('minPoints','Minimum loyalty points','e.g. 500')}
        <label>Customer tag<input value={filters.tag} placeholder="e.g. VIP" onChange={event=>setFilters({...filters,tag:event.target.value})}/></label>
        <label>Dietary or preference contains<input value={filters.dietary} placeholder="e.g. Vegetarian" onChange={event=>setFilters({...filters,dietary:event.target.value})}/></label>
        <label>Marketing channel<select value={filters.channel} onChange={event=>setFilters({...filters,channel:event.target.value})}><option value="">No channel requirement</option><option value="email">Email</option><option value="sms">SMS</option><option value="push">Push</option></select></label>
        <button type="button" onClick={()=>void runPreview()} disabled={busy}>{busy?'Calculating…':'Preview audience'}</button>
        <div className="segment-save"><label>Segment name<input required maxLength={80} value={name} placeholder="e.g. Regular email guests" onChange={event=>setName(event.target.value)}/></label><button className="primary" disabled={busy}>Save segment</button></div>
      </form>
      <section className="settings-card segment-preview"><div className="customer-section-heading"><div><h2>Audience preview</h2><p>Eligibility is checked separately from rule matching.</p></div></div>
        {preview?<><div className="segment-counts"><article><span>Matched</span><strong>{preview.counts.matched}</strong></article><article><span>Eligible</span><strong>{preview.counts.eligible}</strong></article><article><span>Suppressed</span><strong>{preview.counts.suppressed}</strong></article><article><span>Unreachable</span><strong>{preview.counts.unreachable}</strong></article></div><div className="segment-members">{preview.members.map(member=><article key={member.id}><div><strong>{member.name}</strong><span>{member.email||'No email'} · {member.visitCount} visits · {member.points} points</span></div><span className={`segment-status ${member.eligibility}`}>{member.eligibility}</span><details><summary>Why included</summary>{member.reasons.length?member.reasons.map(reason=><p key={reason}>{reason}</p>):<p>No audience rules applied.</p>}</details></article>)}{!preview.members.length&&<p>No customers match these rules.</p>}</div></>:<p className="segment-preview-empty">Choose rules and preview the audience.</p>}
      </section>
    </div>
  </section>;
}
