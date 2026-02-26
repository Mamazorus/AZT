import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

function formatTime() {
  return new Date().toLocaleString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true, timeZoneName: 'short',
  }).replace(',', '').toUpperCase()
}

export default function Header() {
  const [datetime, setDatetime] = useState(formatTime) // lazy init : heure correcte dès le 1er rendu
  const location = useLocation()

  useEffect(() => {
    const interval = setInterval(() => setDatetime(formatTime()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="fixed top-0 left-0 right-0 h-[60px] px-6 flex items-center justify-between bg-white z-[100]">
      {/* Logo */}
      <Link to="/" className="flex items-center" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <img
          src="/logo.svg"
          alt="Logo"
          className="transition-opacity duration-150 hover:opacity-75"
          style={{ height: '30px', filter: 'invert(1)' }}
          draggable={false}
        />
      </Link>

      {/* Center text - hidden on mobile */}
      <span className="absolute left-1/2 -translate-x-1/2 text-sm font-normal tracking-wide hidden md:block">
        @2026 ALL WORKS
      </span>

      {/* Right side */}
      <div className="flex items-center gap-4 md:gap-6">
        <Link
          to="/about"
          className={`text-sm font-normal tracking-wide uppercase transition-opacity duration-150 hover:opacity-60 ${
            location.pathname === '/about' ? 'opacity-60' : ''
          }`}
        >
          ABOUT
        </Link>
        <Link
          to="/admin"
          title="Admin"
          className={`transition-opacity duration-150 hover:opacity-60 ${
            location.pathname === '/admin' ? 'opacity-60' : 'opacity-30'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </Link>
        <span className="text-sm font-normal tracking-wide tabular-nums whitespace-nowrap">
          {datetime}
        </span>
      </div>
    </header>
  )
}
