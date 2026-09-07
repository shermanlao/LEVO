import AdminPageGate from '@/components/admin/AdminPageGate';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPageGate>{children}</AdminPageGate>;
}
