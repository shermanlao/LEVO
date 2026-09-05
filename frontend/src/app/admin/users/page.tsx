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
  role: AdminRole;
  active: boolean;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AdminRole>('staff');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<AdminRole>('staff');
  const [editActive, setEditActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');
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
      setUsers(
        list.map((row: StaffUser) => ({
          id: Number(row.id),
          username: String(row.username),
          role: row.role === 'admin' ? 'admin' : 'staff',
          active: Boolean(row.active),
        }))
      );
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
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error || 'Could not create user');
      }
      setNewUsername('');
      setNewPassword('');
      setNewRole('staff');
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
    setEditUsername(user.username);
    setEditRole(user.role);
    setEditActive(user.active);
    setEditPassword('');
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
      const body: { role: AdminRole; active: boolean; password?: string } = {
        role: editRole,
        active: editActive,
      };
      if (editPassword.trim()) body.password = editPassword;
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
      setEditPassword('');
      setSuccess('User saved.');
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: StaffUser) {
    if (!window.confirm(`Delete login “${user.username}”?`)) return;
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
              hint="Used at login. The numeric ID is assigned automatically."
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              autoComplete="off"
            />
            <TextInput
              label="Password"
              hint="At least 10 characters."
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
            <SelectField
              label="Role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value === 'admin' ? 'admin' : 'staff')}
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
            <TextInput label="Username" value={editUsername} readOnly disabled />
            <SelectField
              label="Role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value === 'admin' ? 'admin' : 'staff')}
            >
              <option value="staff">staff — catalog and projects</option>
              <option value="admin">admin — including user management</option>
            </SelectField>
            <SelectField
              label="Active"
              value={editActive ? 'yes' : 'no'}
              onChange={(e) => setEditActive(e.target.value === 'yes')}
            >
              <option value="yes">Active</option>
              <option value="no">Disabled</option>
            </SelectField>
            <TextInput
              label="New password (optional)"
              hint="Leave blank to keep the current password. New passwords need at least 10 characters."
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
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

      <AdminTable columns={['ID', 'Username', 'Role', 'Active', 'Actions']} loading={loading} empty={!loading && users.length === 0}>
        {users.map((user) => (
          <tr key={user.id}>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.id}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.username}</td>
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
