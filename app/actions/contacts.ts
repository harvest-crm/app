"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { formatPhone } from "@/lib/format";

const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  sourceDetail: z.string().max(255).optional().nullable(),
  temperature: z.enum(["hot", "warm", "cold"]).default("warm"),
  notes: z.string().optional().nullable(),
  birthday: z.string().optional().nullable(),
  homeAnniversary: z.string().optional().nullable(),
});

function normalizeContact(data: z.infer<typeof contactSchema>) {
  return {
    ...data,
    email: data.email || null,
    // Strip non-digits so DB always holds clean digits (e.g. "5551234567")
    phone: data.phone ? data.phone.replace(/\D/g, "") || null : null,
    lastName: data.lastName || null,
    source: data.source || null,
    sourceDetail: data.sourceDetail || null,
    notes: data.notes || null,
    birthday: data.birthday ? new Date(data.birthday) : null,
    homeAnniversary: data.homeAnniversary ? new Date(data.homeAnniversary) : null,
  };
}

function extractContactData(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || null,
    email: formData.get("email") || null,
    phone: formData.get("phone") || null,
    source: formData.get("source") || null,
    sourceDetail: formData.get("sourceDetail") || null,
    temperature: formData.get("temperature") || "warm",
    notes: formData.get("notes") || null,
    birthday: formData.get("birthday") || null,
    homeAnniversary: formData.get("homeAnniversary") || null,
  };
}

export async function createContact(formData: FormData) {
  const { organizationId } = await requireOrg();
  const raw = extractContactData(formData);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const contact = await db.contact.create({
    data: {
      organizationId,
      ...normalizeContact(parsed.data),
    },
  });

  const workspaceIds = formData.getAll("workspaceIds") as string[];
  if (workspaceIds.length > 0) {
    const validWorkspaces = await db.workspace.findMany({
      where: { id: { in: workspaceIds }, organizationId },
      select: { id: true },
    });
    await db.contactWorkspace.createMany({
      data: validWorkspaces.map(({ id: workspaceId }) => ({
        contactId: contact.id,
        workspaceId,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/contacts");
  return { id: contact.id };
}

export async function updateContact(id: string, formData: FormData) {
  const { organizationId } = await requireOrg();

  const existing = await db.contact.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Not found" };

  const raw = extractContactData(formData);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await db.contact.update({
    where: { id },
    data: normalizeContact(parsed.data),
  });

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${id}`);
  return { success: true };
}

export async function deleteContact(id: string) {
  const { organizationId } = await requireOrg();

  const existing = await db.contact.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Not found" };

  await db.contact.delete({ where: { id } });

  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function addContactToWorkspace(contactId: string, workspaceId: string, roleLabel?: string) {
  const { organizationId } = await requireOrg();

  const [contact, workspace] = await Promise.all([
    db.contact.findFirst({ where: { id: contactId, organizationId } }),
    db.workspace.findFirst({ where: { id: workspaceId, organizationId } }),
  ]);

  if (!contact || !workspace) return { error: "Not found" };

  await db.contactWorkspace.upsert({
    where: { contactId_workspaceId: { contactId, workspaceId } },
    create: { contactId, workspaceId, roleLabel: roleLabel ?? null },
    update: { roleLabel: roleLabel ?? null },
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function removeContactFromWorkspace(contactId: string, workspaceId: string) {
  const { organizationId } = await requireOrg();

  const contact = await db.contact.findFirst({ where: { id: contactId, organizationId } });
  if (!contact) return { error: "Not found" };

  await db.contactWorkspace.deleteMany({ where: { contactId, workspaceId } });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function addTagToContact(contactId: string, tagId: string) {
  const { organizationId } = await requireOrg();

  const [contact, tag] = await Promise.all([
    db.contact.findFirst({ where: { id: contactId, organizationId } }),
    db.tag.findFirst({ where: { id: tagId, organizationId } }),
  ]);

  if (!contact || !tag) return { error: "Not found" };

  await db.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { contactId, tagId },
    update: {},
  });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  const { organizationId } = await requireOrg();

  const contact = await db.contact.findFirst({ where: { id: contactId, organizationId } });
  if (!contact) return { error: "Not found" };

  await db.contactTag.deleteMany({ where: { contactId, tagId } });

  revalidatePath(`/contacts/${contactId}`);
  return { success: true };
}

// ── CSV Export ──────────────────────────────────────────────────────────────

function csvCell(v: string | null | undefined): string {
  const s = String(v ?? "");
  return /[,"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function fmtDateOnly(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}


const CSV_HEADERS = [
  "First Name", "Last Name", "Email", "Phone",
  "Source", "Source Detail", "Temperature",
  "Birthday", "Home Anniversary", "Notes",
  "Tags", "Workspaces", "Created At",
];

export async function exportContactsToCsv(filters: {
  q?: string;
  workspace?: string;
}): Promise<string> {
  const { organizationId } = await requireOrg();

  const contacts = await db.contact.findMany({
    where: {
      organizationId,
      ...(filters.q
        ? {
            OR: [
              { firstName: { contains: filters.q, mode: "insensitive" } },
              { lastName: { contains: filters.q, mode: "insensitive" } },
              { email: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filters.workspace
        ? { contactWorkspaces: { some: { workspace: { slug: filters.workspace } } } }
        : {}),
    },
    include: {
      contactTags: { include: { tag: { select: { name: true } } } },
      contactWorkspaces: { include: { workspace: { select: { name: true } } } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const rows = contacts.map((c) => {
    const tags = c.contactTags.map((ct) => ct.tag.name).join(", ");
    const workspaces = c.contactWorkspaces.map((cw) => cw.workspace.name).join(", ");
    return [
      c.firstName, c.lastName, c.email, formatPhone(c.phone),
      c.source, c.sourceDetail, c.temperature,
      fmtDateOnly(c.birthday), fmtDateOnly(c.homeAnniversary),
      c.notes, tags, workspaces, c.createdAt.toISOString(),
    ].map(csvCell).join(",");
  });

  return [CSV_HEADERS.join(","), ...rows].join("\r\n") + "\r\n";
}
