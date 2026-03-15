import { call }      from '../api.js';
import { state }     from '../state.js';
import {
  showToast, escapeHtml, formatDate, formatGrade, gradeClass,
  deadlineClass, deadlineLabel, avatarColor, makeAvatar,
} from '../utils.js';
import { CATEGORIES } from './timeline.js';

let _currentTravail = null;
let _groupFilter    = null; // null = tous les groupes

// ─── Ouverture ────────────────────────────────────────────────────────────────

export async function openGestionDevoir(travail) {
  _currentTravail = travail;
  _groupFilter    = null;

  const catColor = CATEGORIES[travail.category]?.color ?? '#888';
  const cls      = deadlineClass(travail.deadline);
  const lbl      = deadlineLabel(travail.deadline);

  document.getElementById('gd-title').textContent = travail.title;
  document.getElementById('gd-badges').innerHTML = `
    <span class="category-badge" style="background:${catColor}20;color:${catColor};border-color:${catColor}40">${escapeHtml(travail.category)}</span>
    ${travail.type === 'jalon' ? '<span class="jalon-badge">Jalon</span>' : ''}
    ${!travail.published ? '<span class="draft-badge">Brouillon</span>' : ''}
    <span class="deadline-badge ${cls}">${lbl} — ${formatDate(travail.deadline)}</span>
  `;

  document.getElementById('modal-gestion-overlay').classList.remove('hidden');
  await _renderContent();
}

export function bindGestionDevoir() {
  const overlay = document.getElementById('modal-gestion-overlay');
  document.getElementById('modal-gestion-close')
    .addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
}

// ─── Rendu principal ──────────────────────────────────────────────────────────

async function _renderContent() {
  if (!_currentTravail) return;

  const rows = await call(window.api.getTravauxSuivi, _currentTravail.id);
  if (!rows) return;

  const total  = rows.length;
  const rendus = rows.filter(r => r.depot_id != null).length;
  const pct    = total > 0 ? Math.round(rendus / total * 100) : 0;

  document.getElementById('gd-progress-label').textContent = `${rendus} / ${total} rendus`;
  document.getElementById('gd-progress-fill').style.width  = `${pct}%`;

  // Pills groupes
  const groups = [...new Set(rows.map(r => r.travail_group_name).filter(Boolean))];
  _renderGroupPills(groups);

  // Filtrage
  const filtered = _groupFilter
    ? rows.filter(r => r.travail_group_name === _groupFilter)
    : rows;

  _renderRendus(filtered.filter(r => r.depot_id != null));
  _renderAttente(filtered.filter(r => r.depot_id == null));
}

// ─── Pills de groupe ──────────────────────────────────────────────────────────

function _renderGroupPills(groups) {
  const container = document.getElementById('gd-group-pills');
  container.innerHTML = '';
  if (!groups.length) return;

  for (const g of [null, ...groups]) {
    const btn = document.createElement('button');
    btn.className = `gd-group-pill${g === _groupFilter ? ' active' : ''}`;
    btn.textContent = g ?? 'Tous';
    btn.tabIndex = 0;
    btn.addEventListener('click', () => { _groupFilter = g; _renderContent(); });
    btn.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
    container.appendChild(btn);
  }
}

// ─── Section Rendus ───────────────────────────────────────────────────────────

function _renderRendus(rows) {
  const section = document.getElementById('gd-rendus-section');
  section.innerHTML = `
    <div class="gd-section-title">
      ✅ Fichiers rendus
      <span class="gd-count">${rows.length}</span>
    </div>
  `;

  if (!rows.length) {
    section.innerHTML += '<div class="gd-empty">Aucun rendu pour le moment.</div>';
    return;
  }

  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'gd-student-row';

    const avatar = makeAvatar(r.avatar_initials, avatarColor(r.student_name), 34, r.photo_data ?? null);

    const info = document.createElement('div');
    info.className = 'gd-student-info';
    info.innerHTML = `
      <div class="gd-student-name">${escapeHtml(r.student_name)}</div>
      <div class="gd-student-file">
        📄 <span title="${escapeHtml(r.file_name)}">${escapeHtml(r.file_name)}</span>
        <span class="gd-submitted-at">• ${formatDate(r.submitted_at)}</span>
      </div>
      ${r.feedback ? `<div class="gd-feedback-display">"${escapeHtml(r.feedback)}"</div>` : ''}
    `;

    const actions = document.createElement('div');
    actions.className = 'gd-student-actions';

    // Note déjà attribuée ou sélecteur de note
    if (r.note != null) {
      const noteBadge = document.createElement('span');
      noteBadge.className = `note-badge ${gradeClass(r.note)} gd-note-badge`;
      noteBadge.textContent = formatGrade(r.note);
      noteBadge.title = 'Cliquer pour modifier';
      noteBadge.style.cursor = 'pointer';
      noteBadge.addEventListener('click', async () => {
        // Reset note pour re-sélectionner
        const ok = await call(window.api.setNote, { depotId: r.depot_id, note: null });
        if (ok === null) return;
        await _renderContent();
      });
      actions.appendChild(noteBadge);
    } else {
      const gradeSelector = _buildGradeSelector(r.depot_id);
      actions.appendChild(gradeSelector);
    }

    // Bouton feedback
    const btnFeedback = document.createElement('button');
    btnFeedback.className = 'btn-icon gd-btn-feedback';
    btnFeedback.title = r.feedback ? 'Modifier le commentaire' : 'Ajouter un commentaire';
    btnFeedback.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    `;
    btnFeedback.addEventListener('click', () => _toggleFeedbackForm(r, info, btnFeedback));
    actions.appendChild(btnFeedback);

    // Bouton ouvrir fichier (si file_path dispo)
    if (r.file_path) {
      const btnOpen = document.createElement('button');
      btnOpen.className = 'btn-icon';
      btnOpen.title = 'Ouvrir le fichier';
      btnOpen.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
          <path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>
        </svg>
      `;
      btnOpen.addEventListener('click', () => call(window.api.openPath, r.file_path));
      actions.appendChild(btnOpen);
    }

    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(actions);
    section.appendChild(row);
  }
}

