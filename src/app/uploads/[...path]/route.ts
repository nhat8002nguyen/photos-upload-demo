import { readFile, stat } from "fs/promises"
import path from "path"
import type { NextRequest } from "next/server"
import { getUploadRoot } from "@/lib/upload-disk"

function mimeForFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  }
  return map[ext] || "application/octet-stream"
}

type Params = { params: Promise<{ path: string[] }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { path: segments } = await params
  if (!segments?.length) {
    return new Response("Not found", { status: 404 })
  }

  const root = getUploadRoot()
  const fullPath = path.resolve(root, ...segments)
  const relative = path.relative(root, fullPath)
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return new Response("Not found", { status: 404 })
  }

  try {
    const s = await stat(fullPath)
    if (!s.isFile()) {
      return new Response("Not found", { status: 404 })
    }
  } catch {
    return new Response("Not found", { status: 404 })
  }

  const buf = await readFile(fullPath)
  return new Response(buf, {
    headers: {
      "Content-Type": mimeForFile(fullPath),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
