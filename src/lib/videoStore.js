/**
 * Singleton store for persistent video elements.
 * A video element created here lives as long as the page session,
 * so it can be moved between DOM containers without interrupting playback.
 */
const store = new Map() // src → HTMLVideoElement

export function getOrCreateVideo(src) {
  if (store.has(src)) return store.get(src)

  const v = document.createElement('video')
  v.autoplay = true
  v.muted = true
  v.loop = true
  v.playsInline = true
  v.src = src
  Object.assign(v.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  })
  v.play().catch(() => {})

  store.set(src, v)
  return v
}
