import { call }      from '../api.js';
import { state }     from '../state.js';
import { showToast } from '../utils.js';
import {
  avatarColor, escapeHtml, formatDate,
  deadlineClass, deadlineLabel, makeAvatar,
} from '../utils.js';
import { renderTravaux } from './travaux.js';

// ─── Modal suivi ──────────────────────────────────────────────────────────────

export async function openSuiviModal(travail) {
  state.currentTravailId = travail.id;

  document.getElementById('suivi-title').textContent = travail.title;
  const deadlineBadge = document.getElementById('suivi-deadline');
  deadlineBadge.textContent = `${deadlineLabel(travail.deadline)} — ${formatDate(travail.deadline)}`;
  deadlineBadge.className   = `deadline-badge ${deadlineClass(travail.deadline)}`;

  await renderSuivi(travail.id);

  document.getElementById('modal-suivi-overlay').classList.remove('hidden');
}

async function renderSuivi(travailId) {
  const body    = document.getElementById('suivi-body');
  const [rows, travail] = await Promise.all([
    call(window.api.getTravauxSuivi, travailId),
    call(window.api.getTravailById,  travailId),
  ]);
  if (!rows) return;

  const total  = rows.length;
  const rendus = rows.filter(r => r.depot_id != null).length;
  const pct    = total > 0 ? Math.round((rendus / total) * 100) : 0;

  // Barre de progression
  document.getElementById('suivi-progress-label-count').textContent = `${rendus} / ${total} rendus`;
  document.getElementById('suivi-progress-label-pct').textContent   = `${pct} %`;
  document.getElementById('suivi-progress-fill').style.width        = `${pct}%`;

  // Bouton export
  document.getElementById('btn-export-csv').dataset.travailId = travailId;

  body.innerHTML = '';

  for (const r of rows) {
    const rendu = r.depot_id != null;
    const row   = document.createElement('div');
    row.className = `suivi-row ${rendu ? 'rendu' : 'non-rendu'}`;

    const statusDot = document.createElement('div');
    statusDot.className = 'suivi-status';

    const avatar = makeAvatar(r.avatar_initials, avatarColor(r.student_name), 30, r.photo_data ?? null);

    const info = document.createElement('div');
    info.className = 'suivi-info';

    const groupBadge = r.travail_group_name
      ? `<span class="group-tag" style="font-size:10px">${escapeHtml(r.travail_group_name)}</span>`
      : '';

    if (rendu) {
      info.innerHTML = `
        <div class="suivi-name">${escapeHtml(r.student_name)} ${groupBadge}</div>
        <div class="suivi-detail">
          ${escapeHtml(r.file_name)} &middot; Depose le ${formatDate(r.submitted_at)}
        </div>
        ${r.feedback ? `<div class="suivi-feedback">${escapeHtml(r.feedback)}</div>` : ''}
      `;
    } else {
      info.innerHTML = `
        <div class="suivi-name">${escapeHtml(r.student_name)} ${groupBadge}</div>
        <div class="suivi-detail">Non rendu</div>
      `;
    }

    const noteArea = document.createElement('div');
    noteArea.className = 'suivi-note-area';

    if (rendu) {
      if (r.note != null) {
        const badge = document.createElement('span');
        badge.className = 'note-badge';
        badge.textContent = `${r.note}/20`;
        noteArea.appendChild(badge);
      } else {
        const btn = document.createElement('button');
        btn.className   = 'btn-set-note';
        btn.textContent = 'Attribuer';
        btn.addEventListener('click', () => openInlineNoteInput(r.depot_id, noteArea, travailId));
        noteArea.appendChild(btn);
      }
    }

    // Reassignation de groupe (si le travail est groupe)
    if (travail?.group_id) {
      const groupEl = await buildGroupSelect(travailId, r.student_id, r.travail_group_id);
      row.appendChild(groupEl);
    }

    row.appendChild(statusDot);
    row.appendChild(avatar);
    row.appendChild(info);
    row.appendChild(noteArea);
    body.appendChild(row);
  }
}

async function buildGroupSelect(travailId, studentId, currentGroupId) {
  const wrap = document.createElement('div');
  wrap.className = 'suivi-group-select-wrap';

  // Recuperer les groupes de la promo
  const travail = await call(window.api.getTravailById, travailId);
  if (!travail) return wrap;

  const channelId = travail.channel_id;
  // On recupère les groupes via la promo (en passant par le channel)
  // Pour simplifier on charge tous les groupes deja présents dans le suivi
  const tgm = await call(window.api.getTravailGroupMembers, travailId);
  if (!tgm) return wrap;

  // Liste unique de groupes
  const groupMap = new Map();
  for (const m of tgm) groupMap.set(m.group_id, m.group_name);

  const select = document.createElement('select');
  select.className = 'suivi-group-select form-select';
  select.innerHTML = '<option value="">— aucun groupe —</option>';
  for (const [gid, gname] of groupMap) {
    const opt = document.createElement('option');
    opt.value = gid;
    opt.textContent = gname;
    if (gid === currentGroupId) opt.selected = true;
    select.appendChild(opt);
  }

  select.addEventListener('change', async () => {
    const newGroupId = select.value ? parseInt(select.value) : null;
    await call(window.api.setTravailGroupMember, { travailId, studentId, groupId: newGroupId });
    showToast('Groupe mis a jour.', 'success');
    await renderSuivi(travailId);
  });

  wrap.appendChild(select);
  return wrap;
}

