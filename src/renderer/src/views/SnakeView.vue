/**
 * SnakeView — mini-jeu Snake classique. 20x15 grille, serpent grandit en
 * mangeant les pommes, game over sur mur ou self-collision.
 *
 * Score : 10 pts par pomme + 1 pt par tick de survie. Vitesse augmente
 * tous les 5 pommes (tick 120ms -> 60ms minimum).
 *
 * Controles : fleches OU ZQSD (mappage AZERTY et QWERTY) + espace pour
 * demarrer / rejouer. Esc : retour dashboard.
 */
<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Play, RotateCw, Trophy, Sparkles } from 'lucide-vue-next'
import { useArcadeGame } from '@/composables/useArcadeGame'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()
const game = useArcadeGame('snake')

// ── Config ────────────────────────────────────────────────────────────────
const GRID_W = 20
const GRID_H = 15
const CELL   = 28 // pixels
const TICK_INITIAL = 140
const TICK_MIN     = 60
const TICK_STEP    = 8    // ms retires tous les N food

// ── Etat du jeu ───────────────────────────────────────────────────────────
type Dir = 'up' | 'down' | 'left' | 'right'
interface Cell { x: number; y: number }

const snake     = ref<Cell[]>([])
const direction = ref<Dir>('right')
const queuedDir = ref<Dir | null>(null)
const food      = ref<Cell>({ x: 10, y: 7 })
const gameOverReason = ref<string | null>(null)

let tickInterval: ReturnType<typeof setInterval> | null = null
let currentTickMs = TICK_INITIAL
let foodEaten = 0

const canvasRef = ref<HTMLCanvasElement | null>(null)

// ── Init / Reset ──────────────────────────────────────────────────────────
function initSnake() {
  const cx = Math.floor(GRID_W / 2)
  const cy = Math.floor(GRID_H / 2)
  snake.value = [
    { x: cx,     y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]
  direction.value = 'right'
  queuedDir.value = null
  foodEaten = 0
  currentTickMs = TICK_INITIAL
  placeFood()
  gameOverReason.value = null
}

function placeFood() {
  const occupied = new Set(snake.value.map((c) => `${c.x},${c.y}`))
  let x, y
  do {
    x = Math.floor(Math.random() * GRID_W)
    y = Math.floor(Math.random() * GRID_H)
  } while (occupied.has(`${x},${y}`))
  food.value = { x, y }
}

function startGame() {
  initSnake()
  game.startRun()
  startLoop()
  nextTick(() => canvasRef.value?.focus())
}

function startLoop() {
  stopLoop()
  tickInterval = setInterval(doTick, currentTickMs)
}

function stopLoop() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
}

function doTick() {
  if (game.state.value !== 'playing') return
  game.tick()

  // Applique la direction en queue (debounce virages opposes dans le meme tick)
  if (queuedDir.value) {
    direction.value = queuedDir.value
    queuedDir.value = null
  }

  const head = snake.value[0]
  const next: Cell = { x: head.x, y: head.y }
  if (direction.value === 'up')    next.y -= 1
  if (direction.value === 'down')  next.y += 1
  if (direction.value === 'left')  next.x -= 1
  if (direction.value === 'right') next.x += 1

  // Collision mur
  if (next.x < 0 || next.x >= GRID_W || next.y < 0 || next.y >= GRID_H) {
    return gameOver('Mur')
  }
  // Collision self
  if (snake.value.some((c) => c.x === next.x && c.y === next.y)) {
    return gameOver('Toi-meme')
  }

  const ateFood = next.x === food.value.x && next.y === food.value.y
  const newBody = [next, ...snake.value]
  if (!ateFood) newBody.pop()
  else {
    foodEaten++
    game.addScore(10)
    placeFood()
    // Accelere tous les 5 pommes
    if (foodEaten % 5 === 0) {
      currentTickMs = Math.max(TICK_MIN, currentTickMs - TICK_STEP)
      startLoop()
    }
  }
  snake.value = newBody
  game.addScore(1) // survival bonus

  render()
}

