"use client"

import { useState, useId } from "react"
import { useRouter } from "next/navigation"

const T = {
  bg0:          "#080C14",
  bg1:          "#0D1321",
  card:         "#141B2D",
  cardHover:    "#1C2540",
  border:       "rgba(255,255,255,0.07)",
  borderHover:  "rgba(255,255,255,0.18)",
  violet:       "#7C3AED",
  violetLight:  "#A78BFA",
  violetDim:    "rgba(124,58,237,0.15)",
  emerald:      "#10B981",
  emeraldDim:   "rgba(16,185,129,0.12)",
  rose:         "#F43F5E",
  roseDim:      "rgba(244,63,94,0.12)",
  t1:           "#F8FAFC",
  t2:           "#94A3B8",
  t3:           "#475569",
}

export default function LoginPage() {
  const [email, setEmail]       = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)
  const router  = useRouter()
  const uid     = useId()

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

  const inputStyle: React.CSSProperties = {
    width:        "100%",
    background:   T.bg1,
    border:       `1px solid ${T.border}`,
    borderRadius: 10,
    padding:      "11px 14px",
    color:        T.t1,
    fontSize:     14,
    fontFamily:   "monospace",
    outline:      "none",
    boxSizing:    "border-box",
    transition:   "border-color 0.15s",
  }

  const labelStyle: React.CSSProperties = {
    fontSize:      11,
    color:         T.t3,
    fontFamily:    "monospace",
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    display:       "block",
    marginBottom:  6,
  }

  return (
    <div style={{
      minHeight:      "100vh",
      background:     T.bg0,
      display:        "flex",
      alignItems:     "center",
      justifyContent: "center",
      fontFamily:     "'Syne', 'DM Sans', system-ui, sans-serif",
      padding:        "24px 16px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width:          44,
            height:         44,
            borderRadius:   12,
            background:     T.violetDim,
            border:         `1px solid ${T.violetLight}33`,
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            margin:         "0 auto 16px",
            fontSize:       22,
          }}>
            ⚡
          </div>
          <h1 style={{
            fontSize:      26,
            fontWeight:    700,
            color:         T.t1,
            margin:        0,
            letterSpacing: "-0.5px",
          }}>
            Agency OS
          </h1>
          <p style={{
            marginTop:  6,
            fontSize:   13,
            color:      T.t3,
            fontFamily: "monospace",
          }}>
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:   T.card,
          border:       `1px solid ${T.border}`,
          borderRadius: 18,
          padding:      "28px 28px 24px",
        }}>

          {/* Error banner */}
          {error && (
            <div style={{
              background:   T.roseDim,
              border:       `1px solid ${T.rose}44`,
              borderRadius: 8,
              padding:      "10px 14px",
              marginBottom: 20,
              fontSize:     12,
              color:        T.rose,
              fontFamily:   "monospace",
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Email */}
            <div>
              <label htmlFor={`${uid}-email`} style={labelStyle}>Email</label>
              <input
                id={`${uid}-email`}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@agency.com"
                required
                autoComplete="email"
                style={inputStyle}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = T.violetLight}
                onBlur={e  => (e.target as HTMLInputElement).style.borderColor = T.border}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor={`${uid}-password`} style={labelStyle}>Password</label>
              <input
                id={`${uid}-password`}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={inputStyle}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = T.violetLight}
                onBlur={e  => (e.target as HTMLInputElement).style.borderColor = T.border}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:         "100%",
                background:    loading ? T.violetDim : T.violet,
                border:        "none",
                borderRadius:  10,
                padding:       "12px",
                color:         loading ? T.violetLight : "#fff",
                fontSize:      14,
                fontWeight:    600,
                cursor:        loading ? "not-allowed" : "pointer",
                fontFamily:    "monospace",
                letterSpacing: "0.3px",
                transition:    "background 0.15s",
                marginTop:     4,
              }}
            >
              {loading ? "Signing in..." : "Sign in →"}
            </button>

          </form>
        </div>

        {/* Footer note */}
        <p style={{
          textAlign:  "center",
          marginTop:  20,
          fontSize:   11,
          color:      T.t3,
          fontFamily: "monospace",
        }}>
          Admin access only · Contact your administrator
        </p>

      </div>
    </div>
  )
}