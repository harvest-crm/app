"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UserPlus, Crown, Shield, User, ChevronDown, Trash2, Clock, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { updateMemberRole, removeMember, revokeInvite } from "@/app/actions/admin";
import { InviteMemberModal } from "./invite-member-modal";
import { ROLE_RANK } from "@/lib/admin/permissions";
import type { SerializedMember, SerializedInvite } from "@/app/actions/admin";
import type { Role } from "@/lib/admin/permissions";

// ── Role badge ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  owner:  { label: "Owner",  icon: Crown,  bg: "#0F2540", color: "#fff"     },
  admin:  { label: "Admin",  icon: Shield, bg: "#1F8A8A", color: "#fff"     },
  member: { label: "Member", icon: User,   bg: "#F5EFE0", color: "#3D5775"  },
} as const;

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.member;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function Avatar({ member }: { member: SerializedMember }) {
  const initials = [member.firstName?.[0], member.lastName?.[0]].filter(Boolean).join("").toUpperCase()
    || member.email[0].toUpperCase();

  if (member.imageUrl) {
    return (
      <Image src={member.imageUrl} alt={initials} width={32} height={32}
        className="h-8 w-8 rounded-full object-cover" />
    );
  }

  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
      style={{ background: "#E2F0EE", color: "#1F8A8A" }}>
      {initials}
    </span>
  );
}

// ── Role change dropdown ───────────────────────────────────────────────────────

