<script setup lang="ts">
  import { toastState, useToast } from '@/composables/useToast'
  import { AlertTriangle, CheckCircle, Info, X } from 'lucide-vue-next'

  const { dismissToast } = useToast()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="toastState.visible"
        :id="'app-toast'"
        :class="[`toast-${toastState.type}`, { 'toast-has-detail': toastState.detail }]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <!-- Icône contextuelle -->
        <span class="toast-icon">
          <AlertTriangle v-if="toastState.type === 'error'" :size="16" />
          <CheckCircle v-else-if="toastState.type === 'success'" :size="16" />
          <Info v-else :size="16" />
        </span>

        <div class="toast-content">
          <span class="toast-msg">{{ toastState.message }}</span>
          <span v-if="toastState.detail" class="toast-detail">{{ toastState.detail }}</span>
        </div>

        <button
          v-if="toastState.type === 'undo' && toastState.onUndo"
          class="toast-undo-btn"
          @click="toastState.onUndo?.()"
        >
          Annuler
        </button>

        <!-- Bouton fermer (surtout utile pour les erreurs longues) -->
        <button class="toast-close-btn" title="Fermer" @click="dismissToast">
          <X :size="14" />
        </button>

        <span class="toast-progress" :class="{ 'toast-progress--slow': toastState.type === 'error' }" />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  #app-toast {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 10000;
    overflow: hidden;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    font-family: var(--font, sans-serif);
    color: #fff;
    background: #2a2b2d;
    border: 1px solid var(--border);
    box-shadow: 0 8px 28px rgba(0,0,0,.4), 0 0 0 1px rgba(255,255,255,.04) inset;
    max-width: 420px;
    min-width: 280px;
    backdrop-filter: blur(12px);
  }

  .toast-icon { flex-shrink: 0; margin-top: 1px; }

  .toast-content { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .toast-msg { line-height: 1.4; }
  .toast-detail {
    font-size: 11.5px; font-weight: 400; opacity: .75; line-height: 1.35;
  }

  /* Type variants */
  [class~="toast-success"] {
    background: rgba(46,204,113,.15);
    border-color: rgba(46,204,113,.3);
    color: #6fcf97;
  }
  [class~="toast-error"] {
    background: rgba(231,76,60,.18);
    border-color: rgba(231,76,60,.35);
    color: #ff8070;
  }
  [class~="toast-info"] {
    background: rgba(74,144,217,.15);
    border-color: rgba(74,144,217,.3);
    color: #7eb8ff;
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
    flex-shrink: 0;
  }
  .toast-undo-btn:hover { background: var(--bg-hover); }

  .toast-close-btn {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: inherit;
    opacity: .5;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    border-radius: 4px;
    transition: opacity .12s, background .12s;
  }
  .toast-close-btn:hover { opacity: 1; background: rgba(255,255,255,.1); }

  .toast-enter-active {
    transition: opacity var(--motion-base) var(--ease-out),
                transform var(--motion-base) var(--ease-spring);
  }
  .toast-leave-active {
    transition: opacity var(--motion-fast) var(--ease-in),
                transform var(--motion-fast) var(--ease-in);
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
    background: rgba(255,255,255,.3);
    border-radius: 0 1px 0 0;
    animation: toast-timer 4s linear forwards;
  }
  .toast-progress--slow { animation-duration: 8s; }
  .toast-undo ~ .toast-progress,
  [class*="toast-undo"] .toast-progress {
    animation-duration: 5s;
  }
  @keyframes toast-timer {
    from { width: 100%; }
    to   { width: 0%; }
  }
</style>
