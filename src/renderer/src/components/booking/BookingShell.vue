<script setup lang="ts">
/**
 * BookingShell.vue — coque visuelle partagee entre les 3 vues publiques de
 * reservation (token nominatif, lien public ouvert, campagne tripartite).
 *
 * Centralise le fond de page, le centrage, le padding responsive et la prise
 * en charge du dark mode via `prefers-color-scheme`. Les vues filles ne font
 * que rendre BookingFlow dans le slot par defaut.
 *
 * Note : ces 3 pages tournent en mode public (sans le shell de l'app
 * Electron / dashboard), d'ou le besoin d'un fond dedie sans dependance aux
 * tokens du theme app.
 */
</script>

<template>
  <div class="booking-public-shell">
    <slot />
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
