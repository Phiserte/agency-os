import { NextResponse } from "next/server"

import { connectDB } from "@/lib/db/mongoose"
import { User }      from "@/models/User"
import { signToken, setAuthCookie } from "@/lib/auth"
import { ROLE_HOME } from "@/lib/roles"

export async function POST(req: Request) {
  try {
    await connectDB()

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      )
    }

    const { email, password } = (body ?? {}) as Record<string, unknown>

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 422 }
      )
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required." },
        { status: 422 }
      )
    }

    // select: false on password — must explicitly include it
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select("+password")

    if (!user) {
      // Same message for both "not found" and "wrong password" — prevents enumeration
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    const valid = await user.comparePassword(password)
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      )
    }

    // Sign JWT
    const token = await signToken({
      id:    user._id.toString(),
      email: user.email,
      role:  user.role,
      name:  user.name,
    })

    await setAuthCookie(token)

    // Tell the client where to redirect based on role
    const redirectTo = ROLE_HOME[user.role as keyof typeof ROLE_HOME] || "/talent/dashboard"

    return NextResponse.json(
      { success: true, role: user.role, redirectTo },
      { status: 200 }
    )
  } catch (error) {
    console.error("[POST /api/auth/login]", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
