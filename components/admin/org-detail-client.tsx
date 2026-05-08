"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  suspendOrganization, unsuspendOrganization, startImpersonation,
} from "@/app/actions/admin-platform";

type OrgDetail = Awaited<ReturnType<typeof import("@/app/actions/admin-platform").getOrganizationDetail>>;

type Props = { data: NonNullable<OrgDetail>; initialTab: string };

const TABS = ["members", "workspaces", "stats", "activity", "audit"] as const;
type Tab = typeof TABS[number];

// ── Suspend modal ──────────────────────────────────────────────────────────────

function SuspendModal({ orgId, onClose, onSuspended }: {
  orgId: string; onClose: () => void; onSuspended: () => void;
}) {
  const [reason, setReason] = useState("");
  const [, startTr] = useTransition();

  function handleSuspend() {
    if (!reason.trim()) return;
    startTr(async () => {
      const r = await suspendOrganization(orgId, reason.trim());
      if ("error" in r) { toast.error(r.error); return; }
      toast.success("Organization suspended");
      onSuspended();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>Suspend organization</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-[#E2F0EE]">
            <X className="h-4 w-4" style={{ color: "#3D5775" }} />
          </button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <p className="text-sm" style={{ color: "#3D5775" }}>
            Suspended organizations cannot access the app. Their data is preserved.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this org being suspended?"
              className="w-full rounded-md border border-[#E8DFC8] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]"
              style={{ color: "#0F2540" }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3" style={{ borderColor: "#E8DFC8" }}>
          <button type="button" onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSuspend} disabled={!reason.trim()}
            className="rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            style={{ background: "#EF4444" }}>
            Suspend
          </button>
        </div>
      </div>
    </div>
  );
}

// ── OrgDetailClient ────────────────────────────────────────────────────────────

export function OrgDetailClient({ data: initialData, initialTab }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState(initialData);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [confirmUnsuspend, setConfirmUnsuspend] = useState(false);
  const [, startTransition] = useTransition();

  const activeTab = (searchParams.get("tab") ?? initialTab) as Tab;

  function setTab(tab: Tab) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("tab", tab);
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  function handleUnsuspend() {
    startTransition(async () => {
      const r = await unsuspendOrganization(data.org.id);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success("Organization unsuspended");
      setData((d) => ({ ...d, org: { ...d.org, isSuspended: false, suspendedAt: null, suspensionReason: null, suspendedBy: null } }));
      setConfirmUnsuspend(false);
    });
  }

  function handleImpersonate() {
    startTransition(async () => {
      const r = await startImpersonation(data.org.id);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(`Impersonating ${data.org.name}…`);
      router.push("/today");
    });
  }

  const { org, members, workspaces, stats, recentActivities } = data;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>{org.name}</h1>
            {org.isSuspended && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                style={{ background: "#FEE2E2", color: "#991B1B" }}>Suspended</span>
            )}
          </div>
          <p className="mt-0.5 text-sm" style={{ color: "#3D5775" }}>
            Created {new Date(org.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {" · "}{members.filter((m) => m.isActive).length} active member{members.filter(m=>m.isActive).length !== 1 ? "s" : ""}
          </p>
          {org.isSuspended && org.suspensionReason && (
            <p className="mt-1 text-xs text-red-600">Reason: {org.suspensionReason}</p>
          )}
        </div>

        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={handleImpersonate}
            className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
            style={{ borderColor: "#E8DFC8", color: "#0F2540" }}>
            Impersonate (read-only)
          </button>

          {org.isSuspended ? (
            confirmUnsuspend ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-200 px-3 py-1.5">
                <span className="text-xs" style={{ color: "#3D5775" }}>Unsuspend?</span>
                <button onClick={handleUnsuspend} className="text-xs font-semibold text-emerald-600">Yes</button>
                <button onClick={() => setConfirmUnsuspend(false)} className="text-xs" style={{ color: "#3D5775" }}>No</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmUnsuspend(true)}
                className="rounded-md border border-emerald-200 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
                Unsuspend
              </button>
            )
          ) : (
            <button type="button" onClick={() => setShowSuspendModal(true)}
              className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
              Suspend
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-lg border p-1" style={{ borderColor: "#E8DFC8", background: "#fff" }}>
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn("flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors")}
            style={activeTab === t
              ? { background: "#1F8A8A", color: "#fff" }
              : { color: "#3D5775" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "members" && (
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Member</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {members.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-[#F5EFE0]">
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: "#0F2540" }}>
                      {m.firstName || m.lastName ? `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() : m.email}
                    </p>
                    <p className="text-xs" style={{ color: "#3D5775" }}>{m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: "#E2F0EE", color: "#1F8A8A" }}>{m.role}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                    {new Date(m.joinedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${m.isActive ? "text-emerald-600" : "text-red-500"}`}>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "workspaces" && (
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Workspace</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Stages</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>Deals</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {workspaces.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-[#F5EFE0]">
                  <td className="px-4 py-3 font-medium" style={{ color: "#0F2540" }}>{w.name}</td>
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "#3D5775" }}>{w.stageCount}</td>
                  <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "#3D5775" }}>{w.dealCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Contacts",         value: stats.contacts         },
            { label: "Total deals",      value: stats.deals            },
            { label: "Open deals",       value: stats.openDeals        },
            { label: "Open tasks",       value: stats.openTasks        },
            { label: "Completed tasks",  value: stats.completedTasks   },
            { label: "Activities",       value: stats.activities       },
            { label: "Documents",        value: stats.documents        },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
              <p className="text-3xl font-bold tabular-nums" style={{ color: "#0F2540" }}>
                {value.toLocaleString()}
              </p>
              <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "activity" && (
        <div className="space-y-2">
          {recentActivities.length === 0 ? (
            <p className="text-sm" style={{ color: "#3D5775" }}>No activities yet.</p>
          ) : recentActivities.map((a) => (
            <div key={a.id} className="rounded-xl border bg-white p-4" style={{ borderColor: "#E8DFC8" }}>
              <div className="flex items-center justify-between">
                <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: "#E2F0EE", color: "#1F8A8A" }}>
                  {a.type}
                </span>
                <span className="text-xs" style={{ color: "#3D5775" }}>
                  {new Date(a.occurredAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
              <p className="mt-1.5 text-sm line-clamp-2" style={{ color: "#0F2540" }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "audit" && (
        <p className="text-sm" style={{ color: "#3D5775" }}>
          See the <a href="/admin/audit" className="underline" style={{ color: "#1F8A8A" }}>global audit log</a> and filter by this org ID: <code className="rounded px-1" style={{ background: "#F5EFE0" }}>{org.id}</code>
        </p>
      )}

      {/* Suspend modal */}
      {showSuspendModal && (
        <SuspendModal
          orgId={org.id}
          onClose={() => setShowSuspendModal(false)}
          onSuspended={() => setData((d) => ({ ...d, org: { ...d.org, isSuspended: true } }))}
        />
      )}
    </div>
  );
}
