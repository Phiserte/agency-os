import { NextResponse } from "next/server"
import mongoose from "mongoose"

import { connectDB } from "@/lib/db/mongoose"
import { Task, Status, Department } from "@/models/Task"
import { User } from "@/models/User"
import { getCurrentUser } from "@/lib/auth"

const VALID_STATUSES: Status[] = ["backlog", "todo", "inprogress", "review", "done"]

// Every department a manager role can create tasks in. "dev" was previously
// missing here, which would have 422'd any dev-workspace task that tried to
// pass department explicitly.
const VALID_DEPARTMENTS: Department[] = ["marketing", "design", "dev"]

// Maps a manager's role to the department their tasks belong to. This is the
// source of truth for `department` — we no longer trust the client to send
// it, since the "Add task" modal never did, which is why every task was
// landing with department: null.
const ROLE_TO_DEPARTMENT: Record<string, Department> = {
  marketing_manager: "marketing",
  design_manager:     "design",
  dev_manager:         "dev",
}

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    await connectDB()

    const { searchParams } = new URL(req.url)
    const rawStatus     = searchParams.get("status")
    const rawDepartment = searchParams.get("department")
    const rawTalentId   = searchParams.get("talentId")

    const filter: Record<string, unknown> = {}

    if (rawStatus && VALID_STATUSES.includes(rawStatus as Status)) {
      filter.status = rawStatus as Status
    }

    if (rawDepartment && (VALID_DEPARTMENTS as readonly string[]).includes(rawDepartment)) {
      filter.department = rawDepartment
    }

    if (rawTalentId) {
      if (mongoose.Types.ObjectId.isValid(rawTalentId)) {
        filter.talentId = new mongoose.Types.ObjectId(rawTalentId)
      } else {
        filter.assignee = rawTalentId
      }
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
export async function POST(req: Request) {
  try {
    await connectDB()

    let body: Record<string, any>

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

    const { title, priority, assignee, status } = body

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

    if (status && !VALID_STATUSES.includes(status as Status)) {
      return NextResponse.json(
        { error: `Field 'status' must be one of: ${VALID_STATUSES.join(", ")}.` },
        { status: 422 }
      )
    }

    const currentUser = await getCurrentUser()
    const assignedBy = currentUser?.name || ""

    // ── Resolve department server-side ──────────────────────────────────────
    // Manager roles are pinned to their own department, no matter what (or
    // whether) the client sends. Admins may create a task for any
    // department, but must say which one explicitly.
    let department: Department | null = null

    if (currentUser?.role && ROLE_TO_DEPARTMENT[currentUser.role]) {
      department = ROLE_TO_DEPARTMENT[currentUser.role]
    } else if (currentUser?.role === "admin") {
      if (body.department && VALID_DEPARTMENTS.includes(body.department)) {
        department = body.department
      } else {
        return NextResponse.json(
          { error: `Admin task creation requires a 'department' field, one of: ${VALID_DEPARTMENTS.join(", ")}.` },
          { status: 422 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Could not determine department for this task. User role is missing or unrecognized." },
        { status: 403 }
      )
    }

    // ── Handle talentId resolution ──────────────────────────────────────────
    let talentId = body.talentId

    if (!talentId || talentId === "" || !mongoose.Types.ObjectId.isValid(talentId)) {
      talentId = null
    }

    if (!talentId && assignee && typeof assignee === "string") {
      const matchedUser = await User.findOne({ name: assignee }).lean()
      if (matchedUser) {
        talentId = matchedUser._id
      }
    }

    const task = await Task.create({
      ...body,
      department,
      talentId: talentId ? new mongoose.Types.ObjectId(talentId) : null,
      assignedBy,
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("[POST /api/tasks]", error)
    return NextResponse.json(
      { error: "Failed to create task. Please try again." },
      { status: 500 }
    )
  }
}