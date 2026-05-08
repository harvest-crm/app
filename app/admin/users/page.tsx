import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/admin/platform-auth";
import { searchUsers } from "@/app/actions/admin-platform";

export const metadata: Metadata = { title: "Admin · Users" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requirePlatformAdmin();
  const { q = "" } = await searchParams;
  const result = q.trim() ? await searchUsers(q.trim()) : { users: [] };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Users</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>Search across all users in every organization.</p>
      </div>

      {/* Search */}
      <form className="mb-6">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by email or name…"
          autoFocus
          className="w-full max-w-md rounded-lg border border-[#E8DFC8] bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]"
          style={{ color: "#0F2540" }}
        />
      </form>

      {!q.trim() && (
        <p className="text-sm" style={{ color: "#3D5775" }}>Enter a search term to find users.</p>
      )}

      {q.trim() && result.users.length === 0 && (
        <p className="text-sm" style={{ color: "#3D5775" }}>No users found matching &ldquo;{q}&rdquo;.</p>
      )}

      {result.users.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Organizations</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {result.users.map((u) => (
                <tr key={u.clerkUserId} className="transition-colors hover:bg-[#F5EFE0]">
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: "#0F2540" }}>
                      {u.firstName || u.lastName ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : u.email}
                    </p>
                    <p className="text-xs" style={{ color: "#3D5775" }}>{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {u.memberships.map((m) => (
                        <div key={m.orgId} className="flex items-center gap-1.5">
                          <a href={`/admin/organizations/${m.orgId}`}
                            className="text-xs hover:underline" style={{ color: "#1F8A8A" }}>
                            {m.orgName}
                          </a>
                          <span className="rounded px-1.5 py-0.5 text-xs"
                            style={{ background: "#F5EFE0", color: "#3D5775" }}>
                            {m.role}
                          </span>
                          {!m.isActive && (
                            <span className="text-xs text-red-500">inactive</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                    {u.memberships[0]?.lastActiveAt
                      ? new Date(u.memberships[0].lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
