'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/ui/AdminTable';
import AlertBanner from '@/components/ui/AlertBanner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { SelectField, TextInput } from '@/components/ui/FormField';

type AdminRole = 'admin' | 'staff';

type StaffUser = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  tel: string;
  position: string;
  division: string;
  role: AdminRole;
  active: boolean;
};

const EMPTY_FORM = {
  username: '',
  email: '',
  full_name: '',
  tel: '',
  position: '',
  division: '',
  role: 'staff' as AdminRole,
  active: true,
  password: '',
};

function asStaffUser(row: Partial<StaffUser>): StaffUser {
  return {
    id: Number(row.id),
    username: String(row.username || ''),
    email: String(row.email || ''),
    full_name: String(row.full_name || ''),
    tel: String(row.tel || ''),
    position: String(row.position || ''),
    division: String(row.division || ''),
    role: row.role === 'admin' ? 'admin' : 'staff',
    active: Boolean(row.active),
  };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', { cache: 'no-store' });
      if (response.status === 403) {
        window.location.href = '/admin';
        return;
      }
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || `Request failed (${response.status})`);
      }
      const list = Array.isArray(json.data) ? json.data : [];
      setUsers(list.map((row: Partial<StaffUser>) => asStaffUser(row)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username.trim(),
          email: newUser.email.trim(),
          full_name: newUser.full_name.trim(),
          tel: newUser.tel.trim(),
          position: newUser.position.trim(),
          division: newUser.division.trim(),
          password: newUser.password,
          role: newUser.role,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Could not create user');
      }
      setNewUser(EMPTY_FORM);
      setCreating(false);
      setSuccess('User created.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create user');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(user: StaffUser) {
    setEditingId(user.id);
    setEditUser({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      tel: user.tel,
      position: user.position,
      division: user.division,
      role: user.role,
      active: user.active,
      password: '',
    });
    setSuccess(null);
    setError(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        username: editUser.username.trim(),
        email: editUser.email.trim(),
        full_name: editUser.full_name.trim(),
        tel: editUser.tel.trim(),
        position: editUser.position.trim(),
        division: editUser.division.trim(),
        role: editUser.role,
        active: editUser.active,
      };
      if (editUser.password.trim()) body.password = editUser.password;
      const response = await fetch(`/api/admin/users/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Could not save user');
      }
      setEditingId(null);
      setEditUser(EMPTY_FORM);
      setSuccess('User saved.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: StaffUser) {
    if (!window.confirm(`Delete login “${user.email || user.username}”?`)) return;
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Could not delete user');
      }
      if (editingId === user.id) setEditingId(null);
      setSuccess('User deleted.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete user');
    }
  }

  function cell(value: string) {
    return value || '—';
  }

  return (
    <div>
      <AdminPageHeader
        title="User management"
        actions={
          <Button
            helpKey="admin.users.add"
            variant="primary"
            type="button"
            onClick={() => {
              setCreating((open) => !open);
              setError(null);
              setSuccess(null);
            }}
          >
            {creating ? 'Close form' : 'Add user'}
          </Button>
        }
      />

      {error ? <AlertBanner>{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {creating ? (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Add user</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Username"
              hint="Short display name. 2–32 letters, numbers, _ or -."
              value={newUser.username}
              onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
              required
              autoComplete="off"
            />
            <TextInput
              label="Email"
              hint="Used at login. Must be unique."
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              required
              autoComplete="off"
            />
            <TextInput
              label="Full name"
              value={newUser.full_name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, full_name: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Phone"
              type="tel"
              value={newUser.tel}
              onChange={(e) => setNewUser((prev) => ({ ...prev, tel: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Position"
              value={newUser.position}
              onChange={(e) => setNewUser((prev) => ({ ...prev, position: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Division"
              value={newUser.division}
              onChange={(e) => setNewUser((prev) => ({ ...prev, division: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Password"
              hint="At least 10 characters."
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
              required
              minLength={10}
              autoComplete="new-password"
            />
            <SelectField
              label="Role"
              value={newUser.role}
              onChange={(e) =>
                setNewUser((prev) => ({ ...prev, role: e.target.value === 'admin' ? 'admin' : 'staff' }))
              }
            >
              <option value="staff">staff — catalog and projects</option>
              <option value="admin">admin — including user management</option>
            </SelectField>
            <div className="flex items-end gap-3">
              <Button helpKey="admin.users.save" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Create'}
              </Button>
              <Button
                helpKey="admin.users.cancel"
                variant="secondary"
                type="button"
                onClick={() => setCreating(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {editingId != null ? (
        <Card className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Edit user</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput label="ID" value={String(editingId ?? '')} readOnly disabled hint="Assigned by the system." />
            <TextInput
              label="Username"
              hint="Short display name. Changing this signs the user out."
              value={editUser.username}
              onChange={(e) => setEditUser((prev) => ({ ...prev, username: e.target.value }))}
              required
              autoComplete="off"
            />
            <TextInput
              label="Email"
              hint="Used at login. Must be unique."
              type="email"
              value={editUser.email}
              onChange={(e) => setEditUser((prev) => ({ ...prev, email: e.target.value }))}
              required
              autoComplete="off"
            />
            <TextInput
              label="Full name"
              value={editUser.full_name}
              onChange={(e) => setEditUser((prev) => ({ ...prev, full_name: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Phone"
              type="tel"
              value={editUser.tel}
              onChange={(e) => setEditUser((prev) => ({ ...prev, tel: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Position"
              value={editUser.position}
              onChange={(e) => setEditUser((prev) => ({ ...prev, position: e.target.value }))}
              autoComplete="off"
            />
            <TextInput
              label="Division"
              value={editUser.division}
              onChange={(e) => setEditUser((prev) => ({ ...prev, division: e.target.value }))}
              autoComplete="off"
            />
            <SelectField
              label="Role"
              value={editUser.role}
              onChange={(e) =>
                setEditUser((prev) => ({ ...prev, role: e.target.value === 'admin' ? 'admin' : 'staff' }))
              }
            >
              <option value="staff">staff — catalog and projects</option>
              <option value="admin">admin — including user management</option>
            </SelectField>
            <SelectField
              label="Active"
              value={editUser.active ? 'yes' : 'no'}
              onChange={(e) => setEditUser((prev) => ({ ...prev, active: e.target.value === 'yes' }))}
            >
              <option value="yes">Active</option>
              <option value="no">Disabled</option>
            </SelectField>
            <TextInput
              label="New password (optional)"
              hint="Leave blank to keep the current password. New passwords need at least 10 characters."
              type="password"
              value={editUser.password}
              onChange={(e) => setEditUser((prev) => ({ ...prev, password: e.target.value }))}
              minLength={10}
              autoComplete="new-password"
            />
            <div className="flex items-end gap-3">
              <Button helpKey="admin.users.save" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                helpKey="admin.users.cancel"
                variant="secondary"
                type="button"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <AdminTable
        columns={['Username', 'Full name', 'Email', 'Phone', 'Position', 'Division', 'Role', 'Active', 'Actions']}
        loading={loading}
        empty={!loading && users.length === 0}
      >
        {users.map((user) => (
          <tr key={user.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cell(user.full_name)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.email}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cell(user.tel)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cell(user.position)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{cell(user.division)}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.role}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.active ? 'Yes' : 'No'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm">
              <div className="flex gap-3">
                <Button helpKey="admin.users.save" variant="ghost" type="button" onClick={() => startEdit(user)}>
                  Edit
                </Button>
                <Button helpKey="admin.users.delete" variant="danger" type="button" onClick={() => handleDelete(user)}>
                  Delete
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </div>
  );
}
