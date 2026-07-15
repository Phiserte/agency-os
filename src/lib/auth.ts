import { cookies } from "next/headers"
import { signToken, verifyToken, JWTPayload } from "./jwt"

const COOKIE_NAME = "auth_token"
const MAX_AGE     = 60 * 60 * 24 * 7

export { signToken, verifyToken } from "./jwt"
export type { JWTPayload } from "./jwt"

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   MAX_AGE,
    path:     "/",
  })
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}