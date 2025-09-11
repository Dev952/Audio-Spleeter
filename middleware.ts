import { NextRequest, NextResponse } from "next/server";

// Pages that should be accessible without auth
const publicPaths = new Set<string>(["/login", "/signup", "/favicon.ico"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    /\.(.*)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const authToken = req.cookies.get("auth-token")?.value;

  const isPublic = publicPaths.has(pathname);
  const isProtectedRoute = ["/", "/home", "/effects", "/history"].some((p) =>
    pathname === p || pathname.startsWith(`${p}/`)
  );

  // If user is not authenticated and hits a protected route -> redirect to login
  if (!authToken && isProtectedRoute && !isPublic) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and tries to access login or signup, redirect to home
  if (authToken && (pathname === "/login" || pathname === "/signup")) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/home/:path*",
    "/effects/:path*",
    "/history/:path*",
    "/login",
    "/signup",
  ],
};


