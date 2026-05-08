// Impersonation cookie: base64url(JSON) + "." + hex(HMAC-SHA256)
// Server-only — do NOT import from client components.

import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "covenant_imp";
const MAX_AGE_MS  = 60 * 60 * 1000; // 1 hour

function secret(): string {
  const s = process.env.ADMIN_IMPERSONATION_SECRET;
  if (!s) throw new Error("ADMIN_IMPERSONATION_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

function unb64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

export type ImpersonationContext = {
  orgId: string;
  adminUserId: string;
  startedAt: number;
};

export function buildImpersonationToken(ctx: ImpersonationContext): string {
  const payload = b64url(JSON.stringify(ctx));
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export async function getImpersonationContext(): Promise<ImpersonationContext | null> {
  try {
    const jar   = await cookies();
    const raw   = jar.get(COOKIE_NAME)?.value;
    if (!raw) return null;

    const [payload, sig] = raw.split(".");
    if (!payload || !sig) return null;

    // Timing-safe comparison
    const expectedSig = sign(payload);
    const sigBuf = Buffer.from(sig, "hex");
    const expBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;

    const ctx = JSON.parse(unb64url(payload)) as ImpersonationContext;

    // Check expiry
    if (Date.now() - ctx.startedAt > MAX_AGE_MS) {
      // Expired — clear it
      jar.delete(COOKIE_NAME);
      return null;
    }

    return ctx;
  } catch {
    return null;
  }
}

export async function setImpersonationCookie(ctx: ImpersonationContext): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, buildImpersonationToken(ctx), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   60 * 60, // seconds
  });
}

export async function clearImpersonationCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// Call this at the top of every mutating server action.
// Throws if impersonation is active — reads are still allowed.
export async function blockIfImpersonating(): Promise<void> {
  const ctx = await getImpersonationContext();
  if (ctx) {
    throw new Error("Read-only during impersonation — this action is blocked.");
  }
}
