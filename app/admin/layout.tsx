import { requirePlatformAdmin } from "@/lib/admin/platform-auth";
import { ensureBootstrapPlatformAdmin } from "@/lib/admin/seed-platform-admin";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Bootstrap on first load
  await ensureBootstrapPlatformAdmin().catch(console.error);

  // Hard gate — returns 404 for non-admins
  const admin = await requirePlatformAdmin();

  return (
    <AdminShell adminEmail={admin.email}>
      {children}
    </AdminShell>
  );
}
