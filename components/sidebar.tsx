"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Home, Users, Tag, Settings, Building2, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/app/generated/prisma/client";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/tags", label: "Tags", icon: Tag },
];

type SidebarProps = {
  workspaces: Workspace[];
};

export function Sidebar({ workspaces }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-slate-900 text-slate-100">
      <div className="flex items-center gap-2.5 border-b border-slate-800 px-4 py-3.5">
        <Wheat className="h-5 w-5 shrink-0 text-amber-400" />
        <span className="text-sm font-semibold tracking-tight text-slate-100">Harvest CRM</span>
      </div>

      <div className="flex h-14 items-center border-b border-slate-700 px-3">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-start gap-2 rounded-md px-2 py-1.5 text-sm text-slate-100 hover:bg-slate-800",
            },
          }}
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  pathname === href || pathname.startsWith(`${href}/`)
                    ? "bg-slate-700 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {workspaces.length > 0 && (
          <div className="mt-6 px-2">
            <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workspaces
            </p>
            <ul className="space-y-0.5">
              {workspaces.map((ws) => (
                <li key={ws.id}>
                  <Link
                    href={`/workspaces/${ws.slug}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      pathname.startsWith(`/workspaces/${ws.slug}`)
                        ? "bg-slate-700 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                    )}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ws.color }}
                    />
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{ws.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 px-2">
          <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Settings
          </p>
          <ul className="space-y-0.5">
            {[
              { href: "/settings/profile", label: "Profile" },
              { href: "/settings/workspaces", label: "Workspaces" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-slate-700 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                  )}
                >
                  <Settings className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="flex items-center gap-2 border-t border-slate-700 px-3 py-3">
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "h-7 w-7",
            },
          }}
        />
        <span className="text-xs text-slate-400">Account</span>
      </div>
    </aside>
  );
}
