import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/jwt"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get("auth_token")?.value ?? null

  const user = token ? await verifyToken(token) : null

  // ── Redirect logged-in users away from /login ──────────────────────────────
  if (pathname === "/login" || pathname === "/") {
    if (user) {
      const dest = user.role === "admin" ? "/admin/dashboard" : "/talent/dashboard"
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
      // Talent trying to access admin — send to their dashboard
      return NextResponse.redirect(new URL("/talent/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // ── Protect /talent routes — talent only ───────────────────────────────────
  if (pathname.startsWith("/talent")) {
    if (!user) {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (user.role !== "talent") {
      // Admin trying to access talent portal — send to their dashboard
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
    "/talent/:path*",
  ],
}