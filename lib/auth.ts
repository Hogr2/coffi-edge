import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "session";
const MAX_AGE_SECONDS = 365 * 24 * 60 * 60;
// Lower-bound tolerance only — never widen the upper bound (prevents the
// "issued at future" class of bugs seen in production before).
const CLOCK_SKEW_SECONDS = 5;

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", process.env.SESSION_SECRET!)
    .update(payload)
    .digest("base64url");
}

// Hash both sides first so timingSafeEqual gets equal-length buffers and the
// comparison leaks nothing about length or content.
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function login(password: string): Promise<boolean> {
  if (!safeEqual(password, process.env.APP_PASSWORD!)) return false;

  // All session timestamps are Unix/UTC only — never local timezone.
  const payload = Buffer.from(
    JSON.stringify({ iat: Math.floor(Date.now() / 1000) })
  ).toString("base64url");
  const token = `${payload}.${sign(payload)}`;

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

export async function getSession(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;

  try {
    const { iat } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof iat !== "number") return false;
    const age = Math.floor(Date.now() / 1000) - iat;
    return age >= -CLOCK_SKEW_SECONDS && age <= MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}

export async function requireAuth(): Promise<void> {
  if (!(await getSession())) redirect("/labobo");
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
