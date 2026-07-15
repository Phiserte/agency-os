"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter }            from "next/navigation"
import {
  CheckCircle2, Clock3, AlertTriangle,
  CheckSquare, ChevronDown, ChevronUp,
  MessageSquare, LogOut,
} from "lucide-react"
import {
  DndContext, useDroppable, useDraggable,
  DragEndEvent, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core"
import TaskDetailModal, { type TaskDetail } from "@/components/Taskdetailmodal"
import { useTaskPolling, type Task as PollingTask } from "@/hooks/useTaskPolling"
// Talent Dashboard - Read-only view for talents

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  bg0:         "#F8FAFC",
  bg1:         "#F1F5F9",
  card:        "#FFFFFF",
  border:      "#E2E8F0",
  borderHover: "#CBD5E1",
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
  text:        "#0F172A",
  textSub:     "#475569",
  textMute:    "#94A3B8",
}

const STATUS_ORDER = ["backlog", "todo", "inprogress", "review", "done"] as const

const STATUS_CFG: Record<string, { label: string; color: string; dim: string; dot: string }> = {
  backlog:    { label: "Backlog",    color: P.textSub,    dim: "#E2E8F0",   dot: P.textMute },
  todo:       { label: "To Do",       color: P.purpleText, dim: P.purpleDim, dot: P.purple },
  inprogress: { label: "In Progress", color: "#1E40AF",    dim: "#EFF6FF",   dot: "#3B82F6" },
  review:     { label: "Review",      color: P.amberText,  dim: P.amberDim,  dot: P.amber },
  done:       { label: "Done",        color: P.tealText,   dim: P.tealDim,   dot: P.teal },
}

const PRIORITY_CFG: Record<string, { label: string; color: string; dim: string }> = {
  high:   { label: "High",   color: P.redText,   dim: P.redDim },
  medium: { label: "Medium", color: P.amberText, dim: P.amberDim },
  low:    { label: "Low",    color: "#27500A",   dim: "#EAF3DE" },
}

const TAG_COLORS = [
  { color: P.purpleText, dim: P.purpleDim },
  { color: "#1E40AF",    dim: "#EFF6FF" },
  { color: P.tealText,   dim: P.tealDim },
  { color: P.amberText,  dim: P.amberDim },
]

interface Task {
  id: string; title: string; description: string
  priority: string; status: string; assignee: string
  tags: string[]; due: string; progress: number; createdAt: string
}

