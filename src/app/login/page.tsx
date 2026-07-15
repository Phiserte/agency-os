"use client"

import { useState, useId, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, Moon, Sun, CheckSquare, Users, BarChart3, Shield } from "lucide-react"

// ── Refined Palettes ────────────────────────────────────────────────────────
const LIGHT = {
  panelFrom:  "#E0F2FE",
  panelTo:    "#EEF2FF",
  rightBg:    "#F8FAFC",
  card:       "#FFFFFF",
  border:     "#E2E8F0",
  inputBg:    "#F1F5F9",
  violet:     "#4F46E5",
  violetDim:  "#EEF2FF",
  t1:         "#0F172A",
  t2:         "#475569",
  t3:         "#94A3B8",
  toggleBg:   "#0F172A",
  toggleFg:   "#F59E0B",
  blobA:      "rgba(79, 70, 229, 0.12)",
  blobB:      "rgba(16, 185, 129, 0.1)",
  blobC:      "rgba(245, 158, 11, 0.08)",
}

const DARK = {
  panelFrom:  "#0F0B26",
  panelTo:    "#1A153B",
  rightBg:    "#030712",
  card:       "#0B0F19",
  border:     "rgba(255, 255, 255, 0.06)",
  inputBg:    "#131825",
  violet:     "#6366F1",
  violetDim:  "rgba(99, 102, 241, 0.12)",
  t1:         "#F8FAFC",
  t2:         "#94A3B8",
  t3:         "#475569",
  toggleBg:   "#F8FAFC",
  toggleFg:   "#4F46E5",
  blobA:      "rgba(99, 102, 241, 0.18)",
  blobB:      "rgba(16, 185, 129, 0.12)",
  blobC:      "rgba(245, 158, 11, 0.08)",
}

const LOGO_SRC = "/logo.png"
const TASK_SRC = "/task.png"

const FEATURES = [
  { icon: CheckSquare, label: "Tasks" },
  { icon: Users,        label: "Clients" },
  { icon: BarChart3,    label: "Reports" },
]

