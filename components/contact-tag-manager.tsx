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
import { addTagToContact, removeTagFromContact } from "@/app/actions/contacts";
import type { Tag } from "@/app/generated/prisma/client";

type Props = {
  contactId: string;
  contactTags: Tag[];
  allTags: Tag[];
};

export function ContactTagManager({ contactId, contactTags, allTags }: Props) {
  const [pending, startTransition] = useTransition();

  const appliedIds = new Set(contactTags.map((t) => t.id));
  const available = allTags.filter((t) => !appliedIds.has(t.id));

  function add(tagId: string) {
    startTransition(async () => { await addTagToContact(contactId, tagId); });
  }

  function remove(tagId: string) {
    startTransition(async () => { await removeTagFromContact(contactId, tagId); });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {contactTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
            style={{ backgroundColor: tag.color }}
          >
            {tag.name}
            <button
              onClick={() => remove(tag.id)}
              disabled={pending}
              className="ml-0.5 rounded-full hover:opacity-75"
              aria-label={`Remove ${tag.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {contactTags.length === 0 && (
          <span className="text-xs text-[#3D5775]">No tags applied</span>
        )}
      </div>

      {available.length > 0 && (
        <Select onValueChange={(v) => { if (v) add(v); }} value="">
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Add tag..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
