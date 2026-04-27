<script setup lang="ts">
import { useRoute } from 'vue-router'
import BookingPage from '@/components/booking/BookingPage.vue'

const route = useRoute()
const token = route.params.token as string
</script>

<template>
  <div class="booking-public-shell">
    <BookingPage :token="token" />
  </div>
</template>

<style scoped>
.booking-public-shell {
  min-height: 100vh;
  background: #f4f6fa;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
@media (prefers-color-scheme: dark) {
  .booking-public-shell { background: #0b1220; color: #e2e8f0; }
}
@media (max-width: 640px) {
  .booking-public-shell { padding: 0; }
}
</style>
