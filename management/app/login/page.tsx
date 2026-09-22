'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(demoMode);
  const [error, setError] = useState('');
  const started = useRef(false);

  const enterDemo = async () => {
    setBusy(true);
    setError('');
    try {
      const existing = await fetch('/api/auth/session', { cache: 'no-store' });
      if (!existing.ok) {
        const response = await fetch('/api/demo/start', { method: 'POST' });
        const body = await response.json();
        if (!response.ok) throw Error(body.message || 'Unable to open the demo.');
      }
      router.replace('/diary');
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to open the demo.');
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!demoMode || started.current) return;
    started.current = true;
    void enterDemo();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw Error(body.message || 'Unable to sign in.');
      router.replace('/diary');
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  };

  if (demoMode) return (
    <main className="login-page">
      <section className="login-panel">
        <div className="pace-brand login-logo">
          <img className="pace-logo pace-logo-light" src="/branding/pace-light.png" alt="Pace — Service in Sync" />
          <img className="pace-logo pace-logo-dark" src="/branding/pace-dark.png" alt="" aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">INTERACTIVE DEMO</p>
          <h1>Opening your workspace</h1>
          <p>Fictional data. Your changes are private and temporary.</p>
        </div>
        {error && <><p className="login-error" role="alert">{error}</p><button className="primary" disabled={busy} onClick={() => void enterDemo()} type="button">Try again</button></>}
      </section>
    </main>
  );

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="pace-brand login-logo">
          <img className="pace-logo pace-logo-light" src="/branding/pace-light.png" alt="Pace — Service in Sync" />
          <img className="pace-logo pace-logo-dark" src="/branding/pace-dark.png" alt="" aria-hidden="true" />
        </div>
        <div>
          <p className="eyebrow">BACK OFFICE</p>
          <h1>Welcome back</h1>
          <p>Sign in to manage bookings, menus, rewards and venue settings.</p>
        </div>
        <form onSubmit={submit}>
          <label>
            Email address
            <input
              autoComplete="username"
              autoFocus
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button className="primary" disabled={busy} type="submit">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
