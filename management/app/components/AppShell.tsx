'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const key = 'qt-back-office-theme';
    const saved = window.localStorage.getItem(key);
    const enabled = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
  }, []);

  const changeTheme = (enabled: boolean) => {
    setDarkMode(enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
    window.localStorage.setItem('qt-back-office-theme', enabled ? 'dark' : 'light');
  };

  const isDiaryActive = pathname === '/diary';
  const isRewardsActive = pathname === '/rewards';
  const isConfigActive = pathname.startsWith('/configuration');

  return (
    <>
      <header>
        <Link
          className="brand pace-brand"
          href="/diary"
          aria-label="Pace — Service in Sync, back-office home"
        >
          <img
            className="pace-logo pace-logo-light"
            src="/branding/pace-light.png"
            alt="Pace — Service in Sync"
            width="1448"
            height="1086"
          />
          <img
            className="pace-logo pace-logo-dark"
            src="/branding/pace-dark.png"
            alt=""
            aria-hidden="true"
            width="1448"
            height="1086"
          />
        </Link>
        <nav className="global-tabs">
          <Link
            className="global-tab"
            aria-selected={isDiaryActive}
            href="/diary"
          >
            Booking diary
          </Link>
          <Link
            className="global-tab"
            aria-selected={isRewardsActive}
            href="/rewards"
          >
            Rewards
          </Link>
          <Link
            className="global-tab"
            aria-selected={isConfigActive}
            href="/configuration"
          >
            Configuration
          </Link>
        </nav>
        <label className="theme-switch" title={darkMode ? 'Light mode' : 'Dark mode'}>
          <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(event) => changeTheme(event.target.checked)}
            aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          />
          <span className="theme-switch-track" aria-hidden="true">
            <span className="theme-switch-thumb" />
          </span>
        </label>
      </header>
      <main id="booking-workspace">{children}</main>
    </>
  );
}
