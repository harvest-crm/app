"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Home, Users, Tag, Settings, Building2, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { useSearch } from "@/components/search-modal";
import type { Workspace } from "@/app/generated/prisma/client";

// Exact hex locks — no Tailwind color name drift
// #FAFAF9 = warm off-white (not yellow)
// #F5F5F4 = subtle warm gray for active/hover
// #E7E5E4 = border
// #1C1917 = near-black primary text
// #78716C = muted secondary text

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
    <aside
      className="flex h-screen w-56 flex-col border-r"
      style={{ background: "#FAFAF9", borderColor: "#E7E5E4", color: "#1C1917" }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 border-b px-4 py-3.5"
        style={{ borderColor: "#E7E5E4" }}
      >
        <Logo size={20} />
        <span className="text-sm font-semibold tracking-tight" style={{ color: "#1C1917" }}>
          Covenant CRM
        </span>
      </div>

      {/* Search trigger */}
      <div className="px-2 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E7E5E4",
            color: "#A8A29E",
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd style={{ color: "#D6D3D1" }}>⌘K</kbd>
        </button>
      </div>

      {/* Org switcher */}
      <div
        className="flex h-14 items-center border-b px-3"
        style={{ borderColor: "#E7E5E4" }}
      >
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                "w-full justify-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[#F5F5F4]",
            },
          }}
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    background: active ? "#F5F5F4" : "transparent",
                    color: active ? "#1C1917" : "#78716C",
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "#F5F5F4";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>

        {workspaces.length > 0 && (
          <div className="mt-6 px-2">
            <p
              className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#A8A29E" }}
            >
              Workspaces
            </p>
            <ul className="space-y-0.5">
              {workspaces.map((ws) => {
                const active = pathname.startsWith(`/workspaces/${ws.slug}`);
                return (
                  <li key={ws.id}>
                    <Link
                      href={`/workspaces/${ws.slug}`}
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        background: active ? "#F5F5F4" : "transparent",
                        color: active ? "#1C1917" : "#78716C",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "#F5F5F4";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: ws.color }}
                      />
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{ws.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="mt-6 px-2">
          <p
            className="mb-1 px-2.5 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "#A8A29E" }}
          >
            Settings
          </p>
          <ul className="space-y-0.5">
            {[
              { href: "/settings/profile",    label: "Profile" },
              { href: "/settings/workspaces", label: "Workspaces" },
            ].map(({ href, label }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
                    style={{
                      background: active ? "#F5F5F4" : "transparent",
                      color: active ? "#1C1917" : "#78716C",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "#F5F5F4";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div
        className="flex items-center gap-2 border-t px-3 py-3"
        style={{ borderColor: "#E7E5E4" }}
      >
        <UserButton
          appearance={{ elements: { userButtonAvatarBox: "h-7 w-7" } }}
        />
        <span className="text-xs" style={{ color: "#A8A29E" }}>Account</span>
      </div>
    </aside>
  );
}
