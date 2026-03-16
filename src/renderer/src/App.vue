<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore }    from '@/stores/app'
  import { useModalsStore } from '@/stores/modals'
  import Toast    from '@/components/ui/Toast.vue'
  import NavRail  from '@/components/layout/NavRail.vue'
  import Sidebar  from '@/components/sidebar/Sidebar.vue'
  import LoginOverlay from '@/components/auth/LoginOverlay.vue'
  // Modales
  import CmdPalette           from '@/components/modals/CmdPalette.vue'
  import SettingsModal        from '@/components/modals/SettingsModal.vue'
  import CreateChannelModal   from '@/components/modals/CreateChannelModal.vue'
  import NewTravailModal      from '@/components/modals/NewTravailModal.vue'
  import DepotsModal          from '@/components/modals/DepotsModal.vue'
  import SuiviModal           from '@/components/modals/SuiviModal.vue'
  import GestionDevoirModal   from '@/components/modals/GestionDevoirModal.vue'
  import RessourcesModal      from '@/components/modals/RessourcesModal.vue'
  import TimelineModal        from '@/components/modals/TimelineModal.vue'
  import EcheancierModal      from '@/components/modals/EcheancierModal.vue'
  import DocumentPreviewModal from '@/components/modals/DocumentPreviewModal.vue'

  const appStore = useAppStore()
  const modals   = useModalsStore()
  const router   = useRouter()

  let unsubUnread: (() => void) | null = null

  onMounted(() => {
    // Restaurer la session depuis localStorage
    const restored = appStore.restoreSession()
    if (restored) router.replace('/messages')

    // Écouter les messages temps-réel (IPC push)
    unsubUnread = appStore.initUnreadListener()
  })

  onUnmounted(() => { unsubUnread?.() })
</script>

<template>
  <!-- Toast global (accessible depuis n'importe quel composant) -->
  <Toast />

  <!-- Écran de connexion -->
  <LoginOverlay v-if="!appStore.currentUser" />

  <!-- Shell principal (après connexion) -->
  <div v-else id="app-shell" class="app-shell">
    <NavRail />

    <aside class="sidebar-wrapper">
      <Sidebar />
    </aside>

    <main class="main-wrapper">
      <!-- Vue active (messages / travaux / documents) -->
      <RouterView />
    </main>
  </div>

  <!-- Modales globales — montées une fois, visibilité gérée par le store modals -->
  <template v-if="appStore.currentUser">
    <CmdPalette />
    <SettingsModal        v-model="modals.settings"        />
    <CreateChannelModal   v-model="modals.createChannel"   />
    <NewTravailModal      v-model="modals.newTravail"      />
    <DepotsModal          v-model="modals.depots"          />
    <SuiviModal           v-model="modals.suivi"           />
    <GestionDevoirModal   v-model="modals.gestionDevoir"   />
    <RessourcesModal      v-model="modals.ressources"      />
    <TimelineModal        v-model="modals.timeline"        />
    <EcheancierModal      v-model="modals.echeancier"      />
    <DocumentPreviewModal v-model="modals.documentPreview" />
  </template>
</template>

<style>
  /* Styles globaux gérés dans renderer/css/ */
</style>
