<script setup lang="ts">
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAppStore } from '@/stores/app'
  import { useToast } from '@/composables/useToast'
  import { avatarColor } from '@/utils/format'

  const appStore = useAppStore()
  const router   = useRouter()
  const { showToast } = useToast()

  type Screen = 'login' | 'register'
  const screen = ref<Screen>('login')

  // ── Formulaire de connexion ───────────────────────────────────────────────
  const email      = ref('')
  const password   = ref('')
  const loginErr   = ref('')
  const submitting = ref(false)

  async function handleLogin() {
    loginErr.value = ''
    submitting.value = true
    try {
      const res = await window.api.loginWithCredentials(email.value.trim(), password.value)
      if (!res.ok || !res.data) {
        loginErr.value = 'Email ou mot de passe incorrect.'
        password.value = ''
        return
      }
      const u = res.data
      const initials_ = u.avatar_initials ?? u.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
      appStore.login({ ...u, avatar_initials: initials_ })
      router.replace('/messages')
    } finally {
      submitting.value = false
    }
  }

  // ── Formulaire d'inscription ──────────────────────────────────────────────
  const firstName     = ref('')
  const lastName      = ref('')
  const regEmail      = ref('')
  const regPassword   = ref('')
  const regPromoId    = ref<number | ''>('')
  const regEmailErr   = ref('')
  const regSubmitting = ref(false)
  const pendingPhoto  = ref<string | null>(null)
  const promotions    = ref<{ id: number; name: string }[]>([])

  async function loadPromos() {
    const res = await window.api.getPromotions()
    promotions.value = res?.ok ? res.data : []
  }

  const previewInitials = () => {
    const n = `${firstName.value} ${lastName.value}`.trim()
    return n.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'
  }
  const previewColor = () => avatarColor(`${firstName.value} ${lastName.value}`.trim() || '?')

  async function pickPhoto() {
    const res = await window.api.openImageDialog()
    if (res?.ok && res.data) pendingPhoto.value = res.data
  }

  async function handleRegister() {
    regEmailErr.value = ''
    if (!regEmail.value.endsWith('@viacesi.fr')) {
      regEmailErr.value = "L'adresse doit se terminer par @viacesi.fr"
      return
    }
    if (!regPromoId.value) return
    regSubmitting.value = true
    try {
      const fullName = `${firstName.value.trim()} ${lastName.value.trim()}`
      const res = await window.api.registerStudent({
        name: fullName, email: regEmail.value.trim().toLowerCase(),
        promoId: regPromoId.value, photoData: pendingPhoto.value,
        password: regPassword.value,
      })
      if (!res?.ok) { regEmailErr.value = res?.error ?? 'Erreur lors de la création du compte.'; return }

      const stuRes = await window.api.getStudentByEmail(regEmail.value.trim().toLowerCase())
      if (!stuRes?.ok || !stuRes.data) return
      const stu = stuRes.data
      const initials_ = fullName.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
      appStore.login({ ...stu, avatar_initials: initials_, type: 'student' })
      router.replace('/messages')
    } catch (e: unknown) {
      regEmailErr.value = (e as Error).message ?? 'Erreur lors de la création du compte.'
    } finally {
      regSubmitting.value = false
    }
  }

  async function goToRegister() {
    screen.value = 'register'
    await loadPromos()
  }
</script>

