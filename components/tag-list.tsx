"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTag, updateTag, deleteTag } from "@/app/actions/tags";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import type { Tag } from "@/app/generated/prisma/client";

type TagWithCount = Tag & { _count: { contactTags: number } };

const PRESET_COLORS = [
  "#64748B", "#EF4444", "#F97316", "#EAB308",
  "#22C55E", "#3B82F6", "#8B5CF6", "#EC4899",
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-1.5">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full ring-offset-1 transition-all hover:scale-110"
          style={{
            backgroundColor: c,
            outline: value === c ? `2px solid ${c}` : "none",
            outlineOffset: "2px",
          }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

function TagRow({ tag, onSaved }: { tag: TagWithCount; onSaved?: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tag.name);
  const [color, setColor] = useState(tag.color);
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("color", color);
    startTransition(async () => {
      await updateTag(tag.id, fd);
      setEditing(false);
      onSaved?.();
    });
  }

  function remove() {
    if (!confirm(`Delete tag "${tag.name}"?`)) return;
    startTransition(async () => { await deleteTag(tag.id); });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-[#F5EFE0] px-3 py-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 w-40 text-sm"
          autoFocus
        />
        <ColorPicker value={color} onChange={setColor} />
        <Button size="sm" variant="ghost" onClick={save} disabled={pending || !name.trim()}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border bg-white px-3 py-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="flex-1 text-sm font-medium">{tag.name}</span>
      <span className="text-xs text-[#3D5775]">{tag._count.contactTags} contact{tag._count.contactTags !== 1 ? "s" : ""}</span>
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </Button>
    </div>
  );
}

function NewTagRow({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#64748B");
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("color", color);
    startTransition(async () => {
      await createTag(fd);
      setName("");
      setColor("#64748B");
      setOpen(false);
      onCreated?.();
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        New Tag
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border-2 border-dashed border-[#E8DFC8] bg-[#F5EFE0] px-3 py-2">
      <span
        className="h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tag name"
        className="h-7 w-40 text-sm"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <ColorPicker value={color} onChange={setColor} />
      <Button size="sm" variant="ghost" onClick={save} disabled={pending || !name.trim()}>
        <Check className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TagList({ tags }: { tags: TagWithCount[] }) {
  return (
    <div className="space-y-2">
      {tags.map((tag) => (
        <TagRow key={tag.id} tag={tag} />
      ))}
      <NewTagRow />
    </div>
  );
}
