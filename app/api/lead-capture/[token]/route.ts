import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// In-memory; resets on cold start. Fine for Phase 1 abuse prevention.

const rateMap = new Map<string, { count: number; reset: number }>();

function isRateLimited(ip: string): boolean {
  const now    = Date.now();
  const bucket = rateMap.get(ip);
  if (!bucket || now > bucket.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  if (bucket.count >= 10) return true;
  bucket.count++;
  return false;
}

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// ── OPTIONS (preflight) ───────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS });
  }

  // Parse body — support JSON and form-urlencoded
  let body: Record<string, string> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = await req.json();
    } else if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      fd.forEach((v, k) => { body[k] = String(v); });
    } else {
      // Try JSON as fallback
      const text = await req.text();
      if (text) body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers: CORS });
  }

  // Look up workspace by token
  const workspace = await db.workspace.findUnique({
    where: { webhookToken: token },
    select: { id: true, organizationId: true },
  });
  if (!workspace) {
    return NextResponse.json({ error: "invalid token" }, { status: 404, headers: CORS });
  }

  const {
    firstName, lastName, email, phone,
    source, sourceDetail, notes, temperature,
  } = body as Record<string, string | undefined>;

  // Validate — need at least firstName or email
  if (!firstName?.trim() && !email?.trim()) {
    return NextResponse.json(
      { error: "Provide at least firstName or email" },
      { status: 400, headers: CORS },
    );
  }

  // Create contact
  const contact = await db.contact.create({
    data: {
      organizationId: workspace.organizationId,
      firstName:      firstName?.trim()  || "Unknown",
      lastName:       lastName?.trim()   || null,
      email:          email?.trim()      || null,
      phone:          phone?.replace(/\D/g, "") || null,
      source:         source?.trim()     || "Lead Capture",
      sourceDetail:   sourceDetail?.trim() || null,
      notes:          notes?.trim()      || null,
      temperature:    ["hot", "warm", "cold"].includes(temperature ?? "") ? temperature! : "warm",
    },
  });

  // Attach to workspace
  await db.contactWorkspace.create({
    data: { contactId: contact.id, workspaceId: workspace.id },
  });

  return NextResponse.json(
    { success: true, contactId: contact.id },
    { status: 200, headers: CORS },
  );
}
