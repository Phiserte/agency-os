// src/app/admin/clients/page.tsx
import { connectDB }      from "@/lib/db/mongoose"
import { User }           from "@/models/User"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import ClientsPage        from "./ClientsPage"

async function getData() {
  await connectDB()

  const clients = await User.find({ role: "client" })
    .select("-password")
    .sort({ createdAt: -1 })
    .lean()

  const clientIds = clients.map(c => c._id)
  const taskCounts = await Task.aggregate([
    { $match: { clientId: { $in: clientIds } } },
    { $group: {
      _id:   "$clientId",
      total: { $sum: 1 },
      done:  { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
      high:  { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "high"] }, { $ne: ["$status", "done"] }] }, 1, 0] } },
    }},
  ])

  const countMap = new Map(taskCounts.map(t => [t._id.toString(), t]))

  return clients.map(c => {
    const counts = countMap.get(c._id.toString())
    return {
      id:        c._id.toString(),
      name:      c.name,
      email:     c.email,
      company:   c.company ?? "",
      createdAt: c.createdAt?.toISOString() ?? "",
      tasks: {
        total: counts?.total ?? 0,
        done:  counts?.done  ?? 0,
        high:  counts?.high  ?? 0,
      },
    }
  })
}

export default async function Page() {
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") redirect("/login")

  const clients = await getData()
  return <ClientsPage clients={clients} />
}