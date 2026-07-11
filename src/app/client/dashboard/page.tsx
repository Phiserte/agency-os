// src/app/client/dashboard/page.tsx
// Server Component - fetches only tasks assigned to the logged-in client

import { connectDB }      from "@/lib/db/mongoose"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import ClientDashboard    from "./ClientDashboard"
import Sidebar            from "@/components/Sidebar" // <-- IMPORT YOUR SIDEBAR HERE

// Explicit interface to match exactly what ClientDashboard expects
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

async function getClientTasks(clientId: string): Promise<SerializedTask[]> {
  await connectDB()

  // Fetches tasks linked directly to this client's ID
  const tasks = await Task.find({ clientId })
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

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()
  
  // Protect route — bounce if not authenticated or not a client account
  if (!user || user.role !== "client") {
    redirect("/login")
  }

  const tasks = await getClientTasks(user.id)

  // Construct precise time frames to match the client-side rendering
  const now      = new Date()
  const dateStr  = now.toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })
  const hour     = now.getHours()
  const greet    = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const nowISO   = now.toISOString()

  return (
    // Outer Flex container keeps Sidebar on the left, Content on the right
    <div style={{ display: "flex", minHeight: "100vh" }}>
      
      {/* 1. Sidebar Panel */}
      <Sidebar user={user} />

      {/* 2. Main Area Content (scrollable if content overflows dashboard) */}
      <main style={{ flex: 1, overflowY: "auto", height: "100vh" }}>
        <ClientDashboard
          tasks={tasks}
          user={{
            name:  user.name ?? "Client",
            email: user.email ?? "",
            role:  user.role,
          }}
          dateStr={dateStr}
          greet={greet}
          nowISO={nowISO}
        />
      </main>

    </div>
  )
}