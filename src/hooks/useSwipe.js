import { useRef, useState } from 'react'

// Deslizar horizontalmente para cambiar de canción.
// Izquierda → siguiente, derecha → anterior. El desplazamiento vertical no se bloquea.
export function useSwipe({ onNext, onPrev, enabled = true, threshold = 70, tilt = true }) {
  const [dx, setDx] = useState(0)
  const [animate, setAnimate] = useState(false)
  const start = useRef(null)
  const dragged = useRef(false)
  const busy = useRef(false)

  const reset = () => {
    setAnimate(true)
    setDx(0)
  }

  const onPointerDown = (e) => {
    if (!enabled || busy.current || (e.pointerType === 'mouse' && e.button !== 0)) return
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, axis: null }
    dragged.current = false
    setAnimate(false)
  }

  const onPointerMove = (e) => {
    const s = start.current
    if (!s || e.pointerId !== s.id) return
    const mx = e.clientX - s.x
    const my = e.clientY - s.y
    if (!s.axis) {
      if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
      s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (s.axis === 'x') e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    if (s.axis !== 'x') return
    dragged.current = true
    setDx(mx)
  }

  const onPointerUp = (e) => {
    const s = start.current
    start.current = null
    if (!s || s.axis !== 'x') return
    const mx = e.clientX - s.x
    const velocity = Math.abs(mx) / (performance.now() - s.t) // px/ms
    if (Math.abs(mx) < threshold && velocity < 0.6) return reset()

    // sale por un lado, cambia la canción y la nueva entra por el lado contrario
    const dir = mx < 0 ? -1 : 1
    const width = e.currentTarget.offsetWidth || 300
    busy.current = true
    setAnimate(true)
    setDx(dir * width * 1.1)
    setTimeout(() => {
      if (dir < 0) onNext()
      else onPrev()
      setAnimate(false)
      setDx(-dir * width * 0.5)
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          reset()
          busy.current = false
        }),
      )
    }, 170)
  }

  const onPointerCancel = () => {
    start.current = null
    reset()
  }

  // evita que un arrastre se interprete también como clic
  const onClickCapture = (e) => {
    if (dragged.current) {
      e.preventDefault()
      e.stopPropagation()
      dragged.current = false
    }
  }

  const style = {
    transform: `translateX(${dx}px)${tilt ? ` rotate(${dx / 40}deg)` : ''}`,
    opacity: 1 - Math.min(Math.abs(dx) / 500, 0.6),
    transition: animate ? 'transform 220ms cubic-bezier(.2,.8,.2,1), opacity 220ms' : 'none',
    touchAction: 'pan-y',
  }

  return { handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture }, style }
}
