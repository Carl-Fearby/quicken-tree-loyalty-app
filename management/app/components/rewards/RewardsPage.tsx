'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '../ui/Breadcrumbs';
type Reward = {
  id: string;
  code: string;
  label: string;
  points: number;
  expiresAt: string;
  status: string;
};
type Customer = { id: string; name: string; email: string | null; points: number };
type Entry = { id: string; name: string; points: number; reason: string; createdAt: string };
function defaultExpiry() {
  const date = new Date();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 3);
  date.setUTCDate(
    Math.min(
      day,
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate(),
    ),
  );
  return date.toISOString().slice(0, 10);
}
async function request(path: string, body?: object, signal?: AbortSignal) {
  const response = await fetch(
    `/api/rewards/${path}`,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : { signal },
  );
  const text = await response.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw Error(
      response.ok
        ? 'The rewards service returned an invalid response.'
        : 'The rewards service is unavailable. Please retry.',
    );
  }
  if (!response.ok) throw Error(data.message || 'Unable to load rewards.');
  return data;
}
const displayDate = (date: string) =>
  new Date(date).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export function RewardsPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<Reward[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<Reward | null>(null);
  useEffect(() => {
    if (!selected) return;
    const dialog = previewDialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      trigger?.focus();
    };
  }, [selected]);
  const [label, setLabel] = useState('');
  const [points, setPoints] = useState('100');
  const [expiresOn, setExpiresOn] = useState(defaultExpiry);
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [manualPoints, setManualPoints] = useState('100');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('All');
  const pending = useRef<{ key: string; id: string } | null>(null);
  const requestId = (key: string) => {
    if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
    return pending.current!.id;
  };
  const load = async () => {
    const [rewards, history] = await Promise.all([request('tokens'), request('history')]);
    setTokens(rewards.tokens);
    setEntries(history.entries);
  };
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      request(`customers?q=${encodeURIComponent(query)}`, undefined, controller.signal)
        .then((data) => setCustomers(data.customers))
        .catch((e) => {
          if (e.name !== 'AbortError') setError(e.message);
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const generate = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = { label, points: Number(points), expiresOn };
      const reward = await request('tokens', {
        ...body,
        requestId: requestId(JSON.stringify(body)),
      });
      pending.current = null;
      setSelected({ ...reward, status: 'Active' });
      setMessage('Reward created. Download the QR code to print or share.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to generate reward.');
    } finally {
      setBusy(false);
    }
  };
  const credit = async (event: FormEvent) => {
    event.preventDefault();
    if (!customer) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const body = { memberId: customer.id, points: Number(manualPoints), reason };
      const result = await request('points', {
        ...body,
        requestId: requestId(JSON.stringify(body)),
      });
      pending.current = null;
      setMessage(
        `${manualPoints} points added to ${customer.name}. New balance: ${result.points.toLocaleString()} points.`,
      );
      setCustomer({ ...customer, points: result.points });
      setCustomers((current) =>
        current.map((item) =>
          item.id === customer.id ? { ...item, points: result.points } : item,
        ),
      );
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to add points.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="settings-page rewards-page">
      <Breadcrumbs current="Rewards" onSettings={() => router.push('/configuration')} />
      <p className="eyebrow">CUSTOMER LOYALTY</p>
      <h1>Rewards</h1>
      <p className="settings-intro">
        Give a little extra. Create single-use QR rewards or add points directly to a customer.
      </p>
      {error && (
        <p className="error-message" role="alert">
          {error}{' '}
          <button
            onClick={() => {
              setError('');
              load().catch((e) => setError(e.message));
            }}
          >
            Retry
          </button>
        </p>
      )}
      {message && (
        <p className="reward-success" role="status">
          {message}
        </p>
      )}
      <div className="rewards-columns">
        <form className="settings-card reward-form" onSubmit={generate}>
          <div>
            <h2>Create a QR reward</h2>
            <p>Each code can be claimed once. Points are stored securely in the database.</p>
          </div>
          <label>
            Reward name <span>(optional)</span>
            <input
              value={label}
              maxLength={120}
              placeholder="e.g. A little thank you"
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <div className="reward-fields">
            <label>
              Points
              <input
                type="number"
                min="0"
                max="1000"
                step="1"
                required
                value={points}
                onChange={(e) => setPoints(e.target.value)}
              />
            </label>
            <label>
              Expiry date
              <input
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </label>
          </div>
          <p className="reward-hint">
            0–1,000 points · Default expiry: 3 months · Valid until the end of the expiry date
            (UTC).
          </p>
          <button className="primary" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Generate QR reward'}
          </button>
        </form>
        <form className="settings-card reward-form" onSubmit={credit}>
          <div>
            <h2>Add customer points</h2>
            <p>Credit an existing customer and keep a record of the reason.</p>
          </div>
          <label>
            Find a customer
            <input
              type="search"
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCustomer(null);
              }}
            />
          </label>
          <label>
            Customer
            <select
              required
              value={customer?.id || ''}
              onChange={(e) =>
                setCustomer(customers.find((item) => item.id === e.target.value) || null)
              }
            >
              <option value="">
                {customers.length ? 'Select a customer' : 'No customers found'}
              </option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.email ? ` · ${item.email}` : ''}
                </option>
              ))}
            </select>
          </label>
          {customer && (
            <p className="reward-hint">
              Current balance: <strong>{customer.points.toLocaleString()} points</strong>
            </p>
          )}
          <div className="reward-fields">
            <label>
              Points to add
              <input
                type="number"
                min="1"
                max="1000"
                step="1"
                required
                value={manualPoints}
                onChange={(e) => setManualPoints(e.target.value)}
              />
            </label>
            <label>
              Reason
              <input
                required
                maxLength={500}
                placeholder="e.g. Birthday gift"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
          </div>
          <button className="primary" disabled={busy || !customer} type="submit">
            Add points
          </button>
        </form>
      </div>
      {selected && (
        <dialog
          ref={previewDialog}
          className="booking-dialog reward-preview-dialog"
          aria-labelledby="reward-preview-title"
          onCancel={() => setSelected(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const bounds = event.currentTarget.getBoundingClientRect();
              if (
                event.clientX < bounds.left ||
                event.clientX > bounds.right ||
                event.clientY < bounds.top ||
                event.clientY > bounds.bottom
              )
                setSelected(null);
            }
          }}
        >
          <div className="dialog-heading">
            <h2 id="reward-preview-title">Reward preview</h2>
            <button type="button" autoFocus onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="reward-preview">
            <img
              src={`/api/rewards/tokens/${selected.id}/qr`}
              width="192"
              height="192"
              alt={`QR code for ${selected.points} reward points`}
            />
            <div>
              <p className="eyebrow">SINGLE-USE REWARD</p>
              <h2>{selected.label || 'Reward points'}</h2>
              <p>
                Reward code: <strong className="reward-code">{selected.code}</strong>
              </p>
              <p>
                <strong>{selected.points} points</strong> · Expires{' '}
                {displayDate(selected.expiresAt)} · {selected.status}
              </p>
              <p>
                Keep this code safe: whoever claims it first receives the points. App scanning is
                coming later.
              </p>
              <a
                className="reward-download"
                href={`/api/rewards/tokens/${selected.id}/qr?download=1`}
                download
              >
                Download QR code
              </a>{' '}
              <button type="button" onClick={() => setSelected(null)}>
                Close preview
              </button>
            </div>
          </div>
        </dialog>
      )}
      <section className="settings-card reward-records">
        <div className="reward-section-heading">
          <div>
            <h2>Reward tokens</h2>
            <p>Latest 500 rewards. Viewing or downloading a QR code does not use it.</p>
          </div>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {['All', 'Active', 'Used', 'Expired'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        {loading ? (
          <p>Loading rewards…</p>
        ) : tokens.filter((item) => status === 'All' || item.status === status).length === 0 ? (
          <p>No rewards to show. Create your first QR reward above.</p>
        ) : (
          <div className="reward-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Reward</th>
                  <th>Points</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>QR code</th>
                </tr>
              </thead>
              <tbody>
                {tokens
                  .filter((item) => status === 'All' || item.status === status)
                  .map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.label || 'Reward points'}
                        <small className="reward-code">{item.code}</small>
                      </td>
                      <td>{item.points}</td>
                      <td>{displayDate(item.expiresAt)}</td>
                      <td>
                        <span
                          className={`reward-status reward-status-${item.status.toLowerCase()}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setSelected(item)}>View QR</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="settings-card reward-records">
        <h2>Points history</h2>
        <p>Latest 100 manual credits and QR claims.</p>
        {entries.length === 0 ? (
          <p>No points have been added yet.</p>
        ) : (
          <div className="reward-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Points</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>+{item.points}</td>
                    <td>{item.reason}</td>
                    <td>{displayDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
