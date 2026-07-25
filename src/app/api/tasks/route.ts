import { NextResponse } from "next/server"
import mongoose from "mongoose"

import { connectDB } from "@/lib/db/mongoose"
import { Task, Status } from "@/models/Task"
import { User } from "@/models/User" // Imported User model to lookup talent IDs
import { getCurrentUser } from "@/lib/auth"

const VALID_STATUSES: Status[] = ["backlog", "todo", "inprogress", "review", "done"]
const VALID_DEPARTMENTS = ["marketing", "design"] as const

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

    // Cast rawTalentId string into an ObjectId for Mongoose queries
    if (rawTalentId) {
      if (mongoose.Types.ObjectId.isValid(rawTalentId)) {
        filter.talentId = new mongoose.Types.ObjectId(rawTalentId)
      } else {
        // Fallback search by assignee name if an invalid/string ID was passed
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

    const { title, priority, assignee } = body

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
    const { status, department } = body
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

    // Capture who is assigning this task
    const currentUser = await getCurrentUser()
    const assignedBy = currentUser?.name || ""

    // ── Handle talentId resolution ──────────────────────────────────────────────
    let talentId = body.talentId

    // Clean empty string inputs
    if (!talentId || talentId === "" || !mongoose.Types.ObjectId.isValid(talentId)) {
      talentId = null
    }

    // Fallback: If talentId was missing/null but an assignee name was passed ("Tejas")
    if (!talentId && assignee && typeof assignee === "string") {
      const matchedUser = await User.findOne({ name: assignee }).lean()
      if (matchedUser) {
        talentId = matchedUser._id
      }
    }

    const task = await Task.create({
      ...body,
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