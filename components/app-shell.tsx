"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import type { Workspace } from "@/app/generated/prisma/client";

type Props = {
  workspaces: Workspace[];
  children: React.ReactNode;
};

export function AppShell({ workspaces, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        workspaces={workspaces}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar — hamburger */}
        <div
          className="flex items-center gap-3 border-b px-4 py-3 md:hidden"
          style={{ borderColor: "#E8DFC8", background: "#F5EFE0" }}
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1 transition-colors"
            style={{ color: "#0F2540" }}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold" style={{ color: "#0F2540" }}>
            Covenant CRM
          </span>
        </div>

        <main className="flex-1 overflow-y-auto" style={{ background: "#F5EFE0" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
