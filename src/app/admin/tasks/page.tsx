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
    // lean() returns plain objects — serialize _id (ObjectId) to string
    return tasks.map(t => ({
      ...t,
      _id:       t._id.toString(),
      id:        t._id.toString(),
      clientId:  t.clientId?.toString() ?? undefined,
      createdAt: t.createdAt?.toISOString() ?? "",
      updatedAt: t.updatedAt?.toISOString() ?? "",
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