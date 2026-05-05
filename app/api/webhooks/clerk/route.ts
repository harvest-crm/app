import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type ClerkOrganizationEvent = {
  type: "organization.created" | "organization.updated" | "organization.deleted";
  data: {
    id: string;
    name: string;
    slug: string;
  };
};

type ClerkMembershipEvent = {
  type: "organizationMembership.created" | "organizationMembership.deleted";
  data: {
    id: string;
    role: string;
    organization: { id: string };
    public_user_data: {
      user_id: string;
      identifier: string;
    };
  };
};

type ClerkEvent = ClerkOrganizationEvent | ClerkMembershipEvent;

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();

  const wh = new Webhook(webhookSecret);
  let event: ClerkEvent;

  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "organization.created") {
    await db.organization.upsert({
      where: { clerkOrgId: event.data.id },
      create: {
        clerkOrgId: event.data.id,
        name: event.data.name,
      },
      update: {
        name: event.data.name,
      },
    });
  }

  if (event.type === "organization.updated") {
    await db.organization.updateMany({
      where: { clerkOrgId: event.data.id },
      data: { name: event.data.name },
    });
  }

  if (event.type === "organizationMembership.created") {
    const org = await db.organization.findUnique({
      where: { clerkOrgId: event.data.organization.id },
      select: { id: true },
    });

    if (org) {
      await db.organizationMember.upsert({
        where: {
          organizationId_clerkUserId: {
            organizationId: org.id,
            clerkUserId: event.data.public_user_data.user_id,
          },
        },
        create: {
          organizationId: org.id,
          clerkUserId: event.data.public_user_data.user_id,
          email: event.data.public_user_data.identifier,
          role: event.data.role,
        },
        update: {
          role: event.data.role,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
