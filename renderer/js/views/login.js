import { call }        from '../api.js';
import { state }       from '../state.js';
import { avatarColor } from '../utils.js';

// ─── Ecran de selection d'identite ────────────────────────────────────────────

export async function showLoginScreen(onLogin) {
  const overlay = document.getElementById('login-overlay');
  overlay.classList.remove('hidden');

  const identities = await call(window.api.getIdentities);
  if (!identities) return;

  const grid = document.getElementById('login-identity-grid');
  grid.innerHTML = '';

  for (const identity of identities) {
    const card = document.createElement('button');
    card.className = 'login-identity-card';
    if (identity.type === 'teacher') card.classList.add('teacher');

    const initials = identity.avatar_initials ?? identity.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const color    = identity.type === 'teacher' ? 'var(--accent)' : avatarColor(identity.name);

    card.innerHTML = `
      <div class="login-avatar" style="background:${color}">${initials}</div>
      <div class="login-identity-name">${identity.name}</div>
      ${identity.promo_name ? `<div class="login-identity-promo">${identity.promo_name}</div>` : '<div class="login-identity-promo">Professeur</div>'}
    `;

    card.addEventListener('click', () => {
      state.currentUser = {
        id:              identity.id,
        name:            identity.name,
        avatar_initials: initials,
        type:            identity.type,
        promo_id:        identity.promo_id,
        promo_name:      identity.promo_name,
      };
      overlay.classList.add('hidden');
      onLogin(state.currentUser);
    });

    grid.appendChild(card);
  }
}
