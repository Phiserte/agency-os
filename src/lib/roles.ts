// src/lib/roles.ts
// Single source of truth for roles, route access, and home dashboards.
// Add a new role by editing this file only — middleware, login redirect,
// and the User schema enum should all read from here.

export const ROLES = [
  "admin",
  "marketing_manager",
  "design_manager",
  "dev_manager",
  "talent",
] as const

export type UserRole = typeof ROLES[number]

// Which dashboard each role lands on after login / when denied access
export const ROLE_HOME: Record<UserRole, string> = {
  admin:              "/admin/dashboard",
  marketing_manager:  "/marketing/dashboard",
  design_manager:     "/design/dashboard",
  dev_manager:        "/dev/dashboard",
  talent:             "/talent/dashboard",
}

// Route prefix -> which roles may access it. Middleware walks this list
// top to bottom and uses the first match. Add one line here per new
// protected section instead of adding a new "if" branch to middleware.
export const ROUTE_ACCESS: { prefix: string; roles: UserRole[] }[] = [
  { prefix: "/admin",     roles: ["admin"] },
  { prefix: "/marketing", roles: ["admin", "marketing_manager"] },
  { prefix: "/design",    roles: ["admin", "design_manager"] },
  { prefix: "/dev",       roles: ["admin", "dev_manager"] },
  { prefix: "/talent",    roles: ["talent"] },
]

// Department each manager role is scoped to. Used to filter tasks so a
// marketing_manager only sees/edits tasks tagged "marketing", etc.
// Admin bypasses this (sees everything).
export const ROLE_DEPARTMENT: Partial<Record<UserRole, string>> = {
  marketing_manager: "marketing",
  design_manager:    "design",
  dev_manager:       "dev",
}

export function isValidRole(value: string): value is UserRole {
  return (ROLES as readonly string[]).includes(value)
}