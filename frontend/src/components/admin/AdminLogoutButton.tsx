'use client';

import { useRouter } from 'next/navigation';
import HelpButton from '@/components/admin/HelpButton';

export default function AdminLogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <HelpButton
      helpKey="admin.logout"
      onClick={logout}
      className="text-blue-600 hover:underline"
    >
      Log out
    </HelpButton>
  );
}
