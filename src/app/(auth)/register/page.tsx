"use client"

import { LockOutlined, UserOutlined } from "@ant-design/icons"
import { App, Button, Card, Form, Input, Typography } from "antd"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatAuthApiError } from "@/lib/format-api-error"

function RegisterForm() {
  const { message } = App.useApp()
  const router = useRouter()

  const onFinish = async (values: { username: string; password: string }) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      message.error(formatAuthApiError(data.error))
      return
    }
    message.success("Account created")
    router.push("/feed")
    router.refresh()
  }

  return (
    <Card title="Create account" style={{ width: 400 }}>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="username"
          label="Username"
          extra="3–32 characters: letters, numbers, underscore"
          rules={[{ required: true, message: "Choose a username" }]}
        >
          <Input prefix={<UserOutlined />} autoComplete="username" />
        </Form.Item>
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: "Choose a password (min 6 characters)" }]}
        >
          <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block>
          Register
        </Button>
      </Form>
      <Typography.Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
        Already have an account? <Link href="/login">Log in</Link>
      </Typography.Paragraph>
    </Card>
  )
}

export default function RegisterPage() {
  return <RegisterForm />
}
