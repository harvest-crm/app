import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/platform-auth";
import { listAllOrganizations } from "@/app/actions/admin-platform";

export const metadata: Metadata = { title: "Admin · Organizations" };

export default async function AdminOrgsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  await requirePlatformAdmin();
  const { q = "", status = "all", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page));
  const limit = 50;

  const { orgs, total } = await listAllOrganizations({
    search: q || undefined,
    status: (status as "all" | "active" | "suspended") || "all",
    limit,
    offset: (pageNum - 1) * limit,
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Organizations</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
          {total.toLocaleString()} total organizations
        </p>
      </div>

      {/* Search + filter */}
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name or member email…"
          className="rounded-lg border border-[#E8DFC8] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A] max-w-sm flex-1"
          style={{ color: "#0F2540" }} />
        <div className="flex gap-1">
          {(["all", "active", "suspended"] as const).map((s) => (
            <button key={s} type="submit" name="status" value={s}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors"
              style={status === s
                ? { background: "#1F8A8A", color: "#fff", borderColor: "#1F8A8A" }
                : { borderColor: "#E8DFC8", color: "#3D5775" }}>
              {s}
            </button>
          ))}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
        {orgs.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "#3D5775" }}>No organizations found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Organization</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Members</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Contacts</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Deals</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Created</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {orgs.map((org) => (
                <tr key={org.id} className="transition-colors hover:bg-[#F5EFE0]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/organizations/${org.id}`}
                      className="font-medium hover:underline" style={{ color: "#0F2540" }}>
                      {org.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "#3D5775" }}>
                    {org.memberCount}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "#3D5775" }}>
                    {org.contactCount}
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "#3D5775" }}>
                    {org.dealCount}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                    {new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {org.isSuspended ? (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: "#FEE2E2", color: "#991B1B" }}>
                        Suspended
                      </span>
                    ) : (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ background: "#D1FAE5", color: "#065F46" }}>
                        Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          {pageNum > 1 && (
            <Link href={`?q=${q}&status=${status}&page=${pageNum - 1}`}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[#E2F0EE]"
              style={{ borderColor: "#E8DFC8", color: "#3D5775" }}>← Prev</Link>
          )}
          <span className="text-sm" style={{ color: "#3D5775" }}>Page {pageNum} of {totalPages}</span>
          {pageNum < totalPages && (
            <Link href={`?q=${q}&status=${status}&page=${pageNum + 1}`}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[#E2F0EE]"
              style={{ borderColor: "#E8DFC8", color: "#3D5775" }}>Next →</Link>
          )}
        </div>
      )}
    </div>
  );
}
