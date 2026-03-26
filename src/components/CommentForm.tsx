"use client"

import { Button, Form, Input, List, Typography } from "antd"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Comment = {
  id: string
  text: string
  createdAt: Date
  user: { id: string; username: string }
}

export function CommentForm({
  photoId,
  comments,
}: {
  photoId: string
  comments: Comment[]
}) {
  const router = useRouter()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { text: string }) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/photos/${photoId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: values.text }),
      })
      if (!res.ok) {
        return
      }
      form.resetFields()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Typography.Title level={4}>Comments</Typography.Title>
      <List
        dataSource={comments}
        locale={{ emptyText: "No comments yet" }}
        renderItem={(c) => (
          <List.Item>
            <Typography.Text strong>@{c.user.username}: </Typography.Text>
            {c.text}
          </List.Item>
        )}
      />
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          name="text"
          label="Add a comment"
          rules={[{ required: true, message: "Enter a comment" }]}
        >
          <Input.TextArea rows={2} maxLength={2000} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Post
        </Button>
      </Form>
    </div>
  )
}
