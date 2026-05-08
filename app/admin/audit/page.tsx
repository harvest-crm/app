import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/admin/platform-auth";
import { listAuditLog } from "@/app/actions/admin-platform";

export const metadata: Metadata = { title: "Admin · Audit log" };

const ACTION_LABELS: Record<string, string> = {
  impersonate:       "Impersonation started",
  end_impersonation: "Impersonation ended",
  suspend_org:       "Org suspended",
  unsuspend_org:     "Org unsuspended",
  view_org:          "Viewed org",
  view_admin:        "Accessed admin",
  search_user:       "Searched users",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  await requirePlatformAdmin();
  const { page = "1", action } = await searchParams;
  const pageNum = Math.max(1, Number(page));
  const limit = 50;
  const offset = (pageNum - 1) * limit;

  const { rows, total } = await listAuditLog({
    action: action || undefined,
    limit,
    offset,
  });

  const totalPages = Math.ceil(total / limit);

  const ACTIONS = [
    "impersonate", "end_impersonation", "suspend_org", "unsuspend_org",
    "view_org", "view_admin", "search_user",
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Audit log</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>All admin actions, newest first.</p>
      </div>

      {/* Filter */}
      <form className="mb-4 flex gap-2">
        <select name="action" defaultValue={action ?? ""}
          className="rounded-lg border border-[#E8DFC8] bg-white px-3 py-1.5 text-sm focus:outline-none"
          style={{ color: "#0F2540" }}>
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: "#1F8A8A" }}>
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
        {rows.length === 0 ? (
          <p className="p-6 text-sm" style={{ color: "#3D5775" }}>No audit log entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Admin</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Details</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {rows.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-[#F5EFE0]">
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "#3D5775" }}>
                    {new Date(r.createdAt).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#0F2540" }}>{r.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: "#E2F0EE", color: "#1F8A8A" }}>
                      {ACTION_LABELS[r.action] ?? r.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                    {r.targetId && <span>Target: {r.targetId.slice(0, 8)}…</span>}
                    {r.metadata && typeof r.metadata === "object" && "reason" in r.metadata && (
                      <span className="ml-2">Reason: {String((r.metadata as Record<string,string>).reason)}</span>
                    )}
                    {r.metadata && typeof r.metadata === "object" && "query" in r.metadata && (
                      <span>Query: &ldquo;{String((r.metadata as Record<string,string>).query)}&rdquo;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-2">
          {pageNum > 1 && (
            <a href={`?page=${pageNum - 1}${action ? `&action=${action}` : ""}`}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[#E2F0EE]"
              style={{ borderColor: "#E8DFC8", color: "#3D5775" }}>
              ← Prev
            </a>
          )}
          <span className="text-sm" style={{ color: "#3D5775" }}>
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages && (
            <a href={`?page=${pageNum + 1}${action ? `&action=${action}` : ""}`}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-[#E2F0EE]"
              style={{ borderColor: "#E8DFC8", color: "#3D5775" }}>
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