interface Props {
  tasks:   Task[]
  user:    { id: string; name: string; email: string; role: string }
  dateStr: string
  greet:   string
  nowISO:  string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDueStatus(due: string, nowISO: string): "overdue" | "today" | "soon" | "ok" | "none" {
  if (!due) return "none"
  const d = new Date(due), n = new Date(nowISO)
  if (isNaN(d.getTime())) return "none"
  const diff = Math.ceil((d.getTime() - n.getTime()) / 86400000)
  if (diff < 0)   return "overdue"
  if (diff === 0) return "today"
  if (diff <= 3)  return "soon"
  return "ok"
}

function getDueLabel(due: string, nowISO: string): string {
  if (!due) return ""
  const d = new Date(due), n = new Date(nowISO)
  if (isNaN(d.getTime())) return due
  const diff = Math.ceil((d.getTime() - n.getTime()) / 86400000)
  if (diff < 0)   return `${Math.abs(diff)}d overdue`
  if (diff === 0) return "Due today"
  if (diff === 1) return "Due tomorrow"
  if (diff <= 7)  return `Due in ${diff}d`
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

function timeAgo(iso: string, nowISO: string): string {
  const diff  = new Date(nowISO).getTime() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins  <  1) return "just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  <  7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

const DUE_STYLE: Record<string, { color: string; bg: string }> = {
  overdue: { color: P.red,       bg: P.redDim },
  today:   { color: P.amber,     bg: P.amberDim },
  soon:    { color: P.amberText, bg: "rgba(239,159,39,0.06)" },
  ok:      { color: P.textSub,   bg: "transparent" },
  none:    { color: P.textSub,   bg: "transparent" },
}

const AV_BG = [P.purpleDim, "#EFF6FF", P.tealDim, P.amberDim, P.redDim]
const AV_FG = [P.purpleText, "#1E40AF", P.tealText, P.amberText, P.redText]

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const i = (name?.charCodeAt(0) ?? 65) % AV_BG.length
  const p = (name ?? "?").trim().split(" ")
  const initials = p.length === 1 ? p[0].slice(0,2).toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: AV_BG[i], border: `1px solid ${AV_FG[i]}33`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.floor(size*0.36), fontWeight: 700, color: AV_FG[i], flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// ── Comment count hook ────────────────────────────────────────────────────────
function useCommentCount(taskId: string) {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    fetch(`/api/tasks/${taskId}/comments`)
      .then(r => r.json())
      .then((d: unknown[]) => setCount(d.length))
      .catch(() => setCount(0))
  }, [taskId])
  return count
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, nowISO, onClick }: {
  task: Task; nowISO: string; onClick: (t: Task) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const commentCount = useCommentCount(task.id)
  const p        = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.low
  const dueState = getDueStatus(task.due, nowISO)
  const dueLabel = getDueLabel(task.due, nowISO)
  const dueStyle = DUE_STYLE[dueState]
  const tags     = task.tags ?? []

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => { if (!isDragging) onClick(task) }}
      style={{
        transform:    transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
        opacity:      isDragging ? 0.4 : 1,
        background:   P.card,
        border:       `1px solid ${dueState === "overdue" ? P.red + "55" : P.border}`,
        borderLeft:   dueState === "overdue"
          ? `3px solid ${P.red}`
          : dueState === "today"
          ? `3px solid ${P.amber}`
          : `1px solid ${P.border}`,
        borderRadius: 12,
        padding:      "13px 14px 11px",
        cursor:       isDragging ? "grabbing" : "pointer",
        transition:   isDragging ? "none" : "box-shadow 0.12s, border-color 0.12s",
        userSelect:   "none",
        touchAction:  "none",
        boxShadow:    isDragging
          ? "0 10px 24px rgba(0,0,0,0.1)"
          : "0 1px 3px rgba(0,0,0,0.02)",
      }}
      onMouseEnter={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.06)"
          ;(e.currentTarget as HTMLDivElement).style.borderColor =
            dueState === "overdue" ? P.red : P.borderHover
        }
      }}
      onMouseLeave={e => {
        if (!isDragging) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.02)"
          ;(e.currentTarget as HTMLDivElement).style.borderColor =
            dueState === "overdue" ? P.red + "55" : P.border
        }
      }}
    >
      {/* Priority + Due */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9 }}>
        <span style={{
          fontSize: 10, padding: "2px 7px", borderRadius: 4,
          background: p.dim, color: p.color, fontWeight: 600,
        }}>
          {p.label}
        </span>
        {dueLabel && (
          <span style={{
            fontSize: 10, padding: "2px 7px", borderRadius: 4,
            background: dueStyle.bg, color: dueStyle.color,
            fontWeight: dueState === "overdue" || dueState === "today" ? 600 : 500,
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
      <p style={{ fontSize: 13, fontWeight: 600, color: P.text, margin: "0 0 5px", lineHeight: 1.4 }}>
        {task.title}
      </p>

      {/* Description */}
      {task.description && (
        <p style={{
          fontSize: 11, color: P.textSub, margin: "0 0 10px", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {task.description}
        </p>
      )}

      {/* Progress */}
      {task.progress > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: P.textMute }}>Progress</span>
            <span style={{ fontSize: 10, color: task.progress === 100 ? P.teal : P.amber, fontWeight: 600 }}>
              {task.progress}%
            </span>
          </div>
          <div style={{ height: 4, background: P.bg1, borderRadius: 2 }}>
            <div style={{
              width: `${task.progress}%`, height: "100%", borderRadius: 2,
              background: task.progress === 100 ? P.teal : P.purple,
              transition: "width 0.3s",
            }} />
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
          {tags.map((tag, i) => {
            const c = TAG_COLORS[i % TAG_COLORS.length]
            return (
              <span key={tag} style={{
                fontSize: 10, padding: "2px 6px", borderRadius: 4,
                color: c.color, background: c.dim, fontWeight: 500,
              }}>
                {tag}
              </span>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 9, borderTop: `1px solid ${P.border}`, marginTop: 4,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {task.assignee && <Avatar name={task.assignee} size={20} />}
          <span style={{ fontSize: 11, color: P.textSub, fontWeight: 500 }}>
            {task.assignee || "Unassigned"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Comment count */}
          {commentCount !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: commentCount > 0 ? P.purple : P.textMute }}>
              <MessageSquare size={11} strokeWidth={1.8} />
              {commentCount}
            </span>
          )}
          <span style={{ fontSize: 10, color: P.textMute }}>
            {timeAgo(task.createdAt, nowISO)}
          </span>
        </div>
      </div>
    </div>
  )
}

function Column({ status, tasks, nowISO, onCardClick }: {
  status: string; tasks: Task[]; nowISO: string; onCardClick: (t: Task) => void
}) {
  // The column itself handles the droppable area now
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const cfg = STATUS_CFG[status]
  const [collapsed, setCollapsed] = useState(status === "done")

  return (
    <div 
      ref={setNodeRef} // MOVED HERE: The entire column footprint is now the drop zone
      style={{ 
        width: 272, 
        flexShrink: 0,
        borderRadius: 12,
        padding: 4,
        // Visual indicator on the entire column when dragging over it
        background: isOver ? cfg.dim : "transparent",
        border: isOver ? `1.5px dashed ${cfg.dot}` : "1.5px dashed transparent",
        transition: "all 0.15s",
      }}
    >
      {/* Header Button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          width: "100%", marginBottom: 10, padding: "6px 8px",
          background: P.card, border: `1px solid ${P.border}`,
          borderRadius: 10, cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: P.text }}>{cfg.label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            fontSize: 11, padding: "1px 8px", borderRadius: 20,
            background: cfg.dim, color: cfg.color, fontWeight: 700,
          }}>
            {tasks.length}
          </span>
          {collapsed
            ? <ChevronDown size={12} color={P.textMute} strokeWidth={2} />
            : <ChevronUp   size={12} color={P.textMute} strokeWidth={2} />
          }
        </div>
      </button>

      {/* Accent line */}
      <div style={{ 
        height: 3, 
        background: cfg.dot, 
        borderRadius: 2, 
        marginBottom: 10, 
        opacity: collapsed ? 0.1 : 0.5 
      }} />

      {/* Task List - Safely hide contents when collapsed without breaking dnd-kit */}
      <div
        style={{
          display: collapsed ? "none" : "flex", 
          flexDirection: "column",
          gap: 10,
        }}
      >
        {tasks.length === 0 ? (
          <div style={{
            height: 64, borderRadius: 10,
            border: `1px dashed ${P.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: P.card,
          }}>
            <span style={{ fontSize: 11, color: P.textMute }}>No tasks here</span>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} nowISO={nowISO} onClick={onCardClick} />
          ))
        )}
      </div>
    </div>
  )
}
// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function ClientDashboard({ tasks: initialTasks, user, dateStr, greet, nowISO }: Props) {
  const router = useRouter()
  const [tasks,        setTasks]        = useState<Task[]>(initialTasks)
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null)
  const [logging,      setLogging]      = useState(false)
  const [isMounted,    setIsMounted]    = useState(false)
  const [draggingTaskIds, setDraggingTaskIds] = useState<Set<string>>(new Set())

  // Prevent Next.js SSR / Hydration mismatch issues
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const total      = tasks.length
  const done       = tasks.filter(t => t.status === "done").length
  const inProgress = tasks.filter(t => t.status === "inprogress").length
  const overdue    = tasks.filter(t => getDueStatus(t.due, nowISO) === "overdue" && t.status !== "done").length
  const dueToday   = tasks.filter(t => getDueStatus(t.due, nowISO) === "today" && t.status !== "done").length
  const pct        = total === 0 ? 0 : Math.round((done / total) * 100)

  const grouped = STATUS_ORDER.reduce<Record<string, Task[]>>((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s)
    return acc
  }, {})

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const taskId       = active.id as string
    const targetStatus = over.id as string // This will be "todo", "inprogress", etc.

    // Add to dragging set to prevent polling from updating it
    setDraggingTaskIds(prev => new Set(prev).add(taskId))

    // 1. Update the local UI state immediately so the card moves over smoothly
    setTasks(prevTasks => 
      prevTasks.map(t => 
        t.id === taskId ? { ...t, status: targetStatus } : t
      )
    )

    // 2. Optional: If you want to sync this move to your database via an API:
    
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus })
      })
    } catch (err) {
      console.error("Failed to save task status", err)
      // Rollback UI state if the server call fails
      setTasks(initialTasks)
    } finally {
      // Remove from dragging set after a short delay to let the UI settle
      setTimeout(() => {
        setDraggingTaskIds(prev => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
      }, 100)
    }
  }

  // Handle task updates from polling — memoized so identity stays stable
  // across renders (draggingTaskIds only changes on actual drag start/end).
  // This was the source of the polling loop: an inline arrow function here
  // was recreated every render, which made useTaskPolling's internal
  // fetchTasks unstable and retriggered the "initial fetch" on every render.
  const handleTasksUpdate = useCallback((polledTasks: PollingTask[]) => {
  setTasks(prevTasks => {
    if (draggingTaskIds.size > 0) {
      return prevTasks
    }
    return polledTasks as Task[]
  })
}, [draggingTaskIds])

  // Set up polling for real-time updates
  const { refetch: _refetch } = useTaskPolling({
    draggingTaskIds,
    onTasksUpdate: handleTasksUpdate,
    interval: 6000,
    filterParams: { talentId: user.id }
  })

  async function handleLogout() {
    setLogging(true)
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <>
      <div style={{
        minHeight: "100vh", background: P.bg0,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: P.text,
      }}>

        {/* NAVBAR */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 40,
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${P.border}`,
          display: "flex", alignItems: "center",
          padding: "0 32px", height: 56, gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: P.purpleDim,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
            }}>⚡</div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>Sahynex Core</span>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20,
              background: P.purpleDim, color: P.purpleText, fontWeight: 600,
            }}>
              Talent Portal
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {overdue > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: P.redDim, border: `1px solid ${P.red}44`,
                borderRadius: 8, padding: "5px 12px",
                fontSize: 11, color: P.red, fontWeight: 600,
              }}>
                <AlertTriangle size={12} strokeWidth={2.5} />
                {overdue} overdue
              </div>
            )}
            <Avatar name={user.name} size={28} />
            <span style={{ fontSize: 13, color: P.textSub, fontWeight: 500 }}>
              {user.name.split(" ")[0]}
            </span>
            <button
              onClick={handleLogout} disabled={logging}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "transparent", border: `1px solid ${P.border}`,
                borderRadius: 8, padding: "6px 12px",
                color: P.textSub, fontSize: 12, cursor: "pointer",
                fontWeight: 500, transition: "all 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = P.redDim
                ;(e.currentTarget as HTMLButtonElement).style.color = P.red
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = P.red + "44"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent"
                ;(e.currentTarget as HTMLButtonElement).style.color = P.textSub
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = P.border
              }}
            >
              <LogOut size={13} strokeWidth={1.8} />
              {logging ? "..." : "Sign out"}
            </button>
          </div>
        </nav>

        <div style={{ padding: "32px 32px 56px" }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", margin: 0 }}>
              {greet}, {user.name.split(" ")[0]} 👋
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: P.textSub }}>{dateStr}</p>
          </div>

          {/* ── ALERT BANNERS ─────────────────────────────────────────────── */}
          {(overdue > 0 || dueToday > 0) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {overdue > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: P.redDim, border: `1px solid ${P.red}33`,
                  borderRadius: 12, padding: "12px 16px",
                }}>
                  <AlertTriangle size={16} color={P.red} strokeWidth={2} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: P.redText }}>
                      {overdue} task{overdue > 1 ? "s are" : " is"} overdue
                    </span>
                    <span style={{ fontSize: 12, color: P.redText, opacity: 0.8, marginLeft: 8 }}>
                      — please review and update your agency
                    </span>
                  </div>
                </div>
              )}
              {dueToday > 0 && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: P.amberDim, border: `1px solid ${P.amber}33`,
                  borderRadius: 12, padding: "12px 16px",
                }}>
                  <Clock3 size={16} color={P.amber} strokeWidth={2} />
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: P.amberText }}>
                      {dueToday} task{dueToday > 1 ? "s are" : " is"} due today
                    </span>
                    <span style={{ fontSize: 12, color: P.amberText, opacity: 0.8, marginLeft: 8 }}>
                      — check progress below
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STAT CARDS ────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              { label: "Your Tasks",  value: total,      color: P.purple,                             dim: P.purpleDim, icon: CheckSquare,   delta: `${pct}% complete` },
              { label: "In Progress", value: inProgress, color: "#3B82F6",                            dim: "#EFF6FF",   icon: Clock3,        delta: "active now" },
              { label: "Completed",   value: done,       color: P.teal,                               dim: P.tealDim,   icon: CheckCircle2,  delta: "finished" },
              { label: "Overdue",     value: overdue,    color: overdue > 0 ? P.red : P.textMute,  dim: overdue > 0 ? P.redDim : P.bg1, icon: AlertTriangle, delta: overdue > 0 ? "needs attention" : "all on track" },
            ].map(({ label, value, color, dim, icon: Icon, delta }) => (
              <div
                key={label}
                style={{
                  background: P.card, border: `1px solid ${P.border}`,
                  borderRadius: 14, padding: "18px 20px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  position: "relative", overflow: "hidden",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"
                  el.style.transform = "translateY(-1px)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"
                  el.style.transform = "translateY(0)"
                }}
              >
                {/* Top accent */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "14px 14px 0 0" }} />

                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: dim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12, marginTop: 4,
                }}>
                  <Icon size={18} color={color} strokeWidth={1.8} />
                </div>
                <p style={{ fontSize: 11, color: P.textSub, letterSpacing: "0.4px", textTransform: "uppercase", fontWeight: 600, margin: 0 }}>
                  {label}
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-1px", color: P.text, margin: "4px 0 8px", lineHeight: 1 }}>
                  {value}
                </p>
                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: dim, color, fontWeight: 600 }}>
                  {delta}
                </span>
              </div>
            ))}
          </div>

          {/* ── PROGRESS BAR ──────────────────────────────────────────────── */}
          <div style={{
            background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 12, padding: "14px 20px", marginBottom: 24,
            display: "flex", alignItems: "center", gap: 16,
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            <span style={{ fontSize: 12, color: P.textSub, fontWeight: 600, whiteSpace: "nowrap" }}>
              Overall Progress
            </span>
            <div style={{ flex: 1, height: 8, background: P.bg1, borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%",
                background: pct === 100
                  ? P.teal
                  : `linear-gradient(90deg, ${P.purple}, #3B82F6)`,
                borderRadius: 4, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: pct === 100 ? P.teal : P.purple, minWidth: 36 }}>
              {pct}%
            </span>
            {pct === 100 && (
              <span style={{ fontSize: 12, color: P.teal, fontWeight: 600 }}>🎉 All done!</span>
            )}
          </div>

          {/* ── EMPTY STATE ───────────────────────────────────────────────── */}
          {total === 0 && (
            <div style={{
              textAlign: "center", padding: "64px 0",
              border: `1px dashed ${P.border}`, borderRadius: 16, background: P.card,
            }}>
              <CheckSquare size={36} color={P.textMute} strokeWidth={1.2} style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: P.textSub, margin: "0 0 6px", fontWeight: 500 }}>
                No tasks assigned yet
              </p>
              <p style={{ fontSize: 12, color: P.textMute }}>
                Your agency will assign tasks here once your project kicks off
              </p>
            </div>
          )}

          {/* ── BOARD ─────────────────────────────────────────────────────── */}
          {total > 0 && isMounted && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <p style={{ fontSize: 11, color: P.textSub, letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 600, margin: 0 }}>
                  Your Tasks
                </p>
                <span style={{ fontSize: 11, color: P.textMute }}>
                  Click any card to view details &amp; comments
                </span>
              </div>


              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
                      onCardClick={task => setSelectedTask(task as unknown as TaskDetail)}
                    />
                  ))}
                </div>
              </DndContext>
            </>
          )}
        </div>
      </div>

      {/* Task Detail Modal — employee can view + comment, read-only status */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          readOnly={true}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  )
}