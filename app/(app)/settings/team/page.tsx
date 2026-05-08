import type { Metadata } from "next";
import { getTeamData } from "@/app/actions/admin";
import { TeamPageClient } from "@/components/admin/team-page-client";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const data = await getTeamData();

  if ("error" in data) {
    return (
      <div className="p-8">
        <p className="text-sm" style={{ color: "#3D5775" }}>{data.error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#0F2540" }}>Team</h1>
        <p className="mt-1 text-sm" style={{ color: "#3D5775" }}>
          Manage who has access to your Covenant workspace and what they can do.
        </p>
      </div>

      <div className="max-w-3xl">
        <TeamPageClient
          initialMembers={data.members}
          initialInvites={data.invites}
          currentUserRole={data.currentUserRole}
          currentUserId={data.currentUserId}
        />
      </div>
    </div>
  );
}
