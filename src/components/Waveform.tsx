import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface WaveformProps {
  analyser: AnalyserNode | null
  active: boolean
  paused?: boolean
  className?: string
}

/**
 * Lightweight canvas waveform. requestAnimationFrame only runs while listening,
 * capped at roughly 30fps. No audio leaves the browser.
 */
export function Waveform({ analyser, active, paused = false, className }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let raf = 0
    let lastDraw = 0
    let data: Uint8Array | null = null

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawIdle = (width: number, height: number, isPaused: boolean) => {
      context.clearRect(0, 0, width, height)
      context.strokeStyle = isPaused ? 'rgba(181, 166, 122, 0.4)' : 'rgba(148, 160, 177, 0.26)'
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(0, height / 2)
      context.lineTo(width, height / 2)
      context.stroke()

      if (!isPaused) {
        context.fillStyle = 'rgba(148, 160, 177, 0.24)'
        const bars = 18
        const gap = width / bars
        for (let index = 0; index < bars; index += 1) {
          const barHeight = index % 3 === 0 ? 2 : 1
          context.fillRect(index * gap + gap / 2, height / 2 - barHeight / 2, 1, barHeight)
        }
      }
    }

    const draw = (timestamp: number) => {
      if (timestamp - lastDraw < 32) {
        if (active && analyser) raf = requestAnimationFrame(draw)
        return
      }
      lastDraw = timestamp

      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      if (!active || !analyser) {
        drawIdle(width, height, paused)
        return
      }

      if (!data || data.length !== analyser.fftSize) {
        data = new Uint8Array(analyser.fftSize)
      }
      analyser.getByteTimeDomainData(data)

      context.clearRect(0, 0, width, height)
      const bars = Math.max(24, Math.floor(width / 5))
      const gap = width / bars
      const step = Math.max(1, Math.floor(data.length / bars))

      for (let index = 0; index < bars; index += 1) {
        const sample = data[index * step] ?? 128
        const normalized = Math.abs((sample - 128) / 128)
        const barHeight = Math.max(1.5, Math.min(height - 5, normalized * height * 2.8))
        const alpha = 0.32 + normalized * 0.48
        context.fillStyle = `rgba(137, 158, 188, ${alpha.toFixed(3)})`
        context.fillRect(
          index * gap + gap / 2 - 0.75,
          height / 2 - barHeight / 2,
          1.5,
          barHeight,
        )
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    raf = requestAnimationFrame(draw)
    const observer = new ResizeObserver(() => {
      resize()
      // Resizing a canvas resets its bitmap. Repaint the idle baseline immediately;
      // while listening, the active animation loop handles the next frame.
      if (!active || !analyser) {
        const rect = canvas.getBoundingClientRect()
        drawIdle(rect.width, rect.height, paused)
      }
    })
    observer.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [active, analyser, paused])

  return (
    <canvas
      ref={canvasRef}
      className={cn('h-[30px] w-[154px]', className)}
      aria-hidden="true"
    />
  )
}