function gameOver(reason: string) {
  gameOverReason.value = reason
  stopLoop()
  game.endRun({ foodEaten, finalLength: snake.value.length })
}

// ── Rendu canvas ──────────────────────────────────────────────────────────
function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.fillStyle = '#0a0e1a'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Grille subtile
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth = 1
  for (let i = 1; i < GRID_W; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, GRID_H * CELL); ctx.stroke()
  }
  for (let j = 1; j < GRID_H; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(GRID_W * CELL, j * CELL); ctx.stroke()
  }

  // Food (pomme avec halo)
  const fx = food.value.x * CELL + CELL / 2
  const fy = food.value.y * CELL + CELL / 2
  const gradient = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL * 0.8)
  gradient.addColorStop(0, '#ef4444')
  gradient.addColorStop(0.5, 'rgba(239,68,68,0.3)')
  gradient.addColorStop(1, 'rgba(239,68,68,0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(fx, fy, CELL * 0.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(fx, fy, CELL * 0.35, 0, Math.PI * 2)
  ctx.fill()

  // Serpent (gradient tete->queue)
  snake.value.forEach((c, i) => {
    const progress = i / Math.max(1, snake.value.length)
    const hue = 200 - progress * 40 // bleu tete, violet queue
    ctx.fillStyle = i === 0 ? `hsl(${hue}, 80%, 65%)` : `hsl(${hue}, 60%, ${55 - progress * 15}%)`
    const pad = i === 0 ? 2 : 3
    ctx.fillRect(c.x * CELL + pad, c.y * CELL + pad, CELL - pad * 2, CELL - pad * 2)
    // Yeux sur la tete
    if (i === 0) {
      ctx.fillStyle = '#0a0e1a'
      const eyeOffset = 6
      const cx = c.x * CELL + CELL / 2
      const cy = c.y * CELL + CELL / 2
      let ex1 = cx, ey1 = cy, ex2 = cx, ey2 = cy
      if (direction.value === 'right')      { ex1 += eyeOffset; ex2 = ex1; ey1 -= eyeOffset; ey2 += eyeOffset }
      else if (direction.value === 'left')  { ex1 -= eyeOffset; ex2 = ex1; ey1 -= eyeOffset; ey2 += eyeOffset }
      else if (direction.value === 'up')    { ey1 -= eyeOffset; ey2 = ey1; ex1 -= eyeOffset; ex2 += eyeOffset }
      else                                  { ey1 += eyeOffset; ey2 = ey1; ex1 -= eyeOffset; ex2 += eyeOffset }
      ctx.beginPath(); ctx.arc(ex1, ey1, 2, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(ex2, ey2, 2, 0, Math.PI * 2); ctx.fill()
    }
  })
}

// ── Input ─────────────────────────────────────────────────────────────────
function queueDir(dir: Dir) {
  const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }
  if (opposite[dir] === direction.value) return // pas de 180° instantane
  queuedDir.value = dir
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') { router.push('/jeux'); return }
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    if (game.state.value !== 'playing') startGame()
    return
  }
  if (game.state.value !== 'playing') return
  const k = e.key.toLowerCase()
  if (k === 'arrowup'    || k === 'z' || k === 'w') { e.preventDefault(); queueDir('up') }
  if (k === 'arrowdown'  || k === 's')              { e.preventDefault(); queueDir('down') }
  if (k === 'arrowleft'  || k === 'q' || k === 'a') { e.preventDefault(); queueDir('left') }
  if (k === 'arrowright' || k === 'd')              { e.preventDefault(); queueDir('right') }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(async () => {
  await game.refreshLeaderboard()
  await game.refreshMyStats()
  initSnake()
  render()
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  stopLoop()
  window.removeEventListener('keydown', onKeydown)
})

// ── Derivees ──────────────────────────────────────────────────────────────
const allTimeBest = computed(() => game.myStats.value?.allTime.bestScore ?? 0)
const isPersonalBest = computed(() =>
  game.state.value === 'done' && game.lastResult.value != null && game.lastResult.value.score > allTimeBest.value,
)
const currentRank = computed(() => {
  if (!appStore.currentUser) return null
  return game.leaderboard.value.find((e) => e.name === appStore.currentUser?.name)?.rank ?? null
})
</script>

