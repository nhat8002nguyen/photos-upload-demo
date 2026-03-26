import { NextResponse } from "next/server"
import { getSessionCookieOptions } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/constants"

export async function POST(request: Request) {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, "", {
    ...getSessionCookieOptions(request),
    maxAge: 0,
  })
  return res
}