function RoleDropdown({
  member, currentUserRole, onChanged,
}: {
  member: SerializedMember;
  currentUserRole: string;
  onChanged: (role: Role) => void;
}) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const canChange =
    (ROLE_RANK[currentUserRole as Role] ?? 0) >= ROLE_RANK.admin &&
    !member.isSelf &&
    member.role !== "owner";

  if (!canChange) return <RoleBadge role={member.role} />;

  function select(role: Role) {
    setOpen(false);
    if (role === member.role) return;
    startTransition(async () => {
      const r = await updateMemberRole(member.id, role);
      if ("error" in r) toast.error(r.error);
      else { onChanged(role); toast.success("Role updated"); }
    });
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors hover:bg-[#E2F0EE]"
        style={{ borderColor: "#E8DFC8" }}>
        <RoleBadge role={member.role} />
        <ChevronDown className="ml-0.5 h-3 w-3" style={{ color: "#3D5775" }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-32 overflow-hidden rounded-lg border bg-white shadow-xl"
            style={{ borderColor: "#E8DFC8" }}>
            {(["admin", "member"] as const).map((r) => (
              <button key={r} type="button" onClick={() => select(r)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#E2F0EE]",
                  member.role === r && "font-semibold",
                )}
                style={{ color: "#0F2540" }}>
                <RoleBadge role={r} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── MemberRow ──────────────────────────────────────────────────────────────────

function MemberRow({
  member, currentUserRole, onRoleChanged, onRemoved,
}: {
  member: SerializedMember;
  currentUserRole: string;
  onRoleChanged: (id: string, role: Role) => void;
  onRemoved: (id: string) => void;
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [, startTransition] = useTransition();

  const canRemove =
    (ROLE_RANK[currentUserRole as Role] ?? 0) >= ROLE_RANK.admin &&
    !member.isSelf &&
    member.role !== "owner";

  function handleRemove() {
    startTransition(async () => {
      const r = await removeMember(member.id);
      if ("error" in r) toast.error(r.error);
      else { onRemoved(member.id); toast.success("Member removed"); }
      setConfirmRemove(false);
    });
  }

  const joinedStr = new Date(member.joinedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm"
      style={{ borderColor: "#E8DFC8" }}>
      <Avatar member={member} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium" style={{ color: "#0F2540" }}>
            {member.firstName && member.lastName
              ? `${member.firstName} ${member.lastName}`
              : member.email}
            {member.isSelf && (
              <span className="ml-1.5 text-xs" style={{ color: "#3D5775" }}>(you)</span>
            )}
          </p>
        </div>
        <p className="text-xs" style={{ color: "#3D5775" }}>
          {member.email}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>
          Joined {joinedStr}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <RoleDropdown
          member={member}
          currentUserRole={currentUserRole}
          onChanged={(role) => onRoleChanged(member.id, role)}
        />

        {canRemove && !confirmRemove && (
          <button type="button" onClick={() => setConfirmRemove(true)}
            title="Remove member"
            className="rounded-md p-1.5 transition-colors hover:bg-red-50"
            style={{ color: "#3D5775" }}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        {confirmRemove && (
          <div className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5">
            <span className="text-xs" style={{ color: "#3D5775" }}>Remove?</span>
            <button onClick={handleRemove} className="text-xs font-semibold text-red-600 hover:text-red-700">
              Yes
            </button>
            <button onClick={() => setConfirmRemove(false)} className="text-xs" style={{ color: "#3D5775" }}>
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── InviteRow ──────────────────────────────────────────────────────────────────

function InviteRow({
  invite, currentUserRole, onRevoked,
}: {
  invite: SerializedInvite;
  currentUserRole: string;
  onRevoked: (id: string) => void;
}) {
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [, startTransition] = useTransition();

  const canRevoke = (ROLE_RANK[currentUserRole as Role] ?? 0) >= ROLE_RANK.admin;

  function handleRevoke() {
    startTransition(async () => {
      const r = await revokeInvite(invite.id);
      if ("error" in r) toast.error(r.error);
      else { onRevoked(invite.id); toast.success("Invite revoked"); }
      setConfirmRevoke(false);
    });
  }

  const sentStr = new Date(invite.createdAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-white p-4"
      style={{ borderColor: "#E8DFC8", opacity: 0.85 }}>
      <span className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ background: "#F5EFE0" }}>
        <Clock className="h-4 w-4" style={{ color: "#3D5775" }} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: "#0F2540" }}>{invite.email}</p>
        <p className="text-xs" style={{ color: "#3D5775" }}>
          Invited {sentStr} · pending
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <RoleBadge role={invite.role} />

        {canRevoke && !confirmRevoke && (
          <button type="button" onClick={() => setConfirmRevoke(true)}
            title="Revoke invite"
            className="rounded-md p-1.5 transition-colors hover:bg-red-50"
            style={{ color: "#3D5775" }}>
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {confirmRevoke && (
          <div className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5">
            <span className="text-xs" style={{ color: "#3D5775" }}>Revoke?</span>
            <button onClick={handleRevoke} className="text-xs font-semibold text-red-600">Yes</button>
            <button onClick={() => setConfirmRevoke(false)} className="text-xs" style={{ color: "#3D5775" }}>No</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TeamPageClient ─────────────────────────────────────────────────────────────

type Props = {
  initialMembers: SerializedMember[];
  initialInvites: SerializedInvite[];
  currentUserRole: string;
  currentUserId: string;
};

export function TeamPageClient({
  initialMembers, initialInvites, currentUserRole,
}: Props) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isAdmin = (ROLE_RANK[currentUserRole as Role] ?? 0) >= ROLE_RANK.admin;

  function handleRoleChanged(id: string, role: Role) {
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role } : m));
  }

  function handleRemoved(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  function handleRevoked(id: string) {
    setInvites((prev) => prev.filter((i) => i.id !== id));
  }

  // Sort: owner first, then admin, then member
  const sorted = [...members].sort((a, b) =>
    (ROLE_RANK[b.role as Role] ?? 0) - (ROLE_RANK[a.role as Role] ?? 0),
  );

  return (
    <div className="space-y-6">
      {/* Members section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
            Members ({members.length})
          </h2>
          {isAdmin && (
            <button type="button" onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
              style={{ borderColor: "#1F8A8A", color: "#1F8A8A" }}>
              <UserPlus className="h-3.5 w-3.5" />
              Invite member
            </button>
          )}
        </div>

        <div className="space-y-2">
          {sorted.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              currentUserRole={currentUserRole}
              onRoleChanged={handleRoleChanged}
              onRemoved={handleRemoved}
            />
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide"
            style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
            Pending invites ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <InviteRow
                key={inv.id}
                invite={inv}
                currentUserRole={currentUserRole}
                onRevoked={handleRevoked}
              />
            ))}
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="rounded-xl border p-4" style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "#3D5775" }}>
          Role permissions
        </p>
        <div className="space-y-2">
          {[
            { role: "owner" as const, can: ["Everything", "Transfer/delete organization", "Manage billing"] },
            { role: "admin" as const, can: ["Invite & remove members", "Manage workspace settings, templates, automations", "Bulk delete operations"] },
            { role: "member" as const, can: ["Create and manage contacts, deals, tasks", "Log activities, compose emails", "View analytics"] },
          ].map(({ role, can }) => (
            <div key={role} className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0"><RoleBadge role={role} /></div>
              <p className="text-xs" style={{ color: "#3D5775" }}>{can.join(" · ")}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvited={() => router.refresh()}
        />
      )}
    </div>
  );
}
