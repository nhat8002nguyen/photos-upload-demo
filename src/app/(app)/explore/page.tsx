import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/auth"
import { PhotoGridView } from "@/components/PhotoGridView"
import { prisma } from "@/lib/prisma"

const secondary = "rgba(0, 0, 0, 0.45)"

export default async function ExplorePage() {
  const session = await getSessionFromCookies()
  if (!session) {
    redirect("/login")
  }

  const rows = await prisma.photo.findMany({
    orderBy: { createdAt: "desc" },
    take: 48,
    include: {
      user: { select: { id: true, username: true } },
      _count: { select: { comments: true } },
    },
  })

  const photos = rows.map((p) => ({
    id: p.id,
    imagePath: p.imagePath,
    caption: p.caption,
    createdAt: p.createdAt,
    user: p.user,
    commentCount: p._count.comments,
  }))

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, fontWeight: 600 }}>
        Explore
      </h2>
      <p style={{ color: secondary, marginBottom: 16 }}>All uploaded photos.</p>
      <PhotoGridView photos={photos} emptyDescription="No photos yet. Upload one!" />
    </div>
  )
}
