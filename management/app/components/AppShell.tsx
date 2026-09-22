'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { readRewardsFeature, rewardsFeatureChanged } from '../lib/rewards-feature';
import { ManagementAuthProvider, type ManagementUser } from '../contexts/ManagementAuth';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [rewardsEnabled, setRewardsEnabled] = useState<boolean | null>(null);
  const [user, setUser] = useState<ManagementUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [databaseTarget, setDatabaseTarget] = useState<'local' | 'remote'>('local');
  const [databaseLabel, setDatabaseLabel] = useState('Local database');
  const [remoteDatabaseConfigured, setRemoteDatabaseConfigured] = useState(false);
  const [databaseSwitchBusy, setDatabaseSwitchBusy] = useState(false);
  const [showDatabaseBadge, setShowDatabaseBadge] = useState(false);
  const [confirmProductionRefresh, setConfirmProductionRefresh] = useState(false);
  const [productionRefreshBusy, setProductionRefreshBusy] = useState(false);
  const [productionRefreshMessage, setProductionRefreshMessage] = useState('');
  const [productionConfirmation, setProductionConfirmation] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hostname !== 'localhost') return;
    setShowDatabaseBadge(true);
    fetch('/api/development/database-target', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((body) => {
        if (!body) return;
        setDatabaseTarget(body.target);
        setDatabaseLabel(body.label);
        setRemoteDatabaseConfigured(body.remoteConfigured);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const key = 'qt-back-office-theme';
    const saved = window.localStorage.getItem(key);
    const enabled = saved === 'dark';
    setDarkMode(enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
  }, []);

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw Error('Signed out');
        const body = await response.json();
        setUser(body.user);
        if (pathname === '/login') router.replace('/diary');
      })
      .catch(() => {
        setUser(null);
        if (pathname !== '/login') router.replace('/login');
      })
      .finally(() => setAuthReady(true));
  }, [pathname, router]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' || pathname === '/login' || !user) return;
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' });
        if (response.status === 401) window.location.replace('/login');
      } catch {
        // A temporary network failure should not discard an active demo.
      }
    };
    const onFocus = () => void checkSession();
    const interval = window.setInterval(onFocus, 30_000);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [pathname, user]);

  useEffect(() => {
    if (!user) return;
    readRewardsFeature().then(setRewardsEnabled).catch(() => setRewardsEnabled(true));
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled: boolean }>).detail;
      setRewardsEnabled(detail.enabled);
    };
    window.addEventListener(rewardsFeatureChanged, onChange);
    return () => window.removeEventListener(rewardsFeatureChanged, onChange);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const configurationPermissionByPath: Record<string, string> = {
      '/configuration/tables': 'configuration.tables',
      '/configuration/duration': 'configuration.duration',
      '/configuration/hours': 'configuration.hours',
      '/configuration/menu': 'configuration.menu',
      '/configuration/menu-symbols': 'configuration.symbols',
      '/configuration/rewards': 'configuration.rewards',
      '/configuration/users': 'configuration.users',
      '/configuration/database': 'configuration.database',
    };
    if (pathname === '/diary' && user.bookingAccess === 'none')
      router.replace(user.configurationAccess ? '/configuration' : '/rewards');
    if (pathname.startsWith('/configuration') && !user.configurationAccess)
      router.replace(user.bookingAccess !== 'none' ? '/diary' : '/rewards');
    const requiredPermission = configurationPermissionByPath[pathname];
    if (requiredPermission && user.permissions[requiredPermission] === 'none')
      router.replace('/configuration');
  }, [pathname, router, user]);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.replace('/login');
  };

  const changeTheme = (enabled: boolean) => {
    setDarkMode(enabled);
    document.documentElement.dataset.theme = enabled ? 'dark' : 'light';
    window.localStorage.setItem('qt-back-office-theme', enabled ? 'dark' : 'light');
  };

  const switchDatabase = async (target: 'local' | 'remote') => {
    setDatabaseSwitchBusy(true);
    try {
      const response = await fetch('/api/development/database-target', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to switch database.');
      window.location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to switch database.');
      setDatabaseSwitchBusy(false);
    }
  };

  const refreshProduction = async () => {
    setProductionRefreshBusy(true);
    setProductionRefreshMessage('');
    try {
      const response = await fetch('/api/development/refresh-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: productionConfirmation }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to refresh Production.');
      setConfirmProductionRefresh(false);
      setProductionConfirmation('');
      setProductionRefreshMessage('Production refreshed');
    } catch (error) {
      setProductionRefreshMessage(error instanceof Error ? error.message : 'Unable to refresh Production.');
    } finally {
      setProductionRefreshBusy(false);
    }
  };

  const databaseBadge = showDatabaseBadge ? (
    <aside className={`database-target-badge ${databaseTarget}`} aria-label="Development database selector">
      <span className="database-target-dot" aria-hidden="true" />
      <strong>{databaseLabel}</strong>
      <select
        aria-label="Active development database"
        value={databaseTarget}
        disabled={databaseSwitchBusy}
        onChange={(event) => void switchDatabase(event.target.value as 'local' | 'remote')}
      >
        <option value="local">Local</option>
        <option value="remote" disabled={!remoteDatabaseConfigured}>Production</option>
      </select>
      {remoteDatabaseConfigured && (
        <button
          type="button"
          disabled={databaseTarget !== 'local' || databaseSwitchBusy || productionRefreshBusy}
          title={databaseTarget === 'local' ? 'Replace Production with the local database' : 'Switch to Local before refreshing Production'}
          onClick={() => { setProductionRefreshMessage(''); setProductionConfirmation(''); setConfirmProductionRefresh(true); }}
        >Refresh Production</button>
      )}
      {productionRefreshMessage && <span className="database-target-message" role="status">{productionRefreshMessage}</span>}
    </aside>
  ) : null;

  const closePasswordDialog = () => {
    if (passwordBusy) return;
    setChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Password could not be changed.');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Password could not be changed.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const isDiaryActive = pathname === '/diary';
  const isCustomersActive = pathname === '/customers';
  const isRewardsActive = pathname === '/rewards';
  const isConfigActive = pathname.startsWith('/configuration');

  if (!authReady) return <><main className="auth-loading">Loading…</main>{databaseBadge}</>;
  if (pathname === '/login') return <>{children}{databaseBadge}</>;
  if (!user) return <><main className="auth-loading">Taking you to sign in…</main>{databaseBadge}</>;

  return (
    <>
      <ManagementAuthProvider user={user}>
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
          {user.bookingAccess !== 'none' && (
            <Link
              className="global-tab"
              aria-selected={isDiaryActive}
              href="/diary"
            >
              Booking diary
            </Link>
          )}
          {user.permissions.customers !== 'none' && <Link
            className="global-tab"
            aria-selected={isCustomersActive}
            href="/customers"
          >
            Customers
          </Link>}
          {rewardsEnabled && user.permissions.rewards !== 'none' && (
            <Link
              className="global-tab"
              aria-selected={isRewardsActive}
              href="/rewards"
            >
              Rewards
            </Link>
          )}
          {user.configurationAccess && (
            <Link
              className="global-tab"
              aria-selected={isConfigActive}
              href="/configuration"
            >
              Configuration
            </Link>
          )}
        </nav>
        <div className="header-actions">
          <span className="signed-in-user">{user.displayName}</span>
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
          <details className="account-menu">
            <summary>Account</summary>
            <div className="account-menu-options">
              <button type="button" onClick={(event) => {
                setChangingPassword(true);
                event.currentTarget.closest('details')?.removeAttribute('open');
              }}>Change password</button>
              <button type="button" onClick={() => void signOut()}>Sign out</button>
            </div>
          </details>
        </div>
      </header>
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && <div className="demo-banner" role="status">Interactive demo · Fictional data · Your changes are private and temporary</div>}
      <main id="booking-workspace">{children}</main>
      {databaseBadge}
      {confirmProductionRefresh && (
        <div className="dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !productionRefreshBusy && setConfirmProductionRefresh(false)}>
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="refresh-production-title">
            <h2 id="refresh-production-title">Replace Production from Local?</h2>
            <p>This replaces the complete live Production schema and data, including bookings, customers, users and permissions. A backup is saved locally first. This cannot be undone in the app.</p>
            <label>Type PRODUCTION to confirm<input value={productionConfirmation} onChange={(event) => setProductionConfirmation(event.target.value)} autoComplete="off" /></label>
            {productionRefreshMessage && <p className="error-message" role="alert">{productionRefreshMessage}</p>}
            <div className="dialog-actions">
              <button type="button" disabled={productionRefreshBusy} onClick={() => setConfirmProductionRefresh(false)}>Cancel</button>
              <button className="danger" type="button" disabled={productionRefreshBusy || productionConfirmation !== 'PRODUCTION'} onClick={() => void refreshProduction()}>{productionRefreshBusy ? 'Refreshing…' : 'Replace Production data'}</button>
            </div>
          </section>
        </div>
      )}
      {changingPassword && (
        <div className="dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closePasswordDialog()}>
          <section className="user-dialog change-password-dialog" role="dialog" aria-modal="true" aria-labelledby="change-password-title">
            <div className="dialog-heading">
              <h2 id="change-password-title">Change password</h2>
              <button type="button" onClick={closePasswordDialog}>Close</button>
            </div>
            <form onSubmit={changePassword}>
              <label>Current password<input required autoFocus type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></label>
              <label>New password<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></label>
              <label>Confirm new password<input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>
              <small className="password-hint">Use at least 12 characters.</small>
              {passwordError && <p className="login-error" role="alert">{passwordError}</p>}
              <div className="dialog-actions"><button type="button" disabled={passwordBusy} onClick={closePasswordDialog}>Cancel</button><button className="primary" disabled={passwordBusy} type="submit">{passwordBusy ? 'Changing…' : 'Change password'}</button></div>
            </form>
          </section>
        </div>
      )}
      </ManagementAuthProvider>
    </>
  );
}
