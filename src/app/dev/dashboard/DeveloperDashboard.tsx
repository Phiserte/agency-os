"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  CheckSquare, Bell, Search,
  TrendingUp, TrendingDown, CheckCircle2, Clock,
  AlertCircle, ChevronDown, ArrowUpDown, Eye,
  Menu, X,
} from "lucide-react"
import Sidebar from "@/components/Sidebar"

// ── Palette (same as admin dashboard, kept consistent) ────────────────────────
const LOGO_SRC = "/logo.svg"

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
  borderDark:  "#D1D5DB",
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

interface Task {
  id: string; title: string; description: string
  priority: string; status: string; assignee: string
  assignedBy?: string; tags: string[]; due: string
  progress: number; createdAt: string; updatedAt: string
}

interface ActivityItem {
  id: string; title: string; assignee: string
  priority: string; status: string; updatedAt: string
}

interface Props {
  tasks: Task[]; tableTasks: Task[]; recentActivity: ActivityItem[]
  total: number; openTasks: number; doneThisWeek: number; overdueCount: number
  dateStr: string; greet: string; nowISO: string
  user: { name: string; email: string; role: string }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  if (!name) return "?"
  const p = name.trim().split(" ")
  return p.length === 1 ? p[0].slice(0,2).toUpperCase() : (p[0][0]+p[p.length-1][0]).toUpperCase()
}

function avColor(name: string) {
  return AV_COLORS[(name?.charCodeAt(0) ?? 65) % AV_COLORS.length]
}

