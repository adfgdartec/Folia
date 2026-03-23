import { NextRequest } from 'next/server'
import { proxyPost } from '@/lib/api/proxy'
export async function POST(req: NextRequest) {
  return proxyPost(req, '/api/glossary')
}
