"use client"

import { useRouter } from "next/navigation"
import { CheckSquare, Users, BarChart3, ArrowRight } from "lucide-react"

const P = {
  purple:     "#534AB7",
  purpleDim:  "#EEEDFE",
  purpleText: "#3C3489",
  teal:       "#1D9E75",
  amber:      "#EF9F27",
  blue:       "#3B82F6",
  bg:         "#F8FAFC",
  card:       "#FFFFFF",
  border:     "#E2E8F0",
  text:       "#0F172A",
  textSub:    "#475569",
  textMute:   "#94A3B8",
}

const FEATURES = [
  { icon: CheckSquare, label: "Tasks",   desc: "Track work across teams in real time" },
  { icon: Users,       label: "Clients", desc: "Manage talent, clients, and departments" },
  { icon: BarChart3,   label: "Reports", desc: "See progress at a glance" },
]

export default function Home() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      background: P.bg,
      fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Ambient background blobs, matching the login page's aesthetic */}
      <div style={{
        position: "absolute", top: "-10%", right: "-5%",
        width: 500, height: 500, borderRadius: "50%",
        background: "rgba(79, 70, 229, 0.06)", filter: "blur(120px)",
      }} />
      <div style={{
        position: "absolute", bottom: "-10%", left: "-5%",
        width: 450, height: 450, borderRadius: "50%",
        background: "rgba(16, 185, 129, 0.05)", filter: "blur(120px)",
      }} />

      {/* Header */}
      <header style={{
        position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "24px 40px",
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Sahynex" style={{ height: 28 }} />
        <button
          onClick={() => router.push("/login")}
          style={{
            background: "transparent",
            border: `1px solid ${P.border}`,
            borderRadius: 10,
            padding: "9px 20px",
            fontSize: 14,
            fontWeight: 600,
            color: P.text,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = P.purple
            ;(e.currentTarget as HTMLButtonElement).style.color = P.purple
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = P.border
            ;(e.currentTarget as HTMLButtonElement).style.color = P.text
          }}
        >
          Sign In
        </button>
      </header>

      {/* Hero */}
      <main style={{
        position: "relative", zIndex: 1,
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px 80px",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: P.purpleDim, color: P.purpleText,
          padding: "6px 14px", borderRadius: 999,
          fontSize: 13, fontWeight: 600, marginBottom: 24,
        }}>
          ⚡ Sahynex Core
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 6vw, 56px)",
          fontWeight: 800,
          color: P.text,
          lineHeight: 1.08,
          letterSpacing: "-1.5px",
          margin: "0 0 20px",
          maxWidth: 720,
        }}>
          One workspace for every task,<br />client, and team.
        </h1>

        <p style={{
          fontSize: 17,
          color: P.textSub,
          lineHeight: 1.6,
          maxWidth: 520,
          margin: "0 0 36px",
        }}>
          Sahynex Core brings tasks, talent, and reporting into a single calm
          workspace — built for agencies that move fast.
        </p>

        <button
          onClick={() => router.push("/login")}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: P.purple,
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            fontSize: 15,
            fontWeight: 700,
            color: "#fff",
            cursor: "pointer",
            boxShadow: `0 10px 25px -5px ${P.purple}55`,
            transition: "all 0.15s ease",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 14px 30px -5px ${P.purple}66`
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 10px 25px -5px ${P.purple}55`
          }}
        >
          Go to Sign In
          <ArrowRight size={17} strokeWidth={2.5} />
        </button>

        {/* Feature pills */}
        <div style={{
          display: "flex", gap: 16, flexWrap: "wrap",
          justifyContent: "center", marginTop: 64,
          maxWidth: 720,
        }}>
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                borderRadius: 16,
                padding: "20px 22px",
                width: 200,
                textAlign: "left",
                boxShadow: "0 1px 3px rgba(15, 23, 42, 0.04)",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: P.purpleDim,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 12,
              }}>
                <Icon size={17} color={P.purple} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginBottom: 4 }}>
                {label}
              </div>
              <div style={{ fontSize: 12.5, color: P.textMute, lineHeight: 1.5 }}>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 1,
        textAlign: "center",
        padding: "20px 24px 32px",
        fontSize: 12.5,
        color: P.textMute,
      }}>
        Sahynex Core • Project & Client Management Platform
      </footer>
    </div>
  )
}