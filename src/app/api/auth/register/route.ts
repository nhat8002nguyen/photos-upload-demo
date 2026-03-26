import { hash } from "bcryptjs"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SESSION_COOKIE_OPTIONS, signSessionToken } from "@/lib/auth"
import { SESSION_COOKIE } from "@/lib/constants"
import { registerSchema } from "@/lib/validation"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { username, password } = parsed.data
  const passwordHash = await hash(password, 10)

  try {
    const user = await prisma.user.create({
      data: { username, passwordHash },
    })
    const token = await signSessionToken(user.id, user.username)
    const res = NextResponse.json({
      user: { id: user.id, username: user.username },
    })
    res.cookies.set(SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS)
    return res
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : ""
    if (code === "P2002") {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }
    console.error(e)
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
