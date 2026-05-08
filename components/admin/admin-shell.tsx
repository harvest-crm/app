"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Building2, Users, ClipboardList, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin",               label: "Overview",      icon: LayoutDashboard },
  { href: "/admin/organizations", label: "Organizations", icon: Building2       },
  { href: "/admin/users",         label: "Users",         icon: Users           },
  { href: "/admin/audit",         label: "Audit log",     icon: ClipboardList   },
] as const;

type Props = {
  adminEmail: string;
  children: React.ReactNode;
};

export function AdminShell({ adminEmail, children }: Props) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0F2540" }}>
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r" style={{ borderColor: "#1A3254" }}>
        {/* Brand */}
        <div className="flex items-center gap-2 border-b px-4 py-3.5" style={{ borderColor: "#1A3254" }}>
          <span className="flex h-2 w-2 rounded-full bg-red-500" title="Admin mode" />
          <span className="text-sm font-semibold tracking-tight text-white">
            Covenant CRM
          </span>
          <span className="rounded px-1.5 py-0.5 text-xs font-bold"
            style={{ background: "#EF4444", color: "#fff", fontSize: "10px" }}>
            ADMIN
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-0.5 px-2">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-[#1A3254] font-medium text-white"
                        : "text-[#8BA5C0] hover:bg-[#1A3254] hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: "#1A3254" }}>
          <p className="truncate text-xs" style={{ color: "#8BA5C0" }}>{adminEmail}</p>
          <Link
            href="/today"
            className="flex items-center gap-1.5 text-xs transition-colors hover:text-white"
            style={{ color: "#8BA5C0" }}
          >
            <LogOut className="h-3.5 w-3.5" />
            Exit admin
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto" style={{ background: "#F5EFE0" }}>
        {children}
      </main>
    </div>
  );
}
