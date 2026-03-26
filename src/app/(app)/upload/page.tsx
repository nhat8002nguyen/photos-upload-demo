import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/auth"
import { UploadForm } from "@/components/UploadForm"
import { prisma } from "@/lib/prisma"

export default async function UploadPage() {
  const session = await getSessionFromCookies()
  if (!session) {
    redirect("/login")
  }

  const count = await prisma.photo.count({ where: { userId: session.sub } })

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 24, fontWeight: 600 }}>
        Upload
      </h2>
      <UploadForm initialPhotoCount={count} />
    </div>
  )
}
