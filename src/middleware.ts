import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionToken } from "@/lib/auth"

const publicPages = new Set(["/login", "/register"])
const publicApiExact = new Set(["/api/auth/register", "/api/auth/login", "/api/health"])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith("/uploads")) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    /\.(?:ico|png|jpg|jpeg|gif|svg|webp)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get("session")?.value
  const session = token ? await verifySessionToken(token) : null
  const isAuthed = Boolean(session)

  if (pathname.startsWith("/api/")) {
    if (publicApiExact.has(pathname)) {
      return NextResponse.next()
    }
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (publicPages.has(pathname)) {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/feed", request.url))
    }
    return NextResponse.next()
  }

  if (pathname === "/") {
    if (isAuthed) {
      return NextResponse.redirect(new URL("/feed", request.url))
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (!isAuthed) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/feed/:path*",
    "/explore",
    "/upload",
    "/photos/:path*",
    "/users/:path*",
    "/api/:path*",
    "/uploads/:path*",
  ],
}
