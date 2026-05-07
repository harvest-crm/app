"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { User, Unlink } from "lucide-react";
import { toast } from "sonner";
import { linkContactToDeal } from "@/app/actions/deals";
import type { ContactOption } from "@/components/deals/types";

type Props = {
  dealId: string;
  contact: { id: string; firstName: string; lastName: string | null } | null;
  contacts: ContactOption[];
};

export function DealContactCard({ dealId, contact, contacts }: Props) {
  const router = useRouter();
  const [linking, setLinking] = useState(false);
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  const workspaceContacts = contacts.filter((c) => c.isInWorkspace);
  const otherContacts = contacts.filter((c) => !c.isInWorkspace);

  const filtered = (arr: ContactOption[]) =>
    arr.filter((c) => {
      const name = `${c.firstName} ${c.lastName ?? ""}`.toLowerCase();
      return name.includes(search.toLowerCase());
    });

  function link(contactId: string | null) {
    setLinking(false);
    startTransition(async () => {
      const r = await linkContactToDeal(dealId, contactId);
      if ("error" in r) toast.error(r.error);
      else { toast.success(contactId ? "Contact linked" : "Contact unlinked"); router.refresh(); }
    });
  }

  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: "#E8DFC8" }}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
          Primary Contact
        </p>
        <button
          type="button"
          onClick={() => setLinking((v) => !v)}
          className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors hover:bg-[#E2F0EE]"
          style={{ color: "#3D5775" }}
        >
          {contact ? "Change" : "Link contact"}
        </button>
      </div>

      {contact ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
              style={{ background: "#E2F0EE", color: "#1F8A8A" }}>
              {contact.firstName[0]}
            </span>
            <div>
              <a
                href={`/contacts/${contact.id}`}
                className="text-sm font-medium hover:underline"
                style={{ color: "#0F2540" }}
              >
                {contact.firstName} {contact.lastName ?? ""}
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={() => link(null)}
            title="Unlink contact"
            className="rounded-md p-1 text-[#3D5775] hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Unlink className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5"
          style={{ borderColor: "#E8DFC8" }}>
          <User className="h-4 w-4" style={{ color: "#3D5775" }} />
          <span className="text-sm" style={{ color: "#3D5775" }}>No contact linked</span>
        </div>
      )}

      {linking && (
        <div className="mt-3 rounded-lg border bg-white shadow-lg" style={{ borderColor: "#E8DFC8" }}>
          <div className="p-2 border-b" style={{ borderColor: "#E8DFC8" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts…"
              autoFocus
              className="w-full rounded-md border border-[#E8DFC8] px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {workspaceContacts.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold" style={{ color: "#1F8A8A" }}>
                  In this workspace
                </p>
                {filtered(workspaceContacts).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => link(c.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#E2F0EE]"
                    style={{ color: "#0F2540" }}
                  >
                    {c.firstName} {c.lastName ?? ""}
                  </button>
                ))}
              </>
            )}

            {otherContacts.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-xs font-semibold" style={{ color: "#3D5775" }}>
                  Other contacts
                </p>
                {filtered(otherContacts).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => link(c.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-[#E2F0EE]"
                    style={{ color: "#0F2540" }}
                  >
                    {c.firstName} {c.lastName ?? ""}
                  </button>
                ))}
              </>
            )}

            {filtered(workspaceContacts).length === 0 && filtered(otherContacts).length === 0 && (
              <p className="px-3 py-3 text-sm" style={{ color: "#3D5775" }}>No results</p>
            )}
          </div>

          <div className="border-t p-2" style={{ borderColor: "#E8DFC8" }}>
            <button
              type="button"
              onClick={() => setLinking(false)}
              className="w-full rounded-md py-1.5 text-xs text-center transition-colors hover:bg-[#E2F0EE]"
              style={{ color: "#3D5775" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
