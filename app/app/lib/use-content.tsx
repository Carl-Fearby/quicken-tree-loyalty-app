'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {localDb} from './local-db';
import {checkForContentUpdate} from './content-sync';
import type {Content} from './content-types';
import {tenantBrand} from './tenant-brand';
const Context=createContext<Content|null>(null);
const keys:(keyof Content)[]=['appointments','appConfig','menu','points','profile','rewards','events'];
export function ContentProvider({children}:{children:ReactNode}){
 const [content,setContent]=useState<Content|null>(null);
 const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);
 useEffect(()=>{
  let active=true;
  // One-time removal of the browser-only booking/order test records approved
  // for disposal. Keep preferences, credentials and server content caches.
  const cleanupKey='qt-booking-test-cleanup-20260917';
  try {
   if(!localStorage.getItem(cleanupKey)){
    const prefixes=['quicken-tree-order-ahead-','quicken-tree-order-guests-','quicken-tree-order-course-lines-','quicken-tree-placed-order-'];
    for(const key of Object.keys(localStorage))if(key==='quicken-tree-bookings'||prefixes.some(prefix=>key.startsWith(prefix)))localStorage.removeItem(key);
    localStorage.setItem(cleanupKey,'done');
   }
  } catch { /* Storage may be unavailable; retry on a subsequent mount. */ }
  const read=async()=>{const rows=await localDb.content.toArray();const next=Object.fromEntries(rows.map(row=>[row.key,row.data]));if(keys.every(key=>next[key]&&typeof next[key]==='object')&&active)setContent(next as Content);};
  const sync=async()=>{try{await checkForContentUpdate();await read();if(active)setError('');}catch{if(active)setError('Unable to connect. Connect to the internet and retry to download the app data.');}};
  void read().catch(()=>undefined);void sync();
  window.addEventListener('focus',sync);window.addEventListener('online',sync);const timer=setInterval(sync,60000);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',sync);window.removeEventListener('online',sync);};
 },[attempt]);
 if(!content)return <main><h1>{tenantBrand.name}</h1><p role="status">{error||'Loading app data…'}</p>{error&&<button onClick={()=>{setError('');setAttempt(n=>n+1);}}>Retry</button>}</main>;
 return <Context.Provider value={content}>{children}</Context.Provider>;
}
export function useContent(){const content=useContext(Context);if(!content)throw Error('ContentProvider is required');return content;}
