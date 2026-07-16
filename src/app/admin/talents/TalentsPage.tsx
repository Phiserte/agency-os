"use client"

import { useState, useId, useEffect, useRef } from "react"
import { useRouter }        from "next/navigation"
import {
  Plus, Trash2, ExternalLink, Users,
  CheckCircle2, AlertTriangle, Copy, Check,
  CheckSquare, Menu, X
} from "lucide-react"
import Sidebar from "@/components/Sidebar"

// ── Light palette (matches employee portal theme) ─────────────────────────────
const T = {
  bg0:         "#F8FAFC",
  bg1:         "#F1F5F9",
  bg2:         "#E2E8F0",
  bg3:         "#F8FAFC",
  card:        "#FFFFFF",
  cardHover:   "#F8FAFC",
  border:      "#E2E8F0",
  borderHover: "#CBD5E1",
  violet:      "#534AB7",
  violetLight: "#3C3489",
  violetDim:   "#EEEDFE",
  cyan:        "#3B82F6",
  cyanLight:   "#1E40AF",
  cyanDim:     "#EFF6FF",
  emerald:     "#1D9E75",
  emeraldLight:"#085041",
  emeraldDim:  "#E1F5EE",
  amber:       "#EF9F27",
  amberLight:  "#633806",
  amberDim:    "#FAEEDA",
  rose:        "#E24B4A",
  roseDim:     "#FCEBEB",
  t1:          "#0F172A",
  t2:          "#475569",
  t3:          "#94A3B8",
}

interface TalentData {
  id: string; name: string; email: string; company: string
  createdAt: string
  tasks: { total: number; done: number; high: number }
}

interface Props {
  talents: TalentData[]
  user?: { name?: string; email?: string; role: string }
}

const AV_BG = [T.violetDim, T.cyanDim, T.emeraldDim, T.amberDim, T.roseDim]
const AV_FG = [T.violetLight, T.cyanLight, T.emeraldLight, T.amberLight, T.rose]

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const i = (name?.charCodeAt(0) ?? 65) % AV_BG.length
  const parts = (name ?? "?").trim().split(" ")
  const initials = parts.length === 1
    ? parts[0].slice(0, 2).toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: AV_BG[i], border: `1px solid ${AV_FG[i]}33`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.floor(size * 0.36), fontWeight: 700,
      color: AV_FG[i], fontFamily: "monospace", flexShrink: 0,
    }}>
      {initials}
    </div>
  )
}

