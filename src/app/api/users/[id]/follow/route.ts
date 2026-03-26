import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromRequest } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: followingId } = await params
  if (followingId === session.sub) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: followingId } })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  try {
    await prisma.follow.create({
      data: {
        followerId: session.sub,
        followingId,
      },
    })
  } catch (e: unknown) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : ""
    if (code === "P2002") {
      return NextResponse.json({ ok: true, alreadyFollowing: true })
    }
    throw e
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: followingId } = await params
  await prisma.follow.deleteMany({
    where: {
      followerId: session.sub,
      followingId,
    },
  })

  return NextResponse.json({ ok: true })
}
