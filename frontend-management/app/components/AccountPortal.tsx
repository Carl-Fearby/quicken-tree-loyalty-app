'use client';

import Link from 'next/link';
import {useEffect, useState, type FormEvent} from 'react';
import {tenantBrand} from '../lib/tenant-brand';

type PortalMode = 'home' | 'reset';
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function request(path: string, body: Record<string, string>) {
    const response = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message ?? 'We could not complete that request.');
}

export function AccountPortal({mode}: {mode: PortalMode}) {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [token, setToken] = useState('');
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (mode === 'reset') setToken(new URLSearchParams(window.location.search).get('token') ?? '');
    }, [mode]);

    const submitReset = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!token) return setMessage('This password reset link is invalid. Request a new one below.');
        if (password.length < 8) return setMessage('Use at least 8 characters for your password.');
        if (password !== confirmation) return setMessage('Your passwords do not match.');
        try {
            setBusy(true);
            setMessage('');
            await request('/auth/reset-password', {token, password});
            setMessage(`Your password has been reset. Return to the ${tenantBrand.name} app and sign in with it.`);
            setPassword('');
            setConfirmation('');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'We could not reset your password.');
        } finally {
            setBusy(false);
        }
    };

    return <main className="page">
        <div className="brand"><img src={tenantBrand.logo} alt={tenantBrand.name} style={{width: 160, height: 54, objectFit: 'contain', objectPosition: 'left center'}}/></div>
        <section className="card">
            {mode === 'home' && <>
                <p className="eyebrow">ACCOUNT HELP</p>
                <h1>Your {tenantBrand.name} account.</h1>
                <p className="lead">Use the {tenantBrand.name} app for bookings, rewards and account access. To reset a password, choose “Forgot password?” from the app sign-in screen.</p>
                <p className="note">A password reset link sent by the app will open this website securely.</p>
            </>}
            {mode === 'reset' && <>
                <p className="eyebrow">ACCOUNT SECURITY</p>
                <h1>Choose a new password.</h1>
                <p className="lead">Use at least eight characters. This link expires after 30 minutes and can only be used once.</p>
                <form onSubmit={submitReset} noValidate>
                    <label>New password<input value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete="new-password" minLength={8} placeholder="At least 8 characters"/></label>
                    <label>Confirm password<input value={confirmation} onChange={event => setConfirmation(event.target.value)} type="password" autoComplete="new-password" minLength={8} placeholder="Repeat your password"/></label>
                    {message && <p className="message" role="status">{message}</p>}
                    <button className="primary" disabled={busy || !token}>{busy ? 'Resetting…' : 'Reset password'}</button>
                </form>
                <Link className="quiet" href="/">Return to account help</Link>
            </>}
        </section>
    </main>;
}
