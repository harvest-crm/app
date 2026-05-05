"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteContact } from "@/app/actions/contacts";
import { Trash2 } from "lucide-react";

export function DeleteContactButton({ contactId }: { contactId: string }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    startTransition(async () => { await deleteContact(contactId); });
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={pending}>
      <Trash2 className="mr-1.5 h-4 w-4" />
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}
