/**
 * BookingPage.vue — 3-step public booking flow for tutors.
 * Step 1: Calendar slot picker
 * Step 2: Details form (tutor name + email)
 * Step 3: Confirmation (Teams link, .ics download, cancel link)
 */
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue'
import { Calendar, Clock, User, Mail, ChevronLeft, ChevronRight, Check, Video, Download, ArrowLeft, Copy, CalendarPlus } from 'lucide-vue-next'
import { usePublicBooking, type BookingSlot, type PublicBookingMode } from '@/composables/usePublicBooking'
import { useContextMenu } from '@/composables/useContextMenu'
import ContextMenu, { type ContextMenuItem } from '@/components/ui/ContextMenu.vue'

// ── Cloudflare Turnstile (anti-spam) ─────────────────────────────────────────
// Si VITE_TURNSTILE_SITE_KEY est vide, on n'affiche pas de captcha (mode dev,
// ou le backend n'a pas configure TURNSTILE_SECRET_KEY non plus).
const TURNSTILE_SITE_KEY = (import.meta.env?.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  reset: (id?: string) => void
  remove: (id?: string) => void
}
declare global {
  interface Window { turnstile?: TurnstileApi }
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (document.querySelector('script[data-cf-turnstile]')) {
    return new Promise((resolve) => {
      const tick = () => (window.turnstile ? resolve() : setTimeout(tick, 50))
      tick()
    })
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.dataset.cfTurnstile = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('turnstile_load_failed'))
    document.head.appendChild(s)
  })
}

const props = withDefaults(defineProps<{ token: string; mode?: PublicBookingMode }>(), {
  mode: 'token',
})

const {
  eventInfo, slots, weekStart, selectedSlot, step,
  loading, error, errorCode, bookingResult,
  slotsByDate,
  fetchEventInfo, fetchSlots, selectSlot, backToCalendar, bookSlot,
  icsUrl,
} = usePublicBooking(props.token, props.mode)

// Titre humain pour l'ecran d'erreur, fonction du code backend.
const errorTitle = computed(() => {
  switch (errorCode.value) {
    case 'closed':       return 'Reservations fermees'
    case 'inactive':     return 'Type de rendez-vous indisponible'
    case 'not_found':    return 'Lien introuvable'
    case 'invalid_link': return 'Lien invalide'
    default:             return 'Lien invalide'
  }
})

const weekOffset = ref(0)
const tutorName = ref('')
const tutorEmail = ref('')
const submitting = ref(false)

// Captcha (uniquement en mode 'event' = lien public ouvert).
const captchaEnabled = computed(() => props.mode === 'event' && !!TURNSTILE_SITE_KEY)
const captchaRef = ref<HTMLDivElement | null>(null)
const captchaToken = ref('')
const captchaError = ref('')
let captchaWidgetId: string | undefined

async function mountCaptcha() {
  if (!captchaEnabled.value || !captchaRef.value) return
  try {
    await loadTurnstileScript()
  } catch {
    captchaError.value = 'Impossible de charger la verification anti-spam.'
    return
  }
  if (!window.turnstile || !captchaRef.value) return
  // Nettoie un eventuel widget precedent (ex: passage details -> calendrier -> details)
  if (captchaWidgetId) {
    try { window.turnstile.remove(captchaWidgetId) } catch { /* ignore */ }
    captchaWidgetId = undefined
  }
  captchaWidgetId = window.turnstile.render(captchaRef.value, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: (token: string) => { captchaToken.value = token; captchaError.value = '' },
    'error-callback': () => { captchaToken.value = ''; captchaError.value = 'Verification echouee, recommence.' },
    'expired-callback': () => { captchaToken.value = '' },
    theme: 'auto',
    appearance: 'always',
  })
}

watch(() => step.value, async (s) => {
  if (s === 'details' && captchaEnabled.value) {
    captchaToken.value = ''
    captchaError.value = ''
    await nextTick()
    mountCaptcha()
  }
})

