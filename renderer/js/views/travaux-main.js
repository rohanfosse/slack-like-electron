import { call }      from '../api.js';
import { state }     from '../state.js';
import { escapeHtml, formatDate, deadlineClass, deadlineLabel } from '../utils.js';
import { CATEGORIES } from './timeline.js';
import { renderGantt, setGanttPromo } from './gantt.js';
import { renderRendus, setRendusPromo } from './rendus.js';
import { openGestionDevoir } from './gestion-devoir.js';
import { openNewTravailModal } from './travaux.js';

let _activePromo = null;   // null = toutes
let _activeView  = 'gantt'; // 'gantt' | 'rendus' (boutons header)

// Écouter le changement de promo depuis le rail de navigation
document.addEventListener('promo:switch', ({ detail }) => {
  _activePromo = detail.promoId ?? null;
  setGanttPromo(_activePromo);
  setRendusPromo(_activePromo);
  // Re-rendre si la section Travaux est visible
  if (!document.getElementById('travaux-area')?.classList.contains('hidden')) {
    renderTravauxSidebar();
    switchTravauxView(_activeView);
  }
});

// ─── Initialisation de la section Travaux ────────────────────────────────────

export async function initTravauxSection() {
  const isStudent = state.currentUser?.type === 'student';

  // Masquer/afficher les contrôles enseignant
  document.getElementById('btn-view-gantt').classList.toggle('hidden', isStudent);
  document.getElementById('btn-view-rendus').classList.toggle('hidden', isStudent);

  const btnNewTravail = document.getElementById('btn-new-travail-header');
  if (btnNewTravail) {
    btnNewTravail.classList.toggle('hidden', isStudent);
    if (!btnNewTravail._bound) {
      btnNewTravail._bound = true;
      btnNewTravail.addEventListener('click', () => openNewTravailModal(_activePromo));
    }
  }

  if (isStudent) {
    document.getElementById('gantt-view').classList.add('hidden');
    document.getElementById('rendus-view').classList.add('hidden');
    const sv = document.getElementById('student-view');
    sv.classList.remove('hidden');

    const { renderStudentDashboard } = await import('./student-dashboard.js');
    await renderStudentDashboard(sv);

    await renderTravauxSidebar();
  } else {
    document.getElementById('student-view').classList.add('hidden');
    await renderTravauxSidebar();
    await switchTravauxView('gantt');
  }
}

// ─── Sidebar Travaux ─────────────────────────────────────────────────────────

export async function renderTravauxSidebar() {
  await renderPromoFilter();
  await renderTravauxNav();
}

async function renderPromoFilter() {
  const container = document.getElementById('travaux-promo-filter');
  if (!container) return;

  if (state.currentUser?.type !== 'teacher') {
    container.innerHTML = '';
    return;
  }

  const promotions = await call(window.api.getPromotions);
  if (!promotions) return;

  // Synchroniser _activePromo avec la promo sélectionnée dans le rail
  if (state.activePromoId && _activePromo == null) {
    _activePromo = state.activePromoId;
    setGanttPromo(_activePromo);
    setRendusPromo(_activePromo);
  }

  container.innerHTML = `
    <div class="trv-promo-filter">
      <button class="trv-promo-btn${!_activePromo ? ' active' : ''}" data-promo-id="">Toutes</button>
      ${promotions.map(p => `
        <button class="trv-promo-btn${_activePromo === p.id ? ' active' : ''}" data-promo-id="${p.id}">
          <span class="promo-dot" style="background:${p.color}"></span>
          ${escapeHtml(p.name)}
        </button>
      `).join('')}
    </div>
  `;

  container.addEventListener('click', async e => {
    const btn = e.target.closest('[data-promo-id]');
    if (!btn) return;
    container.querySelectorAll('.trv-promo-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _activePromo = btn.dataset.promoId ? parseInt(btn.dataset.promoId) : null;
    setGanttPromo(_activePromo);
    setRendusPromo(_activePromo);
    await renderTravauxNav();
    await switchTravauxView(_activeView);
  });
}

async function renderTravauxNav() {
  const nav = document.getElementById('travaux-nav');
  if (!nav) return;

  // Liste des travaux
  const user = state.currentUser;
  let travaux;

  if (user?.type === 'student') {
    travaux = (await call(window.api.getStudentTravaux, user.id)) ?? [];
  } else {
    const raw = (await call(window.api.getGanttData, _activePromo ?? null)) ?? [];
    travaux = raw;
  }

  if (!travaux.length) {
    nav.innerHTML = '<div class="nav-empty">Aucun travail.</div>';
    return;
  }

  // Grouper par canal
  const byChannel = new Map();
  for (const t of travaux) {
    const key = t.channel_name ?? '';
    if (!byChannel.has(key)) byChannel.set(key, []);
    byChannel.get(key).push(t);
  }

  let html = '';
  for (const [ch, items] of byChannel) {
    html += `
      <div class="trv-nav-channel">
        <div class="trv-nav-channel-label"><span class="channel-prefix">#</span>${escapeHtml(ch)}</div>
        ${items.map(t => {
          const catColor = CATEGORIES[t.category]?.color ?? '#888';
          const isJalon  = t.type === 'jalon';
          const pct = t.students_total > 0 ? Math.round(((t.depots_count ?? 0) / t.students_total) * 100) : null;
          return `
            <div class="trv-nav-item" data-travail-id="${t.id}">
              <span class="trv-nav-dot" style="background:${catColor}"></span>
              <div class="trv-nav-item-content">
                <div class="trv-nav-item-title">${escapeHtml(t.title)}</div>
                <div class="trv-nav-item-meta">
                  ${formatDate(t.deadline)}
                  ${isJalon ? '<span class="jalon-badge" style="font-size:9px">Jalon</span>' : ''}
                  ${!t.published ? '<span class="draft-badge" style="font-size:9px">Brouillon</span>' : ''}
                </div>
                ${pct !== null && !isJalon ? `
                  <div class="trv-nav-progress">
                    <div class="trv-nav-progress-fill" style="width:${pct}%;background:${catColor}"></div>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  nav.innerHTML = html;

  // Clic sur un travail → ouvrir son détail
  nav.addEventListener('click', e => {
    const item = e.target.closest('[data-travail-id]');
    if (!item) return;
    const id = parseInt(item.dataset.travailId);
    const t  = travaux.find(x => x.id === id);
    if (t && t.type !== 'jalon') openGestionDevoir(t);
  });
}


// ─── Basculer entre Gantt et Rendus ──────────────────────────────────────────

export async function switchTravauxView(view) {
  _activeView = view;
  document.getElementById('gantt-view').classList.toggle('hidden', view !== 'gantt');
  document.getElementById('rendus-view').classList.toggle('hidden', view !== 'rendus');

  document.querySelectorAll('.btn-view').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });

  const icon = document.getElementById('travaux-area-icon');
  const name = document.getElementById('travaux-area-name');
  if (icon && name) {
    icon.textContent = view === 'gantt' ? '📊' : '📁';
    name.textContent = view === 'gantt' ? 'Gantt des travaux' : 'Rendus';
  }

  if (view === 'gantt') {
    setGanttPromo(_activePromo);
    await renderGantt(document.getElementById('gantt-view'));
  } else {
    setRendusPromo(_activePromo);
    await renderRendus(document.getElementById('rendus-view'));
  }
}
