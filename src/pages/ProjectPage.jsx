import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectsContext } from '../context/ProjectsContext'

export default function ProjectPage() {
  const { id }                = useParams()
  const navigate              = useNavigate()
  const { projects, loading } = useProjectsContext()

  const project = projects.find(p => String(p.id) === id)

  const [currentVariant, setCurrentVariant] = useState(0)
  const [panelW, setPanelW]               = useState(null)
  const touchStartX                        = useRef(null)
  const videoRefs                          = useRef([])
  const soundHintTimer                     = useRef(null)

  const [isMuted,       setIsMuted]       = useState(true)
  const [showSoundHint, setShowSoundHint] = useState(false)

  // Animation d'ouverture / fermeture (slide depuis le bas)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const images     = project?.images?.filter(Boolean) ?? []
  const mediaTypes = project?.mediaTypes ?? images.map(() => 'image')
  const n          = images.length

  // Détecte les dimensions naturelles de la première image pour adapter le panel (desktop)
  useEffect(() => {
    if (!images[0]) return
    const img  = new Image()
    img.onload = () => {
      if (img.naturalHeight > 0)
        setPanelW(img.naturalWidth / img.naturalHeight)
    }
    img.src = images[0]
  }, [images[0]]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => navigate('/'), 500)
  }, [navigate])

  const prev = useCallback(() => setCurrentVariant(v => Math.max(v - 1, 0)), [])
  const next = useCallback(() => setCurrentVariant(v => Math.min(v + 1, n - 1)), [n])

  const toggleMute = useCallback(() => {
    // Manipuler directement le DOM — nécessaire pour respecter le geste utilisateur
    videoRefs.current.forEach(v => { if (v) v.muted = !v.muted })
    const first = videoRefs.current.find(v => v)
    setIsMuted(first ? first.muted : true)
    setShowSoundHint(true)
    clearTimeout(soundHintTimer.current)
    soundHintTimer.current = setTimeout(() => setShowSoundHint(false), 1200)
  }, [])

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50)       prev()
    else if (delta < -50) next()
    touchStartX.current = null
  }, [prev, next])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape')     handleClose()
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft')  prev()
  }, [handleClose, next, prev])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])


  // Largeur desktop = aspect * 100vh, max 75vw
  const cssVar = panelW
    ? `min(${(panelW * 100).toFixed(2)}vh, 75vw)`
    : 'min(75vh, 55vw)'

  return (
    <div className={`fixed inset-0 z-[200] ${isVisible ? '' : 'pointer-events-none'}`}>

      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/25 backdrop-blur-sm transition-opacity duration-500 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Contenu — slide depuis le bas */}
      <div
        className={`absolute inset-0 flex flex-col md:flex-row bg-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {(loading || !project) ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm text-muted uppercase tracking-wide">
              {loading ? 'LOADING' : 'PROJET INTROUVABLE'}
            </span>
          </div>
        ) : (
          <>
            {/* ─── Barre supérieure mobile — client + CLOSE ─────────────
                Positionnée AVANT le panel image pour apparaître en haut  */}
            <div className="md:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-xs text-muted uppercase tracking-widest">{project.client}</span>
              <button
                onClick={handleClose}
                className="text-xs font-medium uppercase tracking-wide p-2 -m-2 transition-opacity duration-150 hover:opacity-60"
              >
                CLOSE
              </button>
            </div>

            {/* ─── Panel image ──────────────────────────────────────────
                Mobile  : fond blanc, flex-1 = max de hauteur
                Desktop : fond noir, largeur adaptée à l'image          */}
            <div
              style={{ '--pw': cssVar }}
              className="relative flex-1 md:flex-none md:w-[var(--pw)] md:h-full overflow-hidden bg-white md:bg-black"
            >
              {/* Slider d'images — swipe gauche/droite */}
              {n > 0 && (
                <div
                  className="flex h-full transition-transform duration-[380ms] ease-in-out"
                  style={{
                    width:     `${n * 100}%`,
                    transform: `translateX(-${(currentVariant / n) * 100}%)`,
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  {images.map((img, i) => (
                    <div
                      key={i}
                      style={{ width: `${100 / n}%` }}
                      className="h-full flex-shrink-0 flex items-center justify-center relative"
                    >
                      {mediaTypes[i] === 'video' ? (
                        <>
                          <video
                            ref={el => { videoRefs.current[i] = el }}
                            src={img}
                            autoPlay muted loop playsInline
                            className="max-h-full max-w-full object-contain cursor-pointer"
                            onClick={toggleMute}
                          />
                          <div
                            className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                              showSoundHint ? 'opacity-100' : 'opacity-0'
                            }`}
                          >
                            <div className="bg-black/50 rounded-full p-3">
                              {isMuted ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                                </svg>
                              ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                </svg>
                              )}
                            </div>
                          </div>
                        </>
                      ) : (
                        <img
                          src={img}
                          alt={`${project.client} ${i + 1}`}
                          className="max-h-full max-w-full object-contain"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Points de position */}
              {n > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentVariant(i)}
                      className={`h-1 rounded-full transition-all duration-200 ${
                        i === currentVariant
                          ? 'w-4 bg-black/50 md:bg-white'
                          : 'w-1 bg-black/20 hover:bg-black/40 md:bg-white/40 md:hover:bg-white/70'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ─── Panel info ───────────────────────────────────────────
                Mobile  : bande compacte en bas — client + CLOSE + 4 miniatures
                Desktop : panneau latéral complet                        */}
            <div className="flex-shrink-0 md:flex-1 flex flex-col bg-white min-w-0 md:overflow-y-auto">

              {/* Header — desktop uniquement (mobile = barre en haut) */}
              <div className="hidden md:flex items-start justify-between p-6 pb-4">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted uppercase tracking-wider">CLIENT</span>
                    <span className="text-sm font-medium uppercase tracking-wide">{project.client}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted uppercase tracking-wider">LOGICIEL</span>
                    <span className="text-sm font-medium uppercase tracking-wide">{project.software}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted uppercase tracking-wider">DATE</span>
                    <span className="text-sm font-medium uppercase tracking-wide">{project.date}</span>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-sm font-medium uppercase tracking-wide p-2 -m-2 transition-opacity duration-150 hover:opacity-60"
                >
                  CLOSE
                </button>
              </div>

              {/* Grille variantes
                  Mobile  : 4 colonnes, 1 ligne (bande horizontale)
                  Desktop : 2 colonnes, 2 lignes                      */}
              <div className="flex-1 grid grid-cols-4 md:grid-cols-2 gap-1 md:gap-0 px-2 pb-2 md:p-4">
                {images.map((img, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentVariant(index)}
                    className="group aspect-square cursor-pointer relative overflow-hidden bg-neutral-100"
                  >
                    {mediaTypes[index] === 'video' ? (
                        <video
                          src={img}
                          muted
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        />
                      ) : (
                        <img
                          src={img}
                          alt={`Variant ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                        />
                      )}
                    <div
                      className={`absolute inset-0 bg-black transition-opacity duration-200 ${
                        currentVariant === index ? 'opacity-0' : 'opacity-40 group-hover:opacity-10'
                      }`}
                    />
                    <span className="absolute bottom-1 right-1 md:bottom-2 md:right-2 text-[10px] md:text-xs text-white/60 z-10">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                ))}
              </div>

              {/* Footer — desktop uniquement */}
              <div className="hidden md:flex p-6 items-center justify-between">
                <div className="flex items-center gap-2">
                  <kbd className="text-xs text-muted border border-current rounded px-1.5 py-0.5 leading-none">←</kbd>
                  <kbd className="text-xs text-muted border border-current rounded px-1.5 py-0.5 leading-none">→</kbd>
                  <span className="text-xs text-muted uppercase tracking-wider">NAVIGATE</span>
                </div>
                <span className="text-sm text-muted">48.8566° N ; 2.3522° E</span>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  )
}
