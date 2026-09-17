'use client';
import {useEffect,useState} from 'react';
import appointments from '../data/appointments.json';
import appConfig from '../data/app-config.json';
import menu from '../data/menu.json';
import points from '../data/points-and-tier.json';
import profile from '../data/profile.json';
import rewards from '../data/rewards.json';
import events from '../data/events.json';
import {localDb} from './local-db';
import {checkForContentUpdate} from './content-sync';
const fallback={appointments,appConfig,menu,points,profile,rewards,events};
export function useContent(){
 const [content,setContent]=useState(fallback);
 useEffect(()=>{
  let active=true;
  const read=async()=>{const rows=await localDb.content.toArray();const next={...fallback};for(const row of rows)if(row.key in next&&row.data!==null)(next as Record<string,unknown>)[row.key]=row.data;if(active)setContent(next);};
  const sync=()=>{void checkForContentUpdate().then(read).catch(()=>undefined);};
  void read().catch(()=>undefined);sync();
  window.addEventListener('focus',sync);window.addEventListener('quicken-content-updated',read);
  const timer=window.setInterval(sync,60000);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',sync);window.removeEventListener('quicken-content-updated',read);};
 },[]);
 return content;
}
