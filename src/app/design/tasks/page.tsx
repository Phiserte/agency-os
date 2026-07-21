// src/app/marketing/dashboard/page.tsx
// Server Component — fetches only tasks belonging to the "marketing"
// department and renders the shared KanbanBoard scoped to it.
// Accessible to "admin" and "marketing_manager" roles (see middleware.ts /
// src/lib/roles.ts ROUTE_ACCESS).

import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import KanbanBoard, { type Task as BoardTask } from "@/components/kanban/KanbanBoard"

async function getMarketingTasks(): Promise<BoardTask[]> {
  await connectDB()

  const tasks = await Task.find({ department: "design" })
    .sort({ createdAt: -1 })
    .lean()

  return tasks.map(t => ({
    id:          t._id.toString(),
    _id:         t._id.toString(),
    title:       t.title,
    description: t.description ?? "",
    priority:    (t.priority as BoardTask["priority"]) ?? "medium",
    status:      (t.status as BoardTask["status"]) ?? "backlog",
    assignee:    t.assignee ?? "",
    clientId:    t.talentId ? t.talentId.toString() : undefined,
    tags:        t.tags ?? [],
    due:         t.due ?? "",
    progress:    t.progress ?? 0,
    department:  t.department ?? "design",
  }))
}

export default async function MarketingDashboardPage() {
  const user = await getCurrentUser()

  // Middleware already blocks unauthorized roles from reaching this route,
  // but we re-check here as defense in depth (e.g. direct server-side
  // rendering, or if middleware config ever drifts from this page).
  if (!user || (user.role !== "admin" && user.role !== "design_manager")) {
    redirect("/login")
  }

  const tasks = await getMarketingTasks()

  return <KanbanBoard tasks={tasks} department="design" />
}