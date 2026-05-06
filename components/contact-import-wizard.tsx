"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { Upload, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { checkEmailDuplicates, importContacts } from "@/app/actions/import";
import type { ImportResult } from "@/app/actions/import";

// ── Constants ─────────────────────────────────────────────────────────────────

const FIELD_OPTIONS = [
  { value: "skip",             label: "— Skip —" },
  { value: "firstName",        label: "First Name" },
  { value: "lastName",         label: "Last Name" },
  { value: "email",            label: "Email" },
  { value: "phone",            label: "Phone" },
  { value: "source",           label: "Source" },
  { value: "notes",            label: "Notes" },
  { value: "birthday",         label: "Birthday" },
  { value: "homeAnniversary",  label: "Home Anniversary" },
];

const SOURCE_OPTIONS = [
  "Website", "Referral", "Open House", "Past Client", "Sphere",
  "Zillow", "Realtor.com", "HAR", "Cold Outreach", "Event", "Other",
];

const AUTO_MAP: Record<string, string> = {
  "first name": "firstName", "firstname": "firstName", "fname": "firstName", "first": "firstName",
  "last name": "lastName",  "lastname": "lastName",  "lname": "lastName",  "last": "lastName",
  "email": "email", "email address": "email", "e-mail": "email",
  "phone": "phone", "phone number": "phone", "mobile": "phone", "cell": "phone",
  "source": "source",
  "notes": "notes", "note": "notes",
  "birthday": "birthday", "birth date": "birthday", "dob": "birthday",
  "home anniversary": "homeAnniversary", "anniversary": "homeAnniversary",
};

function autoMap(headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of headers) out[h] = AUTO_MAP[h.toLowerCase().trim()] ?? "skip";
  return out;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Workspace = { id: string; name: string };
type Tag       = { id: string; name: string; color: string };

type Props = {
  workspaces: Workspace[];
  allTags:    Tag[];
};

// ── Steps ─────────────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

// ── Main wizard ───────────────────────────────────────────────────────────────

