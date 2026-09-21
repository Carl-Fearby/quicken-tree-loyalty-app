import HomePage from './HomePage';
import { description, metadata } from '../lib/seo';
export const generateMetadata = () => metadata('Restaurant Management Software for Hospitality | Pace', description, '/');
export default function Page() { return <HomePage />; }
