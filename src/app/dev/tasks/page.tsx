// src/app/design/tasks/page.tsx
import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { User }           from "@/models/User"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import KanbanBoard, { type Task as BoardTask, type AssigneeOption } from "@/components/kanban/KanbanBoard"

async function getDesignTasks(): Promise<BoardTask[]> {
  await connectDB()

  const tasks = await Task.find({ department: "dev" })
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
    talentId:    t.talentId ? t.talentId.toString() : undefined,
    tags:        t.tags ?? [],
    due:         t.due ?? "",
    progress:    t.progress ?? 0,
    department:  t.department ?? "dev",
  }))
}

// Only talents who belong to the design department can show up in the
// "Assignee" dropdown here. This is what actually enforces "design manager
// can only assign to design talents" — the board itself just renders
// whatever list it's given, so the scoping has to happen in this query.
async function getDesignAssignees(): Promise<AssigneeOption[]> {
  await connectDB()

  const assignees = await User.find({ role: "talent", department: "dev" })
    .select("_id name email department")
    .lean()

  return assignees.map(u => ({
    id:         u._id.toString(),
    name:       u.name,
    email:      u.email ?? "",
    department: u.department ?? null,
  }))
}

export default async function DesignTasksPage() {
  const user = await getCurrentUser()

  if (!user || (user.role !== "admin" && user.role !== "dev_manager")) {
    redirect("/login")
  }

  const [tasks, assignees] = await Promise.all([
    getDesignTasks(),
    getDesignAssignees(),
  ])

  return (
    <KanbanBoard
      tasks={tasks}
      assignees={assignees}
      department="design"
      user={{ name: user.name, email: user.email, role: user.role }}
    />
  )
}