import { NextResponse } from "next/server"

import { connectDB } from "@/lib/db/mongoose"
import { Task } from "@/models/Task"

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Fields the client is allowed to update. All others are stripped. */
const ALLOWED_UPDATE_FIELDS = [
  "title",
  "description",
  "priority",
  "assignee",
  "clientId",
  "tags",
  "due",
  "status",
  "progress",
] as const

type AllowedField = (typeof ALLOWED_UPDATE_FIELDS)[number]

const VALID_PRIORITIES = ["high", "medium", "low"] as const
const VALID_STATUSES   = ["backlog", "todo", "inprogress", "review", "done"] as const

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── PATCH /api/tasks/[id] ────────────────────────────────────────────────────
// Partially updates a task. Only whitelisted fields are applied.
// Returns the updated task document.
export async function PATCH(req: Request, context: RouteContext) {
  try {
    await connectDB()

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required." },
        { status: 400 }
      )
    }

    let body: Record<string, unknown>

    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      )
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Request body must be a plain object." },
        { status: 400 }
      )
    }

    // Strip any fields not in the whitelist
    const sanitized = ALLOWED_UPDATE_FIELDS.reduce<Partial<Record<AllowedField, unknown>>>(
      (acc, field) => {
        if (field in body) acc[field] = body[field]
        return acc
      },
      {}
    )

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json(
        { error: `No valid fields provided. Allowed fields: ${ALLOWED_UPDATE_FIELDS.join(", ")}.` },
        { status: 422 }
      )
    }

    // Field-level validation
    if ("title" in sanitized) {
      const title = sanitized.title
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { error: "Field 'title' must be a non-empty string." },
          { status: 422 }
        )
      }
      sanitized.title = title.trim()
    }

    if ("priority" in sanitized && !VALID_PRIORITIES.includes(sanitized.priority as typeof VALID_PRIORITIES[number])) {
      return NextResponse.json(
        { error: `Field 'priority' must be one of: ${VALID_PRIORITIES.join(", ")}.` },
        { status: 422 }
      )
    }

    if ("status" in sanitized && !VALID_STATUSES.includes(sanitized.status as typeof VALID_STATUSES[number])) {
      return NextResponse.json(
        { error: `Field 'status' must be one of: ${VALID_STATUSES.join(", ")}.` },
        { status: 422 }
      )
    }

    if ("progress" in sanitized) {
      const progress = sanitized.progress
      if (typeof progress !== "number" || progress < 0 || progress > 100) {
        return NextResponse.json(
          { error: "Field 'progress' must be a number between 0 and 100." },
          { status: 422 }
        )
      }
    }

    if ("tags" in sanitized) {
      if (!Array.isArray(sanitized.tags) || !(sanitized.tags as unknown[]).every(t => typeof t === "string")) {
        return NextResponse.json(
          { error: "Field 'tags' must be an array of strings." },
          { status: 422 }
        )
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { $set: sanitized },
      { new: true, runValidators: true }
    ).lean()

    if (!updatedTask) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      )
    }

    return NextResponse.json(updatedTask, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/tasks/:id]', error)
    return NextResponse.json(
      { error: "Failed to update task. Please try again." },
      { status: 500 }
    )
  }
}

// ─── DELETE /api/tasks/[id] ───────────────────────────────────────────────────
// Permanently deletes a task by ID.
// Returns { success: true, id } on success, 404 if the task doesn't exist.
export async function DELETE(req: Request, context: RouteContext) {
  try {
    await connectDB()

    const { id } = await context.params

    if (!id) {
      return NextResponse.json(
        { error: "Task ID is required." },
        { status: 400 }
      )
    }

    const deleted = await Task.findByIdAndDelete(id).lean()

    if (!deleted) {
      return NextResponse.json(
        { error: "Task not found." },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, id },
      { status: 200 }
    )
  } catch (error) {
    console.error('[DELETE /api/tasks/:id]', error)
    return NextResponse.json(
      { error: "Failed to delete task. Please try again." },
      { status: 500 }
    )
  }
}