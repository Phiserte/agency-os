"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname }       from "next/navigation"
import {
  LayoutDashboard, CheckSquare, Users, LogOut,
  BarChart3, Settings, Bell, Search, TrendingUp,
  TrendingDown, CheckCircle2, Clock, AlertCircle,
  UserPlus, ChevronDown, ArrowUpDown, Eye,
  ChevronLeft, ChevronRight, Calendar, Tag,
} from "lucide-react"

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  purple:      "#534AB7",
  purpleHover: "#4339A0",
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
  green:       "#639922",
  greenDim:    "#EAF3DE",
  greenText:   "#27500A",
  sidebar:     "#1E1B4B",
  sidebarHov:  "#2D2A6A",
  sidebarAct:  "#312E81",
  sidebarText: "#C7D2FE",
  sidebarMute: "#818CF8",
  bg:          "#F3F4F8",
  card:        "#FFFFFF",
  border:      "#E5E7EB",
  borderDark:  "#D1D5DB",
  text:        "#111827",
  textSub:     "#6B7280",
  textMute:    "#9CA3AF",
}

const STATUS_CFG: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  backlog:    { label: "Backlog",     bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
  todo:       { label: "To Do",       bg: P.purpleDim, color: P.purpleText, dot: P.purple },
  inprogress: { label: "In Progress", bg: "#EFF6FF",   color: "#1E40AF",   dot: "#3B82F6" },
  review:     { label: "Review",      bg: P.amberDim,  color: P.amberText, dot: P.amber },
  done:       { label: "Done",        bg: P.tealDim,   color: P.tealText,  dot: P.teal },
}

const PRIORITY_CFG: Record<string, { label: string; bg: string; color: string }> = {
  high:   { label: "High",   bg: P.redDim,   color: P.redText },
  medium: { label: "Medium", bg: P.amberDim, color: P.amberText },
  low:    { label: "Low",    bg: P.greenDim, color: P.greenText },
}

const AV_COLORS = [
  { bg: P.purpleDim, color: P.purpleText },
  { bg: P.tealDim,   color: P.tealText },
  { bg: P.amberDim,  color: P.amberText },
  { bg: P.redDim,    color: P.redText },
  { bg: P.greenDim,  color: P.greenText },
]

const NAV = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/tasks",     icon: CheckSquare,      label: "Tasks" },
  { href: "/admin/clients",   icon: Users,            label: "Clients" },
  { href: "/admin/team",      icon: UserPlus,         label: "Team" },
  { href: "/admin/reports",   icon: BarChart3,        label: "Reports" },
]

interface Task {
  id: string; title: string; description: string
  priority: string; status: string; assignee: string
  clientId?: string; tags: string[]; due: string
  progress: number; createdAt: string; updatedAt: string
}

interface ActivityItem {
  id: string; title: string; assignee: string
  priority: string; status: string; updatedAt: string
}

