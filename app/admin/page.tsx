import type { Metadata } from "next";
import { Building2, Users, TrendingUp, AlertTriangle, Contact, Briefcase } from "lucide-react";
import { getSystemMetrics } from "@/app/actions/admin-platform";

export const metadata: Metadata = { title: "Admin · Overview" };

function KpiCard({ label, value, icon: Icon, accent }: {
  label: string; value: string | number; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: accent ? "#FEE2E2" : "#E2F0EE" }}>
          <Icon className="h-4 w-4" style={{ color: accent ? "#EF4444" : "#1F8A8A" }} />
        </span>
        <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "#3D5775" }}>{label}</p>
      </div>
      <p className="text-3xl font-bold tabular-nums" style={{ color: accent ? "#EF4444" : "#0F2540" }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

export default async function AdminOverviewPage() {
  const m = await getSystemMetrics();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Platform Overview</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>Real-time metrics across all organizations.</p>
      </div>

      {/* KPI grid */}
      <div className="mb-8 grid grid-cols-3 gap-4 lg:grid-cols-4">
        <KpiCard label="Total organizations" value={m.totalOrgs} icon={Building2} />
        <KpiCard label="Active users" value={m.totalActiveUsers} icon={Users} />
        <KpiCard label="New orgs this week" value={m.newOrgsThisWeek} icon={TrendingUp} />
        <KpiCard label="New users this week" value={m.newUsersThisWeek} icon={TrendingUp} />
        <KpiCard label="Suspended orgs" value={m.suspendedOrgs} icon={AlertTriangle} accent={m.suspendedOrgs > 0} />
        <KpiCard label="Total contacts" value={m.totalContacts} icon={Contact} />
        <KpiCard label="Total deals" value={m.totalDeals} icon={Briefcase} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent orgs */}
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
            Recently created organizations
          </h2>
          {m.recentOrgs.length === 0 ? (
            <p className="text-xs" style={{ color: "#3D5775" }}>No organizations yet.</p>
          ) : (
            <div className="space-y-2">
              {m.recentOrgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "#F5EFE0" }}>
                  <div>
                    <a href={`/admin/organizations/${org.id}`}
                      className="text-sm font-medium hover:underline" style={{ color: "#0F2540" }}>
                      {org.name}
                    </a>
                    <p className="text-xs" style={{ color: "#3D5775" }}>
                      {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs" style={{ color: "#3D5775" }}>
                    {new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent admin actions */}
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
            Recent admin actions
          </h2>
          {m.recentAudit.length === 0 ? (
            <p className="text-xs" style={{ color: "#3D5775" }}>No audit log entries yet.</p>
          ) : (
            <div className="space-y-2">
              {m.recentAudit.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: "#F5EFE0" }}>
                  <div>
                    <p className="text-xs font-medium" style={{ color: "#0F2540" }}>
                      {a.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs" style={{ color: "#3D5775" }}>{a.email}</p>
                  </div>
                  <span className="text-xs" style={{ color: "#3D5775" }}>
                    {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
