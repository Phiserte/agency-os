import { SignJWT, jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-this-secret-in-production"
)

export interface JWTPayload {
  id:    string
  email: string
  role:  "admin" | "talent"
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