interface Props {
  tasks: Task[]; tableTasks: Task[]; recentActivity: ActivityItem[]
  total: number; openTasks: number; doneThisWeek: number; lastMonthDone: number
  teamCount: number; clientCount: number
  chart: { labels: string[]; created: number[]; completed: number[] }
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

// ── Status / Priority pill ────────────────────────────────────────────────────
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

// ── Chart ─────────────────────────────────────────────────────────────────────
function TaskChart({ labels, created, completed }: { labels: string[]; created: number[]; completed: number[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<unknown>(null)

  useEffect(() => {
    const load = () => {
      if (!canvasRef.current) return
      const Chart = (window as unknown as { Chart: new (...args: unknown[]) => { destroy: () => void } }).Chart
      if (!Chart) return
      if (chartRef.current) (chartRef.current as { destroy: () => void }).destroy()
      chartRef.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Created", data: created,
              backgroundColor: P.purpleLight,
              borderRadius: 4, barPercentage: 0.55, categoryPercentage: 0.6,
            },
            {
              label: "Completed", data: completed,
              type: "line",
              borderColor: P.teal, backgroundColor: "transparent",
              borderWidth: 2, borderDash: [5, 4],
              pointBackgroundColor: P.teal,
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 4, tension: 0.35,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: "#1F2937",
              titleColor: "#F9FAFB", bodyColor: "#D1D5DB",
              borderColor: "#374151", borderWidth: 1,
              padding: 10, cornerRadius: 8,
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: P.textMute, font: { size: 11 } },
              border: { display: false },
            },
            y: {
              grid: { color: "#F3F4F6" },
              ticks: { color: P.textMute, font: { size: 11 }, stepSize: 1 },
              border: { display: false },
              min: 0,
            },
          },
        },
      })
    }

    if ((window as unknown as { Chart?: unknown }).Chart) {
      load()
    } else {
      const script = document.createElement("script")
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"
      script.onload = load
      document.head.appendChild(script)
    }
  }, [labels, created, completed])

  return (
    <div style={{ position: "relative", width: "100%", height: 170 }}>
      <canvas ref={canvasRef} aria-label="Task volume chart" role="img" />
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8

export default function DashboardPage({
  tasks, tableTasks, recentActivity,
  total, openTasks, doneThisWeek, lastMonthDone,
  teamCount, clientCount, chart,
  dateStr, greet, nowISO, user,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  const [search,         setSearch]         = useState("")
  const [page,           setPage]           = useState(1)
  const [loggingOut,     setLoggingOut]     = useState(false)
  const [statusFilter,   setStatusFilter]   = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  async function handleLogout() {
    setLoggingOut(true)
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

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
    if (item.status === "done")              return { bg: P.tealDim,   color: P.teal,   Icon: CheckCircle2 }
    if (item.priority === "high")            return { bg: P.redDim,    color: P.red,    Icon: AlertCircle }
    if (item.status === "review")            return { bg: P.amberDim,  color: P.amber,  Icon: Eye }
    if (item.status === "inprogress")        return { bg: "#EFF6FF",   color: "#3B82F6",Icon: Clock }
    return                                          { bg: P.purpleDim, color: P.purple, Icon: Clock }
  }

  const overdue = tasks.filter(t =>
    getDueWarning(t.due, nowISO)?.color === P.red && t.status !== "done"
  ).length

  return (
    <div style={{
      display: "flex", height: "100vh",
      background: P.bg, overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: P.text,
    }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: P.sidebar,
        display: "flex", flexDirection: "column",
        padding: "20px 12px",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px", marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: P.purple,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 0 0 3px ${P.purple}55`,
          }}>
            <span style={{ fontSize: 17 }}>⚡</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px" }}>Agency OS</div>
            <div style={{ fontSize: 10, color: P.sidebarMute }}>Admin Portal</div>
          </div>
        </div>

        {/* Nav */}
        <p style={{ fontSize: 10, fontWeight: 600, color: P.sidebarMute, letterSpacing: "1px", padding: "0 10px", marginBottom: 6 }}>MAIN</p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 2,
                background: active ? P.sidebarAct : "transparent",
                border: active ? `1px solid ${P.purple}66` : "1px solid transparent",
                color: active ? "#fff" : P.sidebarText,
                fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: "pointer", textAlign: "left", transition: "all 0.12s",
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = P.sidebarHov }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
            >
              <Icon size={15} strokeWidth={1.8} color={active ? "#fff" : P.sidebarMute} />
              <span style={{ flex: 1 }}>{label}</span>
              {label === "Tasks" && overdue > 0 && (
                <span style={{
                  fontSize: 9, padding: "1px 6px", borderRadius: 20,
                  background: P.red, color: "#fff", fontWeight: 600,
                }}>{overdue}</span>
              )}
            </button>
          )
        })}

        <p style={{ fontSize: 10, fontWeight: 600, color: P.sidebarMute, letterSpacing: "1px", padding: "0 10px", margin: "16px 0 6px" }}>SYSTEM</p>
        {[{ icon: Bell, label: "Notifications" }, { icon: Settings, label: "Settings" }].map(({ icon: Icon, label }) => (
          <button key={label} style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "9px 12px", borderRadius: 8, marginBottom: 2,
            background: "transparent", border: "1px solid transparent",
            color: P.sidebarText, fontSize: 13, cursor: "pointer", textAlign: "left", transition: "all 0.12s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = P.sidebarHov}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}
          >
            <Icon size={15} strokeWidth={1.8} color={P.sidebarMute} />{label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* Profile */}
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.1)`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 4px", marginBottom: 10 }}>
            <Avatar name={user.name} size={32} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ fontSize: 10, color: P.sidebarMute }}>Administrator</div>
            </div>
            <ChevronDown size={12} color={P.sidebarMute} strokeWidth={1.8} />
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              width: "100%", padding: "8px 10px", borderRadius: 8,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              color: P.sidebarText, fontSize: 12, cursor: "pointer", transition: "all 0.12s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = P.redDim; (e.currentTarget as HTMLButtonElement).style.color = P.red }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = P.sidebarText }}
          >
            <LogOut size={13} strokeWidth={1.8} />
            {loggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Topbar */}
        <header style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "0 28px", height: 56, flexShrink: 0,
          background: P.card,
          borderBottom: `1px solid ${P.border}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: P.text, flex: 1, letterSpacing: "-0.3px" }}>
            Dashboard
          </span>

          {/* Search */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: P.bg, border: `1px solid ${P.border}`,
            borderRadius: 10, padding: "7px 12px", width: 220,
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
          }}>
            <Search size={13} color={P.textMute} strokeWidth={1.8} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search tasks..."
              style={{
                border: "none", background: "transparent",
                fontSize: 13, color: P.text, outline: "none", width: "100%",
              }}
            />
          </div>

          {/* Bell */}
          <div style={{ position: "relative" }}>
            <button style={{
              width: 36, height: 36, borderRadius: 10,
              border: `1px solid ${P.border}`, background: P.card,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}>
              <Bell size={16} color={P.textSub} strokeWidth={1.8} />
            </button>
            {overdue > 0 && (
              <div style={{
                position: "absolute", top: -3, right: -3,
                width: 10, height: 10, borderRadius: "50%",
                background: P.red, border: `2px solid ${P.card}`,
              }} />
            )}
          </div>

          {/* User */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "5px 10px", borderRadius: 10,
            border: `1px solid ${P.border}`, background: P.card,
            cursor: "pointer",
          }}>
            <Avatar name={user.name} size={26} />
            <span style={{ fontSize: 13, fontWeight: 500, color: P.text }}>{user.name.split(" ")[0]}</span>
            <ChevronDown size={12} color={P.textMute} strokeWidth={1.8} />
          </div>
        </header>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 40px" }}>

          {/* Greeting */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.4px" }}>
              {greet}, {user.name.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: 13, color: P.textSub, margin: "4px 0 0" }}>{dateStr}</p>
          </div>

          {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {[
              {
                label: "Total Tasks", value: total, icon: CheckSquare,
                accent: P.purple, accentDim: P.purpleDim,
                delta: `+${Math.max(0, total - 1)} added`, up: true, sub: "all time",
                onClick: () => router.push("/admin/tasks"),
              },
              {
                label: "Open Tasks", value: openTasks, icon: Clock,
                accent: "#3B82F6", accentDim: "#EFF6FF",
                delta: openTasks <= 5 ? "on track" : "high volume", up: openTasks <= 5, sub: "not done yet",
                onClick: () => router.push("/admin/tasks"),
              },
              {
                label: "Done This Week", value: doneThisWeek, icon: CheckCircle2,
                accent: P.teal, accentDim: P.tealDim,
                delta: lastMonthDone > 0 ? `${Math.round((doneThisWeek/lastMonthDone)*100)}% of mo` : "this week",
                up: true, sub: "completed",
                onClick: () => router.push("/admin/tasks"),
              },
              {
                label: "Clients", value: clientCount, icon: Users,
                accent: P.amber, accentDim: P.amberDim,
                delta: `${teamCount} team member${teamCount !== 1 ? "s" : ""}`, up: true, sub: "active",
                onClick: () => router.push("/admin/clients"),
              },
            ].map(({ label, value, icon: Icon, accent, accentDim, delta, up, sub, onClick }) => (
              <div
                key={label}
                onClick={onClick}
                style={{
                  background: P.card, border: `1px solid ${P.border}`,
                  borderRadius: 14, padding: "18px 20px",
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  position: "relative", overflow: "hidden",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"
                  el.style.transform = "translateY(-1px)"
                  el.style.borderColor = accent + "44"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"
                  el.style.transform = "translateY(0)"
                  el.style.borderColor = P.border
                }}
              >
                {/* Top accent line */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "14px 14px 0 0" }} />

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, marginTop: 6 }}>
                  <span style={{ fontSize: 12, color: P.textSub, fontWeight: 500 }}>{label}</span>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: accentDim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={16} color={accent} strokeWidth={1.8} />
                  </div>
                </div>

                <div style={{ fontSize: 30, fontWeight: 700, color: P.text, lineHeight: 1, marginBottom: 10, letterSpacing: "-1px" }}>
                  {value}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {up
                    ? <TrendingUp  size={12} color={P.teal} strokeWidth={2} />
                    : <TrendingDown size={12} color={P.red}  strokeWidth={2} />
                  }
                  <span style={{ fontSize: 12, color: up ? P.teal : P.red, fontWeight: 600 }}>{delta}</span>
                  <span style={{ fontSize: 12, color: P.textMute }}>{sub}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── MID ROW ────────────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 14, marginBottom: 20 }}>

            {/* Activity feed */}
            <div style={{
              background: P.card, border: `1px solid ${P.border}`,
              borderRadius: 14, padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>Recent Activity</div>
                  <div style={{ fontSize: 12, color: P.textSub, marginTop: 2 }}>Live feed of task updates</div>
                </div>
                <button
                  onClick={() => router.push("/admin/tasks")}
                  style={{
                    fontSize: 11, color: P.purple, background: P.purpleDim,
                    border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 500,
                  }}
                >
                  View all
                </button>
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
                        onClick={() => router.push("/admin/tasks")}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 0",
                          borderBottom: idx < recentActivity.length - 1 ? `1px solid ${P.border}` : "none",
                          cursor: "pointer", transition: "opacity 0.1s",
                        }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.opacity = "0.75"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.opacity = "1"}
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

            {/* Chart */}
            <div style={{
              background: P.card, border: `1px solid ${P.border}`,
              borderRadius: 14, padding: "18px 20px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>Task Volume (Last 7 Days)</div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: P.textSub }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: P.purpleLight, display: "inline-block" }} />
                    Created
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 14, height: 0, display: "inline-block", borderBottom: `2.5px dashed ${P.teal}`, marginBottom: 2 }} />
                    Completed
                  </span>
                </div>
              </div>
              <TaskChart labels={chart.labels} created={chart.created} completed={chart.completed} />
            </div>
          </div>

          {/* ── TASK TABLE ─────────────────────────────────────────────────── */}
          <div style={{
            background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 14, overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            {/* Table header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderBottom: `1px solid ${P.border}`,
              background: `linear-gradient(to bottom, ${P.card}, ${P.bg}33)`,
            }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>All Tasks</span>
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

            {/* Table */}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: P.bg }}>
                  {["ID", "Title", "Status", "Priority", "Assignee", "Due", "Updated", "Action"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "10px 16px",
                      fontSize: 11, fontWeight: 600, color: P.textSub,
                      borderBottom: `1px solid ${P.border}`,
                      whiteSpace: "nowrap", letterSpacing: "0.3px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        {h}
                        {!["Action"].includes(h) && <ArrowUpDown size={9} color={P.textMute} strokeWidth={2} />}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: P.textMute, fontSize: 13 }}>
                      No tasks match your filters
                    </td>
                  </tr>
                ) : pageRows.map((task, i) => {
                  const sc  = STATUS_CFG[task.status]     ?? STATUS_CFG.backlog
                  const pc  = PRIORITY_CFG[task.priority] ?? PRIORITY_CFG.medium
                  const due = getDueWarning(task.due, nowISO)
                  return (
                    <tr
                      key={task.id}
                      style={{ transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = P.bg}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "transparent"}
                    >
                      <td style={{
                        padding: "11px 16px", fontSize: 11,
                        color: P.textMute, fontWeight: 600,
                        borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none",
                        fontFamily: "monospace",
                      }}>
                        #{task.id.slice(-4).toUpperCase()}
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none", maxWidth: 200 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {task.title}
                        </div>
                        {task.tags?.length > 0 && (
                          <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                            {task.tags.slice(0,2).map(tag => (
                              <span key={tag} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: P.purpleDim, color: P.purpleText }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none" }}>
                        <Pill label={sc.label} bg={sc.bg} color={sc.color} dot={sc.dot} />
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none" }}>
                        <Pill label={pc.label} bg={pc.bg} color={pc.color} />
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none" }}>
                        {task.assignee ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <Avatar name={task.assignee} size={22} />
                            <span style={{ fontSize: 12, color: P.textSub, whiteSpace: "nowrap" }}>
                              {task.assignee.split(" ")[0]}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: P.textMute }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none", whiteSpace: "nowrap" }}>
                        {due ? (
                          <span style={{ fontSize: 11, color: due.color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                            <AlertCircle size={11} strokeWidth={2.5} /> {due.label}
                          </span>
                        ) : task.due ? (
                          <span style={{ fontSize: 11, color: P.textSub }}>
                            {new Date(task.due).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                          </span>
                        ) : (
                          <span style={{ color: P.textMute }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none", fontSize: 11, color: P.textMute, whiteSpace: "nowrap" }}>
                        {timeAgo(task.updatedAt, nowISO)}
                      </td>
                      <td style={{ padding: "11px 16px", borderBottom: i < pageRows.length - 1 ? `1px solid ${P.border}` : "none" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => router.push("/admin/tasks")}
                            style={{
                              fontSize: 11, color: P.purple, fontWeight: 600,
                              background: P.purpleDim, border: "none",
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                            }}
                          >
                            View
                          </button>
                          <button
                            onClick={() => router.push("/admin/tasks")}
                            style={{
                              fontSize: 11, color: P.textSub,
                              background: P.bg, border: `1px solid ${P.border}`,
                              borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderTop: `1px solid ${P.border}`,
              background: P.bg,
            }}>
              <span style={{ fontSize: 12, color: P.textSub }}>
                Showing <strong>{filtered.length === 0 ? 0 : (page-1)*PAGE_SIZE+1}</strong>–<strong>{Math.min(page*PAGE_SIZE, filtered.length)}</strong> of <strong>{filtered.length}</strong> tasks
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => setPage(p => Math.max(1,p-1))}
                  disabled={page===1}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.border}`,
                    background: P.card, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: page===1 ? "not-allowed" : "pointer", opacity: page===1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={13} color={P.textSub} strokeWidth={2} />
                </button>
                {Array.from({ length: Math.min(totalPages,5) }, (_,i) => {
                  const pg = i+1
                  return (
                    <button key={pg} onClick={() => setPage(pg)} style={{
                      width: 30, height: 30, borderRadius: 8,
                      border: `1px solid ${page===pg ? P.purple : P.border}`,
                      background: page===pg ? P.purple : P.card,
                      color: page===pg ? "#fff" : P.textSub,
                      fontSize: 12, fontWeight: page===pg ? 600 : 400,
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {pg}
                    </button>
                  )
                })}
                {totalPages > 5 && <>
                  <span style={{ color: P.textMute, fontSize: 12, lineHeight: "30px", padding: "0 3px" }}>...</span>
                  <button onClick={() => setPage(totalPages)} style={{
                    width: 30, height: 30, borderRadius: 8,
                    border: `1px solid ${page===totalPages ? P.purple : P.border}`,
                    background: page===totalPages ? P.purple : P.card,
                    color: page===totalPages ? "#fff" : P.textSub,
                    fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {totalPages}
                  </button>
                </>}
                <button
                  onClick={() => setPage(p => Math.min(totalPages,p+1))}
                  disabled={page===totalPages}
                  style={{
                    width: 30, height: 30, borderRadius: 8, border: `1px solid ${P.border}`,
                    background: P.card, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: page===totalPages ? "not-allowed" : "pointer", opacity: page===totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={13} color={P.textSub} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ height: 32 }} />
        </div>
      </div>
    </div>
  )
}