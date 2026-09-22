'use client';

import { useEffect, useState } from 'react';
import { readRewardsFeature, writeRewardsFeature } from '../../lib/rewards-feature';

export function RewardsFeatureSetting() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    readRewardsFeature()
      .then(setEnabled)
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load reward availability.'),
      )
      .finally(() => setLoading(false));
  }, []);

  const update = async (next: boolean) => {
    const previous = enabled;
    setEnabled(next);
    setSaving(true);
    setMessage('');
    try {
      const saved = await writeRewardsFeature(next);
      setEnabled(saved);
      setMessage(
        saved
          ? 'Rewards are available in the back office and customer app.'
          : 'Rewards are hidden in the back office and customer app. Existing data is retained.',
      );
    } catch (error) {
      setEnabled(previous);
      setMessage(error instanceof Error ? error.message : 'Unable to update reward availability.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-card reward-feature-setting settings-feature-setting">
      <div>
        <h2>Rewards availability</h2>
        <p>
          Show or hide rewards across both Pace back office and the customer loyalty app.
          Existing points, vouchers and reward history are kept when rewards are off.
        </p>
        {message && <p className="settings-message" role="status">{message}</p>}
      </div>
      <label className="reward-feature-toggle">
        <input
          checked={enabled}
          disabled={loading || saving}
          type="checkbox"
          onChange={(event) => void update(event.target.checked)}
        />
        <span>{loading ? 'Loading…' : saving ? 'Saving…' : enabled ? 'Enabled' : 'Disabled'}</span>
      </label>
    </section>
  );
}
