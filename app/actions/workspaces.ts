"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";
import { hasRole } from "@/lib/admin/server-permissions";
import { seedWorkspaceTemplate } from "@/lib/profession-templates";
import { randomBytes } from "crypto";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  professionTemplate: z.enum(["real_estate", "web_design", "coaching", "consulting", "generic"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const updateSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createWorkspace(formData: FormData) {
  const { organizationId } = await requireOrg();

  const raw = {
    name: formData.get("name"),
    professionTemplate: formData.get("professionTemplate"),
    color: formData.get("color") || undefined,
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, professionTemplate, color } = parsed.data;

  let slug = toSlug(name);
  const existing = await db.workspace.findMany({
    where: { organizationId, slug: { startsWith: slug } },
    select: { slug: true },
  });
  if (existing.length > 0) {
    slug = `${slug}-${existing.length + 1}`;
  }

  const webhookToken = randomBytes(32).toString("hex");

  const workspace = await db.workspace.create({
    data: {
      organizationId,
      name,
      slug,
      color: color ?? "#1E293B",
      professionTemplate,
      webhookToken,
    },
  });

  await seedWorkspaceTemplate(workspace.id, organizationId, professionTemplate);

  revalidatePath("/settings/workspaces");
  return { workspace };
}

export async function updateWorkspace(formData: FormData) {
  const { organizationId } = await requireOrg();

  const raw = {
    id: formData.get("id"),
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { id, name, color } = parsed.data;

  const workspace = await db.workspace.findFirst({
    where: { id, organizationId },
  });
  if (!workspace) return { error: "Not found" };

  const updated = await db.workspace.update({
    where: { id },
    data: { name, color: color ?? workspace.color },
  });

  revalidatePath("/settings/workspaces");
  return { workspace: updated };
}

export async function deleteWorkspace(id: string) {
  const { organizationId } = await requireOrg();
  if (!(await hasRole("admin"))) return { error: "Admin permission required to delete a workspace." };

  const workspace = await db.workspace.findFirst({
    where: { id, organizationId },
  });
  if (!workspace) return { error: "Not found" };

  await db.workspace.delete({ where: { id } });

  revalidatePath("/settings/workspaces");
  return { success: true };
}

export async function getWorkspaces() {
  const { organizationId } = await requireOrg();

  return db.workspace.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function regenerateWebhookToken(
  workspaceId: string,
): Promise<{ token: string } | { error: string }> {
  const { organizationId } = await requireOrg();

  const ws = await db.workspace.findFirst({ where: { id: workspaceId, organizationId } });
  if (!ws) return { error: "Workspace not found" };

  const token = randomBytes(32).toString("hex");
  await db.workspace.update({ where: { id: workspaceId }, data: { webhookToken: token } });

  return { token };
}
