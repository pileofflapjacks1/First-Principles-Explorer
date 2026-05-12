import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 2 * 60 * 60 * 1000; // 2-hour validity window

function getSecret(): string {
  const s = process.env["SESSION_SECRET"];
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

export function issueCreditSessionToken(userId: string): string {
  const issuedAt = Date.now().toString();
  const payload = `${userId}:${issuedAt}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function validateCreditSessionToken(
  token: string | undefined | null,
  userId: string,
): boolean {
  try {
    if (!token) return false;
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return false;
    const payloadB64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const payload = Buffer.from(payloadB64, "base64url").toString();
    const expected = createHmac("sha256", getSecret()).update(payload).digest("base64url");
    // Use timing-safe comparison to prevent timing attacks.
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return false;
    }
    const colonIdx = payload.indexOf(":");
    if (colonIdx === -1) return false;
    const tokenUserId = payload.slice(0, colonIdx);
    const issuedAtStr = payload.slice(colonIdx + 1);
    if (tokenUserId !== userId) return false;
    const issuedAt = parseInt(issuedAtStr, 10);
    if (isNaN(issuedAt) || Date.now() - issuedAt > TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}
