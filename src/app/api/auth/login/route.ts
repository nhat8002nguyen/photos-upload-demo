import { compare } from "bcryptjs"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionCookieOptions, signSessionToken } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/constants"
import { loginSchema } from "@/lib/validation"

export async function POST(request: Request) {
  const cookieOpts = getSessionCookieOptions(request)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 })
  }

  const { username, password } = parsed.data
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
  }

  const ok = await compare(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 })
  }

  const token = await signSessionToken(user.id, user.username)
  const res = NextResponse.json({
    user: { id: user.id, username: user.username },
  })
  res.cookies.set(SESSION_COOKIE, token, cookieOpts)
  return res
}
