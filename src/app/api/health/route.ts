import { NextResponse } from "next/server"

/** Used by Docker/load balancers; must stay unauthenticated (see middleware). */
export async function GET() {
  return NextResponse.json({ ok: true })
}
