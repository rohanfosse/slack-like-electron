/**
 * useForgotPassword : ecran "Mot de passe oublie". Aujourd'hui l'API ne
 * declenche pas de mail (placeholder UX) — le composable fait juste la
 * validation cote client + affiche un message de succes.
 */
import { ref } from 'vue'

export function useForgotPassword() {
  const email = ref('')
  const sent = ref(false)
  const err = ref('')

  function reset(defaultEmail = '') {
    email.value = defaultEmail
    sent.value = false
    err.value = ''
  }

  function submit() {
    err.value = ''
    const trimmed = email.value.trim().toLowerCase()
    if (!trimmed) {
      err.value = 'Veuillez saisir votre adresse email.'
      return
    }
    sent.value = true
  }

  return { email, sent, err, reset, submit }
}
