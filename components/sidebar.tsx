"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Home, Users, Tag, Settings, Building2, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { useSearch } from "@/components/search-modal";
import type { Workspace } from "@/app/generated/prisma/client";

// Locked palette — no Tailwind color names
const C = {
  canvas:        "#F5EFE0",
  border:        "#E8DFC8",
  navy:          "#0F2540",
  navySecondary: "#3D5775",
  teal:          "#1F8A8A",
  tealHover:     "#1A7575",
  tealTint:      "#E2F0EE",
  inputBg:       "#FBF8F0",
  white:         "#FFFFFF",
} as const;

const NAV_ITEMS = [
  { href: "/today",    label: "Today",    icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/tags",     label: "Tags",     icon: Tag },
];

type SidebarProps = { workspaces: Workspace[] };

export function Sidebar({ workspaces }: SidebarProps) {
  const pathname    = usePathname();
  const { setOpen } = useSearch();

  function navLink(href: string, active: boolean) {
    return {
      background: active ? C.tealTint : "transparent",
      color:      active ? C.teal     : C.navySecondary,
    };
  }

  return (
    <aside
      className="flex h-screen w-56 flex-col border-r"
      style={{ background: C.canvas, borderColor: C.border, color: C.navy }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: C.border }}>
        <Logo size={20} />
        <span className="text-sm font-semibold tracking-tight" style={{ color: C.navy }}>
          Covenant CRM
        </span>
      </div>

      {/* Search trigger */}
      <div className="px-2 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors"
          style={{ background: C.inputBg, border: `1px solid ${C.border}`, color: C.navySecondary }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd style={{ color: C.border }}>⌘K</kbd>
        </button>
      </div>

      {/* Org switcher */}
      <div className="flex h-14 items-center border-b px-3" style={{ borderColor: C.border }}>
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "w-full",
              organizationSwitcherTrigger:
                `w-full justify-start gap-2 rounded-md px-2 py-1.5 text-sm`,
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
                  style={navLink(href, active)}
                  onMouseEnter={(e) => {
                    if (!active) Object.assign((e.currentTarget as HTMLElement).style, { background: C.tealTint, color: C.navy });
                  }}
                  onMouseLeave={(e) => {
                    if (!active) Object.assign((e.currentTarget as HTMLElement).style, { background: "transparent", color: C.navySecondary });
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
              className="mb-1 px-2.5 font-medium uppercase"
              style={{ color: C.teal, fontSize: "11px", letterSpacing: "0.06em" }}
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
                      style={navLink(`/workspaces/${ws.slug}`, active)}
                      onMouseEnter={(e) => {
                        if (!active) Object.assign((e.currentTarget as HTMLElement).style, { background: C.tealTint, color: C.navy });
                      }}
                      onMouseLeave={(e) => {
                        if (!active) Object.assign((e.currentTarget as HTMLElement).style, { background: "transparent", color: C.navySecondary });
                      }}
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ws.color }} />
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
            className="mb-1 px-2.5 font-medium uppercase"
            style={{ color: C.teal, fontSize: "11px", letterSpacing: "0.06em" }}
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
                    style={navLink(href, active)}
                    onMouseEnter={(e) => {
                      if (!active) Object.assign((e.currentTarget as HTMLElement).style, { background: C.tealTint, color: C.navy });
                    }}
                    onMouseLeave={(e) => {
                      if (!active) Object.assign((e.currentTarget as HTMLElement).style, { background: "transparent", color: C.navySecondary });
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
      <div className="flex items-center gap-2 border-t px-3 py-3" style={{ borderColor: C.border }}>
        <UserButton appearance={{ elements: { userButtonAvatarBox: "h-7 w-7" } }} />
        <span className="text-xs" style={{ color: C.navySecondary }}>Account</span>
      </div>
    </aside>
  );
}
