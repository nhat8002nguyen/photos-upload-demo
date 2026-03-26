import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE } from "./constants"

export { SESSION_COOKIE } from "./constants"

function getSecret() {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET must be set (min 16 characters)")
  }
  return new TextEncoder().encode(s)
}

export type SessionPayload = {
  sub: string
  username: string
}

export async function signSessionToken(userId: string, username: string) {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
    })
    const sub = payload.sub
    const username = payload.username
    if (typeof sub !== "string" || typeof username !== "string") {
      return null
    }
    return { sub, username }
  } catch {
    return null
  }
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) {
    return null
  }
  return verifySessionToken(token)
}

export function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    return Promise.resolve(null)
  }
  return verifySessionToken(token)
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
}
