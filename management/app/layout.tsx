import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';

export const metadata = {
  title: 'Pace · Back office',
  description: 'Pace hospitality platform back-office management',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
