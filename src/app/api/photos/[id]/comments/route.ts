import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromRequest } from "@/lib/auth"
import { commentSchema } from "@/lib/validation"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: photoId } = await params
  const photo = await prisma.photo.findUnique({ where: { id: photoId } })
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const comment = await prisma.comment.create({
    data: {
      photoId,
      userId: session.sub,
      text: parsed.data.text,
    },
    include: { user: { select: { id: true, username: true } } },
  })

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        user: comment.user,
      },
    },
    { status: 201 },
  )
}