// ─── Sélecteur de note inline A/B/C/D ────────────────────────────────────────

function _buildGradeSelector(depotId) {
  const labels = { A: 'Excellent', B: 'Bien', C: 'Passable', D: 'Insuffisant' };
  const wrap = document.createElement('div');
  wrap.className = 'gd-grade-selector';

  for (const grade of ['A', 'B', 'C', 'D']) {
    const btn = document.createElement('button');
    btn.className = `gd-grade-btn gd-grade-${grade.toLowerCase()}`;
    btn.textContent = grade;
    btn.title = labels[grade];
    btn.tabIndex = 0;
    btn.addEventListener('click', async () => {
      const ok = await call(window.api.setNote, { depotId, note: grade });
      if (ok === null) return;
      showToast(`Note ${grade} — ${labels[grade]}.`, 'success');
      await _renderContent();
    });
    btn.addEventListener('keydown', e => { if (e.key === 'Enter') btn.click(); });
    wrap.appendChild(btn);
  }
  return wrap;
}

// ─── Section En attente ───────────────────────────────────────────────────────

function _renderAttente(rows) {
  const section = document.getElementById('gd-attente-section');
  section.innerHTML = `
    <div class="gd-section-title">
      ⏳ En attente
      <span class="gd-count">${rows.length}</span>
    </div>
  `;

  if (!rows.length) {
    section.innerHTML += '<div class="gd-empty gd-empty-ok">🎉 Tous les rendus sont reçus !</div>';
    return;
  }

  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'gd-student-row gd-row-waiting';

    const avatar = makeAvatar(r.avatar_initials, avatarColor(r.student_name), 34, r.photo_data ?? null);

    const info = document.createElement('div');
    info.className = 'gd-student-info';
    info.innerHTML = `
      <div class="gd-student-name">${escapeHtml(r.student_name)}</div>
      <div class="gd-student-status">Non rendu</div>
    `;

    row.appendChild(avatar);
    row.appendChild(info);
    section.appendChild(row);
  }
}

// ─── Formulaire feedback inline ───────────────────────────────────────────────

function _toggleFeedbackForm(depot, infoEl, btn) {
  const existing = infoEl.querySelector('.gd-feedback-form');
  if (existing) { existing.remove(); return; }

  const form = document.createElement('div');
  form.className = 'gd-feedback-form';
  form.innerHTML = `
    <textarea class="form-textarea" placeholder="Commentaire de correction…" rows="2" style="font-size:12px;">${escapeHtml(depot.feedback ?? '')}</textarea>
    <div class="gd-feedback-form-actions">
      <button class="btn-ghost" style="font-size:12px;padding:4px 10px">Annuler</button>
      <button class="btn-primary" style="font-size:12px;padding:4px 10px">Enregistrer</button>
    </div>
  `;

  form.querySelector('.btn-ghost').addEventListener('click', () => form.remove());
  form.querySelector('.btn-primary').addEventListener('click', async () => {
    const text = form.querySelector('textarea').value.trim();
    const ok   = await call(window.api.setFeedback, { depotId: depot.depot_id, feedback: text });
    if (ok === null) return;
    showToast('Commentaire enregistré.', 'success');
    await _renderContent();
  });

  infoEl.appendChild(form);
  form.querySelector('textarea').focus();
}
