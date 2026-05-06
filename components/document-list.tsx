"use client";

import { useState, useTransition } from "react";
import { File, FileImage, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDownloadUrl, deleteDocument } from "@/app/actions/documents";
import type { SerializedDocument } from "@/app/actions/documents";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBytes(n: number): string {
  if (n < 1_024)             return `${n} B`;
  if (n < 1_048_576)         return `${(n / 1_024).toFixed(1)} KB`;
  if (n < 1_073_741_824)     return `${(n / 1_048_576).toFixed(1)} MB`;
  return `${(n / 1_073_741_824).toFixed(1)} GB`;
}

function fmtRelative(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/"))      return FileImage;
  if (mimeType === "application/pdf")     return FileText;
  if (mimeType.startsWith("text/"))       return FileText;
  if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
  return File;
}

// ── DocRow ────────────────────────────────────────────────────────────────────

function DocRow({
  doc,
  onDeleted,
}: {
  doc: SerializedDocument;
  onDeleted: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading,   setDownloading]   = useState(false);
  const [, startTransition] = useTransition();

  const Icon = fileIcon(doc.mimeType);

  async function handleDownload(e: React.MouseEvent) {
    e.preventDefault();
    if (downloading) return;
    setDownloading(true);
    const result = await getDownloadUrl(doc.id);
    setDownloading(false);
    if ("error" in result) {
      toast.error(result.error);
    } else {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteDocument(doc.id);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        onDeleted(doc.id);
        toast.success("Document deleted");
      }
    });
  }

  return (
    <div className="group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-[#E2F0EE]">
      {/* Icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#E2F0EE]">
        <Icon className="h-4 w-4 text-[#3D5775]" />
      </div>

      {/* File info */}
      <div className="min-w-0 flex-1">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className={cn(
            "block max-w-full truncate text-left text-sm font-medium text-[#1F8A8A] hover:underline disabled:opacity-50",
          )}
        >
          {doc.fileName}
        </button>
        <p className="text-xs text-[#3D5775]">
          {fmtBytes(doc.fileSize)} · {fmtRelative(doc.uploadedAt)}
        </p>
      </div>

      {/* Actions */}
      {confirmDelete ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-[#3D5775]">Delete?</span>
          <button
            onClick={handleDelete}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs text-[#3D5775] hover:text-[#3D5775]"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="shrink-0 rounded p-1 text-[#3D5775] opacity-0 transition-opacity hover:bg-red-100 hover:text-red-500 group-hover:opacity-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── DocumentList ──────────────────────────────────────────────────────────────

export function DocumentList({
  documents,
  onDeleted,
}: {
  documents: SerializedDocument[];
  onDeleted: (id: string) => void;
}) {
  if (documents.length === 0) {
    return <p className="py-4 text-center text-xs text-[#3D5775]">No documents yet.</p>;
  }

  return (
    <div className="space-y-0.5">
      {documents.map((doc) => (
        <DocRow key={doc.id} doc={doc} onDeleted={onDeleted} />
      ))}
    </div>
  );
}
