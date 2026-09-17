const nav=document.querySelector('.global-tabs');
const tab=document.createElement('button');
tab.className='global-tab';tab.dataset.tab='bookings';tab.textContent='Booking management';tab.setAttribute('aria-selected','false');nav.append(tab);
const css=document.createElement('link');css.rel='stylesheet';css.href='/diary.css';document.head.append(css);
const workspace=document.createElement('section');workspace.id='booking-workspace';workspace.hidden=true;
workspace.innerHTML=`<div class="diary-toolbar"><div><p class="eyebrow">BOOKING MANAGEMENT</p><h1>Booking diary</h1></div><div class="diary-controls"><button id="diary-prev" aria-label="Previous day">←</button><label>Date <input id="diary-date" type="date"></label><button id="diary-next" aria-label="Next day">→</button><button id="diary-today">Today</button><button id="diary-refresh">Refresh</button></div></div><button id="configure-tables">Configure tables</button><dialog id="table-config-modal" aria-labelledby="table-config-title"><div class="diary-toolbar"><h2 id="table-config-title">Configure tables</h2><button id="close-table-config" type="button" aria-label="Close table configuration">Close</button></div><p>Use any unique table number, such as 401, 402 or 501, with 2–10 seats.</p><div id="diary-table-settings"></div><h3>Add a table</h3><div id="diary-table-add"></div><p id="diary-table-status" role="status"></p></dialog><p id="diary-summary" role="status"></p><div class="diary-layout"><aside class="diary-bookings"><h2>Bookings for the day</h2><p>Seat counts are shown beside each table. Use Configure tables to change capacities.</p><div id="diary-bookings"></div></aside><div class="diary-scroll" tabindex="0" aria-label="Daily table diary"><div id="diary-grid"></div></div></div>`;
document.body.append(workspace);
const date=document.getElementById('diary-date');
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
date.value=today();let request=0;
async function load(){
 const version=++request;const summary=document.getElementById('diary-summary');summary.textContent='Loading bookings…';
 document.getElementById('diary-bookings').replaceChildren();
 try{
  const response=await fetch('/api/diary?date='+encodeURIComponent(date.value));const data=await response.json();if(!response.ok)throw Error(data.message);if(version!==request)return;
  renderTableSettings(data.tables);
  const active=data.bookings.filter(b=>b.status!=='cancelled');summary.textContent=`${data.tables.length} tables · ${active.length} active bookings · ${active.reduce((n,b)=>n+b.guests,0)} guests`;
  const list=document.getElementById('diary-bookings');
  if(!data.bookings.length){const p=document.createElement('p');p.textContent='No bookings for this date.';list.append(p);}
  for(const b of data.bookings){const card=document.createElement('article');card.className='diary-booking';const title=document.createElement('h3');title.textContent=`${b.time.slice(0,5)} · ${b.name}`;const detail=document.createElement('p');detail.textContent=`${b.guests} guests · ${b.experience} · ${b.status}`;card.append(title,detail);if(b.notes){const note=document.createElement('p');note.textContent=b.notes;card.append(note);}list.append(card);}
  const grid=document.getElementById('diary-grid');grid.replaceChildren();
  const cell=(text,cls)=>{const el=document.createElement('div');el.className=cls;el.textContent=text;return el;};
  const hours=data.openingHours;
  if(!hours||!Number.isFinite(hours.open)||!Number.isFinite(hours.close)||hours.close<=hours.open){summary.textContent+=' · No opening hours configured';return;}
  const format=hour=>{const minutes=Math.round(hour*60);return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');};
  const slots=[];for(let hour=hours.open;hour<hours.close;hour+=.5)slots.push(hour);
  grid.style.gridTemplateColumns=`150px repeat(${slots.length},64px)`;
  summary.textContent+=` · Open ${format(hours.open)}–${format(hours.close)}`;
  grid.append(cell('Table','diary-hour diary-table'));
  for(const hour of slots)grid.append(cell(format(hour),'diary-hour'));
  for(const table of data.tables){
   const heading=cell('','diary-table diary-table-label');
   const name=document.createElement('span');name.textContent=table.name;
   const seats=document.createElement('span');seats.className='diary-seat-count';seats.textContent=`${table.seats} seats`;
   heading.append(name,seats);grid.append(heading);
   for(const hour of slots)grid.append(cell('','diary-slot'));
  }
  const now=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':').map(Number);
  const current=Math.max(hours.open,Math.min(hours.close,now[0]+now[1]/60));
  requestAnimationFrame(()=>{if(version!==request)return;const scroller=workspace.querySelector('.diary-scroll');scroller.scrollLeft=Math.max(0,(current-hours.open)*128-(scroller.clientWidth-90)/2);});
 }catch(error){if(version===request)summary.textContent='Unable to load diary: '+error.message;}
}
tab.onclick=()=>{document.getElementById('database-workspace').hidden=true;document.getElementById('menu-workspace').hidden=true;workspace.hidden=false;nav.querySelectorAll('.global-tab').forEach(b=>b.setAttribute('aria-selected',String(b===tab)));void load();};
nav.addEventListener('click',event=>{if(event.target.closest('[data-tab="database"],[data-tab="menu"]')){workspace.hidden=true;tab.setAttribute('aria-selected','false');}});
date.onchange=load;
for(const [id,days] of [['diary-prev',-1],['diary-next',1]])document.getElementById(id).onclick=()=>{const d=new Date(date.value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);date.value=d.toISOString().slice(0,10);void load();};
document.getElementById('diary-today').onclick=()=>{date.value=today();void load();};
document.getElementById('diary-refresh').onclick=load;

