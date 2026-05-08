"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { ComposeEmailModal } from "./compose-email-modal";

type Props = {
  context: "contact" | "deal";
  contactId?: string;
  contactName?: string;
  contactEmail?: string | null;
  dealId?: string;
  dealTitle?: string;
  dealValue?: number | null;
  workspaceId?: string;
};

export function ComposeEmailButton(props: Props) {
  const [open, setOpen] = useState(false);

  const hasEmail = !!props.contactEmail;
  const tooltip  = hasEmail ? undefined : "Contact has no email address";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={tooltip}
        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[#E2F0EE]"
        style={{ borderColor: "#E8DFC8", color: "#0F2540" }}
      >
        <Mail className="h-3.5 w-3.5" style={{ color: "#1F8A8A" }} />
        Compose email
      </button>

      {open && (
        <ComposeEmailModal {...props} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
