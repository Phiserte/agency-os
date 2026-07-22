import { NextResponse } from "next/server"

import { connectDB } from "@/lib/db/mongoose"
import { Task, Status } from "@/models/Task"

const VALID_STATUSES: Status[] = ["backlog", "todo", "inprogress", "review", "done"]
const VALID_DEPARTMENTS = ["marketing", "design"] as const

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
// Returns tasks sorted by newest first.
// Supports optional filters:
//   ?status=      restrict to a single status column
//   ?department=  restrict to a single department (marketing/design boards)
//   ?talentId=    restrict to tasks assigned to a specific talent
// Filters can be combined; all provided filters are ANDed together.
export async function GET(req: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const rawStatus     = searchParams.get("status")
    const rawDepartment = searchParams.get("department")
    const rawTalentId   = searchParams.get("talentId")

    const filter: Record<string, unknown> = {}

    // Cast to Status only if it's a valid enum value — otherwise ignore it
    if (rawStatus && VALID_STATUSES.includes(rawStatus as Status)) {
      filter.status = rawStatus as Status
    }

    if (rawDepartment && (VALID_DEPARTMENTS as readonly string[]).includes(rawDepartment)) {
      filter.department = rawDepartment
    }

    if (rawTalentId) {
      filter.talentId = rawTalentId
    }

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
// Optional: description, assignee, tags, due, status, progress, department, talentId.
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
    const { status, department } = body as Record<string, unknown>
    if (status && !validStatuses.includes(status as string)) {
      return NextResponse.json(
        { error: `Field 'status' must be one of: ${validStatuses.join(", ")}.` },
        { status: 422 }
      )
    }

    if (department && !(VALID_DEPARTMENTS as readonly string[]).includes(department as string)) {
      return NextResponse.json(
        { error: `Field 'department' must be one of: ${VALID_DEPARTMENTS.join(", ")}.` },
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