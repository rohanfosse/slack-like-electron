<script setup lang="ts">
import { useRoute } from 'vue-router'
import BookingPage from '@/components/booking/BookingPage.vue'
import BookingShell from '@/components/booking/BookingShell.vue'

const route = useRoute()
const slug = route.params.slug as string
</script>

<template>
  <BookingShell>
    <BookingPage :token="slug" mode="event" />
  </BookingShell>
</template>
