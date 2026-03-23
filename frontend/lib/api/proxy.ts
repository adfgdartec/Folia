import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000'

export async function proxyPost(req: NextRequest, path: string) {
  try {
    const body = await req.json()
    const res = await fetch(`${BACKEND}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ detail: 'Backend request failed' }, { status: 502 })
  }
}

export async function proxyGet(req: NextRequest, path: string) {
  try {
    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    const res = await fetch(`${BACKEND}${path}${qs ? '?' + qs : ''}`)
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ detail: 'Backend request failed' }, { status: 502 })
  }
}

export async function proxyMultipart(req: NextRequest, path: string) {
  try {
    const formData = await req.formData()
    const res = await fetch(`${BACKEND}${path}`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ detail: 'Backend request failed' }, { status: 502 })
  }
}
