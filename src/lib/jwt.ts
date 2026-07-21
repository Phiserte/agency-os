import { SignJWT, jwtVerify } from "jose"
import type { UserRole } from "@/lib/roles"

const SECRET_VALUE = process.env.JWT_SECRET
if (!SECRET_VALUE) {
  throw new Error("JWT_SECRET environment variable is not set")
}
const SECRET = new TextEncoder().encode(SECRET_VALUE)

export interface JWTPayload {
  id:    string
  email: string
  role:  UserRole
  name:  string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}