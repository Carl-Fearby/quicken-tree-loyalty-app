'use client';
import { useEffect, useMemo, useState } from 'react';

type Customer = {
  id: string;
  name: string;
  email: string | null;
  memberSince: string;
  tier: string;
  createdAt: string;
  points: number;
  bookingCount: number;
  lastBookingDate: string | null;
};

const displayDate = (date: string | null) =>
  date
    ? new Date(date).toLocaleDateString('en-GB', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'No bookings yet';

async function loadCustomers(query: string, signal?: AbortSignal) {
  const response = await fetch(`/api/customers?q=${encodeURIComponent(query)}`, {
    cache: 'no-store',
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(data.message || 'Unable to load customers.');
  return data.customers as Customer[];
}

export function CustomersPage() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setError('');
      loadCustomers(query, controller.signal)
        .then(setCustomers)
        .catch((problem) => {
          if (problem.name !== 'AbortError')
            setError(problem instanceof Error ? problem.message : 'Unable to load customers.');
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const totalPoints = useMemo(
    () => customers.reduce((total, customer) => total + customer.points, 0),
    [customers],
  );

  return (
    <section className="settings-page customers-page">
      <div className="customers-heading">
        <div>
          <p className="eyebrow">CUSTOMER REGISTRATIONS</p>
          <h1>Customers</h1>
          <p className="settings-intro">
            Registered app customers, their loyalty balance and recent booking activity.
          </p>
        </div>
        <label className="customer-search">
          Search customers
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or email"
          />
        </label>
      </div>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      <div className="customer-metrics" aria-label="Customer summary">
        <article>
          <span>Registrations</span>
          <strong>{customers.length.toLocaleString()}</strong>
        </article>
        <article>
          <span>Loyalty points</span>
          <strong>{totalPoints.toLocaleString()}</strong>
        </article>
      </div>

      <section className="settings-card customers-list">
        <div className="customers-list-header" aria-hidden="true">
          <span>Customer</span>
          <span>Registered</span>
          <span>Bookings</span>
          <span>Points</span>
        </div>
        {customers.map((customer) => (
          <article className="customer-row" key={customer.id}>
            <div>
              <strong>{customer.name}</strong>
              <small>{customer.email || 'No email on record'}</small>
            </div>
            <span>{displayDate(customer.memberSince || customer.createdAt)}</span>
            <span>
              {customer.bookingCount.toLocaleString()}
              <small>{displayDate(customer.lastBookingDate)}</small>
            </span>
            <strong>{customer.points.toLocaleString()}</strong>
          </article>
        ))}
        {!customers.length && (
          <p className="customers-empty">
            {loading ? 'Loading customers...' : 'No registered customers found.'}
          </p>
        )}
      </section>
    </section>
  );
}
