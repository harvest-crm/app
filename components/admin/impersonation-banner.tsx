"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Eye } from "lucide-react";
import { endImpersonation } from "@/app/actions/admin-platform";

type Props = {
  orgName: string;
  orgId: string;
};

export function ImpersonationBanner({ orgName, orgId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleExit() {
    startTransition(async () => {
      await endImpersonation();
      router.push(`/admin/organizations/${orgId}`);
    });
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm font-medium text-white"
      style={{ background: "#EF4444" }}>
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4 shrink-0" />
        <span>
          VIEWING AS <strong>{orgName}</strong> — Read-only mode. All changes are blocked.
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        className="flex items-center gap-1.5 rounded-md border border-white/30 px-3 py-1 text-xs font-medium transition-colors hover:bg-white/10"
      >
        <X className="h-3.5 w-3.5" />
        Exit impersonation
      </button>
    </div>
  );
}