function timeAgo(iso: string, nowISO: string) {
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

function getDueWarning(due: string, nowISO: string) {
  if (!due) return null
  const d = new Date(due)
  if (isNaN(d.getTime())) return null
  const days = Math.ceil((d.getTime() - new Date(nowISO).getTime()) / 86400000)
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, color: P.red }
  if (days === 0) return { label: "Due today", color: P.amber }
  return null
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 28 }: { name: string; size?: number }) {
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

// ── MAIN ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8

export default function DeveloperDashboard({
  tasks, tableTasks, recentActivity,
  total, openTasks, doneThisWeek, overdueCount,
  dateStr, greet, nowISO, user,
}: Props) {
  const router = useRouter()

  const [search,         setSearch]         = useState("")
  const [page,           setPage]           = useState(1)
  const [statusFilter,   setStatusFilter]   = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const filtered = tableTasks.filter(t => {
    const q = search.toLowerCase()
    const ms = !q || t.title.toLowerCase().includes(q) || (t.assignee||"").toLowerCase().includes(q)
    const mst = statusFilter   === "all" || t.status   === statusFilter
    const mp  = priorityFilter === "all" || t.priority === priorityFilter
    return ms && mst && mp
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function activityStyle(item: ActivityItem) {
    if (item.status === "done")       return { bg: P.tealDim,   color: P.teal,   Icon: CheckCircle2 }
    if (item.priority === "high")     return { bg: P.redDim,    color: P.red,    Icon: AlertCircle }
    if (item.status === "review")     return { bg: P.amberDim,  color: P.amber,  Icon: Eye }
    if (item.status === "inprogress") return { bg: "#EFF6FF",   color: "#3B82F6",Icon: Clock }
    return                                   { bg: P.purpleDim, color: P.purple, Icon: Clock }
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!isMobileSidebarOpen || !isMobile) return
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsMobileSidebarOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobileSidebarOpen, isMobile])

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* ── Mobile Sidebar Toggle Button ── */}
      {isMobile && (
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          style={{
            position: "fixed", top: 10, left: 14, zIndex: 1000,
            width: 36, height: 36, borderRadius: 8,
            background: P.card, border: `1px solid ${P.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", color: P.text,
          }}
          title={isMobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isMobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      )}

      {/* ── Sidebar ── */}
      {isMobile ? (
        <div
          ref={sidebarRef}
          style={{
            width: isMobileSidebarOpen ? 240 : 0,
            minWidth: isMobileSidebarOpen ? 240 : 0,
            height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 999,
            transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden", background: P.card, borderRight: `1px solid ${P.border}`,
            boxShadow: isMobileSidebarOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
          }}
        >
          <div style={{ width: 240, height: "100vh", display: "flex", flexDirection: "column" }}>
            <Sidebar user={user} />
          </div>
        </div>
      ) : (
        <div style={{
          width: 240, minWidth: 240, height: "100vh", flexShrink: 0,
          background: P.card, borderRight: `1px solid ${P.border}`,
        }}>
          <Sidebar user={user} />
        </div>
      )}

      {/* ── Page Track ── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: P.bg, overflow: "hidden",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: P.text, minWidth: 0,
      }}>

        {/* Topbar */}
        <header style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: isMobile ? "0 14px 0 60px" : "0 28px",
          height: 56, flexShrink: 0,
          background: P.card,
          borderBottom: `1px solid ${P.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="Sahynex"
            style={{
              height: isMobile ? 20 : 24,
            }}
          />

          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: P.bg, border: `1px solid ${P.border}`,
            borderRadius: 10, padding: "7px 12px",
            width: isMobile ? 120 : 220,
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
          }}>
            <Search size={13} color={P.textMute} strokeWidth={1.8} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder={isMobile ? "Search..." : "Search tasks..."}
              style={{ border: "none", background: "transparent", fontSize: 13, color: P.text, outline: "none", width: "100%" }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <button style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${P.border}`, background: P.card,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <Bell size={16} color={P.textSub} strokeWidth={1.8} />
            </button>
            {overdueCount > 0 && (
              <div style={{
                position: "absolute", top: -3, right: -3,
                width: 10, height: 10, borderRadius: "50%",
                background: P.red, border: `2px solid ${P.card}`,
              }} />
            )}
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 8px", borderRadius: 10,
            border: `1px solid ${P.border}`, background: P.card, cursor: "pointer",
          }}>
            <Avatar name={user.name} size={26} />
            {!isMobile && (
              <>
                <span style={{ fontSize: 13, fontWeight: 500, color: P.text }}>{user.name.split(" ")[0]}</span>
                <ChevronDown size={12} color={P.textMute} strokeWidth={1.8} />
              </>
            )}
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 14px 32px" : "24px 28px 40px" }}>

          {/* Greeting */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: isMobile ? 20 : 22, fontWeight: 700, margin: 0, letterSpacing: "-0.4px" }}>
              {greet}, {user.name.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: 12, color: P.textSub, margin: "4px 0 0" }}>{dateStr}</p>
          </div>

          {/* ── STAT CARDS — trimmed to what a marketing manager needs ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(auto-fit, minmax(140px, 1fr))" : "repeat(4, 1fr)",
            gap: 14, marginBottom: 20
          }}>
            {[
              {
                label: "Total Tasks", value: total, icon: CheckSquare,
                accent: P.purple, accentDim: P.purpleDim,
                delta: "marketing", up: true, sub: "all time",
              },
              {
                label: "Open Tasks", value: openTasks, icon: Clock,
                accent: "#3B82F6", accentDim: "#EFF6FF",
                delta: openTasks <= 5 ? "on track" : "high volume", up: openTasks <= 5, sub: "not done yet",
              },
              {
                label: "Done This Week", value: doneThisWeek, icon: CheckCircle2,
                accent: P.teal, accentDim: P.tealDim,
                delta: "completed", up: true, sub: "this week",
              },
              {
                label: "Overdue", value: overdueCount, icon: AlertCircle,
                accent: overdueCount > 0 ? P.red : P.textMute,
                accentDim: overdueCount > 0 ? P.redDim : "#F3F4F6",
                delta: overdueCount > 0 ? "needs attention" : "all on track",
                up: overdueCount === 0, sub: "",
              },
            ].map(({ label, value, icon: Icon, accent, accentDim, delta, up, sub }) => (
              <div
                key={label}
                style={{
                  background: P.card, border: `1px solid ${P.border}`,
                  borderRadius: 14, padding: "16px 18px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "14px 14px 0 0" }} />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: P.textSub, fontWeight: 500 }}>{label}</span>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={15} color={accent} strokeWidth={1.8} />
                  </div>
                </div>

                <div style={{ fontSize: 28, fontWeight: 700, color: P.text, lineHeight: 1, marginBottom: 8, letterSpacing: "-1px" }}>
                  {value}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    {up
                      ? <TrendingUp  size={11} color={P.teal} strokeWidth={2} />
                      : <TrendingDown size={11} color={P.red}  strokeWidth={2} />
                    }
                    <span style={{ fontSize: 11, color: up ? P.teal : P.red, fontWeight: 600 }}>{delta}</span>
                  </div>
                  {sub && <span style={{ fontSize: 11, color: P.textMute }}>{sub}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ── Recent Activity ── */}
          <div style={{
            background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 14, padding: "18px 20px", marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>Recent Activity</div>
                <div style={{ fontSize: 12, color: P.textSub, marginTop: 2 }}>Live feed of marketing task updates</div>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "24px 0", color: P.textMute, fontSize: 13 }}>
                No activity yet
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {recentActivity.map((item, idx) => {
                  const { bg, color, Icon } = activityStyle(item)
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 0",
                        borderBottom: idx < recentActivity.length - 1 ? `1px solid ${P.border}` : "none",
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: bg, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `1.5px solid ${color}22`,
                      }}>
                        <Icon size={14} color={color} strokeWidth={2} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13, fontWeight: 600, color: P.text,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 11, color: P.textSub, marginTop: 1 }}>
                          {item.assignee || "Unassigned"} · {(STATUS_CFG[item.status] ?? STATUS_CFG.backlog).label}
                        </div>
                      </div>
                      <span style={{
                        fontSize: 11, color: P.textMute, flexShrink: 0,
                        background: P.bg, padding: "2px 7px", borderRadius: 6,
                        border: `1px solid ${P.border}`,
                      }}>
                        {timeAgo(item.updatedAt, nowISO)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div> 
          
          

          {/* ── TASK TABLE ── */}
          <div style={{
            background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 14, overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
              padding: "14px 20px", borderBottom: `1px solid ${P.border}`,
              background: `linear-gradient(to bottom, ${P.card}, ${P.bg}33)`,
            }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>Dev Tasks</span>
                <span style={{
                  fontSize: 11, marginLeft: 8, padding: "2px 8px", borderRadius: 20,
                  background: P.purpleDim, color: P.purpleText, fontWeight: 600,
                }}>
                  {filtered.length}
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
                  style={{
                    fontSize: 12, color: P.textSub, background: P.card,
                    border: `1px solid ${P.border}`, borderRadius: 8,
                    padding: "5px 10px", cursor: "pointer", outline: "none",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="inprogress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="todo">To Do</option>
                  <option value="backlog">Backlog</option>
                  <option value="done">Done</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
                  style={{
                    fontSize: 12, color: P.textSub, background: P.card,
                    border: `1px solid ${P.border}`, borderRadius: 8,
                    padding: "5px 10px", cursor: "pointer", outline: "none",
                  }}
                >
                  <option value="all">All Priority</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: P.bg }}>
                    {["ID", "Title", "Status", "Priority", "Assignee", "Due", "Updated"].map(h => (
                      <th key={h} style={{
                        textAlign: "left", padding: "10px 16px",
                        fontSize: 11, fontWeight: 600, color: P.textSub,
                        borderBottom: `1px solid ${P.border}`,
                        whiteSpace: "nowrap", letterSpacing: "0.3px",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          {h}
                          <ArrowUpDown size={9} color={P.textMute} strokeWidth={2} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((t) => (
                    <tr
                      key={t.id}
                      style={{ borderBottom: `1px solid ${P.border}`, transition: "background 0.1s ease" }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#FAFAFA"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 16px", fontSize: 12, color: P.textMute }}>{t.id.slice(-4)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: P.text }}>{t.title}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <Pill {...(STATUS_CFG[t.status] || STATUS_CFG.backlog)} />
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <Pill {...(PRIORITY_CFG[t.priority] || PRIORITY_CFG.low)} />
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: P.textSub }}>{t.assignee || "Unassigned"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: P.textSub }}>{t.due ? new Date(t.due).toLocaleDateString("en-IN") : "-"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: P.textSub }}>{timeAgo(t.updatedAt, nowISO)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
