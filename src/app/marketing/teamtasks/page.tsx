// src/app/marketing/team/page.tsx
import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import Sidebar            from "@/components/Sidebar"
import TeamTasksView, { type Task as TeamTask } from "@/components/Teamtaskview"

async function getMarketingTasks(): Promise<TeamTask[]> {
  await connectDB()

  const tasks = await Task.find({ department: "marketing" })
    .sort({ updatedAt: -1 })
    .lean()

  return tasks.map(t => ({
    id:          t._id.toString(),
    title:       t.title,
    description: t.description ?? "",
    priority:    t.priority ?? "medium",
    status:      t.status ?? "backlog",
    assignee:    t.assignee || "Unassigned",
    assignedBy:  t.assignedBy,
    tags:        t.tags ?? [],
    due:         t.due ?? "",
    updatedAt:   t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
  }))
}

export default async function MarketingTeamPage() {
  const user = await getCurrentUser()

  if (!user || (user.role !== "admin" && user.role !== "marketing_manager")) {
    redirect("/login")
  }

  const tasks = await getMarketingTasks()

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <div style={{ width: 240, minWidth: 240, height: "100vh", flexShrink: 0 }}>
        <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#F3F4F8", padding: "24px 28px 40px" }}>
        <TeamTasksView tasks={tasks} workspaceLabel="Marketing" />
      </div>
    </div>
  )
}