import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw Error('Set DATABASE_URL in management/.env first.');
const run = promisify(execFile);
const sourceUrl = new URL(process.env.DATABASE_URL);
const seededUrl = new URL(process.env.SEEDED_DATABASE_URL || process.env.DATABASE_URL);
if (!process.env.SEEDED_DATABASE_URL) seededUrl.pathname = `${seededUrl.pathname}_seeded`;
if (seededUrl.toString() === sourceUrl.toString()) throw Error('The seeded database must be separate from the local database.');
const dump = join(tmpdir(), `pace-seeded-${randomUUID()}.dump`);
const databaseName = decodeURIComponent(seededUrl.pathname.slice(1));
const pg = (url) => ['--dbname',url.toString()];
const adminArgs=['--host',seededUrl.hostname,'--port',seededUrl.port||'5432','--username',decodeURIComponent(seededUrl.username)];
const adminEnvironment={...process.env,PGPASSWORD:decodeURIComponent(seededUrl.password)};

await run('pg_dump',['--format=custom','--no-owner','--no-privileges',...pg(sourceUrl),`--file=${dump}`]);
await run('dropdb',['--if-exists','--force',...adminArgs,databaseName],{env:adminEnvironment});
await run('createdb',[...adminArgs,databaseName],{env:adminEnvironment});
await run('pg_restore',['--exit-on-error','--no-owner','--no-privileges',...pg(seededUrl),dump]);
await rm(dump,{force:true});

