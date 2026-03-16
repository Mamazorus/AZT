import { useLocation } from 'react-router-dom'

export default function Footer() {
  const location = useLocation()
  const isWeb    = location.pathname.startsWith('/web')

  return (
    <footer className={`px-4 md:px-6 py-6 flex flex-col md:flex-row items-center justify-between text-xs uppercase tracking-wide mt-auto gap-4 md:gap-0 text-center md:text-left transition-colors duration-300 ${
      isWeb ? 'bg-black text-white/40 border-t border-white/10' : 'bg-white text-black'
    }`}>
      <div className="flex-1">
        <a href="https://www.instagram.com/azt.mam/" target="_blank" rel="noopener noreferrer" className="underline">INSTAGRAM © 2026</a>
        <br />
        <span>POWER BY <a href="https://sordulo.com" target="_blank" rel="noopener noreferrer" className="underline">SORDULO</a></span>
      </div>
      <div className="flex-1 md:text-center">
        <span>PARIS, ÎLE DE FRANCE</span>
        <br />
        <span>48.8566° N ; 2.3522° E</span>
      </div>
      <div className="flex-1 md:text-right">
        <span>DISCLAIMER</span>
        <br />
        <span>ALL RIGHTS RESERVED</span>
      </div>
    </footer>
  )
}
