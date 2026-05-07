"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BulkActionBar } from "./bulk-action-bar";
import { BulkTagModal } from "./bulk-tag-modal";
import { BulkWorkspaceModal } from "./bulk-workspace-modal";
import { BulkTemplateModal } from "./bulk-template-modal";
import { BulkDeleteModal } from "./bulk-delete-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ContactRow = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  temperature: string;
  priceRange: string | null;
  workspaces: Array<{ name: string; slug: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
};

type Tag       = { id: string; name: string; color: string };
type Workspace = { id: string; name: string; color: string };

type Props = {
  contacts: ContactRow[];
  allTags: Tag[];
  allWorkspaces: Workspace[];
};

type ModalType = "tag" | "workspace" | "template" | "delete" | null;

// ── Temperature colors ────────────────────────────────────────────────────────

const TEMP_COLORS: Record<string, string> = {
  hot:  "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-blue-100 text-blue-700",
};

// ── Main component ────────────────────────────────────────────────────────────

export function ContactsTable({ contacts, allTags, allWorkspaces }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Sync header checkbox indeterminate state
  useEffect(() => {
    if (!headerCheckboxRef.current) return;
    headerCheckboxRef.current.indeterminate =
      selectedIds.size > 0 && selectedIds.size < contacts.length;
  }, [selectedIds.size, contacts.length]);

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  }

  function toggleAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else if (contacts.length > 1000) {
      alert("Bulk operations limited to 1000 contacts at a time. Apply more filters first.");
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setActiveModal(null);
  }

  const selectedList = [...selectedIds];

  if (contacts.length === 0) {
    return (
      <div className="mt-12 text-center">
        <p className="text-[#3D5775]">No contacts found.</p>
        <Link href="/contacts/new" className="mt-2 inline-block">
          <Button variant="outline" size="sm">Add your first contact</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b bg-[#F5EFE0]">
            <tr>
              {/* Header checkbox */}
              <th className="w-10 px-3 py-3">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === contacts.length}
                  onChange={toggleAll}
                  style={{ accentColor: "#1F8A8A" }}
                  className="h-4 w-4 cursor-pointer rounded border-[#E8DFC8]"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Name</th>
              <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Email</th>
              <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Phone</th>
              <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Temperature</th>
              <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {contacts.map((c) => {
              const isSelected = selectedIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  style={{ background: isSelected ? "#E2F0EE" : undefined }}
                  className={!isSelected ? "hover:bg-[#E2F0EE]" : ""}
                >
                  {/* Row checkbox */}
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(c.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ accentColor: "#1F8A8A" }}
                      className="h-4 w-4 cursor-pointer rounded border-[#E8DFC8]"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`}
                      className="font-medium text-[#0F2540] hover:text-[#1F8A8A]">
                      {c.firstName} {c.lastName}
                    </Link>
                    {c.priceRange && (
                      <div className="mt-0.5 text-xs text-[#3D5775]">{c.priceRange}</div>
                    )}
                    {c.workspaces.length > 0 && (
                      <div className="mt-0.5 flex gap-1">
                        {c.workspaces.map((ws) => (
                          <span key={ws.slug} className="text-xs text-[#3D5775]">{ws.name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#3D5775]">{c.email ?? ""}</td>
                  <td className="px-4 py-3 text-[#3D5775]">{c.phone ?? ""}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${TEMP_COLORS[c.temperature] ?? "bg-[#E2F0EE] text-[#3D5775]"}`}>
                      {c.temperature}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <span key={tag.id}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Floating action bar */}
      <BulkActionBar
        count={selectedIds.size}
        onTag={()       => setActiveModal("tag")}
        onWorkspace={()  => setActiveModal("workspace")}
        onTemplate={()  => setActiveModal("template")}
        onDelete={()    => setActiveModal("delete")}
        onClear={clearSelection}
      />

      {/* Modals */}
      {activeModal === "tag" && (
        <BulkTagModal
          contactIds={selectedList}
          allTags={allTags}
          onClose={() => { setActiveModal(null); clearSelection(); }}
        />
      )}
      {activeModal === "workspace" && (
        <BulkWorkspaceModal
          contactIds={selectedList}
          allWorkspaces={allWorkspaces}
          onClose={() => { setActiveModal(null); clearSelection(); }}
        />
      )}
      {activeModal === "template" && (
        <BulkTemplateModal
          contactIds={selectedList}
          onClose={() => { setActiveModal(null); clearSelection(); }}
        />
      )}
      {activeModal === "delete" && (
        <BulkDeleteModal
          contactIds={selectedList}
          onClose={() => { setActiveModal(null); clearSelection(); }}
        />
      )}
    </>
  );
}
