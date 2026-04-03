'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFoliaStore } from '@/store'
import { formatCurrency, getHealthGrade, LIFE_STAGE_COLORS } from '@/lib/utils'

const NAV = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard',  label: 'Dashboard',   icon: <GridIcon />,    badge: 'alerts' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { href: '/finances',   label: 'Finances',    icon: <WalletIcon /> },
      { href: '/tax',        label: 'Tax',          icon: <TaxIcon /> },
      { href: '/documents',  label: 'Documents',   icon: <DocIcon /> },
    ],
  },
  {
    label: 'Plan',
    items: [
      { href: '/simulate',   label: 'Simulate',    icon: <SimIcon /> },
      { href: '/invest',     label: 'Invest',       icon: <ChartIcon /> },
      { href: '/advisor',    label: 'AI Advisor',  icon: <AiIcon /> },
    ],
  },
  {
    label: 'Grow',
    items: [
      { href: '/learn',      label: 'Learn',        icon: <BookIcon /> },
      { href: '/journal',    label: 'Journal',      icon: <JournalIcon /> },
      { href: '/community',  label: 'Community',   icon: <PeopleIcon /> },
    ],
  },
]

export function Sidebar() {
  const pathname   = usePathname()
  const dna        = useFoliaStore((s) => s.dna)
  const dashboard  = useFoliaStore((s) => s.dashboard)
  const alertCount = useFoliaStore((s) => s.alertCount)

  const nw     = dashboard?.net_worth?.net_worth ?? 0
  const isPos  = nw >= 0
  const stage  = dna?.life_stage ?? 'launch'
  const stageColor = LIFE_STAGE_COLORS[stage as keyof typeof LIFE_STAGE_COLORS] ?? '#22d47e'

  return (
    <aside style={{
      width: 224,
      minHeight: '100vh',
      background: 'var(--bg-2)',
      borderRight: '1px solid var(--b1)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
    }}>

      {/* Logo */}
      <div style={{ padding: '1.25rem 1rem 0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/favicon.ico" alt="Folia" style={{ width: 28, height: 28, borderRadius: 7 }} />
          <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
            Folia
          </span>
        </div>
      </div>

      {/* Net worth pill */}
      {dna && (
        <div style={{ padding: '0 0.625rem 1rem' }}>
          <div style={{
            background: 'var(--bg-3)',
            border: '1px solid var(--b1)',
            borderRadius: 'var(--r)',
            padding: '0.75rem 0.875rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>Net worth</div>
                <div style={{
                  fontSize: '1.15rem', fontWeight: 700,
                  fontFamily: 'var(--mono)',
                  color: isPos ? 'var(--green)' : 'var(--red)',
                  letterSpacing: '-0.025em', lineHeight: 1,
                }}>
                  {formatCurrency(nw, true)}
                </div>
              </div>
              <div style={{
                background: stageColor + '18',
                border: `1px solid ${stageColor}30`,
                borderRadius: '100px',
                padding: '0.15rem 0.5rem',
                fontSize: '0.62rem',
                fontWeight: 600,
                color: stageColor,
                letterSpacing: '0.03em',
                marginTop: 1,
                textTransform: 'capitalize',
              }}>
                {stage}
              </div>
            </div>
            {dashboard?.health_score && (
              <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div className="progress-track" style={{ flex: 1, height: 3 }}>
                  <div className="progress-fill" style={{
                    width: `${dashboard.health_score.total_score}%`,
                    background: getHealthGrade(dashboard.health_score.total_score).color,
                    height: '100%',
                  }} />
                </div>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--mono)', color: 'var(--t3)' }}>
                  {dashboard.health_score.total_score}/100
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 0.625rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {NAV.map((group) => (
          <div key={group.label}>
            <div style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              color: 'var(--t4)',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              padding: '0 0.375rem',
              marginBottom: '0.25rem',
            }}>
              {group.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.items.map((item) => {
                const active   = pathname.startsWith(item.href)
                const isAlerts = (item as any).badge === 'alerts'
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? 'active' : ''}`}
                  >
                    <span style={{
                      width: 16, height: 16,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: active ? 'var(--green)' : 'var(--t3)',
                      flexShrink: 0,
                      transition: 'color 0.12s',
                    }}>
                      {item.icon}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {isAlerts && alertCount > 0 && (
                      <span style={{
                        background: 'var(--red)',
                        color: '#fff',
                        borderRadius: '100px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.4rem',
                        minWidth: 16,
                        textAlign: 'center',
                        lineHeight: 1.6,
                      }}>
                        {alertCount > 9 ? '9+' : alertCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '0.75rem 0.625rem 1.25rem', borderTop: '1px solid var(--b0)', marginTop: '0.5rem' }}>
        <Link href="/settings" className="nav-item" style={{ marginBottom: 0 }}>
          <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
            <SettingsIcon />
          </span>
          Settings
        </Link>
      </div>
    </aside>
  )
}

// ─── Icons (clean SVG, 16x16) ─────────────────────────────────────────────────

function GridIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
}
function WalletIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="14" height="10" rx="2"/><path d="M1 7h14"/><circle cx="12" cy="10.5" r="1" fill="currentColor" stroke="none"/></svg>
}
function TaxIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L12 4M5 5h1M10 11h1"/><rect x="2" y="2" width="12" height="12" rx="2"/></svg>
}
function DocIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5l-3-4z"/><path d="M10 1v4h3"/><path d="M5 8h6M5 11h4"/></svg>
}
function SimIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12l4-5 3 3 5-7"/><circle cx="14" cy="3" r="1.5" fill="currentColor" stroke="none"/></svg>
}
function ChartIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 14V6l4-4 4 4 4-4v12"/><path d="M2 14h12"/></svg>
}
function AiIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M5 9a3 3 0 006 0M6 6.5h.01M10 6.5h.01"/></svg>
}
function BookIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2h5a2 2 0 012 2v10a2 2 0 01-2 2H2V2z"/><path d="M9 4h3a2 2 0 012 2v6a2 2 0 01-2 2H9"/><path d="M9 8h5"/></svg>
}
function JournalIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="1" width="12" height="14" rx="2"/><path d="M5 5h6M5 8h6M5 11h4"/></svg>
}
function PeopleIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="5" r="2.5"/><circle cx="11" cy="5" r="2"/><path d="M1 14a5 5 0 0110 0"/><path d="M11 12a4 4 0 014 4" strokeDasharray="2 1"/></svg>
}
function SettingsIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.1 3.1l1.4 1.4M11.5 11.5l1.4 1.4M3.1 12.9l1.4-1.4M11.5 4.5l1.4-1.4"/></svg>
}