<template>
  <div class="snake-layout" tabindex="-1">
    <header class="s-header">
      <button class="s-icon-btn" @click="router.push('/jeux')" aria-label="Retour aux jeux">
        <ArrowLeft :size="18" />
      </button>
      <span class="s-brand">Snake</span>
      <span class="s-spacer" />
      <div class="s-score-chip">
        <span class="s-score-label">Score</span>
        <span class="s-score-value">{{ game.score.value }}</span>
      </div>
    </header>

    <main class="s-main">
      <section class="s-stage">
        <div class="s-canvas-wrap">
          <canvas
            ref="canvasRef"
            :width="GRID_W * CELL"
            :height="GRID_H * CELL"
            class="s-canvas"
            tabindex="0"
            aria-label="Grille de jeu Snake"
          />

          <!-- Idle overlay -->
          <div v-if="game.state.value === 'idle'" class="s-overlay">
            <h2>Snake</h2>
            <p>Fleches ou ZQSD pour bouger. Mange les pommes.</p>
            <button class="s-btn-primary" @click="startGame">
              <Play :size="16" /> Jouer <kbd>Espace</kbd>
            </button>
          </div>

          <!-- Game over overlay -->
          <div v-if="game.state.value === 'done' && game.lastResult.value" class="s-overlay s-overlay--done">
            <div v-if="isPersonalBest" class="s-pb">
              <Sparkles :size="14" /> Record personnel
            </div>
            <h2 class="s-over-title">Game over</h2>
            <p class="s-over-reason">Contact : {{ gameOverReason }}</p>
            <div class="s-over-score">
              {{ game.lastResult.value.score }} <span>pts</span>
            </div>
            <div class="s-over-meta">
              <span>{{ snake.length }} cellules</span>
              <span v-if="currentRank">· #{{ currentRank }} du jour</span>
            </div>
            <button class="s-btn-primary" @click="startGame">
              <RotateCw :size="16" /> Rejouer <kbd>Espace</kbd>
            </button>
          </div>
        </div>

        <p class="s-help">
          <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> ou <kbd>ZQSD</kbd> ·
          <kbd>Espace</kbd> demarrer · <kbd>Esc</kbd> quitter
        </p>
      </section>

      <!-- Leaderboard lateral -->
      <aside class="s-leaderboard">
        <h3><Trophy :size="12" /> Aujourd'hui</h3>
        <ol v-if="game.leaderboard.value.length" class="s-lb-list">
          <li
            v-for="e in game.leaderboard.value.slice(0, 10)"
            :key="e.rank"
            :class="{
              'is-me':   e.name === appStore.currentUser?.name,
              'is-gold': e.rank === 1,
              'is-silver': e.rank === 2,
              'is-bronze': e.rank === 3,
            }"
          >
            <span class="s-lb-rank">{{ e.rank }}</span>
            <span class="s-lb-name">{{ e.name }}</span>
            <span class="s-lb-score">{{ e.bestScore }}</span>
          </li>
        </ol>
        <p v-else class="s-lb-empty">Sois le premier a jouer.</p>
      </aside>
    </main>
  </div>
</template>

<style scoped>
.snake-layout {
  display: flex; flex-direction: column;
  height: 100%; overflow: hidden;
  background: radial-gradient(ellipse at top, rgba(59, 130, 246, .1), transparent 60%), var(--bg-canvas);
  outline: none;
}

.s-header {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 20px; height: 56px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.s-icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 6px;
  border: none; background: transparent; color: var(--text-secondary);
  cursor: pointer; transition: background .12s;
}
.s-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

.s-brand { font-size: 13px; font-weight: 800; letter-spacing: .5px; text-transform: uppercase; color: var(--text-primary); }
.s-spacer { flex: 1; }

