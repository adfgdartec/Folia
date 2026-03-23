'use client'
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div style={{
          padding: '2rem', background: 'rgba(248,113,113,0.06)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: 'var(--r-lg)', margin: '1rem 0',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--red)', marginBottom: '0.5rem' }}>Something went wrong</div>
          <div style={{ fontSize: '0.825rem', color: 'var(--t2)', marginBottom: '1rem', fontFamily: 'var(--mono)' }}>
            {this.state.error?.message}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function PageError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--red)', marginBottom: '0.75rem' }}>
        Failed to load this page
      </div>
      <div style={{ fontSize: '0.875rem', color: 'var(--t2)', marginBottom: '1.5rem', fontFamily: 'var(--mono)' }}>
        {error.message}
      </div>
      <button className="btn btn-primary" onClick={reset}>Try again</button>
    </div>
  )
}
