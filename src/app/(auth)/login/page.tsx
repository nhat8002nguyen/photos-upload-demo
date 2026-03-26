"use client"

import { LockOutlined, UserOutlined } from "@ant-design/icons"
import { App, Button, Card, Form, Input, Typography } from "antd"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatAuthApiError } from "@/lib/format-api-error"

function LoginForm() {
  const { message } = App.useApp()
  const router = useRouter()

  const onFinish = async (values: { username: string; password: string }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(formatAuthApiError(data.error))
      return
    }
    router.push("/feed")
    router.refresh()
  }

  return (
    <Card title="Log in" style={{ width: 400 }}>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: "Enter your username" }]}
        >
          <Input prefix={<UserOutlined />} autoComplete="username" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Enter your password" }]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Log in
        </Button>
      </Form>
      <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
        No account? <Link href="/register">Register</Link>
      </Typography.Paragraph>
    </Card>
  )
}

export default function LoginPage() {
  return <LoginForm />
}
