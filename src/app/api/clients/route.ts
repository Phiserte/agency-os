// src/app/api/clients/route.ts
// Returns all client users — used by admin task modal to assign tasks to clients

import { NextResponse } from "next/server"
import { connectDB }    from "@/lib/db/mongoose"
import { User }         from "@/models/User"
import { getCurrentUser } from "@/lib/auth"
import { cookies }      from "next/headers"

export async function GET() {
  try {
    // Only admins can fetch client list
    const cookieStore = await cookies()
    const token = cookieStore.get("auth_token")?.value
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const clients = await User.find({ role: "client" })
      .select("_id name email company")
      .sort({ name: 1 })
      .lean()

    const serialized = clients.map(c => ({
      id:      c._id.toString(),
      name:    c.name,
      email:   c.email,
      company: c.company ?? "",
    }))

    return NextResponse.json(serialized, { status: 200 })
  } catch (error) {
    console.error("[GET /api/clients]", error)
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
  }
}