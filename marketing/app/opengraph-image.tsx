import { ImageResponse } from 'next/og';
export const alt = 'Pace — Restaurant management software. Service in Sync.';
export const size = { width:1200, height:630 };
export const contentType = 'image/png';
export default function Image(){return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',background:'#152c37',color:'#faf9f6',padding:'65px 75px'}}><div style={{display:'flex',fontSize:40,fontWeight:700}}>Pace <span style={{color:'#f56632',marginLeft:18}}>— Service in Sync</span></div><div style={{display:'flex',fontSize:78,lineHeight:1.05,letterSpacing:-3,maxWidth:1000}}>Restaurant management. Better service.</div><div style={{display:'flex',fontSize:28,color:'#c3d1c9'}}>Bookings · Tables · Menus · Customer rewards</div></div>,size);}
