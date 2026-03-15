import { call }        from '../api.js';
import { state }       from '../state.js';
import { avatarColor, escapeHtml } from '../utils.js';

const TEACHER = { id: 0, name: 'Rohan Fosse', avatar_initials: 'RF', photo_data: null, type: 'teacher', promo_name: null, promo_id: null };

// ─── Ecran de connexion ───────────────────────────────────────────────────────

export async function showLoginScreen(onLogin) {
  const overlay = document.getElementById('login-overlay');
  overlay.classList.remove('hidden');

  await showIdentityGrid(onLogin);
}

async function showIdentityGrid(onLogin) {
  const overlay = document.getElementById('login-overlay');
  overlay.innerHTML = `
    <div id="login-panel">
      <div id="login-logo">
        <div class="logo-mark">CC</div>
        <span class="logo-text">CESI Classroom</span>
      </div>
      <h2 id="login-title">Qui etes-vous ?</h2>
      <p id="login-subtitle">Selectionnez votre identite pour continuer</p>
      <div id="login-identity-grid"></div>
      <button id="btn-new-account" class="btn-ghost" style="margin-top:20px;width:100%;font-size:13px;">
        Nouveau compte etudiant
      </button>
    </div>
  `;

  const identities = await call(window.api.getIdentities);
  if (!identities) return;

  const grid = document.getElementById('login-identity-grid');

  for (const identity of identities) {
    const card = document.createElement('button');
    card.className = 'login-identity-card';
    if (identity.type === 'teacher') card.classList.add('teacher');

    const initials = identity.avatar_initials ?? identity.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const color    = identity.type === 'teacher' ? 'var(--accent)' : avatarColor(identity.name);

    const avatarHtml = identity.photo_data
      ? `<div class="login-avatar" style="overflow:hidden;background:transparent"><img src="${identity.photo_data}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/></div>`
      : `<div class="login-avatar" style="background:${color}">${escapeHtml(initials)}</div>`;

    card.innerHTML = `
      ${avatarHtml}
      <div class="login-identity-name">${escapeHtml(identity.name)}</div>
      <div class="login-identity-promo">${identity.promo_name ? escapeHtml(identity.promo_name) : 'Professeur'}</div>
    `;

    card.addEventListener('click', () => login(identity, initials, onLogin));
    grid.appendChild(card);
  }

  document.getElementById('btn-new-account').addEventListener('click', () => {
    showRegisterForm(onLogin);
  });
}

function login(identity, initials, onLogin) {
  state.currentUser = {
    id:              identity.id,
    name:            identity.name,
    avatar_initials: initials,
    photo_data:      identity.photo_data ?? null,
    type:            identity.type,
    promo_id:        identity.promo_id,
    promo_name:      identity.promo_name,
  };
  document.getElementById('login-overlay').classList.add('hidden');
  onLogin(state.currentUser);
}

// ─── Formulaire d'inscription ─────────────────────────────────────────────────

async function showRegisterForm(onLogin) {
  const overlay = document.getElementById('login-overlay');

  const promotions = await call(window.api.getPromotions);
  const promoOptions = (promotions ?? [])
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join('');

  overlay.innerHTML = `
    <div id="login-panel" style="max-width:480px;">
      <div id="login-logo">
        <div class="logo-mark">CC</div>
        <span class="logo-text">CESI Classroom</span>
      </div>
      <h2 id="login-title">Nouveau compte etudiant</h2>
      <p id="login-subtitle">Seules les adresses @viacesi.fr sont acceptees</p>

      <form id="register-form" style="width:100%;display:flex;flex-direction:column;gap:12px;margin-top:8px;">

        <div class="register-photo-row">
          <div id="register-avatar-preview" class="register-avatar-preview">?</div>
          <button type="button" id="btn-pick-photo" class="btn-ghost" style="font-size:12px;">
            Choisir une photo
          </button>
          <button type="button" id="btn-remove-photo" class="btn-ghost register-btn-remove" style="display:none;font-size:12px;">
            Supprimer
          </button>
        </div>

        <div style="display:flex;gap:10px;">
          <div class="form-group" style="flex:1">
            <label class="form-label">Prenom</label>
            <input type="text" id="reg-firstname" class="form-input" placeholder="ex : Alice" required autocomplete="off"/>
          </div>
          <div class="form-group" style="flex:1">
            <label class="form-label">Nom</label>
            <input type="text" id="reg-lastname" class="form-input" placeholder="ex : Martin" required autocomplete="off"/>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Adresse email CESI</label>
          <input type="email" id="reg-email" class="form-input" placeholder="prenom.nom@viacesi.fr" required autocomplete="off"/>
          <span id="reg-email-error" class="field-error"></span>
        </div>

        <div class="form-group">
          <label class="form-label">Promotion</label>
          <select id="reg-promo" class="form-select" required>
            <option value="">Choisir une promotion…</option>
            ${promoOptions}
          </select>
        </div>

        <div style="display:flex;gap:10px;margin-top:6px;">
          <button type="button" id="btn-back-login" class="btn-ghost" style="flex:1">Retour</button>
          <button type="submit" class="btn-primary" style="flex:2">Creer mon compte</button>
        </div>
      </form>
    </div>
  `;

  // Mise a jour de l'apercu avatar en temps reel
  let pendingPhoto = null;

  const updatePreview = () => {
    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName  = document.getElementById('reg-lastname').value.trim();
    const preview   = document.getElementById('register-avatar-preview');
    const name      = `${firstName} ${lastName}`.trim();
    const initials  = name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

    if (pendingPhoto) {
      preview.innerHTML = `<img src="${pendingPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%"/>`;
    } else {
      preview.textContent = initials;
      preview.style.background = name ? avatarColor(name) : 'var(--bg-active)';
    }
  };

  document.getElementById('reg-firstname').addEventListener('input', updatePreview);
  document.getElementById('reg-lastname').addEventListener('input', updatePreview);

  document.getElementById('btn-pick-photo').addEventListener('click', async () => {
    const data = await call(window.api.openImageDialog);
    if (!data) return;
    pendingPhoto = data;
    document.getElementById('btn-remove-photo').style.display = '';
    updatePreview();
  });

  document.getElementById('btn-remove-photo').addEventListener('click', () => {
    pendingPhoto = null;
    document.getElementById('btn-remove-photo').style.display = 'none';
    updatePreview();
  });

  document.getElementById('btn-back-login').addEventListener('click', () => {
    showIdentityGrid(onLogin);
  });

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('reg-firstname').value.trim();
    const lastName  = document.getElementById('reg-lastname').value.trim();
    const email     = document.getElementById('reg-email').value.trim().toLowerCase();
    const promoId   = parseInt(document.getElementById('reg-promo').value);
    const emailErr  = document.getElementById('reg-email-error');

    emailErr.textContent = '';

    if (!email.endsWith('@viacesi.fr')) {
      emailErr.textContent = 'L\'adresse doit se terminer par @viacesi.fr';
      return;
    }
    if (!promoId) return;

    const fullName = `${firstName} ${lastName}`;

    try {
      const result = await call(window.api.registerStudent, {
        name:      fullName,
        email,
        promoId,
        photoData: pendingPhoto,
      });

      if (result === null) return; // erreur affichee par call()

      // Recuperer le nouvel etudiant pour auto-login
      const student = await call(window.api.getStudentByEmail, email);
      if (!student) return;

      const initials = fullName.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
      login({ ...student, type: 'student', avatar_initials: initials }, initials, onLogin);

    } catch (err) {
      emailErr.textContent = err.message ?? 'Erreur lors de la creation du compte.';
    }
  });
}