// INVITE MODAL
function InviteModal({
  onClose, onCreated
}: {
  onClose: () => void
  onCreated: (talent: TalentData & { tempPassword?: string }) => void
}) {
  const uid = useId()
  const [name,     setName]     = useState("")
  const [email,    setEmail]    = useState("")
  const [company,  setCompany]  = useState("")
  const [password, setPassword] = useState("")
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/talents", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name, email, company, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to create talent"); return }
      onCreated(data)
      onClose()
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: T.bg1,
    border: `1px solid ${T.border}`, borderRadius: 8,
    padding: "8px 10px", color: T.t1, fontSize: 13,
    fontFamily: "monospace", outline: "none", boxSizing: "border-box",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: T.t3, fontFamily: "monospace",
    letterSpacing: "0.4px", display: "block", marginBottom: 5,
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)",
        backdropFilter: "blur(4px)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 50,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.card, border: `1px solid ${T.borderHover}`,
          borderRadius: 16, padding: "24px",
          width: 420, maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 20px 40px rgba(15,23,42,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: T.t1, margin: 0 }}>Invite Client</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {error && (
          <div style={{
            background: T.roseDim, border: `1px solid ${T.rose}44`,
            borderRadius: 8, padding: "8px 12px", marginBottom: 16,
            fontSize: 12, color: T.rose, fontFamily: "monospace",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label htmlFor={`${uid}-name`} style={labelStyle}>FULL NAME *</label>
            <input id={`${uid}-name`} value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required style={inputStyle} />
          </div>
          <div>
            <label htmlFor={`${uid}-email`} style={labelStyle}>EMAIL *</label>
            <input id={`${uid}-email`} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@company.com" required style={inputStyle} />
          </div>
          <div>
            <label htmlFor={`${uid}-company`} style={labelStyle}>COMPANY</label>
            <input id={`${uid}-company`} value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" style={inputStyle} />
          </div>
          <div>
            <label htmlFor={`${uid}-pass`} style={labelStyle}>
              TEMPORARY PASSWORD
              <span style={{ color: T.t3, marginLeft: 6 }}>(auto-generated if blank)</span>
            </label>
            <input id={`${uid}-pass`} type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to auto-generate" style={inputStyle} />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              background: "transparent", border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "8px 18px", color: T.t2,
              fontSize: 13, cursor: "pointer", fontFamily: "monospace",
            }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              background: loading ? T.violetDim : T.violet,
              border: "none", borderRadius: 8, padding: "8px 20px",
              color: "#fff", fontSize: 13, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer", fontFamily: "monospace",
            }}>
              {loading ? "Creating..." : "Create & Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// CREDENTIALS MODAL
function CredentialsModal({
  talent, onClose
}: {
  talent: TalentData & { tempPassword?: string }
  onClose: () => void
}) {
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPass,  setCopiedPass]  = useState(false)

  function copy(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login"

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
        backdropFilter: "blur(4px)", display: "flex",
        alignItems: "center", justifyContent: "center", zIndex: 60,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: T.card, border: `1px solid ${T.emerald}44`,
          borderRadius: 16, padding: "28px",
          width: 420, maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 20px 40px rgba(15,23,42,0.14)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: T.emeraldDim, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <CheckCircle2 size={18} color={T.emeraldLight} strokeWidth={2} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.t1, margin: 0 }}>Talent created!</h2>
            <p style={{ fontSize: 12, color: T.t3, fontFamily: "monospace", margin: 0 }}>Share these credentials with {talent.name}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Login URL",  value: loginUrl,          copied: false,      setCopied: () => {} },
            { label: "Email",      value: talent.email,      copied: copiedEmail, setCopied: setCopiedEmail },
            { label: "Password",   value: talent.tempPassword ?? "—", copied: copiedPass, setCopied: setCopiedPass },
          ].map(({ label, value, copied, setCopied }) => (
            <div key={label} style={{
              background: T.bg1, border: `1px solid ${T.border}`,
              borderRadius: 10, padding: "10px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: T.t1, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
              </div>
              <button
                onClick={() => copy(value, setCopied)}
                style={{
                  background: copied ? T.emeraldDim : T.violetDim,
                  border: `1px solid ${copied ? T.emerald : T.violet}44`,
                  borderRadius: 7, padding: "5px 10px",
                  color: copied ? T.emeraldLight : T.violetLight,
                  fontSize: 11, cursor: "pointer", display: "flex",
                  alignItems: "center", gap: 4, fontFamily: "monospace", flexShrink: 0,
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>

        <div style={{
          background: T.amberDim, border: `1px solid ${T.amber}33`,
          borderRadius: 8, padding: "10px 14px", marginBottom: 20,
          fontSize: 11, color: T.amberLight, fontFamily: "monospace",
          display: "flex", gap: 8,
        }}>
          <AlertTriangle size={13} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
          Save this password now — it won&apos;t be shown again
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", background: T.violet, border: "none",
            borderRadius: 10, padding: "10px",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "monospace",
          }}
        >
          Done
        </button>
      </div>
    </div>
  )
}

// MAIN RESPONSIVE PAGE
export default function TalentsPage({ talents: initial, user }: Props) {
  const router = useRouter()
  const [talents,     setTalents]     = useState<TalentData[]>(initial)
  const [showInvite,  setShowInvite]  = useState(false)
  const [newTalent,   setNewTalent]   = useState<(TalentData & { tempPassword?: string }) | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  
  // Responsive UI States
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 992)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!isMobileSidebarOpen || !isMobile) return
    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setIsMobileSidebarOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMobileSidebarOpen, isMobile])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove ${name}? Their tasks will remain on the board but will be unlinked.`)) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/talents/${id}`, { method: "DELETE" })
      if (res.ok) {
        setTalents(prev => prev.filter(t => t.id !== id))
      }
    } finally {
      setDeletingId(null)
    }
  }

  const totalTasks = talents.reduce((s, t) => s + t.tasks.total, 0)
  const totalDone  = talents.reduce((s, t) => s + t.tasks.done, 0)

  return (
    <div style={{
      width: "100vw", height: "100vh", overflow: "hidden", 
      background: T.bg0, display: "flex", position: "relative",
    }}>

      {/* ── Mobile Sidebar Drawer Toggle Button ── */}
      {isMobile && (
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          style={{
            position: "fixed", top: 16, left: 16, zIndex: 90,
            width: 38, height: 38, borderRadius: 10, background: T.card,
            border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          {isMobileSidebarOpen ? <X size={18} color={T.t1} /> : <Menu size={18} color={T.t1} />}
        </button>
      )}

      {/* ── Sidebar System Layout ── */}
      {isMobile ? (
        <div
          ref={sidebarRef}
          style={{
            width: isMobileSidebarOpen ? 240 : 0, minWidth: isMobileSidebarOpen ? 240 : 0,
            height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 100,
            transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            overflow: "hidden", background: T.card, borderRight: `1px solid ${T.border}`,
            boxShadow: isMobileSidebarOpen ? "4px 0 24px rgba(15,23,42,0.12)" : "none",
          }}
        >
          <div style={{ width: 240, height: "100vh", display: "flex", flexDirection: "column" }}>
            <Sidebar user={user} />
          </div>
        </div>
      ) : (
        <div style={{ width: 240, minWidth: 240, height: "100vh", flexShrink: 0, background: T.card, borderRight: `1px solid ${T.border}` }}>
          <Sidebar user={user} />
        </div>
      )}

      {/* ── Scroll Content Frame Window ── */}
      <div style={{
        flex: 1, minWidth: 0, height: "100vh", display: "flex", flexDirection: "column",
        overflowY: "auto", overflowX: "hidden", boxSizing: "border-box",
        fontFamily: "'Syne','DM Sans',system-ui,sans-serif", color: T.t1,
        padding: isMobile ? "76px 16px 40px" : "36px 32px 56px"
      }}>

        {/* Header Block responsive structure */}
        <div style={{ 
          display: "flex", 
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "stretch" : "flex-start", 
          justifyContent: "space-between", 
          gap: 16,
          marginBottom: 32 
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 24 : 28, fontWeight: 700, letterSpacing: "-0.5px", color: T.t1, margin: 0 }}>
              Talents
            </h1>
            <p style={{ marginTop: 4, fontSize: 13, color: T.t3, fontFamily: "monospace", margin: 0 }}>
              {talents.length} talent{talents.length !== 1 ? "s" : ""} · {totalTasks} tasks assigned
            </p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: T.violet, border: "none", borderRadius: 10,
              padding: "10px 18px", color: "#fff",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "monospace", width: isMobile ? "100%" : "auto",
            }}
          >
            <Plus size={15} strokeWidth={2} /> Invite Talent
          </button>
        </div>

        {/* Summary stat cards responsive layout grid */}
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", 
          gap: 14, 
          marginBottom: 28 
        }}>
          {[
            { label: "Total Talents",  value: talents.length, color: T.violetLight, dim: T.violetDim,  icon: Users },
            { label: "Tasks Assigned", value: totalTasks,     color: T.amberLight,  dim: T.amberDim,   icon: CheckSquare },
            { label: "Tasks Done",     value: totalDone,       color: T.emeraldLight,dim: T.emeraldDim, icon: CheckCircle2 },
          ].map(({ label, value, color, dim, icon: Icon }) => (
            <div key={label} style={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "18px 20px",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: dim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={19} color={color} strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ fontSize: 10, color: T.t3, fontFamily: "monospace", letterSpacing: "0.4px", margin: 0 }}>{label}</p>
                <p style={{ fontSize: 26, fontWeight: 700, color, margin: "3px 0 0", letterSpacing: "-0.5px", lineHeight: 1 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Talent list component area */}
        {talents.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            border: `1px dashed ${T.border}`, borderRadius: 16, background: T.card,
          }}>
            <Users size={40} color={T.t3} strokeWidth={1.2} style={{ margin: "0 auto 14px" }} />
            <p style={{ fontSize: 15, color: T.t2, margin: "0 0 6px" }}>No talents yet</p>
            <p style={{ fontSize: 12, color: T.t3, fontFamily: "monospace", margin: "0 0 20px" }}>
              Invite your first talent to get started
            </p>
            <button
              onClick={() => setShowInvite(true)}
              style={{
                background: T.violet, border: "none", borderRadius: 10,
                padding: "9px 20px", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "monospace",
              }}
            >
              + Invite Talent
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {talents.map(talent => {
              const pct = talent.tasks.total === 0
                ? 0
                : Math.round((talent.tasks.done / talent.tasks.total) * 100)

              return (
                <div
                  key={talent.id}
                  style={{
                    background: T.card, border: `1px solid ${T.border}`,
                    borderRadius: 14, padding: isMobile ? "16px" : "18px 22px",
                    display: "flex", 
                    flexDirection: isMobile ? "column" : "row",
                    alignItems: isMobile ? "stretch" : "center", 
                    gap: 16,
                    transition: "all 0.12s",
                    boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                  }}
                  onMouseEnter={e => { 
                    if(!isMobile) {
                      e.currentTarget.style.background = T.cardHover
                      e.currentTarget.style.borderColor = T.borderHover
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,23,42,0.06)" 
                    }
                  }}
                  onMouseLeave={e => { 
                    if(!isMobile) {
                      e.currentTarget.style.background = T.card
                      e.currentTarget.style.borderColor = T.border
                      e.currentTarget.style.boxShadow = "0 1px 3px rgba(15,23,42,0.03)"
                    }
                  }}
                >
                  
                  {/* Avatar + Main Identity Block Container */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <Avatar name={talent.name} size={42} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 8px", marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{talent.name}</span>
                        {talent.company && (
                          <span style={{
                            fontSize: 10, padding: "1px 8px", borderRadius: 20,
                            background: T.cyanDim, color: T.cyanLight, fontFamily: "monospace",
                          }}>
                            {talent.company}
                          </span>
                        )}
                        {talent.tasks.high > 0 && (
                          <span style={{
                            fontSize: 10, padding: "1px 8px", borderRadius: 20,
                            background: T.roseDim, color: T.rose, fontFamily: "monospace",
                            display: "flex", alignItems: "center", gap: 3,
                          }}>
                            <AlertTriangle size={9} strokeWidth={2.5} />
                            {talent.tasks.high} high prio
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: T.t3, fontFamily: "monospace", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {talent.email}
                      </p>
                    </div>
                  </div>

                  {/* Progress segment area metrics display layout framework */}
                  <div style={{ minWidth: isMobile ? "auto" : 260 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <div style={{ flex: 1, height: 4, background: T.bg1, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          width: `${pct}%`, height: "100%",
                          background: pct === 100 ? T.emerald : `linear-gradient(90deg,${T.violet},${T.cyan})`,
                          borderRadius: 2,
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: T.t2, fontFamily: "monospace" }}>
                      {talent.tasks.done}/{talent.tasks.total} tasks · {pct}%
                    </span>
                  </div>

                  {/* Action group triggers placement row positioning alignment options */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: isMobile ? "flex-end" : "center",
                    gap: 8, 
                    flexShrink: 0,
                    borderTop: isMobile ? `1px solid ${T.border}` : "none",
                    paddingTop: isMobile ? 12 : 0
                  }}>
                    <button
                      onClick={() => router.push(`/admin/tasks?talent=${talent.id}`)}
                      title="View tasks"
                      style={{
                        background: T.violetDim, border: `1px solid ${T.violet}33`,
                        borderRadius: 8, padding: "7px 12px",
                        color: T.violetLight, fontSize: 12,
                        cursor: "pointer", fontFamily: "monospace",
                        display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <ExternalLink size={12} strokeWidth={1.8} /> View Tasks
                    </button>

                    <button
                      onClick={() => handleDelete(talent.id, talent.name)}
                      disabled={deletingId === talent.id}
                      title="Remove talent"
                      style={{
                        background: "transparent", border: `1px solid ${T.border}`,
                        borderRadius: 8, padding: "7px 10px",
                        color: T.t3, cursor: "pointer",
                        display: "flex", alignItems: "center",
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  </div>

                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals injection track portal */}
      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onCreated={talent => {
            setTalents(prev => [{ ...talent, tasks: { total: 0, done: 0, high: 0 } }, ...prev])
            setNewTalent(talent)
          }}
        />
      )}

      {newTalent && (
        <CredentialsModal
          talent={newTalent}
          onClose={() => setNewTalent(null)}
        />
      )}
    </div>
  )
}