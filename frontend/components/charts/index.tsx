'use client'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  CartesianGrid,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { TimelinePoint } from '@/types'

// ─── Shared tooltip style ──────────────────────────────────────────────────────

const TooltipBox = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#141920',
      border: '1px solid rgba(255,255,255,0.11)',
      borderRadius: 10,
      padding: '0.625rem 0.875rem',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      fontSize: '0.775rem',
    }}>
      {label != null && (
        <div style={{ color: '#49535f', marginBottom: '0.375rem', fontSize: '0.68rem' }}>{label}</div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: i < payload.length - 1 ? 3 : 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: '#8892a4' }}>{p.name ?? p.dataKey}:</span>
          <span style={{ color: '#f1f3f7', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
            {formatter ? formatter(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

const axisStyle = { fill: '#49535f', fontSize: 11, fontFamily: "'DM Mono', monospace" }

// ─── NET WORTH TIMELINE ───────────────────────────────────────────────────────

interface NetWorthPoint { snapshot_date: string; net_worth: number; total_assets: number; total_debts: number }

export function NetWorthChart({ data, height = 200 }: { data: NetWorthPoint[]; height?: number }) {
  const formatted = data.map(d => ({
    date: d.snapshot_date.slice(0, 7),
    'Net worth': d.net_worth,
    Assets: d.total_assets,
  }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d47e" stopOpacity={0.18} />
            <stop offset="100%" stopColor="#22d47e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={42} />
        <Tooltip content={<TooltipBox formatter={formatCurrency} />} />
        <Area type="monotone" dataKey="Net worth" stroke="#22d47e" strokeWidth={2} fill="url(#nwGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── SCENARIO TIMELINE (fork comparison) ─────────────────────────────────────

export function TimelineChart({
  dataA, dataB, labelA = 'Scenario A', labelB = 'Scenario B', height = 300,
}: {
  dataA: TimelinePoint[]
  dataB?: TimelinePoint[]
  labelA?: string
  labelB?: string
  height?: number
}) {
  const merged = dataA.map((a, i) => ({
    year: `Yr ${a.year}`,
    [labelA]: Math.round(a.net_worth),
    ...(dataB?.[i] ? { [labelB]: Math.round(dataB[i].net_worth) } : {}),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={merged} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d47e" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#22d47e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={50} />
        <Tooltip content={<TooltipBox formatter={formatCurrency} />} />
        <Area type="monotone" dataKey={labelA} stroke="#22d47e" strokeWidth={2} fill="url(#aGrad)" dot={false} />
        {dataB && <Area type="monotone" dataKey={labelB} stroke="#3b82f6" strokeWidth={2} fill="url(#bGrad)" dot={false} />}
        {dataB && <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />}
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── MONTE CARLO PROBABILITY BANDS ───────────────────────────────────────────

export function MonteCarloBand({ data, height = 300 }: { data: TimelinePoint[]; height?: number }) {
  const formatted = data.map(d => ({
    year: `Yr ${d.year}`,
    median:  Math.round(d.p50 ?? d.net_worth),
    best10:  Math.round(d.p90 ?? d.net_worth),
    worst10: Math.round(d.p10 ?? d.net_worth),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="mcBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d47e" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#22d47e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="mcBest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d47e" stopOpacity={0.05} />
            <stop offset="100%" stopColor="#22d47e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={50} />
        <Tooltip content={<TooltipBox formatter={formatCurrency} />} />
        <Area type="monotone" dataKey="best10"  stroke="rgba(34,212,126,0.25)" strokeWidth={1} fill="url(#mcBest)" dot={false} name="Best 10%" />
        <Area type="monotone" dataKey="median"  stroke="#22d47e" strokeWidth={2} fill="url(#mcBand)" dot={false} name="Median" />
        <Area type="monotone" dataKey="worst10" stroke="rgba(255,85,85,0.4)" strokeWidth={1} fill="url(#mcBest)" dot={false} name="Worst 10%" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── SPENDING BAR CHART ───────────────────────────────────────────────────────

export function SpendingChart({
  data, height = 220,
}: {
  data: { category: string; amount: number }[]
  height?: number
}) {
  const formatted = data.map(d => ({
    name: d.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()).slice(0, 12),
    amount: Math.round(d.amount),
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d47e" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#0d9e57" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} width={46} />
        <Tooltip content={<TooltipBox formatter={formatCurrency} />} />
        <Bar dataKey="amount" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── DONUT CHART ──────────────────────────────────────────────────────────────

const DONUT_COLORS = [
  '#22d47e', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#14b8a6', '#f97316', '#ec4899', '#6366f1',
]

export function DonutChart({
  data, height = 220,
}: {
  data: { name: string; value: number }[]
  height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data} cx="50%" cy="45%"
          innerRadius="55%" outerRadius="75%"
          paddingAngle={3} dataKey="value"
          strokeWidth={0}
        >
          {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0]
            const total = data.reduce((s, d) => s + d.value, 0)
            return (
              <div style={{ background: '#141920', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.775rem' }}>
                <div style={{ color: '#f1f3f7', fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: '#8892a4', marginTop: 2 }}>
                  {formatCurrency(p.value as number)} · {((p.value as number / total) * 100).toFixed(1)}%
                </div>
              </div>
            )
          }}
        />
        <Legend
          iconType="circle" iconSize={7}
          wrapperStyle={{ fontSize: 11, color: '#8892a4', paddingTop: 8 }}
          formatter={(v) => v.length > 16 ? v.slice(0, 15) + '…' : v}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── TAX BRACKET WATERFALL ────────────────────────────────────────────────────

export function BracketChart({
  brackets, height = 200,
}: {
  brackets: { rate: number; taxable_amount: number; tax: number }[]
  height?: number
}) {
  if (!brackets?.length) return null
  const formatted = brackets.map(b => ({
    name: `${b.rate}%`,
    tax: Math.round(b.tax),
  }))

  const maxTax = Math.max(...formatted.map(d => d.tax), 1)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={42} />
        <Tooltip content={<TooltipBox formatter={formatCurrency} />} />
        <Bar dataKey="tax" radius={[4, 4, 0, 0]} maxBarSize={50}>
          {formatted.map((entry, i) => {
            const intensity = entry.tax / maxTax
            const r = Math.round(255 * intensity)
            const g = Math.round(85 + (170 - 85) * (1 - intensity))
            return <Cell key={i} fill={`rgba(${r},${g},85,0.85)`} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
