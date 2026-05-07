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
import { ContactsTable } from "@/components/contacts/contacts-table";
import type { ContactRow } from "@/components/contacts/contacts-table";

export const metadata: Metadata = { title: "Contacts" };

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

  const [workspaces, contacts, allTags] = await Promise.all([
    db.workspace.findMany({
      where: { organizationId: org.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, name: true, slug: true, color: true },
    }),
    db.contact.findMany({
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
          ? { contactWorkspaces: { some: { workspace: { slug: params.workspace } } } }
          : {}),
      },
      include: {
        contactTags: { include: { tag: true } },
        contactWorkspaces: { include: { workspace: { select: { name: true, slug: true } } } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.tag.findMany({
      where: { organizationId: org.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true },
    }),
  ]);

  // Price range special render
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

  const priceByContact = new Map<string, { min?: number; max?: number }>();
  for (const v of priceValues) {
    const key = v.definitionId === priceDefMap.get("price_range_min") ? "min" : "max";
    const entry = priceByContact.get(v.entityId) ?? {};
    entry[key] = typeof v.value === "number" ? v.value : Number(v.value);
    priceByContact.set(v.entityId, entry);
  }

  function fmtPriceRange(id: string): string | null {
    const p = priceByContact.get(id);
    if (!p || (!p.min && !p.max)) return null;
    const fmt = (n: number) =>
      n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${Math.round(n / 1_000)}k` : `$${n}`;
    if (p.min && p.max) return `${fmt(p.min)} – ${fmt(p.max)}`;
    if (p.min) return `${fmt(p.min)}+`;
    return `up to ${fmt(p.max!)}`;
  }

  // Serialize contacts for the client component
  const rows: ContactRow[] = contacts.map((c) => ({
    id:         c.id,
    firstName:  c.firstName,
    lastName:   c.lastName,
    email:      c.email,
    phone:      formatPhone(c.phone),
    temperature: c.temperature,
    priceRange: fmtPriceRange(c.id),
    workspaces: c.contactWorkspaces.map((cw) => ({
      name: cw.workspace.name,
      slug: cw.workspace.slug,
    })),
    tags: c.contactTags.map((ct) => ({
      id:    ct.tag.id,
      name:  ct.tag.name,
      color: ct.tag.color,
    })),
  }));

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
          <Input name="q" placeholder="Search contacts..." defaultValue={params.q ?? ""} className="max-w-sm" />
          {params.workspace && <input type="hidden" name="workspace" value={params.workspace} />}
        </form>
        {workspaces.length > 0 && (
          <div className="flex items-center gap-2">
            {workspaces.map((ws) => (
              <Link key={ws.id}
                href={params.workspace === ws.slug ? "/contacts" : `/contacts?workspace=${ws.slug}${params.q ? `&q=${params.q}` : ""}`}>
                <Badge variant={params.workspace === ws.slug ? "default" : "outline"} className="cursor-pointer">
                  {ws.name}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ContactsTable
        contacts={rows}
        allTags={allTags}
        allWorkspaces={workspaces.map((w) => ({ id: w.id, name: w.name, color: w.color }))}
      />
    </div>
  );
}
