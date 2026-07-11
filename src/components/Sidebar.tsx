"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Users, 
  UserPlus, 
  BarChart3, 
  LogOut 
} from "lucide-react";

// ── Light Theme Palette ──────────────────────────────────────────────────────
const P = {
  bg:          "#FFFFFF",
  border:      "#E5E7EB",
  text:        "#111827",
  textSub:     "#6B7280",
  textMute:    "#9CA3AF",
  hover:       "#F3F4F6",
  purple:      "#534AB7",
  purpleDim:   "#EEEDFE",
  purpleText:  "#3C3489",
};

// 1. Split Nav configs explicitly by workspace role roles
const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/tasks",     icon: CheckSquare,      label: "Tasks" },
  { href: "/admin/clients",   icon: Users,            label: "Clients" },
  { href: "/admin/team",      icon: UserPlus,         label: "Team" },
  { href: "/admin/reports",   icon: BarChart3,        label: "Reports" },
];

const CLIENT_NAV_ITEMS = [
  { href: "/client/dashboard", icon: LayoutDashboard, label: "My Dashboard" },
  // Add additional client-accessible paths here if you build them out later
];

// 2. Accept explicit type matching definitions to fix page.tsx interface compilation mismatch
interface SidebarProps {
  user?: {
    name?: string;
    email?: string;
    role: string;
  };
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // 3. Automatically swap menu contents depending on identity access levels
  const isClient = user?.role === "client";
  const navItems = isClient ? CLIENT_NAV_ITEMS : ADMIN_NAV_ITEMS;

  async function handleLogout() {
    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error("Logout failed", err);
      setLoggingOut(false);
    }
  }

  return (
    <aside style={{
      width: 240,
      background: P.bg,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      left: 0,
      flexShrink: 0,
      borderRight: `1px solid ${P.border}`,
    }}>
      {/* Brand Header */}
      <div style={{
        padding: "24px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderBottom: `1px solid ${P.border}`
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `linear-gradient(135deg, ${P.purple}, #3B82F6)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, color: "#fff", fontSize: 14
        }}>
          {isClient ? "C" : "M"}
        </div>
        <span style={{ color: P.text, fontWeight: 700, fontSize: 15, letterSpacing: "-0.2px" }}>
          {isClient ? "Client Portal" : "Management"}
        </span>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: "20px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link 
              key={item.href} 
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 8,
                color: isActive ? P.purpleText : P.textSub,
                background: isActive ? P.purpleDim : "transparent",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = P.hover;
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon 
                size={16} 
                strokeWidth={isActive ? 2.5 : 2} 
                style={{ color: isActive ? P.purple : P.textMute }} 
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User contextual label display footer (Useful metadata check) */}
      {user?.name && (
        <div style={{ padding: "8px 16px", fontSize: "11px", color: P.textMute }}>
          Logged in as: <strong style={{ color: P.textSub }}>{user.name}</strong>
        </div>
      )}

      {/* Footer / Logout action */}
      <div style={{ padding: "16px 12px", borderTop: `1px solid ${P.border}` }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 8,
            color: "#E24B4A",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            textAlign: "left",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#FCEBEB"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          <LogOut size={16} strokeWidth={2} style={{ opacity: 0.9 }} />
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>
    </aside>
  );
}