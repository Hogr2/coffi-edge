import "server-only";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
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

// Brute-force protection: a fixed delay on every failure plus a sliding-window
// lockout per IP (in-memory — resets on server restart, which is fine here).
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES_PER_WINDOW = 10;
const FAILURE_DELAY_MS = 1000;
const failedAttempts = new Map<string, number[]>();

async function clientIp(): Promise<string> {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  );
}

export async function login(password: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !process.env.SESSION_SECRET) return false;

  const ip = await clientIp();
  const now = Date.now();
  const recentFailures = (failedAttempts.get(ip) ?? []).filter(
    (time) => now - time < FAILURE_WINDOW_MS
  );

  if (recentFailures.length >= MAX_FAILURES_PER_WINDOW) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return false;
  }

  if (!safeEqual(password, expected)) {
    recentFailures.push(now);
    failedAttempts.set(ip, recentFailures);
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return false;
  }
  failedAttempts.delete(ip);

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
  if (!process.env.SESSION_SECRET) return false;
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
