import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromRequest } from "@/lib/auth"

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 24))
  const skip = (page - 1) * pageSize

  const following = await prisma.follow.findMany({
    where: { followerId: session.sub },
    select: { followingId: true },
  })
  const ids = following.map((f) => f.followingId)

  if (ids.length === 0) {
    return NextResponse.json({
      items: [],
      page,
      pageSize,
      total: 0,
    })
  }

  const where = { userId: { in: ids } }

  const [items, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.photo.count({ where }),
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
