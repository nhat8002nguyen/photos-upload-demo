import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromRequest } from "@/lib/auth"
import { MAX_PHOTOS_PER_USER } from "@/lib/constants"
import { saveUploadedImage } from "@/lib/upload-disk"

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 24))
  const skip = (page - 1) * pageSize

  const [items, total] = await Promise.all([
    prisma.photo.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.photo.count(),
  ])

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      imagePath: p.imagePath,
      caption: p.caption,
      createdAt: p.createdAt,
      user: p.user,
      commentCount: p._count.comments,
    })),
    page,
    pageSize,
    total,
  })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const count = await prisma.photo.count({ where: { userId: session.sub } })
  if (count >= MAX_PHOTOS_PER_USER) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_PHOTOS_PER_USER} photos per user` },
      { status: 400 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 })
  }

  const file = formData.get("photo")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field \"photo\" is required" }, { status: 400 })
  }

  const captionRaw = formData.get("caption")
  const caption =
    typeof captionRaw === "string" && captionRaw.trim() ? captionRaw.trim().slice(0, 500) : null

  try {
    const { relativeUrl } = await saveUploadedImage(session.sub, file)
    const photo = await prisma.photo.create({
      data: {
        userId: session.sub,
        imagePath: relativeUrl,
        caption,
      },
      include: {
        user: { select: { id: true, username: true } },
      },
    })
    return NextResponse.json(
      {
        photo: {
          id: photo.id,
          imagePath: photo.imagePath,
          caption: photo.caption,
          createdAt: photo.createdAt,
          user: photo.user,
        },
      },
      { status: 201 },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed"
    const status = message.includes("Invalid") || message.includes("exceeds") ? 400 : 500
    if (status === 500) {
      console.error(e)
    }
    return NextResponse.json({ error: message }, { status })
  }
}
