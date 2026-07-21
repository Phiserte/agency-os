// src/app/marketing/dashboard/page.tsx
// Server Component — fetches only tasks belonging to the "marketing"
// department and computes the stats/activity feed for MarketingDashboard.
// Accessible to "admin" and "marketing_manager" roles (see
// src/lib/roles.ts ROUTE_ACCESS / middleware.ts).

import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import DesignDashboard from "./Dashboard"

async function getData() {
  await connectDB()

  const tasks = await Task.find({ department: "design" })
    .sort({ createdAt: -1 })
    .lean()

  const now      = new Date()
  const weekAgo  = new Date(now.getTime() - 7 * 86400000)

  const serialized = tasks.map(t => ({
    id:          t._id.toString(),
    title:       t.title,
    description: t.description ?? "",
    priority:    t.priority as string,
    status:      t.status as string,
    assignee:    t.assignee ?? "",
    tags:        t.tags ?? [],
    due:         t.due ?? "",
    progress:    t.progress ?? 0,
    createdAt:   t.createdAt?.toISOString() ?? "",
    updatedAt:   t.updatedAt?.toISOString() ?? "",
  }))

  const total        = serialized.length
  const openTasks    = serialized.filter(t => t.status !== "done").length
  const doneThisWeek = serialized.filter(t =>
    t.status === "done" && new Date(t.updatedAt) >= weekAgo
  ).length
  const overdueCount = serialized.filter(t => {
    if (!t.due || t.status === "done") return false
    const d = new Date(t.due)
    return !isNaN(d.getTime()) && d.getTime() < now.getTime()
  }).length

  const recentActivity = serialized.slice(0, 6).map(t => ({
    id:        t.id,
    title:     t.title,
    assignee:  t.assignee,
    priority:  t.priority,
    status:    t.status,
    updatedAt: t.updatedAt,
  }))

  const tableTasks = [...serialized].sort((a, b) => {
    const order: Record<string, number> = { inprogress: 0, review: 1, todo: 2, backlog: 3, done: 4 }
    return (order[a.status] ?? 5) - (order[b.status] ?? 5)
  })

  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
  const hour    = now.getHours()
  const greet   = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const nowISO  = now.toISOString()

  return {
    tasks: serialized,
    tableTasks,
    recentActivity,
    total,
    openTasks,
    doneThisWeek,
    overdueCount,
    dateStr,
    greet,
    nowISO,
  }
}

export default async function DesignDashboardPage() {
  const user = await getCurrentUser()

  // Middleware already blocks unauthorized roles from reaching this route,
  // but we re-check here as defense in depth.
  if (!user || (user.role !== "admin" && user.role !== "design_manager")) {
    redirect("/login")
  }

  const data = await getData()

  return (
    <DesignDashboard
      {...data}
      user={{ name: user.name, email: user.email, role: user.role }}
    />
  )
}