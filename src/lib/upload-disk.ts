import { createWriteStream } from "fs"
import { mkdir } from "fs/promises"
import path from "path"
import { pipeline } from "stream/promises"
import { Readable } from "stream"
import { MAX_IMAGE_BYTES, VALID_IMAGE_EXTENSIONS } from "./constants"

export function getUploadRoot() {
  return path.resolve(process.cwd(), process.env.UPLOAD_DIR || "uploads")
}

export function isValidImageFilename(name: string) {
  const ext = path.extname(name).toLowerCase()
  return VALID_IMAGE_EXTENSIONS.has(ext)
}

export async function saveUploadedImage(
  userId: string,
  file: File,
): Promise<{ relativeUrl: string; absolutePath: string }> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`File size exceeds maximum (${MAX_IMAGE_BYTES} bytes)`)
  }
  if (!isValidImageFilename(file.name)) {
    throw new Error("Invalid file type: only jpg, jpeg, png, gif, webp allowed")
  }

  const ext = path.extname(file.name).toLowerCase()
  const safeName = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`
  const dir = path.join(getUploadRoot(), userId)
  await mkdir(dir, { recursive: true })

  const absolutePath = path.join(dir, safeName)
  const buffer = Buffer.from(await file.arrayBuffer())
  await pipeline(Readable.from(buffer), createWriteStream(absolutePath))

  const relativeUrl = `/uploads/${userId}/${safeName}`
  return { relativeUrl, absolutePath }
}
