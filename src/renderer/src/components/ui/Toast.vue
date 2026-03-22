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
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font, sans-serif);
    color: #fff;
    background: #2a2b2d;
    border: 1px solid var(--border);
    box-shadow: 0 6px 20px rgba(0,0,0,.35);
    max-width: 380px;
    backdrop-filter: blur(8px);
  }

  /* Type variants */
  [class~="toast-success"] {
    background: rgba(46,204,113,.15);
    border-color: rgba(46,204,113,.3);
    color: #6fcf97;
  }
  [class~="toast-error"] {
    background: rgba(231,76,60,.15);
    border-color: rgba(231,76,60,.3);
    color: #eb5757;
  }
  [class~="toast-warning"] {
    background: rgba(243,156,18,.15);
    border-color: rgba(243,156,18,.3);
    color: #f2c94c;
  }
  [class~="toast-info"] {
    background: rgba(74,144,217,.15);
    border-color: rgba(74,144,217,.3);
    color: #7eb8ff;
  }

  .toast-msg {
    flex: 1;
    line-height: 1.35;
  }

  .toast-undo-btn {
    font-size: 12px;
    font-weight: 700;
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-active);
    color: #fff;
    cursor: pointer;
    font-family: var(--font, sans-serif);
    transition: background .15s;
  }
  .toast-undo-btn:hover {
    background: var(--bg-active);
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
