/**
 * Shim retro-compatible : delegue au store Pinia useScheduledStore.
 * Garde l'API existante (items/pendingCount/load/create/update/remove).
 */
import { useScheduledStore } from '@/stores/scheduled'

export type { ScheduledMessage, SchedulePayload } from '@/stores/scheduled'

export function useScheduledMessages() {
  return useScheduledStore()
}
