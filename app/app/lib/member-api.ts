'use client';
import {refreshSession} from './auth';
import {localDb} from './local-db';
let token='';
let renewal: ReturnType<typeof refreshSession>|null=null;
export function setMemberToken(value:string){token=value;}
export async function memberRequest<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const base=(process.env.NEXT_PUBLIC_CONTENT_API_URL??'/api').replace(/\/$/,'');
 const send=()=>fetch(base+path,{method,credentials:'include',headers:{Authorization:`Bearer ${token}`,...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
 let response=await send();
 if(response.status===401){renewal??=refreshSession().finally(()=>{renewal=null;});token=(await renewal).accessToken;response=await send();}
 const data=await response.json();if(!response.ok||data.statusCode>=400)throw Error(data.message??'Request failed');return data as T;
}
export async function memberRead<T>(member:string,path:string):Promise<T>{
 const key=`member:${member}:${path}`;
 try{const data=await memberRequest<T>(path);await localDb.entities.put({key,type:'member-api',id:path,updatedAt:new Date().toISOString(),data});return data;}
 catch(error){if(!navigator.onLine){const cached=await localDb.entities.get(key);if(cached)return cached.data as T;}throw error;}
}
