import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload } from "lucide-react";
import { ExportCsvButton } from "@/components/export-csv-button";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Contacts" };

const TEMPERATURE_COLORS = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-[#E2F0EE] text-[#1F8A8A]",
} as const;

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; workspace?: string }>;
}) {
  const { orgId: clerkOrgId } = await auth();
  const params = await searchParams;

  if (!clerkOrgId) return null;

  const org = await db.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  if (!org) {
    return (
      <div className="p-8">
        <p className="text-[#3D5775]">Your organization is not set up yet. Sign out and sign in again.</p>
      </div>
    );
  }

  const workspaces = await db.workspace.findMany({
    where: { organizationId: org.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, slug: true },
  });

  const contacts = await db.contact.findMany({
    where: {
      organizationId: org.id,
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" } },
              { lastName: { contains: params.q, mode: "insensitive" } },
              { email: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(params.workspace
        ? {
            contactWorkspaces: {
              some: { workspace: { slug: params.workspace } },
            },
          }
        : {}),
    },
    include: {
      contactTags: { include: { tag: true } },
      contactWorkspaces: { include: { workspace: { select: { name: true, slug: true } } } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  // Price range special render — only fetch if definitions exist in this org
  const priceRangeDefs = await db.customFieldDefinition.findMany({
    where: { organizationId: org.id, fieldKey: { in: ["price_range_min", "price_range_max"] }, entityType: "contact" },
    select: { id: true, fieldKey: true },
  });
  const priceDefMap = new Map(priceRangeDefs.map((d) => [d.fieldKey, d.id]));
  const priceValues =
    priceRangeDefs.length > 0
      ? await db.customFieldValue.findMany({
          where: { definitionId: { in: priceRangeDefs.map((d) => d.id) }, entityId: { in: contacts.map((c) => c.id) } },
          select: { definitionId: true, entityId: true, value: true },
        })
      : [];

  // Build lookup: contactId -> { min, max }
  const priceByContact = new Map<string, { min?: number; max?: number }>();
  for (const v of priceValues) {
    const key = v.definitionId === priceDefMap.get("price_range_min") ? "min" : "max";
    const entry = priceByContact.get(v.entityId) ?? {};
    entry[key] = typeof v.value === "number" ? v.value : Number(v.value);
    priceByContact.set(v.entityId, entry);
  }

  function fmtPriceRange(contactId: string): string | null {
    const p = priceByContact.get(contactId);
    if (!p || (!p.min && !p.max)) return null;
    const fmt = (n: number) =>
      n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${Math.round(n / 1_000)}k` : `$${n}`;
    if (p.min && p.max) return `${fmt(p.min)} – ${fmt(p.max)}`;
    if (p.min) return `${fmt(p.min)}+`;
    return `up to ${fmt(p.max!)}`;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#0F2540]">Contacts</h1>
        <div className="flex items-center gap-2">
          <ExportCsvButton filters={{ q: params.q, workspace: params.workspace }} />
          <Link href="/contacts/import">
            <Button variant="outline" size="sm">
              <Upload className="mr-1.5 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Link href="/contacts/new">
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              New Contact
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-4 flex gap-3">
        <form className="flex-1">
          <Input
            name="q"
            placeholder="Search contacts..."
            defaultValue={params.q ?? ""}
            className="max-w-sm"
          />
          {params.workspace && (
            <input type="hidden" name="workspace" value={params.workspace} />
          )}
        </form>
        {workspaces.length > 0 && (
          <div className="flex items-center gap-2">
            {workspaces.map((ws) => (
              <Link
                key={ws.id}
                href={
                  params.workspace === ws.slug
                    ? "/contacts"
                    : `/contacts?workspace=${ws.slug}${params.q ? `&q=${params.q}` : ""}`
                }
              >
                <Badge
                  variant={params.workspace === ws.slug ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {ws.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      {contacts.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-[#3D5775]">No contacts found.</p>
          <Link href="/contacts/new" className="mt-2 inline-block">
            <Button variant="outline" size="sm">Add your first contact</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-[#F5EFE0]">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Name</th>
                <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Email</th>
                <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Temperature</th>
                <th className="px-4 py-3 text-left font-medium text-[#3D5775]">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-[#E2F0EE]">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="font-medium text-[#0F2540] hover:text-[#1F8A8A]"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                    {fmtPriceRange(c.id) && (
                      <div className="mt-0.5 text-xs text-[#3D5775]">{fmtPriceRange(c.id)}</div>
                    )}
                    {c.contactWorkspaces.length > 0 && (
                      <div className="mt-0.5 flex gap-1">
                        {c.contactWorkspaces.map((cw) => (
                          <span key={cw.workspace.slug} className="text-xs text-[#3D5775]">
                            {cw.workspace.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#3D5775]">{c.email ?? ""}</td>
                  <td className="px-4 py-3 text-[#3D5775]">{formatPhone(c.phone)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        TEMPERATURE_COLORS[c.temperature as keyof typeof TEMPERATURE_COLORS] ??
                        "bg-[#E2F0EE] text-[#3D5775]"
                      }`}
                    >
                      {c.temperature}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.contactTags.map((ct) => (
                        <span
                          key={ct.tagId}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
                          style={{ backgroundColor: ct.tag.color }}
                        >
                          {ct.tag.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