<template>
  <div id="login-overlay">
    <!--
      Transition "out-in" : l'écran actif sort (fade + glissement vers le haut)
      avant que le nouvel écran entre (fade + glissement depuis le bas).
      mode="out-in" évite que les deux panneaux soient visibles simultanément.
    -->
    <Transition name="login-screen" mode="out-in">

      <!-- ── Connexion ──────────────────────────────────────────────────── -->
      <div v-if="screen === 'login'" key="login" id="login-panel">
        <div id="login-logo">
          <div class="logo-mark">CeS</div>
          <span class="logo-text">CeSlack</span>
        </div>
        <h2 id="login-title">Connexion</h2>
        <p id="login-subtitle">Entrez vos identifiants pour continuer</p>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <label class="form-label" for="login-email">Adresse email</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              class="form-input"
              placeholder="prenom.nom@viacesi.fr"
              autocomplete="email"
              required
              autofocus
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="login-password">Mot de passe</label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              class="form-input"
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
          </div>
          <Transition name="error-pop">
            <span v-if="loginErr" class="field-error login-error-block">{{ loginErr }}</span>
          </Transition>
          <button type="submit" class="btn-primary login-submit" :disabled="submitting">
            {{ submitting ? 'Connexion…' : 'Se connecter' }}
          </button>
        </form>

        <button class="btn-ghost login-switch-btn" @click="goToRegister">
          Nouveau compte étudiant
        </button>
      </div>

      <!-- ── Inscription ──────────────────────────────────────────────── -->
      <div v-else key="register" id="login-panel" class="login-panel-wide">
        <div id="login-logo">
          <div class="logo-mark">CeS</div>
          <span class="logo-text">CeSlack</span>
        </div>
        <h2 id="login-title">Nouveau compte étudiant</h2>
        <p id="login-subtitle">Seules les adresses @viacesi.fr sont acceptées</p>

        <form class="login-form" @submit.prevent="handleRegister">
          <!-- Avatar preview -->
          <div class="register-photo-row">
            <div
              class="register-avatar-preview"
              :style="{ background: pendingPhoto ? 'transparent' : previewColor() }"
            >
              <img v-if="pendingPhoto" :src="pendingPhoto" class="register-avatar-img" />
              <span v-else>{{ previewInitials() }}</span>
            </div>
            <button type="button" class="btn-ghost btn-sm" @click="pickPhoto">Choisir une photo</button>
            <button v-if="pendingPhoto" type="button" class="btn-ghost btn-sm register-btn-remove" @click="pendingPhoto = null">
              Supprimer
            </button>
          </div>

          <div class="login-name-row">
            <div class="form-group">
              <label class="form-label">Prénom</label>
              <input v-model="firstName" type="text" class="form-input" placeholder="ex : Alice" required />
            </div>
            <div class="form-group">
              <label class="form-label">Nom</label>
              <input v-model="lastName" type="text" class="form-input" placeholder="ex : Martin" required />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Adresse email CESI</label>
            <input v-model="regEmail" type="email" class="form-input" placeholder="prenom.nom@viacesi.fr" required />
            <Transition name="error-pop">
              <span v-if="regEmailErr" class="field-error">{{ regEmailErr }}</span>
            </Transition>
          </div>

          <div class="form-group">
            <label class="form-label">Promotion</label>
            <select v-model="regPromoId" class="form-select" required>
              <option value="">Choisir une promotion…</option>
              <option v-for="p in promotions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Mot de passe</label>
            <input v-model="regPassword" type="password" class="form-input" placeholder="Choisissez un mot de passe" required minlength="4" />
          </div>

          <div class="login-form-actions">
            <button type="button" class="btn-ghost" @click="screen = 'login'">Retour</button>
            <button type="submit" class="btn-primary login-submit-wide" :disabled="regSubmitting">
              {{ regSubmitting ? 'Création…' : 'Créer mon compte' }}
            </button>
          </div>
        </form>
      </div>

    </Transition>
  </div>
</template>

<style scoped>
/* ── Formulaire de login ── */
.login-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 13px;
  margin-top: 10px;
}

/* Largeur max du panneau inscription */
.login-panel-wide { max-width: 480px !important; }

/* Bouton de soumission plein-largeur */
.login-submit      { width: 100%; margin-top: 4px; }
.login-submit-wide { flex: 2; }

/* Lien vers inscription */
.login-switch-btn {
  margin-top: 14px;
  width: 100%;
  font-size: 13px;
}

/* Bloc d'erreur avec fond */
.login-error-block {
  background: rgba(231,76,60,.1);
  border: 1px solid rgba(231,76,60,.25);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  font-size: 13px;
  text-align: center;
}

/* Rangée noms côte à côte */
.login-name-row {
  display: flex;
  gap: 10px;
}
.login-name-row .form-group { flex: 1; }

/* Rangée boutons retour/créer */
.login-form-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

/* Image avatar dans preview */
.register-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

/* ── Transition entre écrans (out-in) ── */
/*
 * L'écran actif glisse légèrement vers le haut en sortant,
 * le nouvel écran entre depuis le bas.
 * mode="out-in" garantit que les deux ne se superposent jamais.
 */
.login-screen-enter-active { transition: opacity .22s ease, transform .22s ease; }
.login-screen-leave-active { transition: opacity .18s ease, transform .18s ease; }
.login-screen-enter-from   { opacity: 0; transform: translateY(14px) scale(.98); }
.login-screen-leave-to     { opacity: 0; transform: translateY(-10px) scale(.98); }

/* ── Transition message d'erreur ── */
.error-pop-enter-active { transition: opacity .15s, transform .15s; }
.error-pop-leave-active { transition: opacity .1s; }
.error-pop-enter-from   { opacity: 0; transform: translateY(-4px); }
.error-pop-leave-to     { opacity: 0; }
</style>
