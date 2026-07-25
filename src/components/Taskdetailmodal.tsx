"use client"

import { useState, useEffect, useRef } from "react"
import {
  X, Send, Clock, Tag, User, Calendar,
  AlertTriangle, CheckCircle2, Loader2, Trash2,
} from "lucide-react"

// ── Strict Light Theme Palette ────────────────────────────────────────────────
const T = {
  bg0:         "rgba(17, 24, 39, 0.4)", // Light backdrop modal overlay dim
  bg1:         "#F9FAFB",               // Off-white container segments
  bg2:         "#FFFFFF",               // Pure white workspace surfaces
  bg3:         "#F3F4F6",               // Input text background fields
  card:        "#FFFFFF",               // Main modal paper surface
  border:      "#E5E7EB",               // Default border line
  borderHover: "#D1D5DB",               // Active state borders
  purple:      "#534AB7",               // Theme purple
  purpleLight: "#7C73E6", 
  purpleDim:   "#EEEDFE", 
  cyan:        "#0891B2", 
  cyanDim:     "#E0F7FA", 
  emerald:     "#059669", 
  emeraldDim:  "#E6F4EA", 
  amber:       "#D97706", 
  amberDim:    "#FEF3C7", 
  rose:        "#DC2626", 
  roseDim:     "#FCEBEB", 
  t1:          "#111827",               // Main heading charcoal ink
  t2:          "#4B5563",               // Soft body text slate
  t3:          "#9CA3AF",               // Light caption gray
}

export interface TaskDetail {
  id: string
  _id?: string
  title: string
  description?: string
  priority: string
  status: string
  assignee?: string
  assignedBy?: string
  clientId?: string | null
  tags?: string[]
  due?: string
  progress?: number
  createdAt?: string
}

interface Comment {
  id: string
  authorName: string
  authorRole: "admin" | "client"
  message: string
  createdAt: string
}

interface Props {
  task: TaskDetail
  readOnly?: boolean
  onClose: () => void
  onStatusChange?: (taskId: string, status: string) => void
  onProgressChange?: (taskId: string, progress: number) => void
}

const PRIORITY_CFG: Record<string, { label: string; color: string; dim: string }> = {
  high:   { label: "High",   color: T.rose,        dim: T.roseDim },
  medium: { label: "Medium", color: T.amber,       dim: T.amberDim },
  low:    { label: "Low",    color: T.t2,          dim: T.bg1 },
}

const STATUS_OPTIONS = [
  { value: "backlog",    label: "Backlog",     color: T.t2 },
  { value: "todo",       label: "To Do",       color: T.purple },
  { value: "inprogress", label: "In Progress", color: T.amber },
  { value: "review",     label: "Review",      color: T.cyan },
  { value: "done",       label: "Done",        color: T.emerald },
]

const AV_BG = [T.purpleDim, T.cyanDim, T.emeraldDim, T.amberDim, T.roseDim]
const AV_FG = [T.purple, T.cyan, T.emerald, T.amber, T.rose]

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const i = (name?.charCodeAt(0) ?? 65) % AV_BG.length
  const parts = (name ?? "?").trim().split(" ")
  const initials = parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: AV_BG[i], border: `1px solid ${AV_FG[i]}22`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.floor(size * 0.36), fontWeight: 700,
      color: AV_FG[i], flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)
  if (mins  <  1) return "just now"
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  <  7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

function getDueWarning(due?: string): { label: string; color: string; dim: string } | null {
  if (!due) return null
  const dueDate = new Date(due)
  if (isNaN(dueDate.getTime())) return null
  const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
  if (diffDays < 0)  return { label: `${Math.abs(diffDays)}d overdue`, color: T.rose, dim: T.roseDim }
  if (diffDays === 0) return { label: "Due today",                       color: T.amber,  dim: T.amberDim }
  if (diffDays <= 3) return { label: `Due in ${diffDays}d`,             color: T.amber,  dim: T.amberDim }
  return null
}

