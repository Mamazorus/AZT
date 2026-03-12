import { useLayoutEffect, useRef } from 'react'
import { getOrCreateVideo } from '../lib/videoStore'

/**
 * Renders a persistent video element that survives route transitions.
 * The underlying HTMLVideoElement is reused across mounts, so playback
 * is never interrupted when navigating between the list and detail pages.
 *
 * @param {string}  src        - Video source URL
 * @param {string}  className  - Optional class applied to the video element itself
 */
export default function PersistentVideo({ src, className = '' }) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    if (!containerRef.current || !src) return
    const v = getOrCreateVideo(src)
    // Update class so hover styles work correctly in each context
    v.className = className
    containerRef.current.appendChild(v)
    v.play().catch(() => {})

    return () => {
      // Only detach if the video is still in our container.
      // If another PersistentVideo already claimed it, do nothing.
      if (v.parentElement === containerRef.current) {
        containerRef.current.removeChild(v)
      }
    }
  }, [src, className])

  return <div ref={containerRef} className="absolute inset-0" />
}