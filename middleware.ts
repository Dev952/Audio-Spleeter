import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

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

  const token = req.cookies.get("auth-token")?.value;

  const isPublic = publicPaths.has(pathname);
  const isProtectedRoute = ["/", "/home", "/effects", "/history"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  // If no token and hitting protected route → redirect to login
  if (!token && isProtectedRoute && !isPublic) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token) {
    try {
      // Decode/verify JWT
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      // Handle Pro-only routes
      if (pathname.startsWith("/effects") && decoded.plan !== "pro") {
        const upgradeUrl = req.nextUrl.clone();
        upgradeUrl.pathname = "/upgrade"; // redirect to pricing/upgrade page
        return NextResponse.redirect(upgradeUrl);
      }

      // Redirect logged-in users away from login/signup
      if (pathname === "/login" || pathname === "/signup") {
        const homeUrl = req.nextUrl.clone();
        homeUrl.pathname = "/";
        return NextResponse.redirect(homeUrl);
      }
    } catch (err) {
      // Invalid or expired token → redirect to login
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = "/login";
      return NextResponse.redirect(loginUrl);
    }
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
    "/upgrade",
  ],
};
