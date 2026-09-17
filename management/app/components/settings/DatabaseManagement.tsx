'use client';

import { useEffect, useMemo, useState } from 'react';
import { ModalShell } from '../booking-diary/modals/ModalShell';
import { Breadcrumbs } from '../ui/Breadcrumbs';

type DatabaseTable = { name: string; count: string };
type Column = { name: string; type: string; nullable: boolean };
type TableData = {
  columns: Column[];
  primaryKey: string[];
  rows: Record<string, unknown>[];
  count: string;
  page: number;
};
type PendingDelete = { key: Record<string, unknown> | null };

const value = (item: unknown) =>
  item === null ? 'NULL' : typeof item === 'object' ? JSON.stringify(item) : String(item);

async function api(path: string, options?: RequestInit) {
  const response = await fetch(`/api${path}`, options);
  const body = await response.json();
  if (!response.ok) throw Error(body.message || 'Request failed.');
  return body;
}

export function DatabaseManagement({ onBack }: { onBack: () => void }) {
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [selected, setSelected] = useState('');
  const [data, setData] = useState<TableData | null>(null);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [inspecting, setInspecting] = useState<Record<string, unknown> | null>(null);
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [confirmation, setConfirmation] = useState('');

  const refreshTables = async () => {
    const result = await api('/tables');
    setTables(result.tables || []);
  };
  const load = async (name: string, page = 0) => {
    setMessage('Loading records…');
    try {
      const result = await api(`/tables/${encodeURIComponent(name)}?page=${page}`);
      setSelected(name);
      setData(result);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load records.');
    }
  };

  useEffect(() => {
    void refreshTables().catch((error) =>
      setMessage(error instanceof Error ? error.message : 'Unable to load database tables.'),
    );
  }, []);

  const visibleTables = useMemo(
    () => tables.filter((table) => table.name.toLowerCase().includes(search.toLowerCase())),
    [search, tables],
  );
  const remove = async () => {
    if (!pending || !selected || confirmation !== selected) return;
    setMessage('Deleting…');
    try {
      const result = await api(`/tables/${encodeURIComponent(selected)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: selected,
          key: pending.key,
          all: pending.key === null,
          confirm: selected,
        }),
      });
      setPending(null);
      setConfirmation('');
      setData(null);
      await refreshTables();
      setMessage(`Deleted ${result.deleted} record${result.deleted === 1 ? '' : 's'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Deletion failed.');
    }
  };

  return (
    <section className="database-management">
      <Breadcrumbs current="Database management" onSettings={onBack} />
      <p className="eyebrow">POSTGRESQL WORKSPACE</p>
      <div className="database-title-row">
        <div>
          <h1>{selected || 'Explore your database'}</h1>
          <p className="settings-intro">
            {data
              ? `${Number(data.count).toLocaleString()} records · ${data.columns.length} columns`
              : 'Choose a table to inspect its records.'}
          </p>
        </div>
        {data && (
          <button className="danger" type="button" onClick={() => setPending({ key: null })}>
            Empty table
          </button>
        )}
      </div>
      <p className="settings-message" role="status">
        {message}
      </p>
      <div className="database-layout">
        <aside className="database-sidebar">
          <div className="database-sidebar-heading">
            <h2>Tables</h2>
            <button type="button" onClick={() => void refreshTables()}>
              ↻ Refresh
            </button>
          </div>
          <label className="database-search">
            Find a table
            <input
              type="search"
              placeholder="Filter tables…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <nav className="database-table-list" aria-label="Database tables">
            {visibleTables.map((table) => (
              <button
                aria-current={selected === table.name}
                key={table.name}
                type="button"
                onClick={() => void load(table.name)}
              >
                <span>{table.name}</span>
                <small>{Number(table.count).toLocaleString()}</small>
              </button>
            ))}
          </nav>
          <p>PostgreSQL · public schema</p>
        </aside>
        <main className="database-records">
          {!data ? (
            <div className="database-empty">
              <strong>Your data, in one place.</strong>
              <p>Browse tables, inspect fields, and remove records when necessary.</p>
            </div>
          ) : (
            <>
              <div className="database-table-wrap">
                <table>
                  <thead>
                    <tr>
                      {data.columns.map((column) => (
                        <th key={column.name} scope="col">
                          {column.name}
                          <small>
                            {column.type}
                            {data.primaryKey.includes(column.name) ? ' · PRIMARY KEY' : ''}
                          </small>
                        </th>
                      ))}
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row, index) => (
                      <tr key={index}>
                        {data.columns.map((column) => (
                          <td key={column.name} title={value(row[column.name])}>
                            {value(row[column.name])}
                          </td>
                        ))}
                        <td className="database-row-actions">
                          <button type="button" onClick={() => setInspecting(row)}>
                            Inspect
                          </button>
                          {data.primaryKey.length > 0 && (
                            <button
                              className="danger"
                              type="button"
                              onClick={() =>
                                setPending({
                                  key: Object.fromEntries(
                                    data.primaryKey.map((key) => [key, row[key]]),
                                  ),
                                })
                              }
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="database-pagination">
                <button
                  disabled={data.page === 0}
                  type="button"
                  onClick={() => void load(selected, data.page - 1)}
                >
                  ← Previous
                </button>
                <span>
                  Page {data.page + 1} of {Math.max(1, Math.ceil(Number(data.count) / 50))}
                </span>
                <button
                  disabled={(data.page + 1) * 50 >= Number(data.count)}
                  type="button"
                  onClick={() => void load(selected, data.page + 1)}
                >
                  Next →
                </button>
              </div>
            </>
          )}
        </main>
      </div>
      {inspecting && (
        <ModalShell title="Record details" onClose={() => setInspecting(null)}>
          <pre className="database-json">{JSON.stringify(inspecting, null, 2)}</pre>
        </ModalShell>
      )}
      {pending && (
        <ModalShell
          title={pending.key ? 'Delete this record?' : `Empty ${selected}?`}
          onClose={() => setPending(null)}
        >
          <p className="dialog-warning">
            This cannot be undone. Type <strong>{selected}</strong> to continue.
          </p>
          <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          <div className="dialog-actions">
            <button type="button" onClick={() => setPending(null)}>
              Cancel
            </button>
            <button
              className="danger"
              disabled={confirmation !== selected}
              type="button"
              onClick={() => void remove()}
            >
              Delete permanently
            </button>
          </div>
        </ModalShell>
      )}
    </section>
  );
}

export function DatabaseAccessDialog({
  onClose,
  onUnlock,
}: {
  onClose: () => void;
  onUnlock: () => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  return (
    <ModalShell title="Database management" onClose={onClose}>
      <p>Enter the password to continue.</p>
      <form
        className="database-gate-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (password === 'letmein') onUnlock();
          else setError('Incorrect password.');
        }}
      >
        <label>
          Password
          <input
            autoFocus
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <p className="settings-message" role="status">
          {error}
        </p>
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" type="submit">
            Unlock
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
