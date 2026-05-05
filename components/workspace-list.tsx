"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createWorkspace, updateWorkspace, deleteWorkspace } from "@/app/actions/workspaces";
import { Pencil, Trash2, Plus, Check, X, ExternalLink } from "lucide-react";
import type { Workspace } from "@/app/generated/prisma/client";

const TEMPLATES = [
  { value: "real_estate", label: "Real Estate" },
  { value: "web_design", label: "Web Design" },
  { value: "coaching", label: "Coaching" },
  { value: "consulting", label: "Consulting" },
  { value: "generic", label: "Generic" },
] as const;

const PRESET_COLORS = [
  "#1E293B", "#DC2626", "#EA580C", "#D97706",
  "#16A34A", "#2563EB", "#7C3AED", "#DB2777",
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

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [color, setColor] = useState(workspace.color);
  const [pending, startTransition] = useTransition();

  function save() {
    const fd = new FormData();
    fd.set("id", workspace.id);
    fd.set("name", name);
    fd.set("color", color);
    startTransition(async () => {
      await updateWorkspace(fd);
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm(`Delete workspace "${workspace.name}"? All stages and data will be removed.`)) return;
    startTransition(async () => { await deleteWorkspace(workspace.id); });
  }

  const templateLabel = TEMPLATES.find((t) => t.value === workspace.professionTemplate)?.label ?? workspace.professionTemplate;

  if (editing) {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-slate-50 px-4 py-3">
        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-7 w-48 text-sm"
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
    <div className="flex items-center gap-4 rounded-md border bg-white px-4 py-3">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: workspace.color }} />
      <div className="flex-1">
        <span className="font-medium">{workspace.name}</span>
        <span className="ml-2 text-xs text-slate-400">{templateLabel}</span>
      </div>
      <Link href={`/workspaces/${workspace.slug}`} className="text-slate-400 hover:text-blue-600">
        <ExternalLink className="h-4 w-4" />
      </Link>
      <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="sm" variant="ghost" onClick={remove} disabled={pending}>
        <Trash2 className="h-3.5 w-3.5 text-red-500" />
      </Button>
    </div>
  );
}

function NewWorkspaceForm({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [template, setTemplate] = useState<string>("real_estate");
  const [color, setColor] = useState("#1E293B");
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  function save() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("professionTemplate", template);
    fd.set("color", color);
    startTransition(async () => {
      const result = await createWorkspace(fd);
      if (result?.error && typeof result.error === "object") {
        setErrors(result.error as Record<string, string[]>);
        return;
      }
      setName("");
      setTemplate("real_estate");
      setColor("#1E293B");
      setOpen(false);
      onCreated?.();
    });
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" />
        New Workspace
      </Button>
    );
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">New Workspace</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Real Estate Pipeline"
            className="h-8 text-sm"
            autoFocus
          />
          {errors.name && <p className="text-xs text-red-600">{errors.name[0]}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Profession Template</Label>
          <Select value={template} onValueChange={(v) => { if (v) setTemplate(v); }}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Color</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending || !name.trim()}>
          {pending ? "Creating..." : "Create Workspace"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function WorkspaceList({ workspaces }: { workspaces: Workspace[] }) {
  return (
    <div className="space-y-2">
      {workspaces.map((ws) => (
        <WorkspaceRow key={ws.id} workspace={ws} />
      ))}
      <NewWorkspaceForm />
    </div>
  );
}
