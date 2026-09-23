'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { DatePicker } from '../components/ui/DatePicker';

type Profile = { displayName: string; email: string; dateOfBirth: string | null };
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/profile', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Could not load your profile.');
        setProfile(body.profile);
      })
      .catch((cause) => setError(cause.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setMessage('');
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Could not save your profile.');
      setProfile(body.profile);
      setMessage('Profile saved.');
      window.dispatchEvent(new CustomEvent('management-profile-updated', { detail: { displayName: body.profile.displayName } }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-page profile-page">
      <Breadcrumbs current="Profile" showSettings={false} />
      <h1>Profile</h1>
      {loading ? <p>Loading profile...</p> : profile ? (
        <form className="profile-form" onSubmit={(event) => void save(event)}>
          <label htmlFor="profile-name">Name</label>
          <input id="profile-name" autoComplete="name" maxLength={100} required value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} />
          <label htmlFor="profile-email">Email address</label>
          <input id="profile-email" type="email" autoComplete="email" maxLength={254} required value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
          <span className="profile-field-label">Date of birth</span>
          <div className="profile-date-field">
            <DatePicker ariaLabel="Date of birth" date={profile.dateOfBirth || ''} onChange={(dateOfBirth) => setProfile({ ...profile, dateOfBirth })} allowPast yearSelection maxDate={new Date().toISOString().slice(0, 10)} placeholder="Select date of birth" />
            {profile.dateOfBirth && <button type="button" className="profile-clear-date" aria-label="Clear date of birth" title="Clear date of birth" onClick={() => setProfile({ ...profile, dateOfBirth: null })}><i aria-hidden="true" className="fa-solid fa-xmark" /></button>}
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          {message && <p className="profile-success" role="status">{message}</p>}
          <div className="profile-actions"><button className="primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
        </form>
      ) : <p className="error-message" role="alert">{error}</p>}
    </section>
  );
}
