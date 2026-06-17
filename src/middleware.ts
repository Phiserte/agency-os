import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get("auth_token")?.value ?? null

  const user = token ? await verifyToken(token) : null

  // ── Redirect logged-in users away from /login ──────────────────────────────
  if (pathname === "/login" || pathname === "/") {
    if (user) {
      const dest = user.role === "admin" ? "/admin/dashboard" : "/client/dashboard"
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // ── Protect /admin routes — admin only ─────────────────────────────────────
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (user.role !== "admin") {
      // Client trying to access admin — send to their dashboard
      return NextResponse.redirect(new URL("/client/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // ── Protect /client routes — client only ───────────────────────────────────
  if (pathname.startsWith("/client")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (user.role !== "client") {
      // Admin trying to access client portal — send to their dashboard
      return NextResponse.redirect(new URL("/admin/dashboard", req.url))
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
    "/client/:path*",
  ],
}