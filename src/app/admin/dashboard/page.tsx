// src/app/admin/dashboard/page.tsx
import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { User }           from "@/models/User"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import DashboardPage      from "./DashboardPage"

async function getData() {
  await connectDB()

  const [tasks, teamCount, talentCount, allUsers] = await Promise.all([
    Task.find().sort({ createdAt: -1 }).lean(),
    User.countDocuments({ role: "admin" }),
    // Counts talents AND both manager roles, not just talents — so the
    // stat card reflects everyone who isn't an admin.
    User.countDocuments({ role: { $in: ["talent", "marketing_manager", "design_manager"] } }),
    // Full list (name + role) for the avatar stack under the stat cards.
    // Excludes admins since this row is meant to show staff/talent, not
    // the person viewing the dashboard.
    User.find({ role: { $ne: "admin" } }).select("name role").lean(),
  ])

  const now      = new Date()
  const weekAgo  = new Date(now.getTime() - 7 * 86400000)
  const monthAgo = new Date(now.getTime() - 30 * 86400000)

  // Serialise tasks
  const serialized = tasks.map(t => ({
    id:          t._id.toString(),
    title:       t.title,
    description: t.description ?? "",
    priority:    t.priority    as string,
    status:      t.status      as string,
    assignee:    t.assignee    ?? "",
    talentId:    t.talentId?.toString() ?? undefined,
    tags:        t.tags        ?? [],
    due:         t.due         ?? "",
    progress:    t.progress    ?? 0,
    createdAt:   t.createdAt?.toISOString()  ?? "",
    updatedAt:   t.updatedAt?.toISOString()  ?? "",
  }))

  // Stat card numbers
  const total       = serialized.length
  const openTasks   = serialized.filter(t => t.status !== "done").length
  const doneThisWeek= serialized.filter(t =>
    t.status === "done" && new Date(t.updatedAt) >= weekAgo
  ).length
  const lastMonthDone = serialized.filter(t =>
    t.status === "done" && new Date(t.updatedAt) >= monthAgo
  ).length

  // Task volume last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (6 - i))
    d.setHours(0, 0, 0, 0)
    return d
  })

  const chartCreated   = days.map(d => {
    const next = new Date(d.getTime() + 86400000)
    return serialized.filter(t => {
      const c = new Date(t.createdAt)
      return c >= d && c < next
    }).length
  })
  const chartCompleted = days.map(d => {
    const next = new Date(d.getTime() + 86400000)
    return serialized.filter(t => {
      const u = new Date(t.updatedAt)
      return t.status === "done" && u >= d && u < next
    }).length
  })
  const chartLabels = days.map(d =>
    d.toLocaleDateString("en-IN", { weekday: "short" })
  )

  // Recent activity — last 6 task updates
  const recentActivity = serialized.slice(0, 6).map(t => ({
    id:        t.id,
    title:     t.title,
    assignee:  t.assignee,
    priority:  t.priority,
    status:    t.status,
    updatedAt: t.updatedAt,
  }))

  // Table tasks — open ones first
  const tableTasks = [...serialized]
    .sort((a, b) => {
      const order: Record<string, number> = { inprogress: 0, review: 1, todo: 2, backlog: 3, done: 4 }
      return (order[a.status] ?? 5) - (order[b.status] ?? 5)
    })

  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
  const hour    = now.getHours()
  const greet   = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const nowISO  = now.toISOString()

  return {
    tasks:        serialized,
    tableTasks,
    recentActivity,
    total,
    openTasks,
    doneThisWeek,
    lastMonthDone,
    teamCount,
    talentCount,
    users: allUsers.map(u => ({ name: u.name, role: u.role })),
    chart: { labels: chartLabels, created: chartCreated, completed: chartCompleted },
    dateStr,
    greet,
    nowISO,
  }
}

export default async function Page() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") redirect("/login")

  const data = await getData()
  return <DashboardPage {...data} user={user} />
}