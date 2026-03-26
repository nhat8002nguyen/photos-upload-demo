import { notFound, redirect } from "next/navigation"
import { FollowButton } from "@/components/FollowButton"
import { PhotoGridView } from "@/components/PhotoGridView"
import { getSessionFromCookies } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

const secondary = "rgba(0, 0, 0, 0.45)"

export default async function UserProfilePage({ params }: Params) {
  const session = await getSessionFromCookies()
  if (!session) {
    redirect("/login")
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
    notFound()
  }

  const isSelf = session.sub === user.id
  const followRow =
    isSelf
      ? null
      : await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.sub,
              followingId: user.id,
            },
          },
        })

  const photos = await prisma.photo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true } },
      _count: { select: { comments: true } },
    },
  })

  const grid = photos.map((p) => ({
    id: p.id,
    imagePath: p.imagePath,
    caption: p.caption,
    createdAt: p.createdAt,
    user: p.user,
    commentCount: p._count.comments,
  }))

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>@{user.username}</h2>
        {!isSelf ? (
          <FollowButton userId={user.id} initialFollowing={Boolean(followRow)} />
        ) : (
          <span style={{ color: secondary }}>(you)</span>
        )}
      </div>
      <p style={{ color: secondary, marginBottom: 16 }}>
        {user._count.photos} photos · {user._count.followsReceived} followers ·{" "}
        {user._count.followsInitiated} following
      </p>
      <PhotoGridView photos={grid} emptyDescription="No photos yet." />
    </div>
  )
}
