import { useState, useEffect, useCallback } from 'react'
import { useProjectsContext } from '../context/ProjectsContext'

export default function Preloader({ onComplete }) {
  const { projects, loading } = useProjectsContext()
  const [progress, setProgress] = useState(0)
  const [fading,   setFading]   = useState(false)

  const finish = useCallback(() => {
    setProgress(100)
    setTimeout(() => {
      setFading(true)
      setTimeout(onComplete, 700)
    }, 200)
  }, [onComplete])

  useEffect(() => {
    if (loading) return

    const allImages = projects.flatMap(p =>
      (p.images ?? []).filter((url, i) =>
        url && (p.mediaTypes?.[i] ?? 'image') === 'image'
      )
    )
    const total = allImages.length

    if (total === 0) { finish(); return }

    let loaded = 0
    function onLoad() {
      loaded++
      setProgress(Math.round((loaded / total) * 100))
      if (loaded === total) finish()
    }

    allImages.forEach(src => {
      const img = new Image()
      img.onload  = onLoad
      img.onerror = onLoad
      img.src     = src
    })
  }, [loading, projects, finish])

  return (
    <div
      className="fixed inset-0 z-[500] bg-black flex items-center justify-center overflow-hidden"
      style={{
        transform:  fading ? 'translateY(100%)' : 'translateY(0)',
        transition: fading ? 'transform 0.7s cubic-bezier(0.32,0.72,0,1)' : 'none',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <span
        className="text-white font-medium tabular-nums leading-none select-none"
        style={{ fontSize: '22vw' }}
      >
        {progress}
        <span style={{ fontSize: '5vw', marginLeft: '0.08em' }}>%</span>
      </span>
    </div>
  )
}
