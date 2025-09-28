import crypto from "crypto";

const SECRET = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "fallback-secret";

export function signPreview(payload: { slug: string; version: number; exp: number }) {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
  return Buffer.from(JSON.stringify({ d: payload, s: sig })).toString("base64url");
}

export function verifyPreview(token: string): { slug: string; version: number } | null {
  try {
    const raw = JSON.parse(Buffer.from(token, "base64url").toString());
    const data = JSON.stringify(raw.d);
    const sig = crypto.createHmac("sha256", SECRET).update(data).digest("hex");
    if (sig !== raw.s) return null;
    if (typeof raw.d?.exp !== "number" || Date.now() > raw.d.exp) return null;
    return { slug: raw.d.slug, version: Number(raw.d.version) };
  } catch {
    return null;
  }
}
