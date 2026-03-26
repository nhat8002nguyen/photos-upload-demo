"use client"

import { Card, Empty, List, Typography } from "antd"
import Link from "next/link"

export type PhotoGridItem = {
  id: string
  imagePath: string
  caption: string | null
  createdAt: Date
  user: { id: string; username: string }
  commentCount: number
}

export function PhotoGridView({
  photos,
  emptyDescription,
}: {
  photos: PhotoGridItem[]
  emptyDescription: string
}) {
  if (!photos.length) {
    return <Empty description={emptyDescription} />
  }

  return (
    <List
      grid={{ gutter: 16, xs: 1, sm: 2 }}
      dataSource={photos}
      renderItem={(p) => (
        <List.Item key={p.id}>
          <Card
            hoverable
            cover={
              <Link href={`/photos/${p.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- user uploads served from /uploads */}
                <img
                  alt=""
                  src={p.imagePath}
                  style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}
                />
              </Link>
            }
          >
            <Card.Meta
              title={
                <Link href={`/users/${p.user.id}`}>@{p.user.username}</Link>
              }
              description={
                <Typography.Text type="secondary">
                  {p.caption ?? `${p.commentCount} comment${p.commentCount === 1 ? "" : "s"}`}
                </Typography.Text>
              }
            />
          </Card>
        </List.Item>
      )}
    />
  )
}
