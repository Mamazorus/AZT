import { useState, useCallback, useLayoutEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebProjectsContext } from '../context/WebProjectsContext'
import PersistentVideo from '../components/PersistentVideo'
import { setFromRect } from '../lib/thumbnailTransition'

const SHADES = [
  '#1a1a1a',
  '#1c1a17',
  '#171a1c',
]

const SCROLL_KEY = 'web-scroll-y'

export default function Web() {
  const { projects, loading } = useWebProjectsContext()

  useLayoutEffect(() => {
    const saved = sessionStorage.getItem(SCROLL_KEY)
    if (saved) {
      window.scrollTo({ top: parseInt(saved), behavior: 'instant' })
      sessionStorage.removeItem(SCROLL_KEY)
    }
  }, [])

  return (
    <main data-web className="flex-1 pt-[60px] bg-black">
      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <span className="text-sm text-white/30 uppercase tracking-widest">LOADING</span>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex items-center justify-center h-[calc(100vh-60px)]">
          <span className="text-sm text-white/30 uppercase tracking-widest">NO PROJECTS YET</span>
        </div>
      ) : (
        projects.map((project, i) => (
          <WebSection key={project.id} project={project} index={i} />
        ))
      )}
    </main>
  )
}

function WebSection({ project, index }) {
  const navigate  = useNavigate()
  const reverse   = index % 2 === 1
  const media     = project.images?.[0]
  const isVideo   = media && /\.(mp4|webm|mov)/i.test(media)
  const thumbRef  = useRef(null)

  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false })

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top, visible: true })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setCursor(c => ({ ...c, visible: false }))
  }, [])

  const handleNavigate = useCallback(() => {
    // Capture the thumbnail's exact viewport position before navigating
    if (thumbRef.current) {
      setFromRect(thumbRef.current.getBoundingClientRect())
    }
    sessionStorage.setItem(SCROLL_KEY, window.scrollY)
    navigate(`/web/${project.id}`)
  }, [navigate, project.id])

  return (
    <section
      className={`
        group flex flex-col md:flex-row
        border-b border-white/5 bg-black
        ${reverse ? 'md:flex-row-reverse' : ''}
      `}
    >
      {/* ── Info ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 md:w-72 flex flex-col justify-end px-6 pt-6 pb-10 md:pb-16 bg-black order-2 md:order-none">
        <span className="text-xs text-white/20 tracking-wider mb-8 block">
          {project.number}
        </span>
        <div className="flex flex-col gap-1 mb-8">
          <h2 className="text-base font-normal uppercase tracking-widest text-white">
            {project.client}
          </h2>
          <span className="text-sm text-white/40">{project.type}</span>
          <span className="text-sm text-white/40">{project.year}</span>
        </div>
        {project.summary && (
          <p className="text-sm text-white/40 leading-relaxed mb-8">
            {project.summary}
          </p>
        )}
        <button
          onClick={handleNavigate}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 group-hover:text-white transition-colors duration-150 text-left"
        >
          VIEW PROJECT
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </button>
      </div>

      {/* ── Media ─────────────────────────────────────────────────── */}
      <div
        className="flex-1 px-6 py-6 order-1 md:order-none flex items-center relative"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={thumbRef}
          className="w-full aspect-video relative overflow-hidden cursor-none"
          onClick={handleNavigate}
        >
          {media ? (
            isVideo ? (
              <PersistentVideo
                src={media}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
            ) : (
              <img
                src={media}
                alt={project.client}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                loading="lazy"
              />
            )
          ) : (
            <div className="absolute inset-0" style={{ background: SHADES[index % SHADES.length] }}>
              <span className="absolute bottom-4 left-4 text-[10px] text-white/20 uppercase tracking-widest">
                {project.number}
              </span>
            </div>
          )}
        </div>

        {/* Custom cursor */}
        <div
          className="pointer-events-none absolute z-10 transition-opacity duration-150"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)',
            opacity: cursor.visible ? 1 : 0,
          }}
        >
          <div className="bg-black/50 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7v10" />
            </svg>
            <span className="text-[10px] text-white uppercase tracking-widest whitespace-nowrap">
              View project
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
