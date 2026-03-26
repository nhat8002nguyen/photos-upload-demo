import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CommentForm } from "@/components/CommentForm"
import { getSessionFromCookies } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ id: string }> }

export default async function PhotoDetailPage({ params }: Params) {
  const session = await getSessionFromCookies()
  if (!session) {
    redirect("/login")
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
    notFound()
  }

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 600 }}>
        <Link href={`/users/${photo.user.id}`}>@{photo.user.username}</Link>
      </h2>
      {/* eslint-disable-next-line @next/next/no-img-element -- user uploads served from /uploads */}
      <img
        alt=""
        src={photo.imagePath}
        style={{ width: "100%", maxHeight: 520, objectFit: "contain", marginBottom: 16 }}
      />
      {photo.caption ? <p style={{ marginBottom: 16 }}>{photo.caption}</p> : null}
      <CommentForm photoId={photo.id} comments={photo.comments} />
    </div>
  )
}
