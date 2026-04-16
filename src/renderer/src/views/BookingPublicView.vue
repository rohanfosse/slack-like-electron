/**
 * BookingPublicView.vue — Public booking page shell.
 * No sidebar, no auth required. Full-page standalone layout.
 */
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
  background: #f8fafc;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 16px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

@media (prefers-color-scheme: dark) {
  .booking-public-shell { background: #0f172a; color: #e2e8f0; }
}
</style>
