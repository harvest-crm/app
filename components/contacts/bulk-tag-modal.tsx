"use client";

import { useState, useTransition } from "react";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { bulkTagContacts } from "@/app/actions/bulk-contacts";
import { createTag } from "@/app/actions/tags";

type Tag = { id: string; name: string; color: string };

type Props = {
  contactIds: string[];
  allTags: Tag[];
  onClose: () => void;
};

export function BulkTagModal({ contactIds, allTags: initialTags, onClose }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTagName, setNewTagName] = useState("");
  const [tags, setTags] = useState(initialTags);
  const [pending, startTransition] = useTransition();

  function toggleTag(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  }

  function handleApply() {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const result = await bulkTagContacts(contactIds, [...selectedIds]);
      if ("error" in result) { toast.error(result.error); return; }
      const tagNames = tags.filter((t) => selectedIds.has(t.id)).map((t) => t.name).join(", ");
      toast.success(`${result.tagged} contact${result.tagged !== 1 ? "s" : ""} tagged with ${tagNames}`);
      router.refresh();
      onClose();
    });
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", newTagName.trim());
      fd.set("color", "#1F8A8A");
      const result = await createTag(fd);
      if ("error" in result) { toast.error("Failed to create tag"); return; }
      setTags((prev) => [...prev, result.tag]);
      setSelectedIds((prev) => new Set(prev).add(result.tag.id));
      setNewTagName("");
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl" style={{ border: "1px solid #E8DFC8" }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <h2 className="text-base font-semibold" style={{ color: "#0F2540" }}>
            Tag {contactIds.length} contact{contactIds.length !== 1 ? "s" : ""}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-[#3D5775] hover:bg-[#E2F0EE]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Selected chips */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.filter((t) => selectedIds.has(t.id)).map((t) => (
                <span key={t.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: t.color }}>
                  {t.name}
                  <button onClick={() => toggleTag(t.id)} className="opacity-80 hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Existing tags */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
              Select tags
            </p>
            <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {tags.map((tag) => (
                <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white transition-opacity"
                  style={{ backgroundColor: tag.color, opacity: selectedIds.has(tag.id) ? 1 : 0.5 }}>
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <p className="text-xs" style={{ color: "#3D5775" }}>No tags yet.</p>
              )}
            </div>
          </div>

          {/* Create new tag */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#1F8A8A", letterSpacing: "0.06em" }}>
              Or create new tag
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateTag()}
                placeholder="Tag name…"
                className="flex-1 rounded-md border border-[#E8DFC8] px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F8A8A]"
              />
              <button type="button" onClick={handleCreateTag} disabled={!newTagName.trim() || pending}
                className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-5 py-4" style={{ borderColor: "#E8DFC8" }}>
          <button onClick={onClose} className="rounded-md border border-[#E8DFC8] px-3 py-1.5 text-sm text-[#3D5775] hover:bg-[#F5EFE0]">
            Cancel
          </button>
          <button onClick={handleApply} disabled={selectedIds.size === 0 || pending}
            className="rounded-md bg-[#1F8A8A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#1A7575] disabled:opacity-40">
            {pending ? "Applying…" : `Apply ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
