import {relationalContentReady} from './content';
import type {TransactionSql} from 'postgres';
export async function replacePreferences(tx:TransactionSql,table:'member_tastes'|'member_dietary_needs'|'booking_dietary_needs',id:string,values:string[]){
 if(!relationalContentReady){const owner=table==='booking_dietary_needs'?'bookings':'member_preferences';const key=owner==='bookings'?'id':'member_id';const field=table==='member_tastes'?'tastes':'dietary_needs';await tx.unsafe(`update ${owner} set ${field}=$1::jsonb where ${key}=$2`,[JSON.stringify(values),id]);return;}
 const column=table==='booking_dietary_needs'?'booking_id':'member_id';
 await tx.unsafe(`delete from ${table} where ${column}=$1`,[id]);
 for(const [position,name]of values.entries())await tx.unsafe(`insert into ${table}(${column},position,name) values($1,$2,$3)`,[id,position,name]);
}
