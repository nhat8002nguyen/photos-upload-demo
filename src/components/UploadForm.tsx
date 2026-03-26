"use client"

import { InboxOutlined } from "@ant-design/icons"
import type { UploadFile } from "antd"
import { Alert, App, Button, Form, Input, Typography, Upload } from "antd"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { MAX_PHOTOS_PER_USER } from "@/lib/constants"

function getImageFileFromList(list: UploadFile[]): File | undefined {
  const item = list[0]
  if (!item) {
    return undefined
  }
  if (item.originFileObj instanceof File) {
    return item.originFileObj
  }
  // If beforeUpload stored a bare File, it may be the item itself (no originFileObj).
  if (typeof File !== "undefined" && item instanceof File) {
    return item
  }
  return undefined
}

export function UploadForm({
  initialPhotoCount,
}: {
  initialPhotoCount: number
}) {
  const { message } = App.useApp()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const remaining = Math.max(0, MAX_PHOTOS_PER_USER - initialPhotoCount)
  const disabled = remaining === 0

  const onFinish = async (values: { caption?: string }) => {
    const raw = getImageFileFromList(fileList)
    if (!raw) {
      message.error("Choose an image file")
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append("photo", raw)
      if (values.caption) {
        fd.append("caption", values.caption)
      }
      const res = await fetch("/api/photos", { method: "POST", body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        message.error(typeof data.error === "string" ? data.error : "Upload failed")
        return
      }
      message.success("Photo uploaded")
      router.push(`/photos/${data.photo.id}`)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {disabled ? (
        <Alert
          type="warning"
          showIcon
          message={`You have reached the ${MAX_PHOTOS_PER_USER} photo limit.`}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Typography.Paragraph type="secondary">
          {remaining} of {MAX_PHOTOS_PER_USER} uploads remaining.
        </Typography.Paragraph>
      )}
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item label="Image" required>
          <Upload.Dragger
            accept="image/jpeg,image/png,image/gif,image/webp"
            maxCount={1}
            fileList={fileList}
            beforeUpload={(file) => {
              setFileList([
                {
                  uid: file.uid,
                  name: file.name,
                  status: "done",
                  originFileObj: file,
                },
              ])
              return false
            }}
            onRemove={() => setFileList([])}
            disabled={disabled}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag image here</p>
            <p className="ant-upload-hint">JPG, PNG, GIF, WebP up to 10MB</p>
          </Upload.Dragger>
        </Form.Item>
        <Form.Item name="caption" label="Caption (optional)">
          <Input.TextArea rows={2} maxLength={500} showCount disabled={disabled} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} disabled={disabled}>
          Upload
        </Button>
      </Form>
    </div>
  )
}