// Week days from weekStart
const weekDays = computed(() => {
  if (!weekStart.value) return []
  const start = new Date(weekStart.value + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return {
      iso: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      isToday: d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10),
    }
  })
})

const weekLabel = computed(() => {
  if (!weekDays.value.length) return ''
  const first = weekDays.value[0]
  const last = weekDays.value[6]
  return `${first.day} ${first.month} - ${last.day} ${last.month}`
})

async function prevWeek() {
  if (weekOffset.value <= 0) return
  weekOffset.value--
  await fetchSlots(weekOffset.value)
}

async function nextWeek() {
  if (weekOffset.value >= 12) return
  weekOffset.value++
  await fetchSlots(weekOffset.value)
}

async function onSubmit() {
  if (!tutorName.value.trim() || !tutorEmail.value.trim()) return
  if (captchaEnabled.value && !captchaToken.value) {
    captchaError.value = 'Coche la verification anti-spam ci-dessus.'
    return
  }
  submitting.value = true
  const ok = await bookSlot(tutorName.value.trim(), tutorEmail.value.trim(), captchaToken.value || undefined)
  submitting.value = false
  if (!ok && captchaWidgetId && window.turnstile) {
    // Token consomme cote backend -> reset le widget pour re-verifier.
    try { window.turnstile.reset(captchaWidgetId) } catch { /* ignore */ }
    captchaToken.value = ''
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

onMounted(async () => {
  await fetchEventInfo()
  if (eventInfo.value) await fetchSlots(0)
})

// Toast local car useToast n'est pas dispo dans la vue publique (hors du shell app).
const toastMsg = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
function toast(msg: string) {
  toastMsg.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMsg.value = null }, 2500)
}
onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer)
  if (captchaWidgetId && window.turnstile) {
    try { window.turnstile.remove(captchaWidgetId) } catch { /* ignore */ }
  }
})

