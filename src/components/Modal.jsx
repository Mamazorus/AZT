import { useState, useEffect, useCallback, useRef } from 'react'

export default function Modal({ project, isOpen, onClose }) {
  const [currentVariant, setCurrentVariant] = useState(0)
  const [panelW, setPanelW]               = useState(null)
  const touchStartX                        = useRef(null)

  // Garde le dernier projet valide pour que l'animation de fermeture affiche encore le contenu
  const [displayedProject, setDisplayedProject] = useState(null)
  useEffect(() => {
    if (project) setDisplayedProject(project)
  }, [project])

  const p      = displayedProject
  const images = p?.images?.filter(Boolean) ?? []
  const n      = images.length

  // Reset quand le projet change
  useEffect(() => {
    setCurrentVariant(0)
    setPanelW(null)
  }, [project])

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

  const prev = useCallback(() => setCurrentVariant(v => Math.max(v - 1, 0)), [])
  const next = useCallback(() => setCurrentVariant(v => Math.min(v + 1, n - 1)), [n])

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
    if (e.key === 'Escape')     onClose()
    if (e.key === 'ArrowRight') next()
    if (e.key === 'ArrowLeft')  prev()
  }, [onClose, next, prev])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  // Largeur desktop = aspect * 100vh, max 75vw
  const cssVar = panelW
    ? `min(${(panelW * 100).toFixed(2)}vh, 75vw)`
    : 'min(75vh, 55vw)'

  return (
    // Toujours dans le DOM — pointer-events-none quand fermé pour l'animation slide-down
    <div className={`fixed inset-0 z-[200] ${isOpen ? '' : 'pointer-events-none'}`}>

      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/25 backdrop-blur-sm transition-opacity duration-500 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Contenu — slide depuis le bas */}
      <div
        className={`absolute inset-0 flex flex-col md:flex-row bg-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {p && (
          <>
            {/* ─── Barre supérieure mobile — client + CLOSE ─────────────
                Positionnée AVANT le panel image pour apparaître en haut  */}
            <div className="md:hidden flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-xs text-muted uppercase tracking-widest">{p.client}</span>
              <button
                onClick={onClose}
                className="text-xs font-medium uppercase tracking-wide p-2 -m-2 transition-opacity duration-150 hover:opacity-60"
              >
                CLOSE
              </button>
            </div>

            {/* ─── Panel image ──────────────────────────────────────────
                Mobile  : fond blanc (pas de barres noires), flex-1 = max de hauteur
                Desktop : fond noir, largeur adaptée à l'image              */}
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
                      className="h-full flex-shrink-0 flex items-center justify-center"
                    >
                      <img
                        src={img}
                        alt={`${p.client} ${i + 1}`}
                        className="max-h-full max-w-full object-contain"
                      />
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
                Desktop : panneau latéral complet                          */}
            <div className="flex-shrink-0 md:flex-1 flex flex-col bg-white min-w-0 md:overflow-y-auto">

              {/* Header — desktop uniquement (mobile = barre en haut) */}
              <div className="hidden md:flex items-start justify-between p-6 pb-4">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted uppercase tracking-wider">CLIENT</span>
                    <span className="text-sm font-medium uppercase tracking-wide">{p.client}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted uppercase tracking-wider">LOGICIEL</span>
                    <span className="text-sm font-medium uppercase tracking-wide">{p.software}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted uppercase tracking-wider">DATE</span>
                    <span className="text-sm font-medium uppercase tracking-wide">{p.date}</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-sm font-medium uppercase tracking-wide p-2 -m-2 transition-opacity duration-150 hover:opacity-60"
                >
                  CLOSE
                </button>
              </div>

              {/* Grille variantes
                  Mobile  : 4 colonnes, 1 ligne (bande horizontale)
                  Desktop : 2 colonnes, 2 lignes                        */}
              <div className="flex-1 grid grid-cols-4 md:grid-cols-2 gap-1 md:gap-0 px-2 pb-2 md:p-4">
                {images.map((img, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentVariant(index)}
                    className="group aspect-square cursor-pointer relative overflow-hidden bg-neutral-100"
                  >
                    <img
                      src={img}
                      alt={`Variant ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    />
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
