// src/app/api/tasks/[id]/comments/route.ts

import { NextResponse } from "next/server"
import { connectDB }    from "@/lib/db/mongoose"
import { Comment }      from "@/models/Comment"
import { getCurrentUser } from "@/lib/auth"
import { cookies }      from "next/headers"
import { verifyToken }  from "@/lib/auth"

interface RouteContext {
  params: Promise<{ id: string }>
}

async function getUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth_token")?.value
  if (!token) return null
  return verifyToken(token)
}

// GET /api/tasks/[id]/comments
export async function GET(req: Request, context: RouteContext) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { id } = await context.params

    const comments = await Comment.find({ taskId: id })
      .sort({ createdAt: 1 })
      .lean()

    const serialized = comments.map(c => ({
      id:         c._id.toString(),
      taskId:     c.taskId.toString(),
      authorId:   c.authorId.toString(),
      authorName: c.authorName,
      authorRole: c.authorRole,
      message:    c.message,
      createdAt:  c.createdAt.toISOString(),
    }))

    return NextResponse.json(serialized, { status: 200 })
  } catch (error) {
    console.error("[GET /api/tasks/:id/comments]", error)
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 })
  }
}

// POST /api/tasks/[id]/comments
export async function POST(req: Request, context: RouteContext) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await connectDB()
    const { id } = await context.params

    let body: unknown
    try { body = await req.json() } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const { message } = (body ?? {}) as Record<string, unknown>

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 422 })
    }

    const comment = await Comment.create({
      taskId:     id,
      authorId:   user.id,
      authorName: user.name,
      authorRole: user.role,
      message:    message.trim(),
    })

    return NextResponse.json({
      id:         comment._id.toString(),
      taskId:     comment.taskId.toString(),
      authorId:   comment.authorId.toString(),
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      message:    comment.message,
      createdAt:  comment.createdAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/tasks/:id/comments]", error)
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 })
  }
}