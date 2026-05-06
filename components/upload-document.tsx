"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { prepareUpload, confirmUpload } from "@/app/actions/documents";
import type { SerializedDocument } from "@/app/actions/documents";

const MAX_BYTES = 50 * 1024 * 1024;

// XHR-based PUT so we get upload progress events
function xhrPut(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload  = () => (xhr.status < 300 ? resolve() : reject(new Error(`HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(file);
  });
}

type Props = {
  contactId?: string;
  dealId?: string;
  onUploaded: (doc: SerializedDocument) => void;
};

export function UploadDocument({ contactId, dealId, onUploaded }: Props) {
  const [isDragOver,       setIsDragOver]       = useState(false);
  const [uploading,        setUploading]         = useState(false);
  const [progress,         setProgress]          = useState(0);
  const [currentFileName,  setCurrentFileName]   = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFiles(files: File[]) {
    if (files.length === 0) return;

    // Filter oversized
    const valid    = files.filter((f) => f.size <= MAX_BYTES);
    const oversized = files.filter((f) => f.size > MAX_BYTES);
    for (const f of oversized) toast.error(`${f.name} exceeds the 50 MB limit`);
    if (valid.length === 0) return;

    setUploading(true);

    for (const file of valid) {
      setCurrentFileName(file.name);
      setProgress(0);

      const mimeType = file.type || "application/octet-stream";

      try {
        // 1. Get signed upload URL
        const fd = new FormData();
        fd.set("filename",  file.name);
        fd.set("mimeType",  mimeType);
        fd.set("sizeBytes", String(file.size));
        if (contactId) fd.set("contactId", contactId);
        if (dealId)    fd.set("dealId",    dealId);

        const prep = await prepareUpload(fd);
        if ("error" in prep) { toast.error(prep.error); continue; }

        // 2. PUT file directly to R2
        await xhrPut(prep.uploadUrl, file, mimeType, setProgress);

        // 3. Record in DB
        const confirm = await confirmUpload(
          prep.r2Key, file.name, mimeType, file.size,
          contactId ?? null, dealId ?? null,
        );
        if ("error" in confirm) { toast.error(confirm.error); continue; }

        onUploaded(confirm.doc);
        toast.success(`${file.name} uploaded`);
      } catch (err) {
        console.error(err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setCurrentFileName(null);
    setProgress(0);
    // Reset file input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    if (!uploading) processFiles(Array.from(e.dataTransfer.files));
  }

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          isDragOver && !uploading
            ? "border-[#D0E5E2] bg-[#E2F0EE]"
            : "border-[#E8DFC8] bg-[#F5EFE0] hover:border-[#E8DFC8] hover:bg-white",
          uploading && "cursor-not-allowed opacity-60",
        )}
      >
        <Upload className="h-7 w-7 text-[#3D5775]" />
        <div>
          <p className="text-sm font-medium text-[#3D5775]">
            {uploading ? "Uploading…" : "Drop files here"}
          </p>
          {!uploading && (
            <p className="text-xs text-[#3D5775]">or click to browse · max 50 MB</p>
          )}
        </div>
      </div>

      {/* Progress */}
      {uploading && currentFileName && (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="max-w-xs truncate text-xs text-[#3D5775]">{currentFileName}</p>
            <p className="text-xs text-[#3D5775]">{progress}%</p>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E2F0EE]">
            <div
              className="h-1.5 rounded-full bg-[#E2F0EE]0 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          if (e.target.files) processFiles(Array.from(e.target.files));
        }}
      />
    </div>
  );
}
