/**
 * updater.ts — Auto-updater avec kill switch serveur, canal beta, notification
 * systeme et telemetrie d'adoption.
 *
 * Pipeline au boot (app.isPackaged uniquement) :
 *   1. fetch /api/update/config -> { disabled, minVersion, channel, message, checkEveryMinutes }
 *   2. si disabled=true, on n'arme meme pas l'autoUpdater (kill switch serveur)
 *   3. sinon : configure allowPrerelease selon channel + pref locale beta
 *   4. checkForUpdatesAndNotify + intervalle configurable (min 15 min)
 *   5. a chaque update-downloaded -> notification systeme + entree tray
 *   6. telemetrie : POST anonyme de la version courante (best-effort)
 *
 * Les erreurs reseau sont avalees silencieusement : on ne casse jamais
 * l'app si le serveur de config est injoignable.
 */

import { app, BrowserWindow, Notification, Menu, Tray, ipcMain } from 'electron'
import { autoUpdater, type UpdateInfo } from 'electron-updater'
import { createHash } from 'crypto'

// ── Configuration ────────────────────────────────────────────────────────────

const SERVER_URL: string = process.env.VITE_SERVER_URL || (
  process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : 'https://app.cursus.school'
)

const DEFAULT_CHECK_EVERY_MINUTES = 240 // 4h
const MIN_CHECK_EVERY_MINUTES     = 15
const REMOTE_CONFIG_TIMEOUT_MS    = 5_000

// ── Types ────────────────────────────────────────────────────────────────────

export interface RemoteUpdateConfig {
  disabled: boolean
  minVersion: string | null
  channel: 'stable' | 'beta'
  message: string | null
  checkEveryMinutes: number
}

export interface UpdaterRuntime {
  mainWin: BrowserWindow | null
  tray: Tray | null
  rebuildTrayMenu: () => void
}

// ── Etat interne ─────────────────────────────────────────────────────────────

let updateReady: { version: string; releaseNotes: string | null } | null = null
let checkTimer: NodeJS.Timeout | null = null

export function hasPendingUpdate(): boolean { return updateReady !== null }
export function getPendingUpdate(): typeof updateReady { return updateReady }
export function quitAndInstall(): void {
  if (updateReady) autoUpdater.quitAndInstall()
}

// ── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), REMOTE_CONFIG_TIMEOUT_MS)
  try {
    const res = await fetch(`${SERVER_URL}${path}`, { ...init, signal: ctrl.signal })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function fetchRemoteConfig(): Promise<RemoteUpdateConfig> {
  const fallback: RemoteUpdateConfig = {
    disabled: false,
    minVersion: null,
    channel: 'stable',
    message: null,
    checkEveryMinutes: DEFAULT_CHECK_EVERY_MINUTES,
  }
  const res = await fetchJson<{ ok: boolean; data: RemoteUpdateConfig }>('/api/update/config')
  if (!res?.ok || !res.data) return fallback
  return {
    disabled:          !!res.data.disabled,
    minVersion:        res.data.minVersion || null,
    channel:           res.data.channel === 'beta' ? 'beta' : 'stable',
    message:           res.data.message || null,
    checkEveryMinutes: Math.max(MIN_CHECK_EVERY_MINUTES, Number(res.data.checkEveryMinutes) || DEFAULT_CHECK_EVERY_MINUTES),
  }
}

function anonymousClientHash(): string {
  // Hash deterministe mais non reversible : sert a deduper les pings sans
  // identifier l'utilisateur. On mixe le nom machine + un random persistant
  // serait plus precis mais cote Electron on reste simple et anonyme.
  try {
    const h = createHash('sha256')
    h.update(app.getPath('userData'))
    return h.digest('hex').substring(0, 32)
  } catch {
    return ''
  }
}

async function reportTelemetry(channel: 'stable' | 'beta'): Promise<void> {
  await fetchJson('/api/update/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version:    app.getVersion(),
      platform:   process.platform,
      channel,
      clientHash: anonymousClientHash(),
    }),
  })
}

// ── Preferences locales (beta channel) ───────────────────────────────────────

let userPrefersBeta = false

export function setUserBetaOptIn(enabled: boolean): void { userPrefersBeta = !!enabled }
export function getUserBetaOptIn(): boolean { return userPrefersBeta }

// ── Wiring ───────────────────────────────────────────────────────────────────

function sendToRenderer(runtime: UpdaterRuntime, channel: string, ...args: unknown[]): void {
  const { mainWin } = runtime
  if (mainWin && !mainWin.isDestroyed()) mainWin.webContents.send(channel, ...args)
}

