"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireOrg } from "@/lib/auth";

export async function logEmailSent(input: {
  contactId?: string;
  dealId?: string;
  workspaceId?: string;
  subject: string;
  bodyPreview: string;
  to: string;
}): Promise<{ success: true } | { error: string }> {
  const { organizationId, userId } = await requireOrg();

  const body = `To: ${input.to}\nSubject: ${input.subject}\n\n${input.bodyPreview}`;

  await db.activity.create({
    data: {
      organizationId,
      type: "email_sent",
      body,
      contactId:   input.contactId   ?? null,
      dealId:      input.dealId      ?? null,
      workspaceId: input.workspaceId ?? null,
      createdByClerkUserId: userId,
    },
  });

  if (input.contactId) revalidatePath(`/contacts/${input.contactId}`);
  if (input.dealId)    revalidatePath(`/workspaces`);

  return { success: true };
}
