"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Home, Users, Tag, Settings, Building2, Search, ListChecks, CheckSquare, Mail, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useSearch } from "@/components/search-modal";
import type { Workspace } from "@/app/generated/prisma/client";

// Locked palette
const C = {
  canvas:         "#F5EFE0",
  border:         "#E8DFC8",
  navy:           "#0F2540",
  navySecondary:  "#3D5775",
  teal:           "#1F8A8A",
  tealActive:     "#D0E5E2",  // slightly stronger than #E2F0EE
  inputBg:        "#FBF8F0",
} as const;

const NAV_ITEMS = [
  { href: "/today",    label: "Today",    icon: Home        },
  { href: "/contacts", label: "Contacts", icon: Users       },
  { href: "/tasks",    label: "Tasks",    icon: CheckSquare },
  { href: "/tags",     label: "Tags",     icon: Tag         },
];

type SidebarProps = {
  workspaces: Workspace[];
  isOpen?: boolean;
  onClose?: () => void;
};

export function Sidebar({ workspaces, isOpen = false, onClose }: SidebarProps) {
  const pathname    = usePathname();
  const { setOpen } = useSearch();

  function navStyle(href: string, active: boolean): React.CSSProperties {
    return {
      background: active ? C.tealActive : "transparent",
      color:      active ? C.navy       : C.navySecondary,
      // Inset left border on active — no layout shift
      boxShadow:  active ? "inset 3px 0 0 #1F8A8A" : "none",
      fontWeight: active ? 500 : 400,
    };
  }

  function handleHover(e: React.MouseEvent, active: boolean, enter: boolean) {
    if (active) return;
    const el = e.currentTarget as HTMLElement;
    el.style.background = enter ? C.tealActive : "transparent";
    el.style.color      = enter ? C.navy       : C.navySecondary;
  }

  return (
    <aside
      className={cn(
        "flex h-screen w-56 flex-col border-r",
        // Mobile: fixed overlay, slide in/out
        "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50",
        "max-md:transition-transform max-md:duration-300 max-md:ease-in-out",
        !isOpen && "max-md:-translate-x-full",
      )}
      style={{ background: C.canvas, borderColor: C.border, color: C.navy }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: C.border }}>
        <Logo size={20} thick />
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
                "w-full justify-start gap-2 rounded-md px-2 py-1.5 text-sm",
              // Teal org avatar fallback
              avatarBox:
                "!h-6 !w-6 !rounded-full !bg-[#1F8A8A] !text-white !text-[11px] !font-semibold",
              organizationPreviewAvatarBox:
                "!h-6 !w-6 !rounded-full !bg-[#1F8A8A]",
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
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors"
                  style={navStyle(href, active)}
                  onMouseEnter={(e) => handleHover(e, active, true)}
                  onMouseLeave={(e) => handleHover(e, active, false)}
                  onClick={onClose}
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
                      className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors"
                      style={navStyle(`/workspaces/${ws.slug}`, active)}
                      onMouseEnter={(e) => handleHover(e, active, true)}
                      onMouseLeave={(e) => handleHover(e, active, false)}
                      onClick={onClose}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: ws.color }}
                      />
                      <Building2 className="h-4 w-4 shrink-0" />
                      {/* Allow wrapping on long workspace names */}
                      <span style={{ overflowWrap: "anywhere", lineHeight: 1.3 }}>{ws.name}</span>
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
              { href: "/settings/profile",          label: "Profile",          icon: Settings    },
              { href: "/settings/team",           label: "Team",             icon: UsersRound  },
              { href: "/settings/task-templates", label: "Task Templates",   icon: ListChecks  },
              { href: "/settings/email-templates", label: "Email Templates", icon: Mail        },
              { href: "/settings/email",           label: "Email Settings",  icon: Mail        },
              { href: "/settings/workspaces",      label: "Workspaces",      icon: Settings    },
            ].map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors"
                    style={navStyle(href, active)}
                    onMouseEnter={(e) => handleHover(e, active, true)}
                    onMouseLeave={(e) => handleHover(e, active, false)}
                    onClick={onClose}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t px-3 py-3" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "h-7 w-7" } }} />
          <span className="text-xs" style={{ color: C.navySecondary }}>Account</span>
        </div>
        <a
          href="mailto:thomas@dstormpg.com?subject=Covenant%20CRM%20feedback"
          className="text-[11px] transition-colors hover:text-slate-300"
          style={{ color: C.navySecondary }}
        >
          Report feedback
        </a>
      </div>
    </aside>
  );
}