.s-score-chip {
  display: inline-flex; align-items: baseline; gap: 6px;
  padding: 4px 14px; border-radius: 999px;
  background: var(--accent-subtle); color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.s-score-label { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700; }
.s-score-value { font-family: var(--font-mono, ui-monospace, monospace); font-size: 16px; font-weight: 800; }

.s-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 20px;
  padding: 20px 24px 24px;
  min-height: 0;
  overflow: hidden;
}

.s-stage {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 14px;
}

.s-canvas-wrap {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,.25);
}

.s-canvas {
  display: block;
  outline: none;
  max-width: 100%;
  height: auto;
}

.s-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(10, 14, 26, .85);
  backdrop-filter: blur(4px);
  color: #fff;
  text-align: center;
  padding: 20px;
}
.s-overlay h2 {
  font-size: 32px; font-weight: 800; margin: 0;
  font-family: var(--font-mono, ui-monospace, monospace);
  letter-spacing: -.5px;
}
.s-overlay p { margin: 0; color: rgba(255,255,255,.7); font-size: 13px; }

.s-pb {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 12px; border-radius: 999px;
  background: linear-gradient(90deg, #eab308, #f59e0b);
  color: #1a1a1a; font-size: 11px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .3px;
}
.s-over-title { color: var(--color-danger) !important; }
.s-over-reason { font-style: italic; }
.s-over-score {
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 56px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: -2px;
  line-height: 1;
  margin: 4px 0;
}
.s-over-score span { font-size: 14px; color: var(--text-muted); letter-spacing: 1px; text-transform: uppercase; margin-left: 4px; }
.s-over-meta {
  display: flex; gap: 10px;
  font-size: 12px; color: rgba(255,255,255,.6);
}

.s-btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 22px;
  background: var(--accent); color: #fff;
  border: none; border-radius: 10px;
  font-size: 14px; font-weight: 700; font-family: var(--font);
  cursor: pointer; transition: filter .12s, transform .06s;
  margin-top: 6px;
}
.s-btn-primary:hover { filter: brightness(1.1); }
.s-btn-primary:active { transform: translateY(1px); }
.s-btn-primary kbd {
  background: rgba(255,255,255,.18);
  border: 1px solid rgba(255,255,255,.2);
  color: #fff;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-family: var(--font-mono, monospace);
}

.s-help {
  font-size: 11px; color: var(--text-muted); text-align: center; margin: 0;
}
.s-help kbd {
  display: inline-block;
  padding: 1px 6px;
  margin: 0 1px;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  color: var(--text-secondary);
  background: var(--bg-elevated);
}

/* Leaderboard ──────────────────────────────────────────────────────────── */
.s-leaderboard {
  background: var(--bg-sidebar);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px;
  display: flex; flex-direction: column; gap: 8px;
  min-height: 0; overflow: auto;
}
.s-leaderboard h3 {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 800;
  text-transform: uppercase; letter-spacing: .5px;
  color: var(--text-secondary);
  margin: 0 0 4px;
}
.s-lb-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 3px; }
.s-lb-list li {
  display: grid; grid-template-columns: 22px 1fr auto;
  align-items: center; gap: 8px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 12px; color: var(--text-secondary);
}
.s-lb-list li:hover { background: var(--bg-hover); }
.s-lb-list li.is-me { background: var(--accent-subtle); color: var(--accent); font-weight: 700; }
.s-lb-rank { font-weight: 800; text-align: center; font-variant-numeric: tabular-nums; color: var(--text-muted); }
.is-gold   .s-lb-rank { color: #eab308; }
.is-silver .s-lb-rank { color: #94a3b8; }
.is-bronze .s-lb-rank { color: #c2884d; }
.s-lb-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-lb-score { font-family: var(--font-mono, monospace); font-weight: 800; font-variant-numeric: tabular-nums; }
.s-lb-empty { margin: 0; padding: 12px; color: var(--text-muted); font-size: 11px; font-style: italic; text-align: center; }

@media (max-width: 900px) {
  .s-main { grid-template-columns: 1fr; }
  .s-leaderboard { max-height: 200px; }
}
</style>