const { ctx, open: openCtx, close: closeCtx } = useContextMenu<BookingSlot>()
function buildGoogleCalUrl(s: BookingSlot): string {
  const start = s.start.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = s.end.replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const title = encodeURIComponent(eventInfo.value?.eventTitle ?? 'Rendez-vous')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}`
}
const ctxItems = computed<ContextMenuItem[]>(() => {
  const s = ctx.value?.target
  if (!s) return []
  return [
    { label: 'Réserver ce créneau', icon: Check, action: () => selectSlot(s) },
    { label: 'Copier la date/heure', icon: Copy, separator: true, action: async () => {
      await navigator.clipboard.writeText(`${formatFullDate(s.start)} ${formatTime(s.start)}-${formatTime(s.end)}`)
      toast('Créneau copié.')
    } },
    { label: 'Copier le lien de la page', icon: Copy, action: async () => {
      await navigator.clipboard.writeText(window.location.href)
      toast('Lien copié.')
    } },
    { label: 'Ajouter à Google Calendar', icon: CalendarPlus, separator: true, action: () => {
      window.open(buildGoogleCalUrl(s), '_blank', 'noopener')
    } },
  ]
})
</script>

<template>
  <div class="bp" :style="eventInfo ? { '--accent': eventInfo.color } : {}">
    <!-- Error state -->
    <div v-if="error && !eventInfo" class="bp-error">
      <h2>{{ errorTitle }}</h2>
      <p>{{ error }}</p>
      <p v-if="errorCode === 'closed'" class="bp-error-hint">
        Si tu attendais une reponse de cet enseignant, contacte-le directement.
      </p>
    </div>

    <!-- Loading -->
    <div v-else-if="loading && !eventInfo" class="bp-loading">Chargement...</div>

    <!-- Main content -->
    <template v-else-if="eventInfo">
      <!-- Header -->
      <div class="bp-header">
        <div class="bp-color-bar" />
        <h1 class="bp-title">{{ eventInfo.eventTitle }}</h1>
        <div class="bp-meta">
          <span class="bp-meta-item"><User :size="13" /> {{ eventInfo.teacherName }}</span>
          <span class="bp-meta-item"><Clock :size="13" /> {{ eventInfo.durationMinutes }} min</span>
        </div>
        <p v-if="eventInfo.description" class="bp-desc">{{ eventInfo.description }}</p>
        <p v-if="eventInfo.timezone" class="bp-tz">Horaires affiches en {{ eventInfo.timezone }}</p>
      </div>

      <!-- Step 1: Calendar -->
      <div v-if="step === 'calendar'" class="bp-step">
        <h2 class="bp-step-title">Choisissez un creneau</h2>

        <!-- Week nav -->
        <div class="bp-week-nav">
          <button class="bp-week-btn" :disabled="weekOffset <= 0" aria-label="Semaine precedente" @click="prevWeek">
            <ChevronLeft :size="16" />
          </button>
          <span class="bp-week-label">{{ weekLabel }}</span>
          <button class="bp-week-btn" :disabled="weekOffset >= 12" aria-label="Semaine suivante" @click="nextWeek">
            <ChevronRight :size="16" />
          </button>
        </div>

        <!-- Slot grid -->
        <div class="bp-grid" :class="{ 'bp-grid--loading': loading }">
          <div v-for="d in weekDays" :key="d.iso" class="bp-day" :class="{ 'bp-day--today': d.isToday }">
            <div class="bp-day-header">
              <span class="bp-day-name">{{ d.label }}</span>
              <span class="bp-day-num">{{ d.day }}</span>
            </div>
            <div class="bp-day-slots">
              <button
                v-for="s in (slotsByDate[d.iso] || [])"
                :key="s.start"
                class="bp-slot"
                @click="selectSlot(s)"
                @contextmenu="openCtx($event, s)"
              >
                {{ s.time }}
              </button>
              <span v-if="!(slotsByDate[d.iso] || []).length" class="bp-no-slots">-</span>
            </div>
          </div>
        </div>

        <div v-if="!loading && slots.length === 0" class="bp-empty">
          Aucun creneau disponible cette semaine. Essayez la semaine suivante.
        </div>
      </div>

      <!-- Step 2: Details -->
      <div v-else-if="step === 'details'" class="bp-step">
        <button class="bp-back" @click="backToCalendar">
          <ArrowLeft :size="14" /> Changer de creneau
        </button>

        <div class="bp-selected-slot">
          <Calendar :size="16" />
          <span>{{ selectedSlot ? formatFullDate(selectedSlot.start) : '' }}</span>
          <Clock :size="16" />
          <span>{{ selectedSlot ? `${formatTime(selectedSlot.start)} - ${formatTime(selectedSlot.end)}` : '' }}</span>
        </div>

        <h2 class="bp-step-title">Vos coordonnees</h2>

        <form class="bp-form" @submit.prevent="onSubmit">
          <div class="bp-field">
            <label class="bp-label" for="bp-name"><User :size="12" /> Nom</label>
            <input
              id="bp-name"
              v-model="tutorName"
              class="bp-input"
              :placeholder="mode === 'event' ? 'Prenom Nom' : 'Prenom Nom'"
              autocomplete="name"
              required
              maxlength="200"
            />
          </div>
          <div class="bp-field">
            <label class="bp-label" for="bp-email"><Mail :size="12" /> Email</label>
            <input
              id="bp-email"
              v-model="tutorEmail"
              class="bp-input"
              type="email"
              :placeholder="mode === 'event' ? 'prenom.nom@exemple.fr' : 'email@entreprise.com'"
              autocomplete="email"
              required
            />
          </div>
          <div v-if="captchaEnabled" class="bp-captcha">
            <div ref="captchaRef" />
            <p v-if="captchaError" class="bp-form-error">{{ captchaError }}</p>
          </div>
          <p v-if="error" class="bp-form-error">{{ error }}</p>
          <button
            class="bp-submit"
            type="submit"
            :disabled="submitting || !tutorName.trim() || !tutorEmail.trim() || (captchaEnabled && !captchaToken)"
          >
            <Check :size="16" />
            {{ submitting ? 'Reservation...' : 'Confirmer le rendez-vous' }}
          </button>
        </form>
      </div>

      <!-- Step 3: Confirmation -->
      <div v-else-if="step === 'confirmation' && bookingResult" class="bp-step bp-confirmation">
        <div class="bp-success-icon">
          <Check :size="32" />
        </div>
        <h2 class="bp-step-title">Rendez-vous confirme</h2>
        <p class="bp-conf-detail">
          {{ formatFullDate(bookingResult.startDatetime) }} de
          {{ formatTime(bookingResult.startDatetime) }} a {{ formatTime(bookingResult.endDatetime) }}
        </p>
        <p class="bp-conf-sub">Un email de confirmation a ete envoye a {{ tutorEmail }}.</p>

        <div class="bp-conf-actions">
          <a v-if="bookingResult.teamsJoinUrl" :href="bookingResult.teamsJoinUrl" target="_blank" class="bp-action-btn bp-action-teams">
            <Video :size="16" /> Rejoindre Teams
          </a>
          <a v-if="icsUrl()" :href="icsUrl()!" class="bp-action-btn bp-action-ics">
            <Download :size="16" /> Ajouter au calendrier
          </a>
        </div>
      </div>
    </template>

    <ContextMenu
      v-if="ctx"
      :x="ctx.x"
      :y="ctx.y"
      :items="ctxItems"
      @close="closeCtx"
    />
    <div v-if="toastMsg" class="bp-toast">{{ toastMsg }}</div>
  </div>
</template>

<style scoped>
.bp-toast {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,.85); color: #fff;
  padding: 10px 16px; border-radius: 8px; font-size: 13px;
  z-index: 10000; animation: bp-toast-in .2s ease-out;
}
@keyframes bp-toast-in {
  from { opacity: 0; transform: translate(-50%, 8px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
.bp {
  --accent: #6366f1;
  max-width: 520px; width: 100%;
  background: #fff; border-radius: 16px;
  box-shadow: 0 4px 32px rgba(0,0,0,.08);
  overflow: hidden;
}
@media (prefers-color-scheme: dark) {
  .bp { background: #1e293b; color: #e2e8f0; }
}

/* Header */
.bp-header { padding: 24px 24px 16px; position: relative; }
.bp-color-bar { height: 4px; background: var(--accent); position: absolute; top: 0; left: 0; right: 0; }
.bp-title { font-size: 20px; font-weight: 800; margin: 0 0 8px; color: #111827; }
@media (prefers-color-scheme: dark) { .bp-title { color: #f1f5f9; } }
.bp-meta { display: flex; gap: 16px; font-size: 13px; color: #64748b; }
.bp-meta-item { display: flex; align-items: center; gap: 4px; }
.bp-desc { font-size: 13px; color: #64748b; margin: 8px 0 0; line-height: 1.5; }
.bp-tz { font-size: 11px; color: #94a3b8; margin: 4px 0 0; }

/* Steps */
.bp-step { padding: 0 24px 24px; }
.bp-step-title { font-size: 15px; font-weight: 700; margin: 0 0 12px; color: #111827; }
@media (prefers-color-scheme: dark) { .bp-step-title { color: #f1f5f9; } }

/* Error/Loading */
.bp-error, .bp-loading { padding: 48px 24px; text-align: center; color: #64748b; }
.bp-error h2 { color: #ef4444; font-size: 18px; margin: 0 0 8px; }
.bp-error-hint { font-size: 12px; color: #94a3b8; margin-top: 12px; }

/* Week nav */
.bp-week-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.bp-week-btn {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0;
  background: #fff; color: #64748b; cursor: pointer; transition: all 0.12s;
}
.bp-week-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.bp-week-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.bp-week-label { flex: 1; text-align: center; font-size: 13px; font-weight: 600; color: #374151; text-transform: capitalize; }

/* Slot grid */
.bp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.bp-grid--loading { opacity: 0.5; pointer-events: none; }
.bp-day { display: flex; flex-direction: column; gap: 4px; }
.bp-day--today .bp-day-header { color: var(--accent); }
.bp-day-header { text-align: center; margin-bottom: 4px; }
.bp-day-name { font-size: 11px; font-weight: 600; color: #64748b; text-transform: capitalize; display: block; }
.bp-day-num { font-size: 16px; font-weight: 700; color: #111827; display: block; }
@media (prefers-color-scheme: dark) { .bp-day-num { color: #f1f5f9; } }
.bp-day-slots { display: flex; flex-direction: column; gap: 4px; }
.bp-slot {
  padding: 8px 4px; border-radius: 8px; border: 1px solid #e2e8f0;
  background: #fff; font-size: 12px; font-weight: 600; color: #374151;
  cursor: pointer; transition: all 0.12s; text-align: center;
  font-family: inherit;
}
.bp-slot:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, #fff); color: var(--accent); }
@media (prefers-color-scheme: dark) {
  .bp-slot { background: #334155; border-color: #475569; color: #e2e8f0; }
  .bp-slot:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 15%, #334155); }
}
.bp-no-slots { font-size: 11px; color: #94a3b8; text-align: center; padding: 8px 0; }
.bp-empty { text-align: center; font-size: 13px; color: #94a3b8; padding: 24px 0; }

/* Back button */
.bp-back {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 600; color: #64748b;
  background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 12px;
  font-family: inherit;
}
.bp-back:hover { color: var(--accent); }

/* Selected slot summary */
.bp-selected-slot {
  display: flex; align-items: center; gap: 8px; padding: 12px 16px;
  background: color-mix(in srgb, var(--accent) 8%, #fff); border: 1px solid color-mix(in srgb, var(--accent) 20%, #e2e8f0);
  border-radius: 10px; margin-bottom: 16px;
  font-size: 13px; font-weight: 600; color: var(--accent);
}

/* Form */
.bp-form { display: flex; flex-direction: column; gap: 12px; }
.bp-field { display: flex; flex-direction: column; gap: 4px; }
.bp-label { font-size: 12px; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 4px; }
.bp-input {
  padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 14px; color: #111827; outline: none; transition: border-color 0.15s;
  font-family: inherit;
}
.bp-input:focus { border-color: var(--accent); }
@media (prefers-color-scheme: dark) {
  .bp-input { background: #334155; border-color: #475569; color: #e2e8f0; }
}
.bp-form-error { font-size: 12px; color: #ef4444; margin: 0; }
.bp-captcha { display: flex; flex-direction: column; gap: 6px; align-items: center; min-height: 65px; }
.bp-submit {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px; border-radius: 10px; border: none;
  background: var(--accent); color: #fff; font-size: 14px; font-weight: 700;
  cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.bp-submit:hover:not(:disabled) { filter: brightness(1.1); }
.bp-submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* Confirmation */
.bp-confirmation { text-align: center; padding-top: 24px; }
.bp-success-icon {
  width: 56px; height: 56px; border-radius: 50%; background: #22c55e;
  color: #fff; display: flex; align-items: center; justify-content: center;
  margin: 0 auto 16px;
}
.bp-conf-detail { font-size: 14px; font-weight: 600; color: #374151; margin: 0 0 4px; text-transform: capitalize; }
.bp-conf-sub { font-size: 12px; color: #64748b; margin: 0 0 20px; }
.bp-conf-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.bp-action-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;
  border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;
  transition: all 0.12s; cursor: pointer; font-family: inherit;
}
.bp-action-teams { background: #6366f1; color: #fff; }
.bp-action-teams:hover { filter: brightness(1.1); }
.bp-action-ics { background: #f1f5f9; color: #374151; border: 1px solid #e2e8f0; }
.bp-action-ics:hover { background: #e2e8f0; }

@media (max-width: 480px) {
  .bp-grid { grid-template-columns: repeat(4, 1fr); }
  .bp-header { padding: 20px 16px 12px; }
  .bp-step { padding: 0 16px 20px; }
}
</style>
