import { useCallback, useRef, useState } from 'react'

// Arrastrar hacia abajo para cerrar un panel a pantalla completa.
// Convive con useSwipe: cada uno solo actúa si el gesto va en su eje.
export function useDragDismiss(onDismiss, { threshold = 120 } = {}) {
  const [dy, setDy] = useState(0)
  const [animate, setAnimate] = useState(false)
  const start = useRef(null)
  const dragged = useRef(false)
  const closing = useRef(false)

  // Cierra con la misma animación de bajada (también para el botón de cerrar)
  const dismiss = useCallback(() => {
    if (closing.current) return
    closing.current = true
    setAnimate(true)
    setDy(window.innerHeight)
    setTimeout(onDismiss, 220)
  }, [onDismiss])

  const onPointerDown = (e) => {
    if (closing.current || (e.pointerType === 'mouse' && e.button !== 0)) return
    // no interferir con la barra de progreso, el volumen, etc.
    if (e.target.closest('input, select, textarea, [data-no-dismiss]')) return
    start.current = { y: e.clientY, x: e.clientX, t: performance.now(), id: e.pointerId, axis: null, last: 0 }
    dragged.current = false
    setAnimate(false)
  }

  const onPointerMove = (e) => {
    const s = start.current
    if (!s || e.pointerId !== s.id) return
    const my = e.clientY - s.y
    const mx = e.clientX - s.x
    if (!s.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      s.axis = Math.abs(my) > Math.abs(mx) && my > 0 ? 'y' : 'x'
      if (s.axis === 'y') e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (s.axis !== 'y') return
    dragged.current = true
    s.last = Math.max(0, my)
    setDy(s.last)
  }

  const onPointerUp = () => {
    const s = start.current
    start.current = null
    if (!s || s.axis !== 'y') return
    const velocity = s.last / (performance.now() - s.t) // px/ms
    if (s.last > threshold || velocity > 0.6) dismiss()
    else {
      setAnimate(true)
      setDy(0)
    }
  }

  const onClickCapture = (e) => {
    if (dragged.current) {
      e.preventDefault()
      e.stopPropagation()
      dragged.current = false
    }
  }

  const style = {
    transform: dy ? `translateY(${dy}px)` : undefined,
    transition: animate ? 'transform 220ms cubic-bezier(.2,.8,.2,1)' : 'none',
    // el panel no tiene scroll: así el navegador no roba el gesto (ni hace "pull to refresh")
    touchAction: 'none',
  }

  return {
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture },
    style,
    dismiss,
  }
}
