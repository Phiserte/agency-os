"use client"

import { useState, useId } from "react"
import { useRouter } from "next/navigation"
import { Mail, Lock, CheckSquare, Users, BarChart3, Shield } from "lucide-react"

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


const LOGO_SRC = "/logo.png"
const LOGO = "/logo.svg"
const TASK_SRC = "/task.png"

const FEATURES = [
  { icon: CheckSquare, label: "Tasks" },
  { icon: Users,        label: "Clients" },
  { icon: BarChart3,    label: "Reports" },
]

export default function LoginPage() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const router  = useRouter()
  const uid     = useId()

  const T = LIGHT

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
     <div className="login-container" style={{
       minHeight: "100vh",
       display: "flex",
       fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
       background: T.rightBg,
       transition: "background 0.3s ease",
     }}>
       <style>{`
         /* Standard Layout Rule overrides */
         .login-container {
           flex-direction: row;
         }
         
         @media (max-width: 960px) {
           .login-container {
             flex-direction: column !important;
             overflow-y: auto;
           }
           .login-left {
             flex: none !important;
             width: 100% !important;
             min-height: auto !important;
             padding: 40px 28px !important;
             border-right: none !important;
             border-bottom: 1px solid ${T.border} !important;
           }
           .login-left-inner {
             padding: 0 !important;
             gap: 32px !important;
           }
           .login-left-title {
             font-size: 36px !important;
             margin-bottom: 12px !important;
           }
           .login-left-desc {
             font-size: 15px !important;
             margin-bottom: 24px !important;
           }
           .login-right {
             min-height: auto !important;
             padding: 48px 20px !important;
           }
           .theme-toggle-btn {
             top: 20px !important;
             right: 20px !important;
           }
         }
         
         @media (max-width: 640px) {
           .login-left {
             padding: 32px 20px !important;
           }
           .login-left-title {
             font-size: 28px !important;
           }
           .login-card {
             padding: 32px 20px 24px !important;
             border-radius: 20px !important;
           }
           .login-input-group {
             padding: 10px 14px !important;
           }
           .login-input {
             font-size: 14px !important;
           }
           .login-btn {
             padding: 12px !important;
             font-size: 14px !important;
           }
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
          flex: "0 0 45%",
          minHeight: "100vh",
          position: "relative",
          overflow: "hidden",
          borderRight: `1px solid ${T.border}`,
          backgroundImage: `
            linear-gradient(
              135deg,
              rgba(15,23,42,.75),
              rgba(15,23,42,.45)
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
              "linear-gradient(to bottom, rgba(0,0,0,.1), rgba(0,0,0,.5))",
          }}
        />

        <div
          className="login-left-inner"
          style={{
            position: "relative",
            zIndex: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 48px",
            boxSizing: "border-box",
            gap: "48px"
          }}
        >
          {/* Logo Brand image */}
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO_SRC}
              alt="Sahynex"
              style={{
                width: 140,
                height: "auto",
                display: "block"
              }}
            />
          </div>

          <div style={{ width: "100%", maxWidth: 520 }}>
            <h1
              className="login-left-title"
              style={{
                color: "#fff",
                fontSize: 48,
                lineHeight: 1.1,
                fontWeight: 800,
                marginBottom: 20,
                letterSpacing: "-0.5px"
              }}
            >
              Manage your
              <br />
              entire workflow.
            </h1>

            <p
              className="login-left-desc"
              style={{
                color: "rgba(255,255,255,.85)",
                fontSize: 16,
                lineHeight: 1.6,
                marginBottom: 28,
              }}
            >
              Track projects, clients, reports and every task from one modern
              workspace.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {FEATURES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,.1)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255,255,255,.15)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 500
                  }}
                >
                  <Icon size={16} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,.6)",
              fontSize: 13,
              margin: 0
            }}
          >
            Sahynex Core • Project & Client Management Platform
          </p>
        </div>
      </div>

      {/* ── RIGHT: Sleek Form Panel ────────────────────────────────────── */}
      <div 
        className="login-right"
        style={{
          flex: 1,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          position: "relative",
        }}
      >

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, padding: "0 4px" }}>

          {/* Form Header */}
          <div className="login-header" style={{ textAlign: "center", marginBottom: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LOGO}
              alt="Sahynex"
              style={{
                width: 180,
                height: "auto",
                margin: "0 auto 16px",
                display: "block",
              }}
            />
            <p className="login-subtitle" style={{ marginTop: 8, fontSize: 14, color: T.t2, fontWeight: 400, margin: 0 }}>
              Welcome back. Please sign in to your dashboard.
            </p>
          </div>

          {/* Core Login Card */}
          <div className="login-card" style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 24,
            padding: "40px 36px 32px",
            boxShadow: "0 25px 50px -12px rgba(15, 23, 42, 0.05)",
            transition: "background 0.3s ease, border-color 0.3s ease",
          }}>
            {error && (
              <div style={{
                background: "#FEF2F2",
                border: `1px solid #FEE2E2`,
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
                <div className="input-group login-input-group" style={{
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
                    className="login-input"
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
                <div className="input-group login-input-group" style={{
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
                    className="login-input"
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
                className="btn-submit login-btn"
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

            <div className="login-footer" style={{
              display: "flex", alignItems: "center",  justifyContent: "center", gap: 8,
              marginTop: 28, paddingTop: 24, borderTop: `1px solid ${T.border}`,
            }}>
              <Shield size={14} color={T.t3} strokeWidth={2} />
              <span style={{ fontSize: 12, color: T.t2, fontWeight: 500 }}>
                
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}