function notifyUpdateReady(version: string): void {
  if (!Notification.isSupported()) return
  try {
    new Notification({
      title: 'Cursus — Mise a jour prete',
      body:  `La version ${version} est telechargee. Redemarrez pour l'appliquer.`,
      silent: false,
    }).show()
  } catch (err) {
    console.warn('[Updater] notification failed:', (err as Error).message)
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise l'auto-updater. A appeler depuis main/index.ts apres createWindow.
 * No-op en dev (app.isPackaged === false).
 */
export async function initUpdater(runtime: UpdaterRuntime): Promise<void> {
  if (!app.isPackaged) {
    console.log('[Updater] dev mode — skipped')
    return
  }

  // Idempotence : si initUpdater est appele 2x (reload, HMR, relogin), les
  // ipcMain handlers s'empileraient et les listeners electron-updater aussi.
  ipcMain.removeAllListeners('updater:quitAndInstall')
  ipcMain.removeHandler('updater:checkNow')
  ipcMain.removeHandler('updater:getRemoteConfig')
  ipcMain.removeHandler('updater:setBetaOptIn')
  autoUpdater.removeAllListeners()

  // 1. Recuperer la config distante (kill switch + channel + intervalle)
  const config = await fetchRemoteConfig()

  if (config.disabled) {
    console.log('[Updater] disabled by remote config — auto-update OFF')
    return
  }

  // 2. Configurer electron-updater
  autoUpdater.autoDownload         = true
  autoUpdater.autoInstallOnAppQuit = true

  // Canal : beta si le serveur l'impose OU si l'utilisateur a opt-in localement.
  const effectiveChannel: 'stable' | 'beta' = (config.channel === 'beta' || userPrefersBeta) ? 'beta' : 'stable'
  autoUpdater.allowPrerelease = effectiveChannel === 'beta'
  autoUpdater.channel         = effectiveChannel === 'beta' ? 'beta' : 'latest'

  console.log('[Updater] init', { channel: effectiveChannel, checkEveryMinutes: config.checkEveryMinutes })

  // 3. Telemetrie best-effort (ne bloque pas)
  reportTelemetry(effectiveChannel).catch(() => {})

  // 4. Evenements
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('[Updater] update available:', info.version)
    sendToRenderer(runtime, 'updater:available', info.version)
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('[Updater] downloaded:', info.version)
    const releaseNotes = typeof info.releaseNotes === 'string' ? info.releaseNotes : null
    updateReady = { version: info.version, releaseNotes }
    sendToRenderer(runtime, 'updater:downloaded', { version: info.version, releaseNotes })
    notifyUpdateReady(info.version)
    runtime.rebuildTrayMenu()
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer(runtime, 'updater:progress', Math.round(progress.percent))
  })

  autoUpdater.on('error', (err) => {
    console.error('[Updater] error:', err.message)
    sendToRenderer(runtime, 'updater:error', err.message)
  })

  // 5. IPC handlers
  ipcMain.on('updater:quitAndInstall', () => { quitAndInstall() })

  ipcMain.handle('updater:checkNow', async () => {
    try {
      // Refresh remote config avant check manuel (kill switch live)
      const fresh = await fetchRemoteConfig()
      if (fresh.disabled) {
        return { ok: true, data: { version: app.getVersion(), available: false, disabled: true, message: fresh.message } }
      }
      const result = await autoUpdater.checkForUpdates()
      if (result?.updateInfo?.version && result.updateInfo.version !== app.getVersion()) {
        return { ok: true, data: { version: result.updateInfo.version, available: true } }
      }
      return { ok: true, data: { version: app.getVersion(), available: false } }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('updater:getRemoteConfig', async () => {
    try {
      const fresh = await fetchRemoteConfig()
      return { ok: true, data: fresh }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('updater:setBetaOptIn', (_evt, enabled: boolean) => {
    setUserBetaOptIn(enabled)
    // Prise d'effet au prochain restart (changer le channel a chaud est fragile)
    return { ok: true, data: { enabled, restartRequired: true } }
  })

  // 6. Check initial + intervalle configurable
  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.warn('[Updater] initial check failed:', err.message)
  })
  const intervalMs = config.checkEveryMinutes * 60 * 1000
  if (checkTimer) clearInterval(checkTimer)
  checkTimer = setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {})
  }, intervalMs)
}

export function stopUpdater(): void {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}
