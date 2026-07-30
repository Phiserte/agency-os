"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, ChevronDown, AlertCircle } from "lucide-react"

// ── Palette (kept identical to the rest of the app) ──────────────────────────
const P = {
  purple:      "#534AB7",
  purpleLight: "#AFA9EC",
  purpleDim:   "#EEEDFE",
  purpleText:  "#3C3489",
  teal:        "#1D9E75",
  tealDim:     "#E1F5EE",
  tealText:    "#085041",
  amber:       "#EF9F27",
  amberDim:    "#FAEEDA",
  amberText:   "#633806",
  red:         "#E24B4A",
  redDim:      "#FCEBEB",
  redText:     "#791F1F",
  bg:          "#F3F4F8",
  card:        "#FFFFFF",
  border:      "#E5E7EB",
  text:        "#111827",
  textSub:     "#6B7280",
  textMute:    "#9CA3AF",
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  backlog:    { label: "Backlog",     bg: "#F3F4F6",   color: "#6B7280",    dot: "#9CA3AF" },
  todo:       { label: "To Do",       bg: P.purpleDim, color: P.purpleText, dot: P.purple },
  inprogress: { label: "In Progress", bg: "#EFF6FF",   color: "#1E40AF",    dot: "#3B82F6" },
  review:     { label: "Review",      bg: P.amberDim,  color: P.amberText,  dot: P.amber },
  done:       { label: "Done",        bg: P.tealDim,   color: P.tealText,   dot: P.teal },
}

const PRIORITY_CFG: Record<string, { label: string; bg: string; color: string }> = {
  high:   { label: "High",   bg: P.redDim,   color: P.redText },
  medium: { label: "Medium", bg: P.amberDim, color: P.amberText },
  low:    { label: "Low",    bg: "#EAF3DE",  color: "#27500A" },
}

const AV_COLORS = [
  { bg: P.purpleDim, color: P.purpleText },
  { bg: P.tealDim,   color: P.tealText },
  { bg: P.amberDim,  color: P.amberText },
  { bg: P.redDim,    color: P.redText },
  { bg: "#EAF3DE",   color: "#27500A" },
]

export interface Task {
  id: string
  title: string
  description?: string
  priority: string
  status: string
  assignee: string
  assignedBy?: string
  tags?: string[]
  due?: string
  updatedAt: string
}

interface TeamTasksViewProps {
  /**
   * Preferred: pass tasks straight from a server component (e.g.
   * Task.find({ department: "marketing" }) in page.tsx). No client fetch,
   * no extra round trip, no risk of hitting a route that doesn't exist.
   */
  tasks?: Task[]
  /**
   * Fallback only: an API endpoint returning { tasks: Task[] }. Use this
   * if you genuinely need client-side fetching (e.g. polling); otherwise
   * prefer the `tasks` prop above.
   */
  apiEndpoint?: string
  /** e.g. "Marketing", "Design", "Dev" — used only for the header copy */
  workspaceLabel: string
}

function initials(name: string) {
  if (!name) return "?"
  const p = name.trim().split(" ")
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

function avColor(name: string) {
  return AV_COLORS[(name?.charCodeAt(0) ?? 65) % AV_COLORS.length]
}

function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const c = avColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.bg, color: c.color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.floor(size * 0.36), fontWeight: 600,
      border: `1.5px solid ${c.color}22`,
    }}>
      {initials(name)}
    </div>
  )
}

function Pill({ label, bg, color, dot }: { label: string; bg: string; color: string; dot?: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, padding: "3px 9px", borderRadius: 20,
      background: bg, color, fontWeight: 500, whiteSpace: "nowrap",
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: dot, flexShrink: 0 }} />}
      {label}
    </span>
  )
}

function isOverdue(due?: string) {
  if (!due) return false
  const d = new Date(due)
  if (isNaN(d.getTime())) return false
  return d.getTime() < Date.now()
}