const sql=postgres(seededUrl.toString(),{max:2});
const names=['Amelia Reed','Daniel Price','Sophie Patel','Oliver Hughes','Maya Ellis','James Carter','Isla Morgan','Theo Bennett','Aisha Khan','Noah Clarke','Freya Wilson','Luca Evans','Priya Shah','Ethan Brooks','Ava Turner','Leo Foster','Zara Ahmed','Finn Cooper','Grace Miller','Ben Taylor','Nina Roberts','Oscar Green','Ruby Hall','Sam Walker','Ella White','Adam Scott','Mila Brown','Harvey King','Layla Wood','Max Harris','Hannah Lewis','Ravi Singh','Chloe Baker','Imogen Ward','George Bell','Fatima Ali'];
const tastes=['Small plates & sharing','Grill favourites','Burgers & loaded fries','Steak & chops','Chicken dishes','Curries & global flavours','Craft beer'];
const dietary=['Vegetarian','Vegan','Gluten Free','Crustaceans','Nuts','Milk','Eggs'];
const statuses=['completed','completed','completed','cancelled','no_show'];
await sql.begin(async tx=>{
  await tx`truncate table members,customer_segments restart identity cascade`;
  const [staff]=await tx`select id from management_users where active=true order by role='admin' desc limit 1`;
  const [reminderTemplate]=await tx`select id,category,subject,body from communication_templates where template_key='booking-reminder'`;
  const seededMembers=[];
  const tagRows=[];
  for(const [name,color] of [['VIP','#a66a16'],['Birthday this month','#7a5ba6'],['Window seat','#397895'],['Family','#2f8f57'],['Business guest','#566474']]){
    const [tag]=await tx`insert into customer_tag_definitions(name,color,created_by) values(${name},${color},${staff?.id??null}) on conflict(lower(name)) do update set color=excluded.color returning id,name`;
    tagRows.push(tag);
  }
  const tableRows=await tx`select id from booking_tables order by table_number`;
  for(const [index,name] of names.entries()){
    const email=`${name.toLowerCase().replaceAll(' ','.')}@seeded.pace.test`, phone=`07700${String(900000+index).slice(-6)}`;
    const [member]=await tx`insert into members(email,phone,display_name,member_since,tier,created_at) values(${email},${phone},${name},current_date-${30+index*7}::integer,${index%7===0?'Pace Gold':'Pace Member'},now()-make_interval(days=>${30+index*7}::integer)) returning id`;
    seededMembers.push({id:member.id,name,email,phone,index});
    const points=(index*175)%1800;
    await tx`insert into loyalty_accounts(member_id,points) values(${member.id},${points})`;
    await tx`insert into loyalty_ledger(member_id,points_delta,reason,reference_type,created_at) values(${member.id},${points},'Seeded visit activity','seed',now()-make_interval(days=>${index%120}))`;
    await tx`insert into member_preferences(member_id) values(${member.id}) on conflict do nothing`;
    for(const [position,value] of [tastes[index%tastes.length],tastes[(index+3)%tastes.length]].entries()) await tx`insert into member_tastes(member_id,position,name) values(${member.id},${position},${value})`;
    if(index%3!==2) await tx`insert into member_dietary_needs(member_id,position,name) values(${member.id},0,${dietary[index%dietary.length]})`;
    if(index%2===0) await tx`insert into customer_tags(member_id,tag_id,assigned_by) values(${member.id},${tagRows[index%tagRows.length].id},${staff?.id??null})`;
    for(const channel of ['email','sms','push']){
      const status=index%5===0?'opted_out':index%4===0?'unknown':'opted_in';
      await tx`insert into customer_consents(member_id,channel,purpose,status,source,wording_version,updated_by) values(${member.id},${channel},'marketing',${status},'seeded','seed-v1',${staff?.id??null})`;
    }
    if(index%4===0) await tx`insert into customer_notes(member_id,body,created_by,created_at) values(${member.id},${index%8===0?'Prefers a quiet table near the window.':'Celebrating a special occasion on their next visit.'},${staff?.id??null},now()-interval '10 days')`;
    const visitCount=2+(index%10);
    for(let visit=0;visit<visitCount;visit++){
      const daysAgo=Math.round((visit*(330/Math.max(1,visitCount-1)))+index%18);
      const status=statuses[(index+visit)%statuses.length];
      const bookingDate=new Date(Date.now()-daysAgo*86400000).toISOString().slice(0,10);
      const time=`17:${visit%2?'30':'00'}`;
      const guests=2+((index+visit)%5), table=tableRows[(index+visit)%tableRows.length];
      const depositStatus=(index+visit)%6===0?'demo_paid':(index+visit)%6===1?'demo_card_guarantee':'none';
      const [booking]=await tx`insert into bookings(member_id,booking_date,booking_time,guest_count,experience,status,total_pence,contact_name,contact_email,notes,booking_duration_minutes,assigned_table_id,deposit_status,deposit_amount_pence,created_at) values(${member.id},${bookingDate}::date,${time}::time,${guests},${visit%5===0?'Bottomless Brunch':'Table'},${status},${guests*(1800+index*15)},${name},${email},${visit%4===0?'Seeded booking with service notes':null},90,${table?.id??null},${depositStatus},${depositStatus==='demo_paid'?1000:0},${bookingDate}::date-interval '14 days') returning id`;
      if(status==='no_show')await tx`insert into booking_status_events(booking_id,member_id,from_status,to_status,reason,actor_user_id,created_at) values(${booking.id},${member.id},'confirmed','no_show','Seeded no-show after contact attempt',${staff?.id??null},${bookingDate}::date+${time}::time+interval '2 hours')`;
      if(table) await tx`insert into booking_table_assignments(booking_id,table_id) values(${booking.id},${table.id})`;
      await tx`insert into booking_guests(booking_id,display_name,position) values(${booking.id},${name},1)`;
      if((index+visit)%4===0) await tx`insert into booking_dietary_needs(booking_id,position,name) values(${booking.id},0,${dietary[index%dietary.length]})`;
    }
    const futureDate=new Date(Date.now()+(1+index%28)*86400000).toISOString().slice(0,10), futureTable=tableRows[index%tableRows.length];
    const [futureBooking]=await tx`insert into bookings(member_id,booking_date,booking_time,guest_count,experience,status,total_pence,contact_name,contact_email,notes,booking_duration_minutes,assigned_table_id,deposit_status,deposit_amount_pence) values(${member.id},${futureDate}::date,'17:00'::time,${2+index%5},'Table','confirmed',0,${name},${email},'Upcoming seeded booking',90,${futureTable?.id??null},${index%3===0?'demo_required':'none'},${index%3===0?1000:0}) returning id`;
    if(index%3===0){await tx`insert into booking_reminder_events(booking_id,channel,status,initiated_by,delivered_at) values(${futureBooking.id},'email','delivered',${staff?.id??null},now())`;if(reminderTemplate)await tx`insert into communication_deliveries(template_id,member_id,booking_id,channel,category,recipient,subject,body,status,sent_at,delivered_at,provider,initiated_by,metadata) values(${reminderTemplate.id},${member.id},${futureBooking.id},'email',${reminderTemplate.category},${email},'Your booking is coming up',${`Hi ${name}, this is a seeded booking reminder.`},'delivered',now(),now(),'demo',${staff?.id??null},${tx.json({seeded:true})})`;}
    if(futureTable) await tx`insert into booking_table_assignments(booking_id,table_id) values(${futureBooking.id},${futureTable.id})`;
    await tx`insert into booking_guests(booking_id,display_name,position) values(${futureBooking.id},${name},1)`;
  }
  for(const [position,member] of seededMembers.slice(0,8).entries()) await tx`insert into waitlist_entries(member_id,service_date,guest_name,contact_email,contact_phone,party_size,status,priority,quoted_wait_minutes,notes,assigned_table_id,created_by) values(${member.id},current_date,${member.name},${member.email},${member.phone},${2+position%5},${position===0?'ready':position===1?'nearly_ready':'waiting'},${position===3?2:0},${10+position*5},'Seeded walk-in party',${position<2?tableRows[position]?.id??null:null},${staff?.id??null})`;
  for(const [name,definition] of [['Regular email guests',{operator:'and',filters:{minVisits:4,visitedWithinDays:90,minPoints:0,tag:'',dietary:'',channel:'email'}}],['Vegetarian guests',{operator:'and',filters:{minVisits:0,visitedWithinDays:0,minPoints:0,tag:'',dietary:'Vegetarian',channel:''}}],['High loyalty audience',{operator:'and',filters:{minVisits:0,visitedWithinDays:0,minPoints:750,tag:'',dietary:'',channel:'email'}}]]) await tx`insert into customer_segments(name,definition,created_by) values(${name},${tx.json(definition)},${staff?.id??null})`;
});
await sql.end();
console.log(`Seeded ${names.length} customers with 12 months of booking and CRM data in ${databaseName}.`);
