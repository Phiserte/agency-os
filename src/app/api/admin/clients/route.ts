// src/app/api/admin/clients/route.ts
import { NextResponse } from "next/server"
import { connectDB }    from "@/lib/db/mongoose"
import { User }         from "@/models/User"
import { Task }         from "@/models/Task"
import { cookies }      from "next/headers"
import { verifyToken }  from "@/lib/auth"
import bcrypt           from "bcryptjs"

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null
  const user = await verifyToken(token)
  if (!user || user.role !== "admin") return null
  return user
}

// GET /api/admin/clients
// Returns all clients with their task counts
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const clients = await User.find({ role: "client" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean()

    // Get task counts per client in one query
    const clientIds = clients.map(c => c._id)
    const taskCounts = await Task.aggregate([
      { $match: { clientId: { $in: clientIds } } },
      { $group: { _id: "$clientId", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
    ])

    const countMap = new Map(taskCounts.map(t => [t._id.toString(), t]))

    const serialized = clients.map(c => {
      const counts = countMap.get(c._id.toString())
      return {
        id:        c._id.toString(),
        name:      c.name,
        email:     c.email,
        company:   c.company ?? "",
        createdAt: c.createdAt?.toISOString() ?? "",
        tasks: {
          total: counts?.total ?? 0,
          done:  counts?.done  ?? 0,
        },
      }
    })

    return NextResponse.json(serialized, { status: 200 })
  } catch (error) {
    console.error("[GET /api/admin/clients]", error)
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
  }
}

// POST /api/admin/clients
// Invite a new client — creates User with role "client"
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { name, email, company, password } = (body ?? {}) as Record<string, unknown>

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 422 })
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 422 })
    }

    // Check duplicate
    const existing = await User.findOne({ email: (email as string).toLowerCase().trim() })
    if (existing) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    // Use provided password or generate a temp one
    const rawPassword  = (typeof password === "string" && password.trim())
      ? password.trim()
      : Math.random().toString(36).slice(-10) + "A1!"

    const hashed = await bcrypt.hash(rawPassword, 12)

    const client = await User.create({
      name:     (name as string).trim(),
      email:    (email as string).toLowerCase().trim(),
      password: hashed,
      company:  typeof company === "string" ? company.trim() : "",
      role:     "client",
    })

    return NextResponse.json({
      id:          client._id.toString(),
      name:        client.name,
      email:       client.email,
      company:     client.company,
      createdAt:   client.createdAt.toISOString(),
      // Return temp password so admin can share with client
      tempPassword: rawPassword,
      tasks: { total: 0, done: 0 },
    }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/clients]", error)
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
  }
}