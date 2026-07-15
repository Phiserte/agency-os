// src/app/api/admin/talents/route.ts
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

// GET /api/admin/talents
// Returns all talents with their task counts
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()

    const talents = await User.find({ role: "talent" })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean()

    // Get task counts per talent in one query
    const talentIds = talents.map(c => c._id)
    const taskCounts = await Task.aggregate([
      { $match: { talentId: { $in: talentIds } } },
      { $group: { _id: "$talentId", total: { $sum: 1 }, done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } } } },
    ])

    const countMap = new Map(taskCounts.map(t => [t._id.toString(), t]))

    const serialized = talents.map(c => {
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
    console.error("[GET /api/admin/talents]", error)
    return NextResponse.json({ error: "Failed to fetch talents" }, { status: 500 })
  }
}

// POST /api/admin/talents
// Invite a new talent — creates User with role "talent"
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

    

    const talent = await User.create({
  name:     (name as string).trim(),
  email:    (email as string).toLowerCase().trim(),
  password: rawPassword,   // ← pass the PLAIN password, let pre("save") hash it
  company:  typeof company === "string" ? company.trim() : "",
  role:     "talent",
})

    return NextResponse.json({
      id:          talent._id.toString(),
      name:        talent.name,
      email:       talent.email,
      company:     talent.company,
      createdAt:   talent.createdAt.toISOString(),
      // Return temp password so admin can share with talent
      tempPassword: rawPassword,
      tasks: { total: 0, done: 0 },
    }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/talents]", error)
    return NextResponse.json({ error: "Failed to create talent" }, { status: 500 })
  }
}
