import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith("/signin");
  const isProtected = pathname.startsWith("/dashboard");
  const isHome = pathname === "/";

  // Later: replace with cookie/session check if needed
  const user = req.cookies.get("tw_wallet")?.value;

  // Unauthenticated user
  if (!user && (isProtected || isHome)) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  // Authenticated user
  if (user && (isAuthPage || isHome)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/signin", "/dashboard/:path*"],
};
