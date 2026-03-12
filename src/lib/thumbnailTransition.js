/**
 * Module-level singleton for the FLIP thumbnail transition.
 * Stores the source rect (getBoundingClientRect) captured just before navigation.
 */
let _fromRect = null

export function setFromRect(rect) {
  _fromRect = rect
}

/** Returns and clears the stored rect (consume once). */
export function consumeFromRect() {
  const r = _fromRect
  _fromRect = null
  return r
}
