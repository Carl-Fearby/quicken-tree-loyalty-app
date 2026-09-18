'use client';

import {useState, type FormEvent} from 'react';
import {Icon} from '../Icon';
import styles from './styles.module.css';
import {login, register, requestPasswordReset} from '../../lib/auth';
import {tenantBrand} from '../../lib/tenant-brand';

type AuthMode = 'sign-in' | 'sign-up' | 'forgot-password';

export type LocalSession = {
    accessToken: string;
    email: string;
    name: string;
    createdAt: string;
};

export function AuthScreen({onAuthenticated}: {onAuthenticated: (session: LocalSession) => void}) {
    const [mode, setMode] = useState<AuthMode>('sign-up');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const isForgotten = mode === 'forgot-password';

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (isForgotten && !email.trim()) {
            setMessage('Enter the email address for your account.');
            return;
        }
        if (!isForgotten && (!email.trim() || !password.trim() || (mode === 'sign-up' && !name.trim()))) {
            setMessage('Please complete all fields to continue.');
            return;
        }
        if (!isForgotten && password.length < 8) {
            setMessage('Use at least 8 characters for your password.');
            return;
        }
        if (mode === 'sign-up' && password !== confirmPassword) {
            setMessage('Your passwords do not match.');
            return;
        }
        try {
            setMessage('');
            setIsSubmitting(true);
            if (isForgotten) {
                await requestPasswordReset(email.trim());
                setMessage('If an account exists for that address, a reset link has been sent.');
                return;
            }
            const response = mode === 'sign-up' ? await register(name.trim(), email.trim(), password) : await login(email.trim(), password);
            onAuthenticated({accessToken: response.accessToken, email: response.member.email, name: response.member.name, createdAt: new Date().toISOString()});
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'We could not complete that request.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const switchMode = (next: AuthMode) => {
        setMode(next);
        setMessage('');
        setConfirmPassword('');
        setPassword('');
    };

    return <section className={styles.root} aria-labelledby="welcome-title">
        <div className={styles.brand}>
            <img src={tenantBrand.logoRed} alt={tenantBrand.name}/>
        </div>
        <div className={styles.intro}>
            <p className="eyebrow">{mode === 'sign-up' ? 'JOIN THE TABLE' : isForgotten ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</p>
            <h1 id="welcome-title">{mode === 'sign-up' ? <>More from every<br/>visit.</> : isForgotten ? <>Reset your<br/>password.</> : <>Good to see<br/>you again.</>}</h1>
            <p>{mode === 'sign-up' ? `Book your table, earn rewards and keep everything you love about ${tenantBrand.name} in one place.` : isForgotten ? 'Enter your email address and we will send a reset link if an account exists.' : `Sign in to your ${tenantBrand.name} account to see your bookings, rewards and favourites.`}</p>
        </div>
        {!isForgotten && <div className={styles.tabs} role="tablist" aria-label="Account access">
            <button type="button" className={mode === 'sign-up' ? styles.active : ''} onClick={() => switchMode('sign-up')} role="tab" aria-selected={mode === 'sign-up'}>Create account</button>
            <button type="button" className={mode === 'sign-in' ? styles.active : ''} onClick={() => switchMode('sign-in')} role="tab" aria-selected={mode === 'sign-in'}>Sign in</button>
        </div>}
        <form className={styles.form} onSubmit={submit} noValidate aria-busy={isSubmitting}>
            {mode === 'sign-up' && <label>Your name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name"/></label>}
            <label>Email address<input value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" inputMode="email" type="email" placeholder="you@example.com"/></label>
            {!isForgotten && <label>Password<span className={styles.passwordField}><input value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} placeholder={mode === 'sign-in' ? 'Your password' : 'At least 8 characters'} minLength={8}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={`${showPassword ? 'Hide' : 'Show'} password`}>{showPassword ? 'Hide' : 'Show'}</button></span></label>}
            {mode === 'sign-up' && <label>Confirm password<input value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" minLength={8}/></label>}
            {mode === 'sign-in' && <button className={styles.forgotten} type="button" onClick={() => switchMode('forgot-password')}>Forgot password?</button>}
            {isForgotten && <button className={styles.forgotten} type="button" onClick={() => switchMode('sign-in')}>Back to sign in</button>}
            {message && <p className={styles.message} role="status">{message}</p>}
            <button className={styles.submit} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : isForgotten ? 'Send reset link' : 'Sign in'} {!isSubmitting && <Icon name="fa-arrow-right"/>}</button>
        </form>
        <p className={styles.terms}>By continuing, you agree to receive account and booking updates from {tenantBrand.name}.</p>
    </section>;
}
