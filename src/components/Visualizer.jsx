import { useEffect, useRef } from 'react'
import { usePlayer } from '../hooks/usePlayer'

// Barras de frecuencia simétricas dibujadas con el color de acento
export function Visualizer({ bars = 48, className = '' }) {
  const { analyser } = usePlayer()
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null
    const levels = new Float32Array(bars)
    const root = document.documentElement
    let raf

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      if (data) analyser.getByteFrequencyData(data)
      ctx.fillStyle = root.style.getPropertyValue('--accent') || '#fff'

      const gap = 3
      const bw = Math.max(1, (w - gap * (bars - 1)) / bars)
      const half = bars / 2
      for (let i = 0; i < bars; i++) {
        // espejo: graves en el centro, agudos hacia los bordes
        const d = Math.abs(i - half + 0.5) / half
        const bin = data ? Math.floor(Math.pow(d, 1.6) * data.length * 0.72) : 0
        const v = data ? data[bin] / 255 : 0
        levels[i] += (v - levels[i]) * 0.3
        const bh = Math.max(3, levels[i] * h)
        const x = i * (bw + gap)
        const y = (h - bh) / 2
        ctx.globalAlpha = 0.35 + levels[i] * 0.65
        ctx.beginPath()
        ctx.roundRect(x, y, bw, bh, Math.min(bw / 2, 3))
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [analyser, bars])

  return <canvas ref={ref} className={`block w-full ${className}`} aria-hidden="true" />
}
