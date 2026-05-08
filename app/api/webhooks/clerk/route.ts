import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clerkRoleToOurRole } from "@/lib/admin/permissions";

type ClerkOrganizationEvent = {
  type: "organization.created" | "organization.updated" | "organization.deleted";
  data: {
    id: string;
    name: string;
    slug: string;
    created_by?: string;
  };
};

type ClerkMembershipEvent = {
  type:
    | "organizationMembership.created"
    | "organizationMembership.updated"
    | "organizationMembership.deleted";
  data: {
    id: string;
    role: string;
    organization: { id: string; created_by?: string };
    public_user_data: {
      user_id: string;
      identifier: string;
      first_name?: string | null;
      last_name?: string | null;
      image_url?: string | null;
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
  const svixId        = headerPayload.get("svix-id");
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
      "svix-id":        svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  // ── organization.created ──────────────────────────────────────────────────

  if (event.type === "organization.created") {
    await db.organization.upsert({
      where:  { clerkOrgId: event.data.id },
      create: { clerkOrgId: event.data.id, name: event.data.name },
      update: { name: event.data.name },
    });
  }

  // ── organization.updated ──────────────────────────────────────────────────

  if (event.type === "organization.updated") {
    await db.organization.updateMany({
      where: { clerkOrgId: event.data.id },
      data:  { name: event.data.name },
    });
  }

  // ── organizationMembership.created / updated ──────────────────────────────

  if (
    event.type === "organizationMembership.created" ||
    event.type === "organizationMembership.updated"
  ) {
    const { user_id, identifier, first_name, last_name, image_url } = event.data.public_user_data;

    const org = await db.organization.findUnique({
      where:  { clerkOrgId: event.data.organization.id },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ received: true });

    // Determine our role: check if this user has a pending invite with a specific role,
    // or fall back to mapping the Clerk role
    const pendingInvite = await db.organizationInvite.findFirst({
      where: { organizationId: org.id, email: identifier, status: "pending" },
    });

    // Check if this user is the org creator (they get "owner")
    const isOwner = event.data.organization.created_by === user_id;
    const role = pendingInvite
      ? (pendingInvite.role as "owner" | "admin" | "member")
      : clerkRoleToOurRole(event.data.role, isOwner);

    await db.organizationMember.upsert({
      where: {
        organizationId_clerkUserId: { organizationId: org.id, clerkUserId: user_id },
      },
      create: {
        organizationId: org.id,
        clerkUserId:    user_id,
        email:          identifier,
        firstName:      first_name  ?? null,
        lastName:       last_name   ?? null,
        imageUrl:       image_url   ?? null,
        role,
        isActive:       true,
      },
      update: {
        firstName: first_name ?? null,
        lastName:  last_name  ?? null,
        imageUrl:  image_url  ?? null,
        isActive:  true,
        ...(event.type === "organizationMembership.updated" ? { role } : {}),
      },
    });

    // Mark invite as accepted
    if (pendingInvite && event.type === "organizationMembership.created") {
      await db.organizationInvite.update({
        where: { id: pendingInvite.id },
        data:  { status: "accepted", acceptedAt: new Date() },
      });
    }
  }

  // ── organizationMembership.deleted ────────────────────────────────────────

  if (event.type === "organizationMembership.deleted") {
    const org = await db.organization.findUnique({
      where:  { clerkOrgId: event.data.organization.id },
      select: { id: true },
    });
    if (org) {
      await db.organizationMember.updateMany({
        where: {
          organizationId: org.id,
          clerkUserId:    event.data.public_user_data.user_id,
        },
        data: { isActive: false },
      });
    }
  }

  return NextResponse.json({ received: true });
}
