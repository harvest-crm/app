"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportContactsToCsv } from "@/app/actions/contacts";

type Props = {
  filters: { q?: string; workspace?: string };
};

export function ExportCsvButton({ filters }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const csv = await exportContactsToCsv(filters);
      // Subtract 1 for the header row; filter empty trailing line
      const count = csv.split("\r\n").filter(Boolean).length - 1;

      if (count === 0) {
        toast("No contacts to export");
        return;
      }

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `contacts-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${count} contact${count !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      <Download className="mr-1.5 h-4 w-4" />
      {loading ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
