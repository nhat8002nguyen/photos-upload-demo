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
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      createdAt: true,
      _count: {
        select: {
          photos: true,
          followsInitiated: true,
          followsReceived: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const followRow =
    session.sub === id
      ? null
      : await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.sub,
              followingId: id,
            },
          },
        })

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      createdAt: user.createdAt,
      photoCount: user._count.photos,
      followingCount: user._count.followsInitiated,
      followerCount: user._count.followsReceived,
      isSelf: session.sub === id,
      isFollowing: Boolean(followRow),
    },
  })
}
