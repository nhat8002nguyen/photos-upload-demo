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

const SESSION_COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
}

/**
 * `Secure` cookies are not stored on plain HTTP. In production behind nginx, set
 * `secure` only when the client used HTTPS (`X-Forwarded-Proto: https`) or
 * `COOKIE_SECURE=true`. HTTP demos (e.g. http://EC2_IP) keep cookies usable.
 */
export function getSessionCookieOptions(request: Request) {
  const env = process.env.COOKIE_SECURE
  let secure: boolean
  if (env === "true") {
    secure = true
  } else if (env === "false") {
    secure = false
  } else {
    secure = request.headers.get("x-forwarded-proto") === "https"
  }
  return { ...SESSION_COOKIE_BASE, secure }
}

