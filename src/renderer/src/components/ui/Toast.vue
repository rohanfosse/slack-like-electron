<script setup lang="ts">
  import { toastState } from '@/composables/useToast'
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="toastState.visible"
        :id="'app-toast'"
        :class="`toast-${toastState.type}`"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span class="toast-msg">{{ toastState.message }}</span>
        <button
          v-if="toastState.type === 'undo' && toastState.onUndo"
          class="toast-undo-btn"
          @click="toastState.onUndo?.()"
        >
          Annuler
        </button>
        <span class="toast-progress" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  /* Position top-right */
  #app-toast {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 10000;
    overflow: hidden;
  }

  .toast-enter-active {
    transition: opacity 0.25s ease, transform 0.25s cubic-bezier(.34,1.56,.64,1);
  }
  .toast-leave-active {
    transition: opacity 0.18s ease, transform 0.18s ease;
  }
  .toast-enter-from {
    opacity: 0;
    transform: translateX(30px);
  }
  .toast-leave-to {
    opacity: 0;
    transform: translateX(20px);
  }

  /* Progress bar */
  .toast-progress {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    background: rgba(255,255,255,.35);
    border-radius: 0 1px 0 0;
    animation: toast-timer 4s linear forwards;
  }
  .toast-undo ~ .toast-progress,
  [class*="toast-undo"] .toast-progress {
    animation-duration: 5s;
  }
  @keyframes toast-timer {
    from { width: 100%; }
    to   { width: 0%; }
  }
</style>
