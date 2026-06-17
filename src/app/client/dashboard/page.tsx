// src/app/client/dashboard/page.tsx
// Server Component - fetches only tasks assigned to the logged-in client

import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import ClientDashboard    from "./ClientDashboard"

async function getClientTasks(clientId: string) {
  await connectDB()

  const tasks = await Task.find({ clientId })
    .sort({ createdAt: -1 })
    .lean()

  return tasks.map(t => ({
    id:          t._id.toString(),
    title:       t.title,
    description: t.description ?? "",
    priority:    t.priority as string,
    status:      t.status   as string,
    assignee:    t.assignee ?? "",
    tags:        t.tags     ?? [],
    due:         t.due      ?? "",
    progress:    t.progress ?? 0,
    createdAt:   t.createdAt?.toISOString() ?? "",
  }))
}

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== "client") redirect("/login")

  const tasks = await getClientTasks(user.id)

  const now      = new Date()
  const dateStr  = now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
  const hour     = now.getHours()
  const greet    = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const nowISO   = now.toISOString()

  return (
    <ClientDashboard
      tasks={tasks}
      user={user}
      dateStr={dateStr}
      greet={greet}
      nowISO={nowISO}
    />
  )
}