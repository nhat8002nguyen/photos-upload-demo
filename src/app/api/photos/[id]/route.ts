import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromRequest } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true } } },
      },
    },
  })

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({
    photo: {
      id: photo.id,
      imagePath: photo.imagePath,
      caption: photo.caption,
      createdAt: photo.createdAt,
      user: photo.user,
      comments: photo.comments.map((c) => ({
        id: c.id,
        text: c.text,
        createdAt: c.createdAt,
        user: c.user,
      })),
    },
  })
}
