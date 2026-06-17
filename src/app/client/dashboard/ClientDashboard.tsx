"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2, Clock3, AlertTriangle,
  LogOut, CheckSquare, Bell, ChevronDown, ChevronUp,
} from "lucide-react"

const T = {
  bg0:         "#080C14",
  bg1:         "#0D1321",
  card:        "#141B2D",
  cardHover:   "#1C2540",
  border:      "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.14)",
  violet:      "#7C3AED",
  violetLight: "#A78BFA",
  violetDim:   "rgba(124,58,237,0.15)",
  cyan:        "#06B6D4",
  cyanLight:   "#67E8F9",
  cyanDim:     "rgba(6,182,212,0.12)",
  emerald:     "#10B981",
  emeraldLight:"#6EE7B7",
  emeraldDim:  "rgba(16,185,129,0.12)",
  amber:       "#F59E0B",
  amberLight:  "#FCD34D",
  amberDim:    "rgba(245,158,11,0.12)",
  rose:        "#F43F5E",
  roseDim:     "rgba(244,63,94,0.12)",
  t1:          "#F8FAFC",
  t2:          "#94A3B8",
  t3:          "#475569",
}

interface Task {
  id: string; title: string; description: string
  priority: string; status: string; assignee: string
  tags: string[]; due: string; progress: number; createdAt: string
}

interface Props {
  tasks:   Task[]
  user:    { name: string; email: string; role: string }
  dateStr: string
  greet:   string
  nowISO:  string
}

const STATUS_ORDER = ["inprogress", "review", "todo", "backlog", "done"] as const

const STATUS_CFG: Record<string, { label: string; color: string; dim: string; dot: string }> = {
  backlog:    { label: "Backlog",     color: T.t3,          dim: "rgba(71,85,105,0.15)",  dot: T.t3 },
  todo:       { label: "To Do",       color: T.violetLight, dim: T.violetDim,             dot: T.violet },
  inprogress: { label: "In Progress", color: T.amberLight,  dim: T.amberDim,              dot: T.amber },
  review:     { label: "Review",      color: T.cyanLight,   dim: T.cyanDim,               dot: T.cyan },
  done:       { label: "Done",        color: T.emeraldLight,dim: T.emeraldDim,            dot: T.emerald },
}

const PRIORITY_CFG: Record<string, { label: string; color: string; dim: string }> = {
  high:   { label: "High",   color: T.rose,        dim: T.roseDim },
  medium: { label: "Medium", color: T.amberLight,  dim: T.amberDim },
  low:    { label: "Low",    color: T.t2,           dim: "rgba(148,163,184,0.12)" },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDueStatus(due: string, nowISO: string): "overdue" | "today" | "soon" | "ok" | "none" {
  if (!due) return "none"
  const dueDate = new Date(due)
  const now     = new Date(nowISO)
  if (isNaN(dueDate.getTime())) return "none"
  const diffMs   = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0)  return "overdue"
  if (diffDays === 0) return "today"
  if (diffDays <= 3) return "soon"
  return "ok"
}

function getDueLabel(due: string, nowISO: string): string {
  if (!due) return ""
  const dueDate = new Date(due)
  const now     = new Date(nowISO)
  if (isNaN(dueDate.getTime())) return due
  const diffMs   = dueDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0)  return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  if (diffDays <= 7) return `Due in ${diffDays}d`
  return dueDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

function timeAgo(iso: string, nowISO: string): string {
  const diff = new Date(nowISO).getTime() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins  <  1) return "just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  <  7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

