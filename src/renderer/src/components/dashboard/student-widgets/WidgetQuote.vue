/**
 * WidgetQuote.vue - Citation inspirante du jour.
 */
<script setup lang="ts">
import { computed } from 'vue'
import { Quote } from 'lucide-vue-next'

const QUOTES = [
  { text: "L'éducation est l'arme la plus puissante pour changer le monde.", author: 'Nelson Mandela' },
  { text: "La persévérance est la noblesse de l'obstination.", author: 'Adrien Decourcelle' },
  { text: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", author: 'Sénèque' },
  { text: "Le succès, c'est tomber sept fois et se relever huit.", author: 'Proverbe japonais' },
  { text: "La seule façon de faire du bon travail, c'est d'aimer ce que vous faites.", author: 'Steve Jobs' },
  { text: "Apprendre sans réfléchir est vain. Réfléchir sans apprendre est dangereux.", author: 'Confucius' },
  { text: "Le savoir est la seule matière qui s'accroît quand on la partage.", author: 'Socrate' },
  { text: "Il n'y a pas de réussite facile ni d'échecs définitifs.", author: 'Marcel Proust' },
  { text: "La curiosité est le moteur de l'accomplissement.", author: 'Ken Robinson' },
  { text: "Chaque expert était autrefois un débutant.", author: 'Helen Hayes' },
  { text: "L'intelligence, ce n'est pas ce que l'on sait mais ce que l'on fait quand on ne sait pas.", author: 'Jean Piaget' },
  { text: "Le courage n'est pas l'absence de peur, mais la capacité de vaincre ce qui fait peur.", author: 'Nelson Mandela' },
  { text: "Un voyage de mille lieues commence toujours par un premier pas.", author: 'Lao Tseu' },
  { text: "La connaissance s'acquiert par l'expérience, tout le reste n'est que de l'information.", author: 'Albert Einstein' },
  { text: "Vis comme si tu devais mourir demain. Apprends comme si tu devais vivre toujours.", author: 'Gandhi' },
]

const todayQuote = computed(() => {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return QUOTES[dayOfYear % QUOTES.length]
})
</script>

<template>
  <div class="dashboard-card sa-card sa-quote">
    <div class="sa-card-header">
      <Quote :size="14" class="sa-card-icon" />
      <span class="sa-section-label">Citation du jour</span>
    </div>
    <div class="sa-quote-body">
      <p class="sa-quote-text">&laquo;&nbsp;{{ todayQuote.text }}&nbsp;&raquo;</p>
      <span class="sa-quote-author">— {{ todayQuote.author }}</span>
    </div>
  </div>
</template>

<style scoped>
.sa-quote-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 0;
}

.sa-quote-text {
  font-size: 12.5px;
  font-style: italic;
  color: var(--text-primary);
  line-height: 1.5;
  margin: 0;
}

.sa-quote-author {
  font-size: 11px;
  color: var(--text-muted);
  text-align: right;
}
</style>
