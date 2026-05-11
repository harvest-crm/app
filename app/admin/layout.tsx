import { requirePlatformAdmin } from "@/lib/admin/platform-auth";
import { ensureBootstrapPlatformAdmin } from "@/lib/admin/seed-platform-admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { db } from "@/lib/db";
import { AccessStatus } from "@/app/generated/prisma/client";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await ensureBootstrapPlatformAdmin().catch(console.error);
  const admin = await requirePlatformAdmin();
  const pendingCount = await db.organization.count({ where: { accessStatus: AccessStatus.PENDING } });

  return (
    <AdminShell adminEmail={admin.email} pendingCount={pendingCount}>
      {children}
    </AdminShell>
  );
}
