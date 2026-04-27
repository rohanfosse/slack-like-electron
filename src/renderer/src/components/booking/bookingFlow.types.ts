/**
 * Types partages entre BookingFlow.vue et ses wrappers
 * (BookingPage.vue, BookingCampaignView.vue).
 *
 * Place dans un module separe car Vue SFC `script setup` n'expose pas
 * les types declares a l'interieur — il faut un fichier .ts pour
 * `import type { ... }` propre.
 */

export interface BookingFlowSlot {
  start: string
  end: string
  date: string
  time: string
}

export interface BookingFlowInfo {
  title: string
  description?: string | null
  durationMinutes: number
  color: string
  hostName: string
  timezone?: string | null
  /** Pre-rempli si token nominatif ou campagne. Vide si lien public ouvert. */
  attendeeName?: string | null
  attendeeEmail?: string | null
  /** Si true, le formulaire demande nom + email du tuteur entreprise. */
  withTutor?: boolean
}

export interface BookingFlowResult {
  startDatetime: string
  endDatetime: string
  joinUrl?: string | null
  cancelToken?: string | null
}

export interface BookingFlowSubmitPayload {
  attendeeName: string
  attendeeEmail: string
  tutorName?: string
  tutorEmail?: string
  captchaToken?: string
}