let tableConfigBusy=false;
const tableModal=document.getElementById('table-config-modal');
document.getElementById('configure-tables').onclick=()=>tableModal.showModal();
document.getElementById('close-table-config').onclick=()=>tableModal.close();
function renderTableSettings(tables){
 const settings=document.getElementById('diary-table-settings');settings.replaceChildren();
 const add=document.getElementById('diary-table-add');add.replaceChildren();
 if(!tables.length){const empty=document.createElement('p');empty.textContent='No tables configured. Add your first table below.';settings.append(empty);}
 function row(table){
  const form=document.createElement('form');form.className='diary-table-setting';
  const field=(title,value,min,max)=>{
   const label=document.createElement('label');label.textContent=title;
   const input=document.createElement('input');input.type='number';input.min=min;input.max=max;input.step='1';input.required=true;input.value=value;label.append(input);form.append(label);return input;
  };
  const number=field('Table number',table?.number??'',1,2147483647);
  number.placeholder='e.g. 401';
  const seats=field('Seats',table?.seats??2,2,10);
  const save=document.createElement('button');save.type='submit';save.textContent=table?'Save':'Add table';form.append(save);
  async function mutate(method){
   if(tableConfigBusy)return;
   tableConfigBusy=true;
   tableModal.querySelectorAll('input,button').forEach(el=>el.disabled=true);
   const status=document.getElementById('diary-table-status');status.textContent='Saving…';
   try{
    const response=await fetch('/api/booking-tables'+(table?'/'+table.id:''),{method,headers:{'Content-Type':'application/json'},...(method==='DELETE'?{}:{body:JSON.stringify({number:Number(number.value),seats:Number(seats.value)})})});
    const result=await response.json();if(!response.ok)throw Error(result.message);
    status.textContent=method==='DELETE'?`${table.name} removed.`:`${result.name} saved with ${result.seats} seats.`;
    await load();
   }catch(error){status.textContent=error.message;}finally{
    tableConfigBusy=false;tableModal.querySelectorAll('input,button').forEach(el=>el.disabled=false);
   }
  }
  form.onsubmit=event=>{event.preventDefault();void mutate(table?'PUT':'POST');};
  if(table){
   const remove=document.createElement('button');remove.type='button';remove.className='danger';remove.textContent='Remove';remove.setAttribute('aria-label','Remove '+table.name);
   remove.onclick=()=>{if(confirm(`Remove ${table.name}?`))void mutate('DELETE');};form.append(remove);
  }
  return form;
 }
 for(const table of tables)settings.append(row(table));
 add.append(row(null));
}
