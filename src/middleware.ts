import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"
import { ROUTE_ACCESS, ROLE_HOME } from "@/lib/roles"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get("auth_token")?.value ?? null

  const user = token ? await verifyToken(token) : null

  // ── Redirect logged-in users away from /login or / ─────────────────────────
  if (pathname === "/login" || pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL(ROLE_HOME[user.role], req.url))
    }
    return NextResponse.next()
  }

  // ── Route-prefix based access control ───────────────────────────────────────
  // Add a new protected section by editing ROUTE_ACCESS in src/lib/roles.ts —
  // no need to add another "if" branch here.
  const match = ROUTE_ACCESS.find(r => pathname.startsWith(r.prefix))
  if (match) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (!match.roles.includes(user.role)) {
      // Logged in, but this role isn't allowed here — send them home instead
      return NextResponse.redirect(new URL(ROLE_HOME[user.role], req.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/marketing/:path*",
    "/design/:path*",
    "/talent/:path*",
  ],
}