export default function LoginPage() {
  const [dark, setDark]         = useState(false)
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const router  = useRouter()
  const uid     = useId()

  const T = useMemo(() => (dark ? DARK : LIGHT), [dark])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Login failed. Please try again.")
        return
      }
      router.push(data.redirectTo)
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      background: T.rightBg,
      transition: "background 0.3s ease",
    }}>
      <style>{`
        @media (max-width: 960px) {
          .login-left { display: none !important; }
        }
        .input-group:focus-within {
          border-color: ${T.violet} !important;
          box-shadow: 0 0 0 3px ${T.violet}1A !important;
        }
        .btn-submit:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .btn-submit:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>

      {/* LEFT PANEL */}
      <div
        className="login-left"
        style={{
          flex: "0 0 58%",
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          borderRight: `1px solid ${T.border}`,
          backgroundImage: `
            linear-gradient(
              135deg,
              rgba(15,23,42,.70),
              rgba(15,23,42,.35)
            ),
            url(${TASK_SRC})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,.15), rgba(0,0,0,.55))",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 56px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={LOGO_SRC}
            alt="Sahynex"
            style={{
              width: 170,
              height: "auto",
            }}
          />

          <div style={{ maxWidth: 520 }}>
            <h1
              style={{
                color: "#fff",
                fontSize: 56,
                lineHeight: 1.05,
                fontWeight: 800,
                marginBottom: 24,
              }}
            >
              Manage your
              <br />
              entire workflow.
            </h1>

            <p
              style={{
                color: "rgba(255,255,255,.82)",
                fontSize: 18,
                lineHeight: 1.7,
                marginBottom: 36,
              }}
            >
              Track projects, clients, reports and every task from one modern
              workspace.
            </p>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {FEATURES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 18px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.12)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(255,255,255,.18)",
                    color: "#fff",
                  }}
                >
                  <Icon size={18} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,.7)",
              fontSize: 14,
            }}
          >
            Sahynex Core • Project & Client Management Platform
          </p>
        </div>
      </div>

      {/* ── RIGHT: Sleek Form Panel ────────────────────────────────────── */}
      <div style={{
        flex: 1,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
      }}>
        {/* Decorative subtle ambiance blur */}
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: dark ? "rgba(99, 102, 241, 0.05)" : "rgba(79, 70, 229, 0.03)", filter: "blur(120px)", top: "10%", right: "10%" }} />

        {/* Floating Theme Toggle */}
        <button
          onClick={() => setDark(d => !d)}
          aria-label="Toggle theme"
          style={{
            position: "absolute", top: 32, right: 32, zIndex: 2,
            width: 40, height: 40, borderRadius: 12,
            background: T.card, border: `1px solid ${T.border}`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            transition: "all 0.2s ease",
          }}
        >
          {dark
            ? <Moon size={18} color={T.toggleFg} strokeWidth={2} />
            : <Sun  size={18} color={T.toggleFg} strokeWidth={2} />}
        </button>

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>

          {/* Form Header */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: T.violetDim, border: `1px solid ${T.violet}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 24,
              boxShadow: `0 8px 20px -4px ${T.violet}20`,
            }}>
              ⚡
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T.t1, margin: 0, letterSpacing: "-0.5px" }}>
              Sahynex Core
            </h1>
            <p style={{ marginTop: 8, fontSize: 14, color: T.t2, fontWeight: 400 }}>
              Welcome back. Please sign in to your dashboard.
            </p>
          </div>

          {/* Core Login Card */}
          <div style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            padding: "40px 36px 32px",
            boxShadow: dark
              ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              : "0 25px 50px -12px rgba(15, 23, 42, 0.05)",
            transition: "background 0.3s ease, border-color 0.3s ease",
          }}>
            {error && (
              <div style={{
                background: dark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
                border: `1px solid ${dark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2"}`,
                borderRadius: 12, padding: "12px 16px", marginBottom: 24,
                fontSize: 13, color: "#EF4444", fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label htmlFor={`${uid}-email`} style={{
                  fontSize: 12, color: T.t2, fontWeight: 600,
                  display: "block", marginBottom: 8, letterSpacing: "0.2px"
                }}>
                  Email Address
                </label>
                <div className="input-group" style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", background: T.inputBg,
                  border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: "12px 16px", boxSizing: "border-box",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                  <Mail size={18} color={T.t3} strokeWidth={2} />
                  <input
                    id={`${uid}-email`}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    autoComplete="email"
                    style={{
                      flex: 1, border: "none", background: "transparent",
                      color: T.t1, fontSize: 15, outline: "none", width: "100%"
                    }}
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`${uid}-password`} style={{
                  fontSize: 12, color: T.t2, fontWeight: 600,
                  display: "block", marginBottom: 8, letterSpacing: "0.2px"
                }}>
                  Password
                </label>
                <div className="input-group" style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", background: T.inputBg,
                  border: `1px solid ${T.border}`, borderRadius: 12,
                  padding: "12px 16px", boxSizing: "border-box",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}>
                  <Lock size={18} color={T.t3} strokeWidth={2} />
                  <input
                    id={`${uid}-password`}
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    style={{
                      flex: 1, border: "none", background: "transparent",
                      color: T.t1, fontSize: 15, outline: "none", width: "100%"
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-submit"
                style={{
                  width: "100%", background: loading ? T.violetDim : T.violet,
                  border: "none", borderRadius: 12, padding: "14px",
                  color: loading ? T.violet : "#fff",
                  fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease", marginTop: 8,
                  boxShadow: loading ? "none" : `0 10px 25px -5px ${T.violet}40`,
                }}
              >
                {loading ? "Verifying Credentials..." : "Sign In to Core Account"}
              </button>
            </form>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 28, paddingTop: 24, borderTop: `1px solid ${T.border}`,
            }}>
              <Shield size={14} color={T.t3} strokeWidth={2} />
              <span style={{ fontSize: 12, color: T.t2, fontWeight: 500 }}>
                Protected Environment · Admin Access Only
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}