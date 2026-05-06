"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Home, Users, Tag, Settings, Building2, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { useSearch } from "@/components/search-modal";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/app/generated/prisma/client";

const NAV_ITEMS = [
  { href: "/today",    label: "Today",    icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/tags",     label: "Tags",     icon: Tag },
];

type SidebarProps = { workspaces: Workspace[] };

export function Sidebar({ workspaces }: SidebarProps) {
  const pathname    = usePathname();
  const { setOpen } = useSearch();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-stone-200 bg-amber-50 text-stone-800">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-stone-200 px-4 py-3.5">
        <Logo size={20} />
        <span className="text-sm font-semibold tracking-tight text-stone-800">Covenant CRM</span>
      </div>

      {/* Search trigger */}
      <div className="px-2 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-stone-200 bg-white/80 px-2.5 py-1.5 text-xs text-stone-400 transition-colors hover:border-stone-300 hover:text-stone-600"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-stone-300">⌘K</kbd>
        </button>
      </div>

      {/* Org switcher */}
      <div className="flex h-14 items-center border-b border-stone-200 px-3">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-start gap-2 rounded-md px-2 py-1.5 text-sm text-stone-700 hover:bg-stone-100",
            },
          }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  pathname === href || pathname.startsWith(`${href}/`)
                    ? "bg-stone-200 text-stone-800"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
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
            <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
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
                        ? "bg-stone-200 text-stone-800"
                        : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
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
          <p className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Settings
          </p>
          <ul className="space-y-0.5">
            {[
              { href: "/settings/profile",    label: "Profile" },
              { href: "/settings/workspaces", label: "Workspaces" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    pathname === href
                      ? "bg-stone-200 text-stone-800"
                      : "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
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

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-stone-200 px-3 py-3">
        <UserButton
          appearance={{ elements: { userButtonAvatarBox: "h-7 w-7" } }}
        />
        <span className="text-xs text-stone-500">Account</span>
      </div>
    </aside>
  );
}
