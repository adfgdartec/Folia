import type { Metadata, Viewport } from 'next'
import { ToastProvider } from '@/frontend/components/ui/Toast'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Folia', template: '%s · Folia' },
  description: 'The financial life OS for every age and stage.',
  icons: { icon: '/favicon.ico' },
}

export const viewport: Viewport = {
  themeColor: '#080b0f',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
