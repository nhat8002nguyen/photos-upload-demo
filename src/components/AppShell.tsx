"use client"

import {
  CompassOutlined,
  HomeOutlined,
  LogoutOutlined,
  UploadOutlined,
} from "@ant-design/icons"
import { Button, Layout, Menu, theme } from "antd"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

const { Header, Content } = Layout

export function AppShell({
  user,
  children,
}: {
  user: { id: string; username: string }
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { token } = theme.useToken()

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const selected = (() => {
    if (pathname.startsWith("/feed")) {
      return ["feed"]
    }
    if (pathname.startsWith("/explore")) {
      return ["explore"]
    }
    if (pathname.startsWith("/upload")) {
      return ["upload"]
    }
    return []
  })()

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          paddingInline: 24,
          gap: 16,
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <div style={{ fontWeight: 700, marginRight: 24 }}>PhotoShare</div>
        <Menu
          mode="horizontal"
          selectedKeys={selected}
          style={{ flex: 1, minWidth: 0, border: "none" }}
          items={[
            {
              key: "feed",
              icon: <HomeOutlined />,
              label: <Link href="/feed">Feed</Link>,
            },
            {
              key: "explore",
              icon: <CompassOutlined />,
              label: <Link href="/explore">Explore</Link>,
            },
            {
              key: "upload",
              icon: <UploadOutlined />,
              label: <Link href="/upload">Upload</Link>,
            },
          ]}
        />
        <Link href={`/users/${user.id}`} style={{ color: token.colorText }}>
          @{user.username}
        </Link>
        <Button type="text" icon={<LogoutOutlined />} onClick={logout}>
          Log out
        </Button>
      </Header>
      <Content style={{ padding: 24, maxWidth: 960, margin: "0 auto", width: "100%" }}>
        {children}
      </Content>
    </Layout>
  )
}