export function ContactImportWizard({ workspaces, allTags }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // CSV data
  const [csvString,   setCsvString]   = useState("");
  const [headers,     setHeaders]     = useState<string[]>([]);
  const [allRows,     setAllRows]     = useState<Record<string, string>[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [total,       setTotal]       = useState(0);

  // Mappings: CSV header → CRM field key
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Options
  const [workspaceId,     setWorkspaceId]     = useState("");
  const [selectedTagIds,  setSelectedTagIds]  = useState<string[]>([]);
  const [sourceOverride,  setSourceOverride]  = useState("");
  const [temperature,     setTemperature]     = useState("warm");

  // Step 4
  const [duplicateCount,    setDuplicateCount]    = useState(0);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  // Step 5
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, startImport] = useTransition();

  // ── Step 1: File upload ──────────────────────────────────────────────────────

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsing,    setParsing]    = useState(false);

  function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large (max 10 MB)"); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { toast.error("Please select a .csv file"); return; }
    setParsing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? "";
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });
      const cols = result.meta.fields ?? [];
      setCsvString(text);
      setHeaders(cols);
      setAllRows(result.data);
      setPreviewRows(result.data.slice(0, 10));
      setTotal(result.data.length);
      setMappings(autoMap(cols));
      setParsing(false);
      setStep(2);
    };
    reader.onerror = () => { toast.error("Could not read file"); setParsing(false); };
    reader.readAsText(file);
  }

  // ── Step 4: check duplicates on enter ────────────────────────────────────────

  async function enterPreview() {
    setStep(4);
    setCheckingDuplicates(true);
    const emailKey  = Object.entries(mappings).find(([, v]) => v === "email")?.[0];
    const emails    = emailKey ? allRows.map((r) => r[emailKey]).filter(Boolean) : [];
    const result    = await checkEmailDuplicates(emails);
    setDuplicateCount(result.duplicateCount);
    setCheckingDuplicates(false);
  }

  // ── Import ────────────────────────────────────────────────────────────────────

  function handleImport() {
    startImport(async () => {
      const fd = new FormData();
      fd.set("csvString",  csvString);
      fd.set("mappings",   JSON.stringify(mappings));
      fd.set("workspaceId", workspaceId);
      fd.set("tagIds",     JSON.stringify(selectedTagIds));
      fd.set("source",     sourceOverride);
      fd.set("temperature", temperature);
      const result = await importContacts(fd);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setImportResult(result);
        setStep(5);
        toast.success(`Imported ${result.imported} contacts`);
      }
    });
  }

  // ── Validation ────────────────────────────────────────────────────────────────

  const hasRequiredMapping =
    Object.values(mappings).includes("firstName") ||
    Object.values(mappings).includes("email");

  const mappedFields = new Set(Object.values(mappings).filter((v) => v !== "skip"));

  // ── Preview table columns ─────────────────────────────────────────────────────

  const previewCols = FIELD_OPTIONS.filter(
    (f) => f.value !== "skip" && mappedFields.has(f.value),
  );

  function getMappedValue(row: Record<string, string>, fieldKey: string): string {
    const header = Object.entries(mappings).find(([, v]) => v === fieldKey)?.[0];
    return header ? (row[header] ?? "") : "";
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  const cancelBtn = (
    <Link href="/contacts" className="text-sm text-slate-400 hover:text-slate-600">
      Cancel
    </Link>
  );

  const stepLabels = ["Upload", "Map Columns", "Options", "Preview", "Done"];

  // ── STEP 1 ────────────────────────────────────────────────────────────────────

  if (step === 1) return (
    <div className="space-y-6">
      <StepHeader step={1} labels={stepLabels} />

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => !parsing && fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors",
          isDragOver ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
          parsing && "pointer-events-none opacity-60",
        )}
      >
        <Upload className="h-10 w-10 text-slate-300" />
        <div>
          <p className="text-base font-medium text-slate-600">{parsing ? "Parsing…" : "Drop your CSV here"}</p>
          <p className="text-sm text-slate-400">or click to browse · .csv only · max 10 MB</p>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

      <div className="flex justify-end">{cancelBtn}</div>
    </div>
  );

  // ── STEP 2 ────────────────────────────────────────────────────────────────────

  if (step === 2) return (
    <div className="space-y-6">
      <StepHeader step={2} labels={stepLabels} />
      <p className="text-sm text-slate-500">{total} rows detected. Map each column to a contact field.</p>

      <div className="divide-y rounded-xl border bg-white">
        {headers.map((h) => (
          <div key={h} className="flex items-center gap-4 px-4 py-3">
            <span className="w-48 shrink-0 truncate text-sm font-medium text-slate-700">{h}</span>
            <span className="text-slate-400">→</span>
            <select
              value={mappings[h] ?? "skip"}
              onChange={(e) => setMappings((prev) => ({ ...prev, [h]: e.target.value }))}
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>

      {!hasRequiredMapping && (
        <p className="flex items-center gap-1.5 text-sm text-amber-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Map at least First Name or Email to continue.
        </p>
      )}

      <div className="flex items-center justify-between">
        {cancelBtn}
        <div className="flex gap-3">
          <button onClick={() => setStep(1)} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Back</button>
          <button onClick={() => setStep(3)} disabled={!hasRequiredMapping}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-40">
            Continue
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 3 ────────────────────────────────────────────────────────────────────

  if (step === 3) return (
    <div className="space-y-6">
      <StepHeader step={3} labels={stepLabels} />

      <div className="space-y-4 rounded-xl border bg-white p-6">
        {workspaces.length > 0 && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Add to Workspace</label>
            <select value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Override Source</label>
          <select value={sourceOverride} onChange={(e) => setSourceOverride(e.target.value)} className={inputCls}>
            <option value="">— Use CSV value or leave blank —</option>
            {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Default Temperature</label>
          <select value={temperature} onChange={(e) => setTemperature(e.target.value)} className={inputCls}>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
          </select>
        </div>

        {allTags.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Apply Tags to All</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
                  style={selectedTagIds.includes(t.id) ? { backgroundColor: t.color, color: "#fff", borderColor: t.color } : {}}>
                  <input type="checkbox" checked={selectedTagIds.includes(t.id)} className="sr-only"
                    onChange={(e) => setSelectedTagIds((prev) => e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id))} />
                  {t.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {cancelBtn}
        <div className="flex gap-3">
          <button onClick={() => setStep(2)} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Back</button>
          <button onClick={enterPreview} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
            Preview import
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 4 ────────────────────────────────────────────────────────────────────

  if (step === 4) return (
    <div className="space-y-6">
      <StepHeader step={4} labels={stepLabels} />

      <div className="rounded-xl border bg-white p-4">
        <p className="text-sm text-slate-700">
          Found <strong>{total}</strong> row{total !== 1 ? "s" : ""}.
          {checkingDuplicates ? " Checking for duplicates…" : (
            duplicateCount > 0 ? ` Of those, ${duplicateCount} look like duplicate${duplicateCount !== 1 ? "s" : ""} (matching email already in your contacts).` : " No duplicates found."
          )}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800">
          Will import: {Math.max(0, total - duplicateCount)} contact{total - duplicateCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Preview table */}
      {previewCols.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                {previewCols.map((c) => (
                  <th key={c.value} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {previewRows.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  {previewCols.map((c) => (
                    <td key={c.value} className="max-w-[180px] truncate px-3 py-2 text-slate-700">
                      {getMappedValue(row, c.value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {total > 10 && <p className="px-3 py-2 text-xs text-slate-400">Showing first 10 of {total} rows</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        {cancelBtn}
        <div className="flex gap-3">
          <button onClick={() => setStep(3)} className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Back</button>
          <button
            onClick={handleImport}
            disabled={importing || checkingDuplicates || total === 0}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-40"
          >
            {importing ? "Importing…" : `Import ${Math.max(0, total - duplicateCount)} contacts`}
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 5 ────────────────────────────────────────────────────────────────────

  if (step === 5 && importResult) return (
    <div className="space-y-6">
      <StepHeader step={5} labels={stepLabels} />

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">Import complete</p>
            <p className="text-sm text-slate-500">
              Imported <strong>{importResult.imported}</strong> contact{importResult.imported !== 1 ? "s" : ""} · Skipped <strong>{importResult.skipped}</strong> duplicate{importResult.skipped !== 1 ? "s" : ""}
              {importResult.errors.length > 0 ? ` · ${importResult.errors.length} error${importResult.errors.length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>

        {importResult.errors.length > 0 && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Errors</p>
            {importResult.errors.map((e, i) => (
              <p key={i} className="text-xs text-red-700">Row {e.row}: {e.reason}</p>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/contacts" className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900">
            View contacts
          </Link>
          <button onClick={() => { setStep(1); setImportResult(null); setCsvString(""); setHeaders([]); setAllRows([]); }}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Import another file
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}

// ── StepHeader ────────────────────────────────────────────────────────────────

function StepHeader({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const n = i + 1;
        const done    = n < step;
        const current = n === step;
        return (
          <div key={n} className="flex items-center gap-2">
            <div className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
              done    ? "bg-emerald-500 text-white" :
              current ? "bg-slate-800 text-white"   : "bg-slate-100 text-slate-400",
            )}>
              {done ? <Check className="h-3.5 w-3.5" /> : n}
            </div>
            <span className={cn("text-sm", current ? "font-semibold text-slate-800" : "text-slate-400")}>
              {label}
            </span>
            {i < labels.length - 1 && <span className="text-slate-200">·</span>}
          </div>
        );
      })}
    </div>
  );
}
