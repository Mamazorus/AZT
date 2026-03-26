import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useWebProjectsContext } from '../context/WebProjectsContext'
import PersistentVideo from '../components/PersistentVideo'
import { consumeFromRect } from '../lib/thumbnailTransition'

// Forcer le protocole https:// si absent
const formatUrl = (url) => {
  if (!url) return null
  if (url.match(/^https?:\/\//)) return url
  return `https://${url}`
}

export default function WebProjectPage() {
  const { id }                = useParams()
  const navigate              = useNavigate()
  const { projects, loading } = useWebProjectsContext()
  const projectIndex          = projects.findIndex(p => String(p.id) === id)
  const project               = projects[projectIndex]
  const reverse               = projectIndex % 2 === 1
  const thumbRef              = useRef(null)

  // Scroll to top first (before the FLIP reads positions)
  useLayoutEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }) }, [])

  // FLIP animation: animate thumbnail FROM its Web-page position TO here
  useLayoutEffect(() => {
    const el   = thumbRef.current
    const from = consumeFromRect()  // consumes and clears the stored rect
    if (!el || !from) return

    const to = el.getBoundingClientRect()

    const dx = from.left - to.left
    const dy = from.top  - to.top
    const sx = from.width  / to.width
    const sy = from.height / to.height

    // Jump instantly to the source position
    el.style.transformOrigin = '0 0'
    el.style.willChange      = 'transform'
    el.style.transform       = `translate(${dx}px, ${dy}px) scaleX(${sx}) scaleY(${sy})`
    el.style.transition      = 'none'

    // Force reflow so the browser registers the initial state
    void el.offsetHeight

    // Animate to natural position
    el.style.transition = 'transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)'
    el.style.transform  = 'translate(0px, 0px) scaleX(1) scaleY(1)'

    // Clean up inline styles once done
    const cleanup = () => {
      el.style.transform       = ''
      el.style.transition      = ''
      el.style.transformOrigin = ''
      el.style.willChange      = ''
    }
    el.addEventListener('transitionend', cleanup, { once: true })
    return () => el.removeEventListener('transitionend', cleanup)
  }, []) // run only on initial mount

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') navigate('/web') }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [navigate])

  const [animKey, setAnimKey] = useState(Date.now)

  useEffect(() => {
    const restart = () => { if (!document.hidden) setAnimKey(Date.now()) }
    document.addEventListener('visibilitychange', restart)
    return () => document.removeEventListener('visibilitychange', restart)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-[60px]">
        <span className="text-xs text-white/30 uppercase tracking-widest">LOADING</span>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 pt-[60px]">
        <span className="text-xs text-white/30 uppercase tracking-widest">PROJECT NOT FOUND</span>
        <button
          onClick={() => navigate('/web')}
          className="text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors duration-150"
        >
          ← BACK TO WEB
        </button>
      </div>
    )
  }

  const blocks      = project.blocks ?? []
  const hasBlocks   = blocks.length > 0
  const isVideo     = (url) => /\.(mp4|webm|mov)/i.test(url)

  // Legacy: projets sans blocs
  const legacyImages = (project.images ?? []).filter(Boolean)
  const legacyThumb  = legacyImages[0] ?? null
  const legacyExtra  = legacyImages.slice(1)

  const GAP = '12px'

  const renderMedia = (url, cls, ref) => {
    if (!url) return <div className={`${cls} bg-zinc-900`} ref={ref} />
    return (
      <div className={`${cls} relative overflow-hidden`} ref={ref}>
        {isVideo(url) ? (
          <PersistentVideo src={url} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        )}
      </div>
    )
  }

  return (
    <div data-web className="min-h-screen bg-black text-white">

      {/* ── Sub-nav ───────────────────────────────────────────────────────────── */}
      <div className="fixed top-[60px] left-0 right-0 z-[99] flex items-center justify-between px-6 h-[50px] bg-black/90 backdrop-blur-sm border-b border-white/10">
        <button
          onClick={() => navigate('/web')}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors duration-150"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" />
          </svg>
          WEB
        </button>
        <span className="text-xs text-white/20 uppercase tracking-widest">{project.number}</span>
        <div className="w-14" />
      </div>

      {/* ── Layout principal ──────────────────────────────────────────────────── */}
      <div className={`pt-[110px] flex flex-col md:flex-row min-h-screen ${reverse ? 'md:flex-row-reverse' : ''}`}>

        {/* ── Info sticky ───────────────────────────────────────────────────── */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex-shrink-0 md:w-72 px-6 py-10"
        >
          <div className="md:sticky md:top-[130px] flex flex-col gap-8">
            <span className="text-xs text-white/20 tracking-widest">{project.number}</span>
            <div className="flex flex-col gap-1">
              <h1 className="text-base font-normal uppercase tracking-widest text-white">
                {project.client}
              </h1>
              <span className="text-sm text-white/40">{project.type}</span>
              <span className="text-sm text-white/40">{project.year}</span>
            </div>
            {project.description && (
              <div className="text-sm text-white/50 leading-relaxed whitespace-pre-wrap">
                {project.description}
              </div>
            )}
            {project.url && (
              <a
                href={formatUrl(project.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/40 hover:text-white transition-colors duration-150"
              >
                VISIT SITE
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </a>
            )}
          </div>
        </motion.aside>

        {/* ── Contenu scrollable ────────────────────────────────────────────── */}
        <div className="flex-1 py-6 pb-16" style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingLeft: GAP, paddingRight: GAP }}>

          {hasBlocks ? (
            blocks.map((block, bi) => {
              const item0     = block.items?.[0]
              const item1     = block.items?.[1]
              const firstRef  = bi === 0 ? thumbRef : undefined
              const bgStyle   = { backgroundColor: block.bgColor ?? '#000000' }

              const blockContent = (() => {
                if (block.type === 'duo') {
                  return (
                    <div style={{ ...bgStyle, display: 'flex', gap: GAP }}>
                      {renderMedia(item0?.url, 'flex-1 aspect-square', firstRef)}
                      {renderMedia(item1?.url, 'flex-1 aspect-square')}
                    </div>
                  )
                }
                if (block.type === 'portrait') {
                  return (
                    <div style={{ ...bgStyle, display: 'flex', justifyContent: 'center' }}>
                      {renderMedia(item0?.url, 'w-2/3 aspect-[3/4]', firstRef)}
                    </div>
                  )
                }
                if (block.type === 'wide-narrow') {
                  return (
                    <div style={{ ...bgStyle, display: 'flex', gap: GAP }}>
                      {renderMedia(item0?.url, 'flex-[2] aspect-video', firstRef)}
                      {renderMedia(item1?.url, 'flex-1 aspect-square')}
                    </div>
                  )
                }
                // default: 'full'
                return renderMedia(item0?.url, 'w-full aspect-video', firstRef)
              })()

              if (bi === 0) {
                // Pas d'animation — le FLIP gère le premier bloc
                return <div key={`${animKey}-block-${block.id ?? bi}`}>{blockContent}</div>
              }
              return (
                <motion.div
                  key={`${animKey}-block-${block.id ?? bi}`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.35 + bi * 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  {blockContent}
                </motion.div>
              )
            })
          ) : (
            /* Legacy: projets sans blocs */
            <>
              <div ref={thumbRef} className="w-full aspect-video relative overflow-hidden">
                {legacyThumb ? (
                  isVideo(legacyThumb) ? (
                    <PersistentVideo src={legacyThumb} />
                  ) : (
                    <img src={legacyThumb} alt={project.client} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  )
                ) : (
                  <div className="absolute inset-0 bg-zinc-900" />
                )}
              </div>
              {legacyExtra.map((url, i) => (
                <motion.div
                  key={`${animKey}-${i}`}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.5 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full aspect-video relative overflow-hidden"
                >
                  {isVideo(url) ? (
                    <PersistentVideo src={url} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  )}
                </motion.div>
              ))}
            </>
          )}

        </div>
      </div>

    </div>
  )
}
