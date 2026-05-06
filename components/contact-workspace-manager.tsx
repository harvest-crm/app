"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { addContactToWorkspace, removeContactFromWorkspace } from "@/app/actions/contacts";
import type { Workspace, ContactWorkspace } from "@/app/generated/prisma/client";

type PopulatedCW = ContactWorkspace & { workspace: Workspace };

type Props = {
  contactId: string;
  contactWorkspaces: PopulatedCW[];
  allWorkspaces: Workspace[];
};

export function ContactWorkspaceManager({ contactId, contactWorkspaces, allWorkspaces }: Props) {
  const [pending, startTransition] = useTransition();

  const assignedIds = new Set(contactWorkspaces.map((cw) => cw.workspaceId));
  const available = allWorkspaces.filter((ws) => !assignedIds.has(ws.id));

  function add(workspaceId: string) {
    startTransition(async () => { await addContactToWorkspace(contactId, workspaceId); });
  }

  function remove(workspaceId: string) {
    startTransition(async () => { await removeContactFromWorkspace(contactId, workspaceId); });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        {contactWorkspaces.map((cw) => (
          <div key={cw.workspaceId} className="flex items-center justify-between rounded-md bg-stone-50 px-2.5 py-1.5 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: cw.workspace.color }}
              />
              {cw.workspace.name}
            </span>
            <button
              onClick={() => remove(cw.workspaceId)}
              disabled={pending}
              className="text-stone-400 hover:text-red-500"
              aria-label={`Remove from ${cw.workspace.name}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {contactWorkspaces.length === 0 && (
          <span className="text-xs text-stone-400">Not in any workspace</span>
        )}
      </div>

      {available.length > 0 && (
        <Select onValueChange={(v) => { if (v) add(v); }} value="">
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Add to workspace..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ws.color }}
                  />
                  {ws.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
