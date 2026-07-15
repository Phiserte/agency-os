// src/app/api/admin/talents/[id]/route.ts
import { NextResponse } from "next/server"
import { connectDB }    from "@/lib/db/mongoose"
import { User }         from "@/models/User"
import { Task }         from "@/models/Task"
import { cookies }      from "next/headers"
import { verifyToken }  from "@/lib/auth"

interface RouteContext {
  params: Promise<{ id: string }>
}

async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null
  const user = await verifyToken(token)
  if (!user || user.role !== "admin") return null
  return user
}

// PATCH /api/admin/talents/[id]
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { id } = await context.params

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const allowed = ["name", "email", "company"] as const
    const update: Partial<Record<typeof allowed[number], string>> = {}

    for (const field of allowed) {
      const val = (body as Record<string, unknown>)[field]
      if (typeof val === "string" && val.trim()) {
        update[field] = field === "email" ? val.toLowerCase().trim() : val.trim()
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No valid fields provided" }, { status: 422 })
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-password").lean()

    if (!updated) return NextResponse.json({ error: "Talent not found" }, { status: 404 })

    return NextResponse.json({
      id:      updated._id.toString(),
      name:    updated.name,
      email:   updated.email,
      company: updated.company ?? "",
    }, { status: 200 })
  } catch (error) {
    console.error("[PATCH /api/admin/talents/:id]", error)
    return NextResponse.json({ error: "Failed to update talent" }, { status: 500 })
  }
}

// DELETE /api/admin/talents/[id]
// Also unlinks their tasks (sets talentId to null)
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin()
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { id } = await context.params

    const deleted = await User.findByIdAndDelete(id).lean()
    if (!deleted) return NextResponse.json({ error: "Talent not found" }, { status: 404 })

    // Unlink their tasks so they don't disappear from the board
    await Task.updateMany({ talentId: id }, { $set: { talentId: null } })

    return NextResponse.json({ success: true, id }, { status: 200 })
  } catch (error) {
    console.error("[DELETE /api/admin/talents/:id]", error)
    return NextResponse.json({ error: "Failed to delete talent" }, { status: 500 })
  }
}
