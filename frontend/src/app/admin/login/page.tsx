'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeAdminNextPath } from '@/lib/admin-session';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import AlertBanner from '@/components/ui/AlertBanner';
import { TextInput } from '@/components/ui/FormField';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Invalid email or password');
      }
      const next = safeAdminNextPath(searchParams.get('next'));
      router.push(next);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message === 'Failed to fetch' || message === 'Load failed' || message.includes('NetworkError')) {
        setError('Cannot reach the login API. Start the app with npm run dev from the repo root, then try again.');
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <h1 className="text-2xl font-bold mb-6">Admin login</h1>
        {error && <AlertBanner>{error}</AlertBanner>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <TextInput
            label="Email"
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextInput
            label="Password"
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button helpKey="admin.login" type="submit" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-600">Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
