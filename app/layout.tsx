import type { Metadata } from 'next';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';

export const metadata: Metadata = { title: 'The Quicken Tree | Loyalty', description: 'Book, earn and enjoy more at The Quicken Tree.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
