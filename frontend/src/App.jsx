import { useEffect, useRef, useCallback } from 'react'
import './App.css'

const W = 480
const H = 640
const CAT_X = 100
const CAT_SIZE = 36
const GRAVITY = 0.45
const FLAP_VY = -9
const PIPE_W = 68
const PIPE_GAP = 160
const PIPE_SPEED = 2.8
const SPAWN_MS = 1800

function App() {
  const canvasRef = useRef(null)
  const game = useRef({
    phase: 'idle',
    catY: H / 2,
    catVY: 0,
    pipes: [],
    score: 0,
    best: 0,
    lastSpawn: -(SPAWN_MS + 1),
  })

  const handleInput = useCallback(() => {
    const g = game.current
    if (g.phase === 'idle' || g.phase === 'dead') {
      g.catY = H / 2
      g.catVY = FLAP_VY
      g.pipes = []
      g.score = 0
      g.lastSpawn = -(SPAWN_MS + 1)
      g.phase = 'playing'
    } else {
      g.catVY = FLAP_VY
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const g = game.current
    let rafId
    let startT = null

    const drawPipe = (x, gapTop) => {
      // Top pipe body
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(x, 0, PIPE_W, gapTop - 24)
      // Top pipe cap
      ctx.fillStyle = '#16a34a'
      ctx.fillRect(x - 6, gapTop - 24, PIPE_W + 12, 24)

      // Bottom pipe cap
      ctx.fillStyle = '#16a34a'
      ctx.fillRect(x - 6, gapTop + PIPE_GAP, PIPE_W + 12, 24)
      // Bottom pipe body
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(x, gapTop + PIPE_GAP + 24, PIPE_W, H - gapTop - PIPE_GAP - 24)
    }

    const drawCat = (y, angle) => {
      ctx.save()
      ctx.translate(CAT_X, y)
      ctx.rotate(angle)
      ctx.font = `${CAT_SIZE}px serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🐱', 0, 0)
      ctx.restore()
    }

    const drawBg = () => {
      const sky = ctx.createLinearGradient(0, 0, 0, H)
      sky.addColorStop(0, '#38bdf8')
      sky.addColorStop(1, '#bae6fd')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, W, H)

      // Ground
      ctx.fillStyle = '#86efac'
      ctx.fillRect(0, H - 50, W, 50)
      ctx.fillStyle = '#4ade80'
      ctx.fillRect(0, H - 50, W, 8)
    }

    const overlay = (alpha) => {
      ctx.fillStyle = `rgba(0,0,0,${alpha})`
      ctx.fillRect(0, 0, W, H)
    }

    const text = (str, x, y, size, color = 'white', bold = false) => {
      ctx.textAlign = 'center'
      ctx.fillStyle = color
      ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui`
      ctx.fillText(str, x, y)
    }

    const tick = (ts) => {
      if (!startT) startT = ts
      const elapsed = ts - startT

      drawBg()

      if (g.phase === 'playing') {
        // Spawn pipes
        if (elapsed - g.lastSpawn >= SPAWN_MS) {
          const gapTop = 80 + Math.random() * (H - PIPE_GAP - 130 - 50)
          g.pipes.push({ x: W, gapTop, scored: false })
          g.lastSpawn = elapsed
        }

        // Physics
        g.catVY += GRAVITY
        g.catY += g.catVY

        // Move & cull pipes
        for (const p of g.pipes) p.x -= PIPE_SPEED
        g.pipes = g.pipes.filter(p => p.x + PIPE_W + 6 > 0)

        // Score
        for (const p of g.pipes) {
          if (!p.scored && p.x + PIPE_W + 6 < CAT_X - CAT_SIZE / 2) {
            p.scored = true
            g.score++
          }
        }

        // Collision detection
        const cx = CAT_X
        const cy = g.catY
        const r = CAT_SIZE / 2 - 6

        const hitBounds = cy + r > H - 50 || cy - r < 0
        let hitPipe = false
        for (const p of g.pipes) {
          const inX = cx + r > p.x - 6 && cx - r < p.x + PIPE_W + 6
          const inY = cy - r < p.gapTop || cy + r > p.gapTop + PIPE_GAP
          if (inX && inY) { hitPipe = true; break }
        }

        if (hitBounds || hitPipe) {
          g.best = Math.max(g.best, g.score)
          g.phase = 'dead'
          if (cy + r > H - 50) g.catY = H - 50 - r
        }
      }

      // Draw pipes
      for (const p of g.pipes) drawPipe(p.x, p.gapTop)

      // Draw cat
      if (g.phase === 'idle') {
        const bobY = H / 2 + Math.sin(elapsed / 500) * 10
        drawCat(bobY, 0)
      } else {
        const angle = Math.min(Math.max(g.catVY * 0.05, -0.45), 0.75)
        drawCat(g.catY, angle)
      }

      // Overlays
      if (g.phase === 'idle') {
        overlay(0.35)
        text('🐱 Flappy Cat', W / 2, H / 2 - 60, 42, 'white', true)
        text('Click or Space to start', W / 2, H / 2 + 10, 20)
        if (g.best > 0) text(`Best: ${g.best}`, W / 2, H / 2 + 46, 18, '#fde68a')

      } else if (g.phase === 'playing') {
        ctx.fillStyle = 'white'
        ctx.font = 'bold 46px system-ui'
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0,0,0,0.4)'
        ctx.shadowBlur = 6
        ctx.fillText(g.score, W / 2, 64)
        ctx.shadowBlur = 0

      } else if (g.phase === 'dead') {
        overlay(0.52)
        text('Game Over 😿', W / 2, H / 2 - 85, 44, 'white', true)
        text(`Score: ${g.score}`, W / 2, H / 2 - 25, 30, 'white', true)
        text(`Best: ${g.best}`, W / 2, H / 2 + 18, 22, '#fde68a')
        text('Click or Space to try again', W / 2, H / 2 + 65, 19)
      }

      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); handleInput() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleInput])

  return (
    <div className="game-wrapper">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="game-canvas"
        onClick={handleInput}
      />
    </div>
  )
}

export default App
