import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/auth"
import { AppShell } from "@/components/AppShell"

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSessionFromCookies()
  if (!session) {
    redirect("/login")
  }

  return (
    <AppShell user={{ id: session.sub, username: session.username }}>
      {children}
    </AppShell>
  )
}
