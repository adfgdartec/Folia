import { Sidebar } from '@/frontend/components/layout/Sidebar'
import { RealtimeManager } from '@/frontend/components/layout/RealtimeManager'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <RealtimeManager />
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: '2rem 2.25rem',
        maxWidth: '100%',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
