'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Breadcrumbs } from '../ui/Breadcrumbs';

type User = {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'staff';
  active: boolean;
  permissions: Record<string, string>;
  createdAt: string;
};
type PermissionDefinition = {
  key: string;
  label: string;
  description: string;
  levels: string[];
  position: number;
};

const emptyForm = {
  displayName: '',
  email: '',
  password: '',
  role: 'staff' as User['role'],
  active: true,
  permissions: {} as Record<string, string>,
};

async function request(path: string, options?: RequestInit) {
  const response = await fetch(path, options);
  const text = await response.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw Error('The user service returned an invalid response.');
  }
  if (!response.ok) throw Error(body.message || 'Unable to update users.');
  return body;
}

export function UserManagement({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<User['role']>('staff');
  const [currentPermissions, setCurrentPermissions] = useState<Record<string, string>>({});
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [editing, setEditing] = useState<User | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const load = () =>
    request('/api/users').then((body) => {
      setUsers(body.users);
      setCurrentUserId(body.currentUser.id);
      setCurrentUserRole(body.currentUser.role);
      setCurrentPermissions(body.currentUser.permissions);
      setPermissionDefinitions(body.permissionDefinitions);
    });

  useEffect(() => {
    load().catch((problem) => setError(problem instanceof Error ? problem.message : 'Unable to load users.'));
  }, []);

  const openCreate = () => {
    setForm({
      ...emptyForm,
      permissions: Object.fromEntries(permissionDefinitions.map((definition) => [definition.key, 'none'])),
    });
    setEditing(null);
    setError('');
  };
  const openEdit = (user: User) => {
    setForm({
      displayName: user.displayName,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
      permissions: { ...user.permissions },
    });
    setEditing(user);
    setError('');
  };
  const closeEditor = () => {
    if (!busy) setEditing(undefined);
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(editing ? `/api/users/${editing.id}` : '/api/users', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      await load();
      setEditing(undefined);
      setMessage(editing ? 'User updated.' : 'User created.');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to save user.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError('');
    try {
      await request(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
      await load();
      setDeleteTarget(null);
      setMessage('User deleted.');
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Unable to delete user.');
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };
  const permissionLabel = (definition: PermissionDefinition, level: string) =>
    level === 'write' ? (definition.key === 'bookings' ? 'Read & write' : 'Allowed') : level === 'read' ? 'Read only' : 'No access';
  const availableLevels = (definition: PermissionDefinition) => {
    if (currentUserRole === 'admin') return definition.levels;
    const maximum = definition.levels.indexOf(currentPermissions[definition.key] || 'none');
    return definition.levels.filter((_, index) => index <= maximum);
  };
  const bookingDefinitions = permissionDefinitions.filter((definition) => definition.levels.length > 2);
  const functionDefinitions = permissionDefinitions.filter((definition) => definition.levels.length === 2 && !definition.key.startsWith('configuration.'));
  const configurationDefinitions = permissionDefinitions.filter((definition) => definition.key.startsWith('configuration.'));
  const permissionCheckbox = (definition: PermissionDefinition) => (
    <label className="permission-checkbox" key={definition.key}>
      <input
        type="checkbox"
        checked={form.role === 'admin' || form.permissions[definition.key] !== 'none'}
        disabled={form.role === 'admin' || currentPermissions[definition.key] === 'none'}
        onChange={(event) => setForm({
          ...form,
          permissions: {
            ...form.permissions,
            [definition.key]: event.target.checked ? definition.levels.at(-1) || 'write' : 'none',
          },
        })}
      />
      <span><strong>{definition.label}</strong><small>{definition.description}</small></span>
    </label>
  );

  return (
    <section className="settings-page users-settings">
      <Breadcrumbs current="Users" onSettings={onBack} />
      <p className="eyebrow">ACCESS MANAGEMENT</p>
      <div className="users-heading">
        <div>
          <h1>Users</h1>
          <p className="settings-intro">Manage who can sign in to Pace back office and what level of access they have.</p>
        </div>
        <button className="primary" type="button" onClick={openCreate}>+ Add user</button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {message && <p className="reward-success" role="status">{message}</p>}
      <section className="settings-card users-list">
        <div className="users-list-header" aria-hidden="true">
          <span>User</span><span>Role</span><span>Status</span><span />
        </div>
        {users.map((user) => (
          <div className="user-row" key={user.id}>
            <div><strong>{user.displayName}</strong><small>{user.email}{user.id === currentUserId ? ' · You' : ''}</small></div>
            <span className="user-role">{user.role === 'admin' ? 'Admin' : 'Staff'}</span>
            <span className={`user-status ${user.active ? 'active' : ''}`}>{user.active ? 'Active' : 'Disabled'}</span>
            <div className="user-row-actions">
              <button type="button" onClick={() => openEdit(user)}>Edit</button>
              <button className="danger" disabled={user.id === currentUserId} type="button" onClick={() => setDeleteTarget(user)}>Delete</button>
            </div>
          </div>
        ))}
        {!users.length && !error && <p>Loading users…</p>}
      </section>

      {editing !== undefined && (
        <div className="dialog-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <section className="user-dialog" role="dialog" aria-modal="true" aria-labelledby="user-dialog-title">
            <div className="dialog-heading">
              <h2 id="user-dialog-title">{editing ? 'Edit user' : 'Add user'}</h2>
              <button type="button" onClick={closeEditor}>Close</button>
            </div>
            <form onSubmit={save}>
              <label>Name<input required maxLength={100} value={form.displayName} onChange={(event) => setForm({...form, displayName: event.target.value})} /></label>
              <label>Email address<input required type="email" autoComplete="off" value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} /></label>
              <label>{editing ? 'New password (leave blank to keep current)' : 'Temporary password'}<input required={!editing} minLength={12} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({...form, password: event.target.value})} /></label>
              <label>Role<select value={form.role} disabled={editing?.id === currentUserId || currentUserRole !== 'admin'} onChange={(event) => {
                const role = event.target.value as User['role'];
                setForm({...form, role});
              }}><option value="staff">Staff</option>{currentUserRole === 'admin' && <option value="admin">Admin</option>}</select></label>
              <fieldset className="user-permission-fields" disabled={form.role === 'admin'}>
                <legend>Permissions</legend>
                {bookingDefinitions.map((definition) => (
                  <label key={definition.key}>{definition.label}<select value={form.role === 'admin' ? definition.levels.at(-1) : form.permissions[definition.key] || 'none'} onChange={(event) => setForm({...form, permissions: {...form.permissions, [definition.key]: event.target.value}})}>{availableLevels(definition).map((level) => <option key={level} value={level}>{permissionLabel(definition,level)}</option>)}</select><small>{definition.description}</small></label>
                ))}
                {!!functionDefinitions.length && <div className="permission-checkbox-grid">{functionDefinitions.map(permissionCheckbox)}</div>}
                {!!configurationDefinitions.length && (
                  <section className="configuration-permissions">
                    <div><h3>Configuration options</h3><p>Choose each settings area this user can open and change.</p></div>
                    <div className="permission-checkbox-grid">{configurationDefinitions.map(permissionCheckbox)}</div>
                  </section>
                )}
                {form.role === 'admin' && <p>Administrators always have full access to every function.</p>}
              </fieldset>
              <label className="user-active-toggle"><input type="checkbox" checked={form.active} disabled={editing?.id === currentUserId} onChange={(event) => setForm({...form, active: event.target.checked})} /> Active user</label>
              <div className="dialog-actions"><button type="button" onClick={closeEditor}>Cancel</button><button className="primary" disabled={busy} type="submit">{busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}</button></div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="dialog-layer" role="presentation">
          <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-user-title">
            <h2 id="delete-user-title">Delete {deleteTarget.displayName}?</h2>
            <p>This permanently removes their back-office access and active sessions.</p>
            <div className="dialog-actions"><button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button><button className="danger" disabled={busy} type="button" onClick={() => void remove()}>{busy ? 'Deleting…' : 'Delete user'}</button></div>
          </section>
        </div>
      )}
    </section>
  );
}
