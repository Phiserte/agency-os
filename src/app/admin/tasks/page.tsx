// src/app/tasks/page.tsx
// Server Component — fetches tasks from MongoDB and passes them to the board.
// KanbanBoard handles all interactivity client-side.

import { connectDB } from "@/lib/db/mongoose"
import { Task } from "@/models/Task"
import KanbanBoard from "@/components/kanban/KanbanBoard"

async function getTasks() {
  try {
    await connectDB()
    const tasks = await Task.find().sort({ createdAt: -1 }).lean()
    // lean() returns plain objects — serialize all ObjectId fields to strings
    return tasks.map(t => ({
      id:          t._id.toString(),
      title:       t.title,
      description: t.description ?? "",
      priority:    t.priority,
      status:      t.status,
      assignee:    t.assignee ?? "",
      talentId:    t.talentId?.toString() ?? undefined,
      tags:        t.tags ?? [],
      due:         t.due ?? "",
      progress:    t.progress ?? 0,
      createdAt:   t.createdAt?.toISOString() ?? "",
      updatedAt:   t.updatedAt?.toISOString() ?? "",
    }))
  } catch (error) {
    console.error("[TasksPage] Failed to fetch tasks:", error)
    return []
  }
}

export default async function TasksPage() {
  const tasks = await getTasks()

  return <KanbanBoard tasks={tasks} />
}