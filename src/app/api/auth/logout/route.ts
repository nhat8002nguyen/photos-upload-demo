import { NextResponse } from "next/server"
import { SESSION_COOKIE_OPTIONS } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/constants"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, "", {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  })
  return res
}
