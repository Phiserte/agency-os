// src/app/talent/dashboard/page.tsx
// Server Component - fetches only tasks assigned to the logged-in talent

import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import TalentDashboard    from "./TalentDashboard"

// Explicit interface to match exactly what TalentDashboard expects
interface SerializedTask {
  id:          string
  title:       string
  description: string
  priority:    string
  status:      string
  assignee:    string
  tags:        string[]
  due:         string
  progress:    number
  createdAt:   string
}

async function getTalentTasks(talentId: string): Promise<SerializedTask[]> {
  await connectDB()

  // Fetches tasks linked directly to this talent's ID
  const tasks = await Task.find({ talentId })
    .sort({ createdAt: -1 })
    .lean()

  return tasks.map(t => {
    let serializedDue = ""
    
    if (t.due) {
      const rawDue = t.due as unknown
      const dueAsDate = rawDue instanceof Date ? rawDue : new Date(t.due as string)
      
      if (!isNaN(dueAsDate.getTime())) {
        serializedDue = dueAsDate.toISOString()
      } else if (typeof t.due === "string") {
        serializedDue = t.due 
      }
    }

    const rawCreatedAt = t.createdAt as unknown

    return {
      id:          t._id.toString(),
      title:       t.title,
      description: t.description ?? "",
      priority:    t.priority as string,
      status:      t.status   as string,
      assignee:    t.assignee ?? "",
      tags:        t.tags     ?? [],
      due:         serializedDue,
      progress:    t.progress ?? 0,
      createdAt:   rawCreatedAt instanceof Date 
        ? rawCreatedAt.toISOString() 
        : t.createdAt 
        ? new Date(rawCreatedAt as string | number).toISOString()
        : new Date().toISOString(),
    }
  })
}

export default async function TalentDashboardPage() {
  const user = await getCurrentUser()
  
  // Protect route — bounce if not authenticated or not a talent account
  if (!user || user.role !== "talent") {
    redirect("/login")
  }

  const tasks = await getTalentTasks(user.id)

  // Construct precise time frames to match the client-side rendering
  const now      = new Date()
  const dateStr  = now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
  const hour     = now.getHours()
  const greet    = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const nowISO   = now.toISOString()

  return (
    <div style={{ minHeight: "100vh" }}>
      <TalentDashboard
        tasks={tasks}
        user={{
          id:    user.id,
          name:  user.name ?? "Talent",
          email: user.email ?? "",
          role:  user.role,
        }}
        dateStr={dateStr}
        greet={greet}
        nowISO={nowISO}
      />
    </div>
  )
}
