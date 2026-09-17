import './globals.css';

export const metadata = {
  title: 'Quicken Tree · Back-office',
  description: 'Quicken Tree back-office management',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
