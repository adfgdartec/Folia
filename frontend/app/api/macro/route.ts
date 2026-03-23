import { NextRequest } from 'next/server'
import { proxyGet } from '@/lib/api/proxy'
export async function GET(req: NextRequest) {
  return proxyGet(req, '/api/macro/indicators')
}
