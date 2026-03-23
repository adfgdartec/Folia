import { NextRequest } from 'next/server'
import { proxyMultipart } from '@/lib/api/proxy'
export async function POST(req: NextRequest) {
  return proxyMultipart(req, '/api/documents')
}
