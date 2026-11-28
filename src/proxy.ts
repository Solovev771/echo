import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE = "aura_stash_session";

/** Logged-out warehouse URLs bounce before any database work, so the screen is never stuck on “AURA”. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/stash/login" || pathname.startsWith("/stash/icons/")) {
    return NextResponse.next();
  }
  if (pathname === "/stash/manifest.webmanifest") return NextResponse.next();
  if (!request.cookies.get(COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/stash/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/stash", "/stash/:path*"],
};