const DUE_STYLE: Record<string, { color: string; bg: string; icon?: React.ReactNode }> = {
  overdue: { color: T.rose,        bg: T.roseDim },
  today:   { color: T.amberLight,  bg: T.amberDim },
  soon:    { color: T.amberLight,  bg: "rgba(245,158,11,0.08)" },
  ok:      { color: T.t3,          bg: "transparent" },
  none:    { color: T.t3,          bg: "transparent" },
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const AV_BG = [T.violetDim, T.cyanDim, T.emeraldDim, T.amberDim, T.roseDim]
const AV_FG = [T.violetLight, T.cyanLight, T.emeraldLight, T.amberLight, T.rose]
function Avatar({ name, size=28 }: { name: string; size?: number }) {
  const i = (name?.charCodeAt(0) ?? 65) % AV_BG.length
  const initials = (() => {
    const p = (name ?? "?").trim().split(" ")
    return p.length === 1 ? p[0].slice(0,2).toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase()
  })()
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: AV_BG[i], border: `1px solid ${AV_FG[i]}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.floor(size*0.36), fontWeight: 700,
      color: AV_FG[i], fontFamily: "monospace", flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── Task Card (read-only) ─────────────────────────────────────────────────────
function TaskCard({ task, nowISO }: { task: Task; nowISO: string }) {
  const p        = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.low
  const dueState = getDueStatus(task.due, nowISO)
  const dueLabel = getDueLabel(task.due, nowISO)
  const dueStyle = DUE_STYLE[dueState]
  const tags     = task.tags ?? []

  return (
    <div
      style={{
        background:   T.card,
        border:       `1px solid ${dueState === "overdue" ? T.rose + "44" : T.border}`,
        borderRadius: 12,
        padding:      "13px 13px 11px",
        transition:   "background 0.12s, border-color 0.12s",
        userSelect:   "none",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.background = T.cardHover
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.background = T.card
      }}
    >
      {/* Priority + Due */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 4,
          background: p.dim, color: p.color,
          fontFamily: "monospace", fontWeight: 600,
        }}>
          {p.label}
        </span>

        {dueLabel && (
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 4,
            background: dueStyle.bg, color: dueStyle.color,
            fontFamily: "monospace", fontWeight: dueState === "overdue" || dueState === "today" ? 600 : 400,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            {(dueState === "overdue" || dueState === "today") && (
              <AlertTriangle size={9} strokeWidth={2.5} />
            )}
            {dueLabel}
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{ fontSize: 13, fontWeight: 600, color: T.t1, margin: "0 0 5px", lineHeight: 1.4 }}>
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: 11, color: T.t3, margin: "0 0 10px",
          lineHeight: 1.5, fontFamily: "monospace",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {task.description}
        </p>
      )}

      {/* Progress bar */}
      {task.progress > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace" }}>Progress</span>
            <span style={{ fontSize: 10, color: task.progress === 100 ? T.emeraldLight : T.amberLight, fontFamily: "monospace" }}>
              {task.progress}%
            </span>
          </div>
          <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
            <div style={{
              width: `${task.progress}%`, height: "100%", borderRadius: 2,
              background: task.progress === 100
                ? T.emerald
                : `linear-gradient(90deg, ${T.violet}, ${T.cyan})`,
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {tags.map((tag, i) => {
            const colors = [
              { color: T.violetLight, dim: T.violetDim },
              { color: T.cyanLight,   dim: T.cyanDim },
              { color: T.emeraldLight,dim: T.emeraldDim },
              { color: T.amberLight,  dim: T.amberDim },
            ]
            const c = colors[i % colors.length]
            return (
              <span key={tag} style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 4,
                fontFamily: "monospace", color: c.color, background: c.dim,
              }}>
                {tag}
              </span>
            )
          })}
        </div>
      )}

      {/* Footer: assignee + timestamp */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 9, borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {task.assignee && <Avatar name={task.assignee} size={20} />}
          <span style={{ fontSize: 10, color: T.t2, fontFamily: "monospace" }}>
            {task.assignee || "Unassigned"}
          </span>
        </div>
        <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace" }}>
          {timeAgo(task.createdAt, nowISO)}
        </span>
      </div>
    </div>
  )
}

// ── Column (read-only) ────────────────────────────────────────────────────────
function Column({ status, tasks, nowISO }: { status: string; tasks: Task[]; nowISO: string }) {
  const cfg = STATUS_CFG[status]
  const [collapsed, setCollapsed] = useState(status === "done")

  return (
    <div style={{ width: 272, flexShrink: 0 }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", marginBottom: 12, padding: "0 2px",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, letterSpacing: "0.3px" }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 20,
            background: cfg.dim, color: cfg.color, fontFamily: "monospace", fontWeight: 600,
          }}>
            {tasks.length}
          </span>
          {collapsed
            ? <ChevronDown size={13} color={T.t3} strokeWidth={2} />
            : <ChevronUp   size={13} color={T.t3} strokeWidth={2} />
          }
        </div>
      </button>

      {!collapsed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.length === 0 ? (
            <div style={{
              height: 64, borderRadius: 10,
              border: `1px dashed ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 11, color: T.t3, fontFamily: "monospace" }}>No tasks here</span>
            </div>
          ) : (
            tasks.map(task => <TaskCard key={task.id} task={task} nowISO={nowISO} />)
          )}
        </div>
      )}
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ClientDashboard({ tasks, user, dateStr, greet, nowISO }: Props) {
  const router      = useRouter()
  const [logging, setLogging] = useState(false)

  const total      = tasks.length
  const done       = tasks.filter(t => t.status === "done").length
  const inProgress = tasks.filter(t => t.status === "inprogress").length
  const overdue    = tasks.filter(t => getDueStatus(t.due, nowISO) === "overdue" && t.status !== "done").length
  const pct        = total === 0 ? 0 : Math.round((done / total) * 100)

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, {})

  async function handleLogout() {
    setLogging(true)
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <div style={{
      minHeight: "100vh", background: T.bg0,
      fontFamily: "'Syne','DM Sans',system-ui,sans-serif", color: T.t1,
    }}>

      {/* NAVBAR */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 40,
        background: `${T.bg0}ee`, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${T.border}`,
        display: "flex", alignItems: "center",
        padding: "0 32px", height: 56, gap: 16,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: T.violetDim, border: `1px solid ${T.violetLight}33`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
          }}>⚡</div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>Agency OS</span>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 20,
            background: T.cyanDim, color: T.cyanLight, fontFamily: "monospace",
          }}>
            Client Portal
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Overdue warning */}
          {overdue > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: T.roseDim, border: `1px solid ${T.rose}44`,
              borderRadius: 8, padding: "5px 12px",
              fontSize: 11, color: T.rose, fontFamily: "monospace",
            }}>
              <AlertTriangle size={12} strokeWidth={2.5} />
              {overdue} overdue
            </div>
          )}

          <Avatar name={user.name} size={28} />
          <span style={{ fontSize: 12, color: T.t2, fontFamily: "monospace" }}>
            {user.name.split(" ")[0]}
          </span>

          <button
            onClick={handleLogout}
            disabled={logging}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "transparent", border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "6px 12px",
              color: T.t3, fontSize: 12, cursor: "pointer",
              fontFamily: "monospace", transition: "all 0.12s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = T.roseDim
              ;(e.currentTarget as HTMLButtonElement).style.color = T.rose
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = `${T.rose}55`
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent"
              ;(e.currentTarget as HTMLButtonElement).style.color = T.t3
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = T.border
            }}
          >
            <LogOut size={13} strokeWidth={1.8} />
            {logging ? "..." : "Sign out"}
          </button>
        </div>
      </nav>

      <div style={{ padding: "36px 32px 56px" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: T.t1, margin: 0 }}>
            {greet}, {user.name.split(" ")[0]} 👋
          </h1>
          <p style={{ marginTop: 4, fontSize: 12, color: T.t3, fontFamily: "monospace" }}>{dateStr}</p>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "Your Tasks",   value: total,      color: T.violetLight, dim: T.violetDim,  icon: CheckSquare,    delta: `${pct}% complete` },
            { label: "In Progress",  value: inProgress, color: T.amberLight,  dim: T.amberDim,   icon: Clock3,         delta: "active now" },
            { label: "Completed",    value: done,        color: T.emeraldLight,dim: T.emeraldDim, icon: CheckCircle2,   delta: "finished" },
            { label: "Overdue",      value: overdue,     color: overdue > 0 ? T.rose : T.t3, dim: overdue > 0 ? T.roseDim : "rgba(71,85,105,0.15)", icon: AlertTriangle, delta: overdue > 0 ? "needs attention" : "all on track" },
          ].map(({ label, value, color, dim, icon: Icon, delta }) => (
            <div
              key={label}
              style={{
                background: T.card, border: `1px solid ${T.border}`,
                borderRadius: 16, padding: "20px 22px",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.background = T.cardHover
                ;(e.currentTarget as HTMLDivElement).style.borderColor = T.borderHover
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.background = T.card
                ;(e.currentTarget as HTMLDivElement).style.borderColor = T.border
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: dim,
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12,
              }}>
                <Icon size={18} color={color} strokeWidth={1.8} />
              </div>
              <p style={{ fontSize: 11, color: T.t3, letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: "monospace", margin: 0 }}>
                {label}
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-1px", color, margin: "6px 0 10px", lineHeight: 1 }}>
                {value}
              </p>
              <span style={{
                fontSize: 10, padding: "2px 7px", borderRadius: 4,
                background: dim, color, fontFamily: "monospace",
              }}>
                {delta}
              </span>
            </div>
          ))}
        </div>

        {/* Overall progress bar */}
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: "16px 22px", marginBottom: 28,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <span style={{ fontSize: 11, color: T.t2, fontFamily: "monospace", whiteSpace: "nowrap" }}>
            Overall Progress
          </span>
          <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: pct === 100
                ? T.emerald
                : `linear-gradient(90deg, ${T.violet}, ${T.cyan})`,
              borderRadius: 3, transition: "width 0.5s",
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: pct === 100 ? T.emeraldLight : T.violetLight, fontFamily: "monospace", minWidth: 36 }}>
            {pct}%
          </span>
          {pct === 100 && (
            <span style={{ fontSize: 11, color: T.emeraldLight, fontFamily: "monospace" }}>
              All done!
            </span>
          )}
        </div>

        {/* Empty state */}
        {total === 0 && (
          <div style={{
            textAlign: "center", padding: "64px 0",
            border: `1px dashed ${T.border}`, borderRadius: 16,
          }}>
            <CheckSquare size={36} color={T.t3} strokeWidth={1.2} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontSize: 14, color: T.t2, margin: "0 0 6px" }}>No tasks assigned yet</p>
            <p style={{ fontSize: 12, color: T.t3, fontFamily: "monospace" }}>
              Your agency will assign tasks here once your project kicks off
            </p>
          </div>
        )}

        {/* READ-ONLY KANBAN */}
        {total > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: T.t2, letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: "monospace", margin: 0 }}>
                Your Tasks
              </p>
              <span style={{ fontSize: 11, color: T.t3, fontFamily: "monospace" }}>
                Read-only view
              </span>
            </div>
            <div style={{
              display: "flex", gap: 18,
              overflowX: "auto", paddingBottom: 24,
              alignItems: "flex-start",
            }}>
              {STATUS_ORDER.map(status => (
                <Column
                  key={status}
                  status={status}
                  tasks={grouped[status] ?? []}
                  nowISO={nowISO}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}