export default function TaskDetailModal({
  task, readOnly = false, onClose, onStatusChange, onProgressChange
}: Props) {
  const taskId = (task._id ?? task.id) as string

  const [comments,     setComments]     = useState<Comment[]>([])
  const [loadingCmts,  setLoadingCmts]  = useState(true)
  const [message,      setMessage]      = useState("")
  const [sending,      setSending]      = useState(false)
  const [status,       setStatus]       = useState(task.status)
  const [progress,     setProgress]     = useState(task.progress ?? 0)
  const [savingStatus, setSavingStatus] = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const p          = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.low
  const dueWarning = getDueWarning(task.due)
  const tags       = task.tags ?? []

  useEffect(() => {
    setLoadingCmts(true)
    fetch(`/api/tasks/${taskId}/comments`)
      .then(r => r.json())
      .then((data: Comment[]) => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setLoadingCmts(false))
  }, [taskId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose])

  async function handleStatusChange(newStatus: string) {
    if (readOnly || newStatus === status) return
    setSavingStatus(true)
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: newStatus }),
      })
      setStatus(newStatus)
      onStatusChange?.(taskId, newStatus)
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleProgressChange(val: number) {
    if (readOnly) return
    setProgress(val)
    await fetch(`/api/tasks/${taskId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ progress: val }),
    })
    onProgressChange?.(taskId, val)
  }

  async function handleSendComment(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: message.trim() }),
      })
      if (res.ok) {
        const newComment: Comment = await res.json()
        setComments(prev => [...prev, newComment])
        setMessage("")
      }
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        onClose()
        onStatusChange?.(taskId, status)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "Failed to delete task")
      }
    } catch (error) {
      alert("Failed to delete task. Please try again.")
    } finally {
      setDeleting(false)
      setShowConfirm(false)
    }
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status)

  return (
    /* Light Mode Translucent Backdrop Overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: T.bg0, 
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: "20px 16px",
      }}
    >
      {/* Modal Canvas Box */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   T.card,
          border:       `1px solid ${T.border}`,
          borderRadius: 16,
          width:        "100%",
          maxWidth:     820,
          maxHeight:    "90vh",
          display:      "flex",
          overflow:     "hidden",
          boxShadow:    "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.03)",
        }}
      >
        {/* LEFT — Task Detail Panel */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "28px 28px 24px",
          borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", gap: 20,
          background: T.bg2,
        }}>
          {/* Header row */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 6,
                  background: p.dim, color: p.color, fontWeight: 600,
                }}>
                  {p.label}
                </span>
                {dueWarning && (
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 6,
                    background: dueWarning.dim, color: dueWarning.color,
                    fontWeight: 600, display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <AlertTriangle size={12} strokeWidth={2.5} />
                    {dueWarning.label}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: T.t1, margin: 0, lineHeight: 1.3 }}>
                {task.title}
              </h2>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "transparent", border: "none",
                color: T.t3, cursor: "pointer", padding: 4, flexShrink: 0,
                transition: "color 0.1s"
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = T.t1}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = T.t3}
            >
              <X size={20} strokeWidth={2} />
            </button>
            {!readOnly && (
              <button
                onClick={() => setShowConfirm(true)}
                style={{
                  background: "transparent", border: "none",
                  color: T.rose, cursor: "pointer", padding: 4, flexShrink: 0,
                  transition: "all 0.1s", marginLeft: 4
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = T.roseDim
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent"
                }}
                title="Delete task"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Description Container */}
          {task.description && (
            <p style={{
              fontSize: 13, color: T.t2, lineHeight: 1.6,
              margin: 0, padding: "14px", background: T.bg1,
              borderRadius: 10, border: `1px solid ${T.border}`,
            }}>
              {task.description}
            </p>
          )}

          {/* Metadata Layout Matrix */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Status Dropdown block */}
            <div style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <CheckCircle2 size={13} color={T.t3} strokeWidth={2} />
                <span style={{ fontSize: 10, color: T.t2, fontWeight: 700, letterSpacing: "0.5px" }}>STATUS</span>
              </div>
              {readOnly ? (
                <span style={{ fontSize: 13, fontWeight: 600, color: currentStatus?.color ?? T.t2 }}>
                  {currentStatus?.label}
                </span>
              ) : (
                <select
                  value={status}
                  onChange={e => handleStatusChange(e.target.value)}
                  disabled={savingStatus}
                  style={{
                    background: "transparent", border: "none",
                    color: currentStatus?.color ?? T.t2,
                    fontSize: 13, fontWeight: 600,
                    cursor: "pointer", outline: "none", width: "100%",
                  }}
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s.value} value={s.value} style={{ background: T.bg2, color: T.t1 }}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Assignee Card Block */}
            <div style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <User size={13} color={T.t3} strokeWidth={2} />
                <span style={{ fontSize: 10, color: T.t2, fontWeight: 700, letterSpacing: "0.5px" }}>ASSIGNEE</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {task.assignee
                  ? <><Avatar name={task.assignee} size={22} /><span style={{ fontSize: 13, color: T.t1, fontWeight: 600 }}>{task.assignee}</span></>
                  : <span style={{ fontSize: 13, color: T.t3, fontWeight: 500 }}>Unassigned</span>
                }
              </div>
            </div>

            {/* Assigned By Card Block */}
            <div style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <User size={13} color={T.t3} strokeWidth={2} />
                <span style={{ fontSize: 10, color: T.t2, fontWeight: 700, letterSpacing: "0.5px" }}>ASSIGNED BY</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {task.assignedBy
                  ? <><Avatar name={task.assignedBy} size={22} /><span style={{ fontSize: 13, color: T.t1, fontWeight: 600 }}>{task.assignedBy}</span></>
                  : <span style={{ fontSize: 13, color: T.t3, fontWeight: 500 }}>Unknown</span>
                }
              </div>
            </div>

            {/* Target Due Date Block */}
            <div style={{
              background: T.bg1, border: `1px solid ${dueWarning ? dueWarning.color + "22" : T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Calendar size={13} color={T.t3} strokeWidth={2} />
                <span style={{ fontSize: 10, color: T.t2, fontWeight: 700, letterSpacing: "0.5px" }}>DUE DATE</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: dueWarning?.color ?? T.t1 }}>
                {task.due
                  ? new Date(task.due).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
                  : "No due date"
                }
              </span>
            </div>

            {/* Calendar Log Trace */}
            <div style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Clock size={13} color={T.t3} strokeWidth={2} />
                <span style={{ fontSize: 10, color: T.t2, fontWeight: 700, letterSpacing: "0.5px" }}>CREATED</span>
              </div>
              <span style={{ fontSize: 13, color: T.t1, fontWeight: 500 }}>
                {task.createdAt ? timeAgo(task.createdAt) : "—"}
              </span>
            </div>
          </div>

          {/* Progress Interactive Tracker */}
          <div style={{
            background: T.bg1, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: T.t2, fontWeight: 700, letterSpacing: "0.5px" }}>PROGRESS</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? T.emerald : T.purple }}>
                {progress}%
              </span>
            </div>
            <div style={{ height: 6, background: "#E5E7EB", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: progress === 100 ? T.emerald : `linear-gradient(90deg, ${T.purple}, #3B82F6)`,
                borderRadius: 3, transition: "width 0.3s",
              }} />
            </div>
            {!readOnly && (
              <input
                type="range" min={0} max={100} step={5}
                value={progress}
                onChange={e => handleProgressChange(Number(e.target.value))}
                style={{ width: "100%", accentColor: T.purple, cursor: "pointer" }}
              />
            )}
          </div>

          {/* Tag Array Wrapper */}
          {tags.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Tag size={13} color={T.t3} strokeWidth={2} />
                <span style={{ fontSize: 10, color: T.t2, fontWeight: 700, letterSpacing: "0.5px" }}>TAGS</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {tags.map((tag, i) => {
                  const colors = [
                    { color: T.purple,  dim: T.purpleDim },
                    { color: T.cyan,    dim: T.cyanDim },
                    { color: T.emerald, dim: T.emeraldDim },
                    { color: T.amber,   dim: T.amberDim },
                  ]
                  const c = colors[i % colors.length]
                  return (
                    <span key={tag} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: c.dim, color: c.color, fontWeight: 600,
                    }}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Chat Comment Stream */}
        <div style={{
          width: 320, flexShrink: 0,
          display: "flex", flexDirection: "column",
          background: T.bg1,
        }}>
          {/* Section Sub-heading Banner */}
          <div style={{
            padding: "20px 20px 14px",
            borderBottom: `1px solid ${T.border}`,
            background: T.bg2,
          }}>
            <p style={{ fontSize: 11, color: T.t2, letterSpacing: "0.5px", textTransform: "uppercase", fontWeight: 700, margin: 0 }}>
              Comments {comments.length > 0 && `(${comments.length})`}
            </p>
          </div>

          {/* Comment Scroller List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {loadingCmts ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
                <Loader2 size={18} color={T.purple} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 32 }}>
                <p style={{ fontSize: 12, color: T.t2, fontWeight: 600, margin: 0 }}>No comments yet</p>
                <p style={{ fontSize: 11, color: T.t3, marginTop: 4, margin: 0 }}>Be the first to speak out</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} style={{ display: "flex", gap: 9 }}>
                  <Avatar name={c.authorName} size={26} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: T.t1 }}>{c.authorName}</span>
                      <span style={{
                        fontSize: 9, padding: "1px 6px", borderRadius: 20,
                        background: c.authorRole === "admin" ? T.purpleDim : T.cyanDim,
                        color: c.authorRole === "admin" ? T.purple : T.cyan,
                        fontWeight: 700, textTransform: "uppercase"
                      }}>
                        {c.authorRole}
                      </span>
                      <span style={{ fontSize: 10, color: T.t3, marginLeft: "auto" }}>
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12, color: T.t1, lineHeight: 1.5,
                      background: T.bg2,
                      border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: "8px 10px",
                    }}>
                      {c.message}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Interactive Text Input Footer */}
          <form
            onSubmit={handleSendComment}
            style={{
              padding: "14px 20px",
              borderTop: `1px solid ${T.border}`,
              background: T.bg2,
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSendComment(e as unknown as React.FormEvent)
              }}
              placeholder="Add a comment... (Ctrl+Enter)"
              rows={3}
              style={{
                width: "100%", background: T.bg3,
                border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "9px 12px", color: T.t1, fontSize: 12,
                outline: "none", resize: "none", boxSizing: "border-box",
                transition: "all 0.15s",
              }}
              onFocus={e => {
                const el = e.target as HTMLTextAreaElement
                el.style.borderColor = T.purple
                el.style.backgroundColor = T.bg2
              }}
              onBlur={e  => {
                const el = e.target as HTMLTextAreaElement
                el.style.borderColor = T.border
                el.style.backgroundColor = T.bg3
              }}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: !message.trim() || sending ? T.purpleDim : T.purple,
                border: "none", borderRadius: 8, padding: "8px 14px",
                color: !message.trim() || sending ? T.purpleLight : "#fff",
                fontSize: 12, fontWeight: 600,
                cursor: !message.trim() || sending ? "not-allowed" : "pointer",
                transition: "all 0.15s", alignSelf: "flex-end",
              }}
            >
              {sending
                ? <Loader2 size={13} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                : <Send size={13} strokeWidth={2} />
              }
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>

      {/* Delete Confirmation Dialog */}
      {showConfirm && (
        <div
          onClick={() => setShowConfirm(false)}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: "24px",
              width: "100%",
              maxWidth: 400,
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: T.roseDim,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <AlertTriangle size={20} color={T.rose} strokeWidth={2} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>
                Delete Task
              </h3>
            </div>
            <p style={{ fontSize: 13, color: T.t2, margin: "0 0 20px", lineHeight: 1.5 }}>
              Are you sure you want to delete <strong>"{task.title}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowConfirm(false)}
                disabled={deleting}
                style={{
                  background: T.bg1,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "9px 18px",
                  color: T.t2,
                  fontSize: 13,
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontWeight: 500,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  background: T.rose,
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 18px",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: deleting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} strokeWidth={2} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
