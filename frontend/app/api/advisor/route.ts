import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const res = await fetch(`${BACKEND}/api/advisor/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    return NextResponse.json({ detail: 'Advisor request failed' }, { status: res.status })
  }
  return new NextResponse(res.body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
    },
  })
}
