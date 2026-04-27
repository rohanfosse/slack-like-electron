<script setup lang="ts">
/**
 * BookingCampaignView.vue — wrapper qui plug useCampaignBooking sur BookingFlow.
 * Mode "campaign" : l'etudiant est deja identifie via le token, on demande
 * uniquement les coordonnees du tuteur si tripartite.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useCampaignBooking } from '@/composables/useCampaignBooking'
import BookingFlow from '@/components/booking/BookingFlow.vue'
import BookingShell from '@/components/booking/BookingShell.vue'
import type { BookingFlowInfo } from '@/components/booking/bookingFlow.types'

const route = useRoute()
const token = route.params.token as string

const {
  info, selectedSlot, step, loading, error, errorCode, result,
  fetchInfo, fetchSlots, selectSlot, backToCalendar, book,
  slots,
} = useCampaignBooking(token)

const submitting = ref(false)

const flowInfo = computed<BookingFlowInfo | null>(() => {
  if (!info.value) return null
  return {
    title: info.value.campaignTitle,
    description: info.value.description,
    durationMinutes: info.value.durationMinutes,
    color: info.value.color,
    hostName: info.value.teacherName,
    timezone: info.value.timezone,
    attendeeName: info.value.studentName,
    attendeeEmail: info.value.studentEmail,
    withTutor: info.value.withTutor,
  }
})

const flowResult = computed(() => {
  if (!result.value) return null
  return {
    startDatetime: result.value.startDatetime,
    endDatetime: result.value.endDatetime,
    joinUrl: result.value.joinUrl,
    cancelToken: result.value.cancelToken,
  }
})

async function onSubmit(payload: { tutorName?: string; tutorEmail?: string }) {
  if (!info.value) return
  submitting.value = true
  await book({
    tutorName: info.value.withTutor ? payload.tutorName : undefined,
    tutorEmail: info.value.withTutor ? payload.tutorEmail : undefined,
  })
  submitting.value = false
}

onMounted(async () => {
  await fetchInfo()
  if (info.value && !result.value) await fetchSlots()
})
</script>

<template>
  <BookingShell>
    <BookingFlow
      :info="flowInfo"
      :slots="slots"
      :selected-slot="selectedSlot"
      :step="step"
      :loading="loading"
      :error="error"
      :error-code="errorCode"
      :result="flowResult"
      :ics-url="null"
      :captcha-site-key="''"
      :attendee-identified="true"
      :submitting="submitting"
      @select-slot="selectSlot"
      @back-to-calendar="backToCalendar"
      @submit-details="onSubmit"
    />
  </BookingShell>
</template>
