import { NextResponse } from "next/server"

import { connectDB } from "@/lib/db/mongoose"
import { Task, Status } from "@/models/Task"

const VALID_STATUSES: Status[] = ["backlog", "todo", "inprogress", "review", "done"]

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
// Returns all tasks sorted by newest first.
// Supports optional ?status= filter to fetch tasks for a specific column.
export async function GET(req: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const rawStatus = searchParams.get("status")

    // Cast to Status only if it's a valid enum value — otherwise ignore it
    const filter = rawStatus && VALID_STATUSES.includes(rawStatus as Status)
      ? { status: rawStatus as Status }
      : {}

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(tasks, { status: 200 })
  } catch (error) {
    console.error("[GET /api/tasks]", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks. Please try again." },
      { status: 500 }
    )
  }
}

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
// Creates a new task. Requires { title, priority } in the request body.
// Optional: description, assignee, tags, due, status, progress.
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

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be an object." },
        { status: 400 }
      )
    }

    const { title, priority } = body as Record<string, unknown>

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Field 'title' is required and must be a non-empty string." },
        { status: 422 }
      )
    }

    const validPriorities = ["high", "medium", "low"]
    if (priority && !validPriorities.includes(priority as string)) {
      return NextResponse.json(
        { error: `Field 'priority' must be one of: ${validPriorities.join(", ")}.` },
        { status: 422 }
      )
    }

    const validStatuses = ["backlog", "todo", "inprogress", "review", "done"]
    const { status } = body as Record<string, unknown>
    if (status && !validStatuses.includes(status as string)) {
      return NextResponse.json(
        { error: `Field 'status' must be one of: ${validStatuses.join(", ")}.` },
        { status: 422 }
      )
    }

    const task = await Task.create(body)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("[POST /api/tasks]", error)
    return NextResponse.json(
      { error: "Failed to create task. Please try again." },
      { status: 500 }
    )
  }
}