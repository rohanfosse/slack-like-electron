/**
 * WidgetGroupMembers.vue - Membres du groupe de l'étudiant pour le projet actif.
 */
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Users } from 'lucide-vue-next'
import { useAppStore } from '@/stores/app'

interface Member {
  id: number
  name: string
}

const appStore = useAppStore()
const members = ref<Member[]>([])
const groupName = ref<string | null>(null)
const loading = ref(false)

async function fetchGroup() {
  const user = appStore.currentUser
  const promoId = appStore.activePromoId ?? user?.promo_id
  if (!user || !promoId) { members.value = []; return }

  loading.value = true
  try {
    const res = await window.api.getGroups(promoId)
    if (!res.ok || !res.data) { members.value = []; return }

    // Find the group that contains the current user
    for (const group of res.data) {
      const membersRes = await window.api.getGroupMembers(group.id)
      if (!membersRes.ok || !membersRes.data) continue
      const memberIds = membersRes.data.map((m) => m.student_id)
      if (memberIds.includes(user.id)) {
        groupName.value = group.name
        // Fetch member names — we only have student_ids so build from profiles
        const mList: Member[] = []
        for (const mid of memberIds) {
          try {
            const profile = await window.api.getStudentProfile(mid)
            if (profile.ok && profile.data) {
              const p = profile.data as { name?: string; id?: number }
              mList.push({ id: mid, name: p.name ?? `Étudiant #${mid}` })
            } else {
              mList.push({ id: mid, name: `Étudiant #${mid}` })
            }
          } catch {
            mList.push({ id: mid, name: `Étudiant #${mid}` })
          }
        }
        members.value = mList
        return
      }
    }
    members.value = []
  } catch {
    members.value = []
  } finally {
    loading.value = false
  }
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')
}

const avatarColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

function avatarColor(index: number): string {
  return avatarColors[index % avatarColors.length]
}

onMounted(fetchGroup)
watch(() => appStore.activeProject, fetchGroup)
</script>

<template>
  <div class="dashboard-card sa-card sa-group">
    <div class="sa-card-header">
      <Users :size="14" class="sa-card-icon sa-icon--group" />
      <span class="sa-section-label">Mon groupe</span>
      <span v-if="groupName" class="sa-group-name">{{ groupName }}</span>
    </div>
    <div v-if="members.length" class="sa-group-list">
      <div v-for="(m, i) in members" :key="m.id" class="sa-group-member">
        <span class="sa-member-avatar" :style="{ background: avatarColor(i) }">{{ initials(m.name) }}</span>
        <span class="sa-member-name">{{ m.name }}</span>
      </div>
    </div>
    <p v-else-if="loading" class="sa-empty">Chargement…</p>
    <p v-else class="sa-empty">Aucun groupe assigné</p>
  </div>
</template>

<style scoped>
.sa-group { border-left: 3px solid var(--color-group, #14b8a6); }
.sa-icon--group { color: var(--color-group, #14b8a6); }

.sa-group-name {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
  opacity: .7;
}

.sa-group-list { display: flex; flex-direction: column; gap: 6px; }

.sa-group-member {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.sa-member-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.sa-member-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sa-empty { font-size: 12px; color: var(--text-muted); margin: 0; opacity: .6; }
</style>
