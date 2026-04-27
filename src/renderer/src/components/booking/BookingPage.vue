<script setup lang="ts">
/**
 * BookingPage.vue — wrapper qui plug le composable usePublicBooking
 * sur le composant partage BookingFlow.
 *
 * Sert /book/:token (lien nominatif) ET /book/e/:slug (lien public ouvert)
 * via la prop `mode`. La logique fetch/etat reste dans le composable ;
 * BookingPage ne fait que cabler les events vers les actions du composable.
 *
 * En mode public ouvert, le composable charge plus large (toutes les semaines
 * dispo via fetchSlots(weekOffset)). On charge plusieurs semaines en parallele
 * a l'arrivee pour que le calendrier mensuel soit utilisable directement.
 */
import { onMounted, computed, ref } from 'vue'
import { usePublicBooking, type PublicBookingMode } from '@/composables/usePublicBooking'
import BookingFlow from '@/components/booking/BookingFlow.vue'
import type { BookingFlowInfo } from '@/components/booking/bookingFlow.types'

const props = withDefaults(defineProps<{ token: string; mode?: PublicBookingMode }>(), {
  mode: 'token',
})

const TURNSTILE_SITE_KEY = (import.meta.env?.VITE_TURNSTILE_SITE_KEY as string | undefined) || ''

const {
  eventInfo, slots, selectedSlot, step,
  loading, error, errorCode, bookingResult,
  fetchEventInfo, fetchSlotsRange, selectSlot, backToCalendar, bookSlot,
  icsUrl,
} = usePublicBooking(props.token, props.mode)

const submitting = ref(false)

/** Convertit BookingEventInfo en BookingFlowInfo (renomme les champs). */
const flowInfo = computed<BookingFlowInfo | null>(() => {
  if (!eventInfo.value) return null
  return {
    title: eventInfo.value.eventTitle,
    description: eventInfo.value.description,
    durationMinutes: eventInfo.value.durationMinutes,
    color: eventInfo.value.color,
    hostName: eventInfo.value.teacherName,
    timezone: eventInfo.value.timezone,
    attendeeName: eventInfo.value.studentName ?? null,
    // Email pas pre-rempli en mode token (le visiteur est le tuteur entreprise)
    // ni en mode event (visiteur inconnu). On laisse vide.
    attendeeEmail: null,
    withTutor: false,
  }
})

const flowResult = computed(() => {
  if (!bookingResult.value) return null
  return {
    startDatetime: bookingResult.value.startDatetime,
    endDatetime: bookingResult.value.endDatetime,
    joinUrl: bookingResult.value.teamsJoinUrl,
  }
})

const captchaSiteKey = computed(() => props.mode === 'event' ? TURNSTILE_SITE_KEY : '')

async function onSubmit(payload: { attendeeName: string; attendeeEmail: string; tutorName?: string; tutorEmail?: string; captchaToken?: string }) {
  submitting.value = true
  await bookSlot(payload.attendeeName, payload.attendeeEmail, payload.captchaToken)
  submitting.value = false
}

onMounted(async () => {
  await fetchEventInfo()
  if (eventInfo.value) await fetchSlotsRange(8)
})
</script>

<template>
  <BookingFlow
    :info="flowInfo"
    :slots="slots"
    :selected-slot="selectedSlot"
    :step="step"
    :loading="loading"
    :error="error"
    :error-code="errorCode"
    :result="flowResult"
    :ics-url="icsUrl()"
    :captcha-site-key="captchaSiteKey"
    :attendee-identified="false"
    :submitting="submitting"
    @select-slot="selectSlot"
    @back-to-calendar="backToCalendar"
    @submit-details="onSubmit"
  />
</template>
