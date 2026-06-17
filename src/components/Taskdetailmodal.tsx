"use client"

import { useState, useEffect, useRef } from "react"
import {
  X, Send, Clock, Tag, User, Calendar,
  AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react"

const T = {
  bg0:         "#080C14",
  bg1:         "#0D1321",
  bg2:         "#111827",
  bg3:         "#1A2238",
  card:        "#141B2D",
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

export interface TaskDetail {
  id: string
  _id?: string
  title: string
  description?: string
  priority: string
  status: string
  assignee?: string
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
  medium: { label: "Medium", color: T.amberLight,  dim: T.amberDim },
  low:    { label: "Low",    color: T.t2,           dim: "rgba(148,163,184,0.12)" },
}

const STATUS_OPTIONS = [
  { value: "backlog",    label: "Backlog",     color: T.t3 },
  { value: "todo",       label: "To Do",       color: T.violetLight },
  { value: "inprogress", label: "In Progress", color: T.amberLight },
  { value: "review",     label: "Review",      color: T.cyanLight },
  { value: "done",       label: "Done",        color: T.emeraldLight },
]

const AV_BG = [T.violetDim, T.cyanDim, T.emeraldDim, T.amberDim, T.roseDim]
const AV_FG = [T.violetLight, T.cyanLight, T.emeraldLight, T.amberLight, T.rose]

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const i = (name?.charCodeAt(0) ?? 65) % AV_BG.length
  const parts = (name ?? "?").trim().split(" ")
  const initials = parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: AV_BG[i], border: `1px solid ${AV_FG[i]}44`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.floor(size * 0.36), fontWeight: 700,
      color: AV_FG[i], fontFamily: "monospace", flexShrink: 0,
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

function getDueWarning(due?: string): { label: string; color: string } | null {
  if (!due) return null
  const dueDate = new Date(due)
  if (isNaN(dueDate.getTime())) return null
  const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
  if (diffDays < 0)  return { label: `${Math.abs(diffDays)}d overdue`, color: T.rose }
  if (diffDays === 0) return { label: "Due today",                       color: T.amberLight }
  if (diffDays <= 3) return { label: `Due in ${diffDays}d`,             color: T.amberLight }
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
  const bottomRef = useRef<HTMLDivElement>(null)

  const p          = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.low
  const dueWarning = getDueWarning(task.due)
  const tags       = task.tags ?? []

  // Fetch comments
  useEffect(() => {
    setLoadingCmts(true)
    fetch(`/api/tasks/${taskId}/comments`)
      .then(r => r.json())
      .then((data: Comment[]) => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setLoadingCmts(false))
  }, [taskId])

  // Scroll to bottom when comments load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  // Close on Escape
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

  const currentStatus = STATUS_OPTIONS.find(s => s.value === status)

  return (
    /* Overlay */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: "20px 16px",
      }}
    >
      {/* Modal */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:   T.card,
          border:       `1px solid ${T.borderHover}`,
          borderRadius: 18,
          width:        "100%",
          maxWidth:     820,
          maxHeight:    "90vh",
          display:      "flex",
          overflow:     "hidden",
        }}
      >
        {/* LEFT — Task detail */}
        <div style={{
          flex: 1, overflowY: "auto",
          padding: "28px 28px 24px",
          borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", gap: 20,
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              {/* Priority + due warning */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 4,
                  background: p.dim, color: p.color,
                  fontFamily: "monospace", fontWeight: 600,
                }}>
                  {p.label}
                </span>
                {dueWarning && (
                  <span style={{
                    fontSize: 10, padding: "2px 8px", borderRadius: 4,
                    background: dueWarning.color === T.rose ? T.roseDim : T.amberDim,
                    color: dueWarning.color, fontFamily: "monospace",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <AlertTriangle size={9} strokeWidth={2.5} />
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
              }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = T.t1}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = T.t3}
            >
              <X size={20} strokeWidth={1.8} />
            </button>
          </div>

          {/* Description */}
          {task.description && (
            <p style={{
              fontSize: 13, color: T.t2, lineHeight: 1.6,
              fontFamily: "monospace", margin: 0,
              padding: "14px", background: T.bg1,
              borderRadius: 10, border: `1px solid ${T.border}`,
            }}>
              {task.description}
            </p>
          )}

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* Status */}
            <div style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <CheckCircle2 size={12} color={T.t3} strokeWidth={1.8} />
                <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", letterSpacing: "0.4px" }}>STATUS</span>
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

            {/* Assignee */}
            <div style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <User size={12} color={T.t3} strokeWidth={1.8} />
                <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", letterSpacing: "0.4px" }}>ASSIGNEE</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {task.assignee
                  ? <><Avatar name={task.assignee} size={22} /><span style={{ fontSize: 13, color: T.t1, fontWeight: 600 }}>{task.assignee}</span></>
                  : <span style={{ fontSize: 13, color: T.t3 }}>Unassigned</span>
                }
              </div>
            </div>

            {/* Due date */}
            <div style={{
              background: T.bg1, border: `1px solid ${dueWarning ? dueWarning.color + "33" : T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Calendar size={12} color={T.t3} strokeWidth={1.8} />
                <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", letterSpacing: "0.4px" }}>DUE DATE</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: dueWarning?.color ?? T.t2 }}>
                {task.due
                  ? new Date(task.due).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })
                  : "No due date"
                }
              </span>
            </div>

            {/* Created */}
            <div style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "12px 14px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Clock size={12} color={T.t3} strokeWidth={1.8} />
                <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", letterSpacing: "0.4px" }}>CREATED</span>
              </div>
              <span style={{ fontSize: 13, color: T.t2, fontFamily: "monospace" }}>
                {task.createdAt ? timeAgo(task.createdAt) : "—"}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div style={{
            background: T.bg1, border: `1px solid ${T.border}`,
            borderRadius: 10, padding: "14px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", letterSpacing: "0.4px" }}>PROGRESS</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: progress === 100 ? T.emeraldLight : T.amberLight, fontFamily: "monospace" }}>
                {progress}%
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginBottom: 10 }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: progress === 100 ? T.emerald : `linear-gradient(90deg, ${T.violet}, ${T.cyan})`,
                borderRadius: 3, transition: "width 0.3s",
              }} />
            </div>
            {!readOnly && (
              <input
                type="range" min={0} max={100} step={5}
                value={progress}
                onChange={e => handleProgressChange(Number(e.target.value))}
                style={{ width: "100%", accentColor: T.violet, cursor: "pointer" }}
              />
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Tag size={12} color={T.t3} strokeWidth={1.8} />
                <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", letterSpacing: "0.4px" }}>TAGS</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
                      fontSize: 11, padding: "3px 10px", borderRadius: 20,
                      background: c.dim, color: c.color, fontFamily: "monospace",
                    }}>
                      {tag}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Comments */}
        <div style={{
          width: 320, flexShrink: 0,
          display: "flex", flexDirection: "column",
          background: T.bg1,
        }}>
          {/* Comments header */}
          <div style={{
            padding: "20px 20px 14px",
            borderBottom: `1px solid ${T.border}`,
          }}>
            <p style={{ fontSize: 11, color: T.t2, letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: "monospace", margin: 0 }}>
              Comments {comments.length > 0 && `(${comments.length})`}
            </p>
          </div>

          {/* Comment list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
            {loadingCmts ? (
              <div style={{ display: "flex", justifyContent: "center", paddingTop: 24 }}>
                <Loader2 size={18} color={T.t3} strokeWidth={1.8} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : comments.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: 32 }}>
                <p style={{ fontSize: 12, color: T.t3, fontFamily: "monospace", margin: 0 }}>No comments yet</p>
                <p style={{ fontSize: 11, color: T.t3, fontFamily: "monospace", marginTop: 4 }}>Be the first to comment</p>
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
                        background: c.authorRole === "admin" ? T.violetDim : T.cyanDim,
                        color: c.authorRole === "admin" ? T.violetLight : T.cyanLight,
                        fontFamily: "monospace",
                      }}>
                        {c.authorRole}
                      </span>
                      <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", marginLeft: "auto" }}>
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: 12, color: T.t2, lineHeight: 1.5,
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: "8px 10px",
                      fontFamily: "monospace",
                    }}>
                      {c.message}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Comment input */}
          <form
            onSubmit={handleSendComment}
            style={{
              padding: "14px 20px",
              borderTop: `1px solid ${T.border}`,
              display: "flex", flexDirection: "column", gap: 8,
            }}
          >
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSendComment(e as unknown as React.FormEvent)
              }}
              placeholder="Add a comment... (Ctrl+Enter to send)"
              rows={3}
              style={{
                width: "100%", background: T.bg3,
                border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "9px 12px", color: T.t1, fontSize: 12,
                fontFamily: "monospace", outline: "none",
                resize: "none", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={e => (e.target as HTMLTextAreaElement).style.borderColor = T.violetLight}
              onBlur={e  => (e.target as HTMLTextAreaElement).style.borderColor = T.border}
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                background: !message.trim() || sending ? T.violetDim : T.violet,
                border: "none", borderRadius: 8, padding: "8px 14px",
                color: !message.trim() || sending ? T.violetLight : "#fff",
                fontSize: 12, fontWeight: 600,
                cursor: !message.trim() || sending ? "not-allowed" : "pointer",
                fontFamily: "monospace", transition: "all 0.15s",
                alignSelf: "flex-end",
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
    </div>
  )
}