// Champ de note inline dans le suivi (evite d'ouvrir une 2e modal)
function openInlineNoteInput(depotId, container, travailId) {
  container.innerHTML = '';
  const input = document.createElement('input');
  input.type        = 'number';
  input.min         = '0';
  input.max         = '20';
  input.step        = '0.5';
  input.placeholder = '0–20';
  input.style.cssText = 'width:64px;background:var(--bg-light);border:1px solid var(--accent);border-radius:4px;color:var(--text-primary);padding:4px 6px;font-size:13px;outline:none;text-align:center;-moz-appearance:textfield;';

  const btnOk = document.createElement('button');
  btnOk.className   = 'btn-primary';
  btnOk.style.cssText = 'padding:4px 10px;font-size:12px;';
  btnOk.textContent = 'OK';

  const save = async () => {
    const val = parseFloat(input.value.replace(',', '.'));
    if (isNaN(val) || val < 0 || val > 20) { input.style.borderColor = 'var(--color-danger)'; return; }
    const ok = await call(window.api.setNote, { depotId, note: val });
    if (ok === null) return;
    showToast('Note enregistree.', 'success');
    await renderSuivi(travailId);
    await renderTravaux();
  };

  btnOk.addEventListener('click', save);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });

  container.appendChild(input);
  container.appendChild(btnOk);
  input.focus();
}

// ─── Export CSV ────────────────────────────────────────────────────────────────

export function bindSuiviModal() {
  const overlay = document.getElementById('modal-suivi-overlay');

  document.getElementById('modal-suivi-close').addEventListener('click', () => {
    overlay.classList.add('hidden');
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });

  document.getElementById('btn-export-csv').addEventListener('click', async e => {
    const travailId = parseInt(e.currentTarget.dataset.travailId);
    const result = await call(window.api.exportCsv, travailId);
    if (result === null) return;
    if (result) showToast(`Exporte : ${result}`, 'success');
  });
}

// ─── Profil etudiant (panel droit) ────────────────────────────────────────────

export async function openProfilPanel(studentId) {
  state.rightPanel = 'profil';
  const panel = document.getElementById('right-panel');
  panel.classList.remove('hidden');

  const data = await call(window.api.getStudentProfile, studentId);
  if (!data) return;

  const { student, travaux } = data;
  const rendus  = travaux.filter(t => t.depot_id != null).length;
  const notes   = travaux.filter(t => t.note != null).map(t => t.note);
  const moyenne = notes.length
    ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1)
    : null;

  panel.innerHTML = `
    <div class="profil-header">
      <div class="msg-avatar" style="background:${avatarColor(student.name)};color:#fff;width:38px;height:38px;font-size:14px;flex-shrink:0;">${escapeHtml(student.avatar_initials)}</div>
      <div class="profil-info">
        <div class="profil-name">${escapeHtml(student.name)}</div>
        <div class="profil-promo">${escapeHtml(student.promo_name)}</div>
      </div>
      <button class="btn-ghost" id="btn-close-profil">Fermer</button>
    </div>
    <div style="padding:10px 16px 6px;font-size:12px;color:var(--text-muted);display:flex;gap:16px;border-bottom:1px solid rgba(255,255,255,.07);">
      <span><strong style="color:var(--text-primary)">${rendus}</strong> rendu${rendus > 1 ? 's' : ''}</span>
      ${moyenne != null ? `<span>Moyenne : <strong style="color:var(--text-primary)">${moyenne}/20</strong></span>` : ''}
    </div>
    <div class="panel-body" id="profil-body">
      ${travaux.length ? '' : '<div class="empty-state"><p>Aucun travail dans cette promo.</p></div>'}
    </div>
  `;

  document.getElementById('btn-close-profil').addEventListener('click', () => {
    state.rightPanel = null;
    panel.classList.add('hidden');
  });

  const body = document.getElementById('profil-body');
  for (const t of travaux) {
    const item = document.createElement('div');
    item.className = 'profil-travail-item';
    item.innerHTML = `
      <div class="profil-travail-title">${escapeHtml(t.title)}</div>
      <div class="profil-travail-canal">#${escapeHtml(t.channel_name)} &middot; ${formatDate(t.deadline)}</div>
      <div class="profil-depot-row">
        ${t.depot_id
          ? `<span class="profil-depot-file" title="${escapeHtml(t.file_name)}">${escapeHtml(t.file_name)}</span>
             ${t.note != null ? `<span class="note-badge">${t.note}/20</span>` : '<span style="font-size:11px;color:var(--text-muted)">Non note</span>'}`
          : `<span class="profil-non-rendu">Non rendu</span>`
        }
      </div>
      ${t.feedback ? `<div style="font-size:11px;color:var(--text-secondary);font-style:italic;margin-top:4px;">${escapeHtml(t.feedback)}</div>` : ''}
    `;
    body.appendChild(item);
  }
}
