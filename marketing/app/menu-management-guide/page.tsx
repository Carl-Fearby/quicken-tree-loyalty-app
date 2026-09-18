import type { Metadata } from 'next';
import { AdvicePage } from '../AdvicePage';
import { metadata } from '../../lib/seo';
export const generateMetadata = (): Metadata => metadata('Menu management guide | Pace', 'Practical advice for maintaining menus, prices, availability and dietary information.', '/menu-management-guide');
export default function MenuManagementGuidePage() { return <AdvicePage eyebrow="MENU MANAGEMENT" title={<>Keep service information accurate from kitchen to <em>guest.</em></>} intro="Menu maintenance is operational work. A clear structure helps staff update information quickly and helps guests make decisions with confidence." sections={[
  {title:'Use a consistent structure',copy:'Organise menus into sections and dishes so staff can find the right item quickly and guests get a predictable browsing experience.'},
  {title:'Treat availability as live information',copy:'Mark items according to what the venue can serve, and review availability as stock, service periods and seasonal menus change.'},
  {title:'Keep prices and descriptions together',copy:'A single maintained record reduces the risk of a price being changed in one place but not another.'},
  {title:'Make dietary details useful',copy:'Keep dietary information close to the dish rather than relying on a separate document that can fall out of date.'},
  {title:'Give updates an owner',copy:'Decide who can edit menus and when changes should be reviewed, especially before a new menu or service period goes live.'},
  {title:'Check the guest view',copy:'After a change, review the experience as a guest would see it. Accuracy is only useful when it reaches the right screen.'}
]}/>; }
