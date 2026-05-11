import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/admin/platform-auth";
import { db } from "@/lib/db";
import { AccessStatus } from "@/app/generated/prisma/client";
import { approveOrganizationAction, rejectOrganizationAction } from "@/app/actions/admin-beta";

export const metadata: Metadata = { title: "Admin · Pending Applications" };

const TIER_OPTIONS = [
  { value: "STANDARD",      label: "Standard"      },
  { value: "BROKERAGE",     label: "Brokerage"     },
  { value: "LIFETIME_FREE", label: "Lifetime free" },
  { value: "INTERNAL",      label: "Internal"      },
] as const;

export default async function PendingOrgsPage() {
  await requirePlatformAdmin();

  const orgs = await db.organization.findMany({
    where: { accessStatus: AccessStatus.PENDING },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      tier: true,
      createdAt: true,
      members: {
        where: { isActive: true },
        orderBy: { joinedAt: "asc" },
        take: 1,
        select: { firstName: true, lastName: true, email: true },
      },
    },
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-medium" style={{ color: "#0F2540" }}>
          Pending applications
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
          {orgs.length} organization{orgs.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {orgs.length === 0 ? (
        <div
          className="rounded-xl border bg-white px-6 py-12 text-center"
          style={{ borderColor: "#E8DFC8" }}
        >
          <p className="text-sm font-medium" style={{ color: "#0F2540" }}>
            No pending applications
          </p>
          <p className="mt-1 text-xs" style={{ color: "#3D5775" }}>
            New signups will appear here for review.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
                {["Organization", "Owner", "Email", "Signed up", "Tier", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide"
                    style={{ color: "#3D5775" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#E8DFC8" }}>
              {orgs.map((org) => {
                const owner = org.members[0];
                const ownerName = [owner?.firstName, owner?.lastName].filter(Boolean).join(" ") || "Unknown";
                return (
                  <tr key={org.id} className="transition-colors hover:bg-[#F5EFE0]">
                    <td className="px-4 py-3 font-medium" style={{ color: "#0F2540" }}>
                      {org.name}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                      {ownerName}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#3D5775" }}>
                      {owner?.email ?? ""}
                    </td>
                    <td className="px-4 py-3 text-xs tabular-nums" style={{ color: "#3D5775" }}>
                      {org.createdAt.toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    {/* Approve form — tier select + approve button */}
                    <td className="px-4 py-3">
                      <form action={approveOrganizationAction} className="flex items-center gap-2">
                        <input type="hidden" name="orgId" value={org.id} />
                        <select
                          name="tier"
                          defaultValue={org.tier}
                          className="rounded-md border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#1F8A8A]"
                          style={{ borderColor: "#E8DFC8", color: "#0F2540" }}
                        >
                          {TIER_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-md px-3 py-1 text-xs font-medium text-white transition-colors"
                          style={{ background: "#1F8A8A" }}
                        >
                          Approve
                        </button>
                      </form>
                    </td>
                    {/* Reject form */}
                    <td className="px-4 py-3">
                      <form action={rejectOrganizationAction}>
                        <input type="hidden" name="orgId" value={org.id} />
                        <button
                          type="submit"
                          className="rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-[#FCE8E8]"
                          style={{ borderColor: "#E8DFC8", color: "#EF4444" }}
                        >
                          Reject
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
