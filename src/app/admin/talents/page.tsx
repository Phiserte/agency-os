// src/app/admin/clients/page.tsx
import { connectDB }      from "@/lib/db/mongoose"
import { User }           from "@/models/User"
import { Task }           from "@/models/Task"
import { getCurrentUser } from "@/lib/auth"
import { redirect }       from "next/navigation"
import TalentsPage        from "./TalentsPage"

async function getData() {
  await connectDB()

  const talents = await User.find({ role: "talent" })
    .select("-password")
    .sort({ createdAt: -1 })
    .lean()

  const talentIds = talents.map(c => c._id)
  const taskCounts = await Task.aggregate([
    { $match: { talentId: { $in: talentIds } } },
    { $group: {
      _id:   "$talentId",
      total: { $sum: 1 },
      done:  { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
      high:  { $sum: { $cond: [{ $and: [{ $eq: ["$priority", "high"] }, { $ne: ["$status", "done"] }] }, 1, 0] } },
    }},
  ])

  const countMap = new Map(taskCounts.map(t => [t._id.toString(), t]))

  return talents.map(c => {
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

  const talents = await getData()
  return <TalentsPage talents={talents} user={{ name: user.name, email: user.email, role: user.role }} />
}