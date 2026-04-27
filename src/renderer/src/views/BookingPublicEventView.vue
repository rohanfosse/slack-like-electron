<script setup lang="ts">
import { useRoute } from 'vue-router'
import BookingPage from '@/components/booking/BookingPage.vue'

const route = useRoute()
const slug = route.params.slug as string
</script>

<template>
  <div class="booking-public-shell">
    <BookingPage :token="slug" mode="event" />
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
