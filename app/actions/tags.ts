"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

const tagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export async function createTag(formData: FormData) {
  const { organizationId } = await requireOrg();

  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const tag = await db.tag.create({
    data: {
      organizationId,
      name: parsed.data.name,
      color: parsed.data.color ?? "#64748B",
    },
  });

  revalidatePath("/tags");
  return { tag };
}

export async function updateTag(id: string, formData: FormData) {
  const { organizationId } = await requireOrg();

  const existing = await db.tag.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Not found" };

  const parsed = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const tag = await db.tag.update({
    where: { id },
    data: {
      name: parsed.data.name,
      color: parsed.data.color ?? existing.color,
    },
  });

  revalidatePath("/tags");
  return { tag };
}

export async function deleteTag(id: string) {
  const { organizationId } = await requireOrg();

  const existing = await db.tag.findFirst({ where: { id, organizationId } });
  if (!existing) return { error: "Not found" };

  await db.tag.delete({ where: { id } });

  revalidatePath("/tags");
  return { success: true };
}
