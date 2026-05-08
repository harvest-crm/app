"use client";

import { useState, useTransition } from "react";
import { X, Mail, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { inviteMember } from "@/app/actions/admin";

type Props = {
  onClose: () => void;
  onInvited: () => void;
};

export function InviteMemberModal({ onClose, onInvited }: Props) {
  const [email, setEmail]   = useState("");
  const [role,  setRole]    = useState<"admin" | "member">("member");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    startTransition(async () => {
      const r = await inviteMember(email.trim(), role);
      if ("error" in r) { toast.error(r.error); return; }
      toast.success(`Invite sent to ${email.trim()}`);
      onInvited();
      onClose();
    });
  }

  const ROLE_INFO = {
    member: {
      label: "Member",
      desc:  "Can create and manage contacts, deals, tasks, and activities. Cannot change workspace settings or manage team members.",
    },
    admin: {
      label: "Admin",
      desc:  "Full access to workspace settings, custom fields, automations, templates, and team management. Cannot delete the organization.",
    },
  } as const;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "#E8DFC8" }}>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" style={{ color: "#1F8A8A" }} />
            <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>Invite team member</h2>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-md p-1 hover:bg-[#E2F0EE]" style={{ color: "#3D5775" }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5">
          {/* Email */}
          <div>
            <label className="mb-1 block text-xs font-medium" style={{ color: "#3D5775" }}>
              Email address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "#3D5775" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                autoFocus
                required
                className="w-full rounded-md border border-[#E8DFC8] py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]"
                style={{ color: "#0F2540" }}
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <p className="mb-2 text-xs font-medium" style={{ color: "#3D5775" }}>Role</p>
            <div className="space-y-2">
              {(["member", "admin"] as const).map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                  style={{
                    borderColor: role === r ? "#1F8A8A" : "#E8DFC8",
                    background:  role === r ? "#E2F0EE" : "#fff",
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r}
                    checked={role === r}
                    onChange={() => setRole(r)}
                    className="mt-0.5 accent-[#1F8A8A]"
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#0F2540" }}>
                      {ROLE_INFO[r].label}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "#3D5775" }}>
                      {ROLE_INFO[r].desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <p className="text-xs" style={{ color: "#3D5775" }}>
            An email invite will be sent. The invite expires in 7 days.
          </p>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-[#E2F0EE]"
              style={{ color: "#3D5775" }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || pending}
              className="rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              style={{ background: "#1F8A8A" }}
            >
              {pending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
