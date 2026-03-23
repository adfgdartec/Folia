import { NextRequest } from 'next/server'
import { proxyPost } from '@/lib/api/proxy'
import { proxyGet } from '@/lib/api/proxy'
export async function POST(req: NextRequest) {
  return proxyPost(req, '/api/stocks')
}
export async function GET(req: NextRequest) {
  return proxyGet(req, '/api/stocks')
}
