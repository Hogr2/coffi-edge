import { NextRequest, NextResponse } from "next/server";

// Redirect UX only: sends unauthenticated dashboard requests to the /labobo
// login page. Real verification (HMAC check) happens server-side in
// requireAuth() — every future Server Action must call it on its first line.
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /labobo itself is the login page and must stay reachable.
  if (pathname !== "/labobo" && !request.cookies.get("session")?.value) {
    return NextResponse.redirect(new URL("/labobo", request.url));
  }

  return NextResponse.next();
}

// Scoped to the dashboard only — "/", /_next/*, static assets, favicon,
// manifest/icons are never touched by this proxy.
export const config = {
  matcher: ["/labobo/:path*"],
};