export default function TeamTasksView({ tasks: initialTasks, apiEndpoint, workspaceLabel }: TeamTasksViewProps) {
  const [tasks, setTasks]     = useState<Task[]>(initialTasks ?? [])
  const [loading, setLoading] = useState(!initialTasks && !!apiEndpoint)
  const [error, setError]     = useState<string | null>(null)
  const [search, setSearch]   = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    // Tasks came from the server component — nothing to fetch.
    if (initialTasks) return
    if (!apiEndpoint) return

    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const res = await fetch(apiEndpoint as string, { cache: "no-store" })
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const data = await res.json()
        if (!cancelled) setTasks(data.tasks ?? data ?? [])
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load tasks")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [apiEndpoint, initialTasks])

  const grouped = useMemo(() => {
    const q = search.toLowerCase()
    const filtered = tasks.filter(t => {
      const matchesSearch = !q || t.title.toLowerCase().includes(q) || (t.assignee || "").toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || t.status === statusFilter
      return matchesSearch && matchesStatus
    })

    const map = new Map<string, Task[]>()
    for (const t of filtered) {
      const key = t.assignee || "Unassigned"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    // Sort people alphabetically, "Unassigned" last
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "Unassigned") return 1
      if (b === "Unassigned") return -1
      return a.localeCompare(b)
    })
  }, [tasks, search, statusFilter])

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, marginBottom: 20,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: P.text, letterSpacing: "-0.3px" }}>
            {workspaceLabel} · By Person
          </h1>
          <p style={{ fontSize: 12, color: P.textSub, margin: "4px 0 0" }}>
            Tasks grouped by who's doing them
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 10, padding: "7px 12px", width: 220,
          }}>
            <Search size={13} color={P.textMute} strokeWidth={1.8} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or task..."
              style={{ border: "none", background: "transparent", fontSize: 13, color: P.text, outline: "none", width: "100%" }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{
              fontSize: 12, color: P.textSub, background: P.card,
              border: `1px solid ${P.border}`, borderRadius: 8,
              padding: "5px 10px", cursor: "pointer", outline: "none",
            }}
          >
            <option value="all">All Status</option>
            <option value="backlog">Backlog</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "48px 0", color: P.textMute, fontSize: 13 }}>
          Loading tasks...
        </div>
      )}

      {!loading && error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: P.redDim, color: P.redText,
          padding: "12px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16,
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!loading && !error && grouped.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: P.textMute, fontSize: 13 }}>
          No tasks found
        </div>
      )}

      {!loading && !error && grouped.length > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {grouped.map(([person, personTasks]) => {
            const doneCount = personTasks.filter(t => t.status === "done").length
            const overdueCount = personTasks.filter(t => t.status !== "done" && isOverdue(t.due)).length

            return (
              <div key={person} style={{
                background: P.card, border: `1px solid ${P.border}`,
                borderRadius: 14, padding: "16px 18px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                {/* Person header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <Avatar name={person} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{person}</div>
                    <div style={{ fontSize: 11, color: P.textSub }}>
                      {personTasks.length} task{personTasks.length !== 1 ? "s" : ""} · {doneCount} done
                      {overdueCount > 0 && (
                        <span style={{ color: P.red, fontWeight: 600 }}> · {overdueCount} overdue</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {personTasks.map((t, idx) => (
                    <div key={t.id} style={{
                      padding: "10px 0",
                      borderBottom: idx < personTasks.length - 1 ? `1px solid ${P.border}` : "none",
                    }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: P.text, marginBottom: 6,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {t.title}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Pill {...(STATUS_CFG[t.status] || STATUS_CFG.backlog)} />
                        <Pill {...(PRIORITY_CFG[t.priority] || PRIORITY_CFG.low)} />
                        {t.due && (
                          <span style={{
                            fontSize: 11,
                            color: t.status !== "done" && isOverdue(t.due) ? P.red : P.textMute,
                            fontWeight: t.status !== "done" && isOverdue(t.due) ? 600 : 400,
                          }}>
                            {t.status !== "done" && isOverdue(t.due) ? "Overdue" : "Due"} {new Date(t.due).toLocaleDateString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}