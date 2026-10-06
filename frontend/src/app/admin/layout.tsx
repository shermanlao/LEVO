import type { Metadata } from 'next';
import AdminPageGate from '@/components/admin/AdminPageGate';

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPageGate>{children}</AdminPageGate>;
}
