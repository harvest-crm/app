import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

const TEMPERATURE_COLORS = {
  hot: "bg-red-100 text-red-700",
  warm: "bg-amber-100 text-amber-700",
  cold: "bg-blue-100 text-blue-700",
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
        <p className="text-slate-500">Your organization is not set up yet. Sign out and sign in again.</p>
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

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Contacts</h1>
        <Link href="/contacts/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            New Contact
          </Button>
        </Link>
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
          <p className="text-slate-500">No contacts found.</p>
          <Link href="/contacts/new" className="mt-2 inline-block">
            <Button variant="outline" size="sm">Add your first contact</Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Phone</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Temperature</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                    {c.contactWorkspaces.length > 0 && (
                      <div className="mt-0.5 flex gap-1">
                        {c.contactWorkspaces.map((cw) => (
                          <span key={cw.workspace.slug} className="text-xs text-slate-400">
                            {cw.workspace.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.email ?? ""}</td>
                  <td className="px-4 py-3 text-slate-600">{c.phone ?? ""}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        TEMPERATURE_COLORS[c.temperature as keyof typeof TEMPERATURE_COLORS] ??
                        "bg-slate-100 text-slate-600"
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
