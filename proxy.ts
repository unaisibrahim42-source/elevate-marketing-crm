import { NextRequest, NextResponse } from "next/server";

// Lightweight edge-safe gate: redirects to /crm/login when there's no
// session cookie at all. The real authorization check (does the session
// still exist / is it expired / is the user active) happens server-side
// in app/crm/layout.tsx via getCurrentUser(), which has full DB access.
const PUBLIC_CRM_PATHS = ["/crm/login", "/crm/sign"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/crm")) return NextResponse.next();
  if (PUBLIC_CRM_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasSession = request.cookies.has("crm_session");
  if (!hasSession) {
    const loginUrl = new URL("/crm/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/crm/:path*"],
};
