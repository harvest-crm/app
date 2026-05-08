// Bootstrap: create the first platform admin row if none exist.
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const BOOTSTRAP_EMAIL = "thomas@dstormpg.com";

export async function ensureBootstrapPlatformAdmin(): Promise<void> {
  // Idempotent — if any admin exists, do nothing
  const count = await db.platformAdmin.count();
  if (count > 0) return;

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({
    emailAddress: [BOOTSTRAP_EMAIL],
    limit: 1,
  });

  const user = users[0];
  if (!user) return; // Thomas hasn't signed up yet — will auto-create on first login

  await db.platformAdmin.create({
    data: {
      clerkUserId: user.id,
      email:       BOOTSTRAP_EMAIL,
      grantedBy:   null, // bootstrapped
      isActive:    true,
    },
  });
}
