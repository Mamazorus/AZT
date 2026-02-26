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
      setTimeout(onComplete, 500)
    }, 150)
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
      className={`fixed inset-0 z-[500] bg-white flex items-center justify-center transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <span className="text-sm font-medium uppercase tracking-widest tabular-nums">
        {progress}&nbsp;%
      </span>
    </div>
  )
}
