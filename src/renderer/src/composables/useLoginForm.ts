/**
 * useLoginForm : state + submit pour l'ecran de connexion. Gere le
 * remember-me (localStorage, expire apres 7 jours) et appelle appStore.login
 * + router.replace('/dashboard') sur succes.
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { STORAGE_KEYS } from '@/constants'
import type { LoginResponse } from '@/types'

const REMEMBER_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function useLoginForm() {
  const appStore = useAppStore()
  const router = useRouter()

  const email = ref('')
  const password = ref('')
  const loginErr = ref('')
  const submitting = ref(false)
  const showPwd = ref(false)
  const rememberMe = ref(!!localStorage.getItem(STORAGE_KEYS.REMEMBER_TOKEN))

  // Auto-fill email depuis la session memorisee (7 jours max)
  onMounted(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REMEMBER_TOKEN)
      if (raw) {
        const { email: savedEmail, ts } = JSON.parse(raw)
        if (Date.now() - ts < REMEMBER_TTL_MS) {
          email.value = savedEmail
          rememberMe.value = true
        } else {
          localStorage.removeItem(STORAGE_KEYS.REMEMBER_TOKEN)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_TOKEN)
    }
  })

  async function submit() {
    loginErr.value = ''
    submitting.value = true
    try {
      const res = await window.api.loginWithCredentials(email.value.trim(), password.value)
      if (!res?.ok || !res.data) {
        const serverErr = (res as { error?: string })?.error
        loginErr.value = serverErr ?? 'Email ou mot de passe incorrect.'
        password.value = ''
        return
      }
      const u = res.data as LoginResponse
      appStore.login({ ...u, avatar_initials: u.avatar_initials ?? u.name.slice(0, 2).toUpperCase() })
      if (rememberMe.value) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_TOKEN, JSON.stringify({
          email: email.value.trim(),
          ts: Date.now(),
        }))
      } else {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_TOKEN)
      }
      router.replace('/dashboard')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      loginErr.value = msg || 'Erreur inattendue lors de la connexion.'
    } finally {
      submitting.value = false
    }
  }

  return { email, password, loginErr, submitting, showPwd, rememberMe, submit }
}
