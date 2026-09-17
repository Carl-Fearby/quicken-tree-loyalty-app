'use client';

import {useState, type FormEvent} from 'react';
import {Icon} from '../Icon';
import styles from './styles.module.css';
import {login, register} from '../../lib/auth';

type AuthMode = 'sign-in' | 'sign-up';

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

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!email.trim() || !password.trim() || (mode === 'sign-up' && !name.trim())) {
            setMessage('Please complete all fields to continue.');
            return;
        }
        if (password.length < 8) {
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
            const response = mode === 'sign-up'
                ? await register(name.trim(), email.trim(), password)
                : await login(email.trim(), password);
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
    };

    return <section className={styles.root} aria-labelledby="welcome-title">
        <div className={styles.brand}>
            <img src="/brand/quicken-tree-red.png" alt="The Quicken Tree Bar Grill Restaurant"/>
        </div>
        <div className={styles.intro}>
            <p className="eyebrow">{mode === 'sign-up' ? 'JOIN THE TABLE' : 'WELCOME BACK'}</p>
            <h1 id="welcome-title">{mode === 'sign-up' ? <>More from every<br/>visit.</> : <>Good to see<br/>you again.</>}</h1>
            <p>{mode === 'sign-up' ? 'Book your table, earn rewards and keep everything you love about The Quicken Tree in one place.' : 'Sign in to your Quicken Tree account to see your bookings, rewards and favourites.'}</p>
        </div>
        <div className={styles.tabs} role="tablist" aria-label="Account access">
            <button type="button" className={mode === 'sign-up' ? styles.active : ''} onClick={() => switchMode('sign-up')} role="tab" aria-selected={mode === 'sign-up'}>Create account</button>
            <button type="button" className={mode === 'sign-in' ? styles.active : ''} onClick={() => switchMode('sign-in')} role="tab" aria-selected={mode === 'sign-in'}>Sign in</button>
        </div>
        <form className={styles.form} onSubmit={submit} noValidate aria-busy={isSubmitting}>
            {mode === 'sign-up' && <label>Your name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" placeholder="Your name"/></label>}
            <label>Email address<input value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" inputMode="email" type="email" placeholder="you@example.com"/></label>
            <label>Password<span className={styles.passwordField}><input value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'} type={showPassword ? 'text' : 'password'} placeholder={mode === 'sign-up' ? 'At least 8 characters' : 'Your password'} minLength={8}/><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={`${showPassword ? 'Hide' : 'Show'} password`}>{showPassword ? 'Hide' : 'Show'}</button></span></label>
            {mode === 'sign-up' && <label>Confirm password<input value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" minLength={8}/></label>}
            {mode === 'sign-in' && <button className={styles.forgotten} type="button" onClick={() => setMessage('Password reset will be connected when email delivery is configured.')}>Forgot password?</button>}
            {message && <p className={styles.message} role="status">{message}</p>}
            <button className={styles.submit} type="submit" disabled={isSubmitting}>{isSubmitting ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'} {!isSubmitting && <Icon name="fa-arrow-right"/>}</button>
        </form>
        <p className={styles.terms}>By continuing, you agree to receive account and booking updates from The Quicken Tree.</p>
    </section>;
}
