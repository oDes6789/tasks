import { createHmac, timingSafeEqual } from "crypto";

const DEFAULT_SECRET = "tcgv-dev-session-secret-change-me";

export interface SessionPayload {
  userId: number;
  expiresAt: number;
}

function getSecret(): string {
  return process.env.SESSION_SECRET || DEFAULT_SECRET;
}

export function createSessionToken(userId: number, ttlMs: number): string {
  const expiresAt = Date.now() + ttlMs;
  const payload = JSON.stringify({ userId, expiresAt });
  const payloadB64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(payloadB64).digest("base64url");

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionPayload;
    if (typeof payload.userId !== "number" || typeof payload.expiresAt !== "number") return null;
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
