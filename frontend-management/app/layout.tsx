import type {Metadata} from 'next';
import './globals.css';
import {tenantBrand} from './lib/tenant-brand';

export const metadata: Metadata = {
    title: `${tenantBrand.name} | Account`,
    description: `Manage access to your ${tenantBrand.name} account, powered by Pace.`
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
    return <html lang="en"><body>{children}</body></html>;
}
