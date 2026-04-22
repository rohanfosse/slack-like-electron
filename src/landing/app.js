/* ══════════════════════════════════════════════════════════════════════════
   Cursus Landing - app.js
   Scroll-triggered mini-demos, dark mode, version fetch
   ══════════════════════════════════════════════════════════════════════════ */

// ── Reduced motion preference ─────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── Dark mode (pill toggle, both icons always visible) ────────────────────
const saved = localStorage.getItem('cursus-landing-theme')
const initial = saved || 'light'
document.documentElement.dataset.theme = initial

// OS dark-mode preference intentionally ignored; user toggles manually

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem('cursus-landing-theme', next)
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // ── Burger menu toggle ──────────────────────────────────────────────
  const burger = document.getElementById('burger-toggle')
  const mobileMenu = document.getElementById('mobile-menu')

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true'
      burger.setAttribute('aria-expanded', String(!open))
      mobileMenu.setAttribute('aria-hidden', String(open))
    })

    // Close on link click
    mobileMenu.querySelectorAll('.mobile-link').forEach(link => {
      link.addEventListener('click', () => {
        burger.setAttribute('aria-expanded', 'false')
        mobileMenu.setAttribute('aria-hidden', 'true')
      })
    })

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        burger.setAttribute('aria-expanded', 'false')
        mobileMenu.setAttribute('aria-hidden', 'true')
        burger.focus()
      }
    })
  }

  // ── Keyboard accessibility for interactive demos ──────────────────
  function handleKeyActivation(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.target.click()
    }
  }

  document.querySelectorAll('.sidebar-ch, .devoir-item, .doc-item, .reaction, .live-opt').forEach(el => {
    el.setAttribute('tabindex', '0')
    el.setAttribute('role', 'button')
    el.addEventListener('keydown', handleKeyActivation)
  })

  // ── GitHub stars fetch ────────────────────────────────────────────────
  fetch('https://api.github.com/repos/rohanfosse/cursus')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data?.stargazers_count) return
      const el = document.getElementById('gh-stars')
      if (el) el.textContent = data.stargazers_count + ' stars'
    }).catch(() => {})

  // ── Version fetch (GitHub releases — fallback silencieux sur les valeurs hardcodees) ─
  fetch('https://api.github.com/repos/rohanfosse/cursus/releases/latest')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data?.tag_name) return
      const v = data.tag_name.startsWith('v') ? data.tag_name : 'v' + data.tag_name
      ;['pill-version', 'footer-version'].forEach(id => {
        const el = document.getElementById(id)
        if (el) el.textContent = v
      })
    }).catch(() => {})

  // ── OS detection (kept for analytics, Web is always recommended) ──────

  // ── Scroll reveal (IntersectionObserver) ──────────────────────────────
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' })

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el))

  // ── Dashboard counter animation ───────────────────────────────────────
  function animateCounters() {
    document.querySelectorAll('.counter').forEach(el => {
      const section = el.closest('.feature-section')
      if (!section?.classList.contains('visible')) return
      if (el.dataset.animated) return
      el.dataset.animated = '1'

      if (prefersReducedMotion) {
        el.textContent = el.dataset.target
        return
      }

      const target = parseFloat(el.dataset.target)
      const duration = 1000
      const start = performance.now()

      function update(now) {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        el.textContent = (target * eased).toFixed(1)
        if (progress < 1) requestAnimationFrame(update)
      }
      requestAnimationFrame(update)
    })
  }

  // ── Progress ring animation ───────────────────────────────────────────
  function animateProgressRings() {
    document.querySelectorAll('.widget-progress-ring').forEach(ring => {
      const section = ring.closest('.feature-section')
      if (!section?.classList.contains('visible')) return
      if (ring.dataset.animated) return
      ring.dataset.animated = '1'

      const target = parseInt(ring.dataset.target)
      const arc = ring.querySelector('.progress-arc')
      const label = ring.querySelector('.ring-label')

      if (prefersReducedMotion) {
        arc.setAttribute('stroke-dasharray', `${target} 100`)
        label.textContent = target + '%'
        return
      }

      const duration = 1200
      const start = performance.now()

      function update(now) {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const current = Math.round(target * eased)
        arc.setAttribute('stroke-dasharray', `${current} 100`)
        label.textContent = current + '%'
        if (progress < 1) requestAnimationFrame(update)
      }
      requestAnimationFrame(update)
    })
  }

  // ── Docs search typing animation ─────────────────────────────────────
  function animateDocsSearch() {
    const section = document.getElementById('demo-docs')?.closest('.feature-section')
    if (!section?.classList.contains('visible')) return
    const searchText = section.querySelector('.docs-search-text')
    if (!searchText || searchText.dataset.animated) return
    searchText.dataset.animated = '1'

    const text = 'algo...'

    if (prefersReducedMotion) {
      searchText.textContent = text
      return
    }

    let i = 0
    const interval = setInterval(() => {
      searchText.textContent = text.slice(0, ++i)
      if (i >= text.length) clearInterval(interval)
    }, 100)
  }

  // ── MutationObserver: trigger animations when .visible is added ───────
  document.querySelectorAll('.feature-section').forEach(section => {
    const mo = new MutationObserver(() => {
      if (section.classList.contains('visible')) {
        animateCounters()
        animateProgressRings()
        animateDocsSearch()
        mo.disconnect()
      }
    })
    mo.observe(section, { attributes: true, attributeFilter: ['class'] })
  })

  // Trigger for sections already visible on load
  document.querySelectorAll('.feature-section.visible').forEach(() => {
    animateCounters()
    animateProgressRings()
    animateDocsSearch()
  })

  // ══════════════════════════════════════════════════════════════════════
  //  INTERACTIVE DEMOS
  // ══════════════════════════════════════════════════════════════════════

  // ── Chat demo: clickable channels ─────────────────────────────────────
  const chatChannels = {
    'général': [
      { av: 'MR', bg: '#6366F1', name: 'Prof. Martin', nc: '#6366F1', t: '10:42', txt: 'Le livrable du <b>Projet Web E4</b> est à rendre vendredi 17h.' },
      { av: 'EL', bg: '#059669', name: 'Emma L.', nc: '', t: '10:44', txt: 'Merci ! On peut travailler en équipe ?' },
      { av: 'MR', bg: '#6366F1', name: 'Prof. Martin', nc: '#6366F1', t: '10:45', txt: 'Oui, groupes de 2-3. Utilisez le canal <b>#projet-web</b> pour coordonner.', rx: '👍 4|🎉 2' },
    ],
    'annonces': [
      { av: 'MR', bg: '#6366F1', name: 'Prof. Martin', nc: '#6366F1', t: '09:00', txt: '📌 <b>Semaine 12</b> : pas de cours mercredi. TP reporté à jeudi 14h.' },
      { av: 'MR', bg: '#6366F1', name: 'Prof. Martin', nc: '#6366F1', t: '08:30', txt: 'Résultats du TP Algo disponibles dans vos notes.', rx: '👍 8' },
    ],
    'projet-web': [
      { av: 'JD', bg: '#D97706', name: 'Jean D.', nc: '', t: '14:12', txt: 'J\'ai push l\'archi sur le repo. Quelqu\'un peut review ?' },
      { av: 'EL', bg: '#059669', name: 'Emma L.', nc: '', t: '14:15', txt: 'Je regarde ce soir ! C\'est sur quelle branche ?' },
      { av: 'JD', bg: '#D97706', name: 'Jean D.', nc: '', t: '14:16', txt: '<code>feat/auth-module</code>. Merci 🙏', rx: '👍 1' },
    ],
    'algo-tp': [
      { av: 'SB', bg: '#8B5CF6', name: 'Sara B.', nc: '', t: '16:30', txt: 'Quelqu\'un a compris la rotation AVL ? Je bloque sur le cas double.' },
      { av: 'JD', bg: '#D97706', name: 'Jean D.', nc: '', t: '16:35', txt: 'Regarde le <code>balanceFactor</code>. Si > 1 et fils gauche < 0 → rotation gauche-droite.', rx: '💡 3' },
    ]
  }

  function renderMessages(container, msgs, hasTyping) {
    container.innerHTML = ''
    msgs.forEach((m, i) => {
      const reactions = m.rx ? m.rx.split('|').map(r => `<span class="reaction">${r.trim()}</span>`).join('') : ''
      const div = document.createElement('div')
      div.className = 'demo-msg'
      div.style.setProperty('--delay', (i * 200) + 'ms')
      div.innerHTML = `<div class="msg-avatar" style="background:${m.bg}">${m.av}</div><div class="msg-body"><span class="msg-author"${m.nc ? ` style="color:${m.nc}"` : ''}>${m.name}</span><span class="msg-time">${m.t}</span><div class="msg-text">${m.txt}</div>${reactions ? `<div class="msg-reactions">${reactions}</div>` : ''}</div>`
      container.appendChild(div)
    })
    if (hasTyping) {
      const t = document.createElement('div')
      t.className = 'demo-typing'
      t.style.setProperty('--delay', (msgs.length * 200 + 200) + 'ms')
      t.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span> Jean écrit...'
      container.appendChild(t)
    }

    // Keyboard a11y for dynamically rendered reactions
    container.querySelectorAll('.reaction').forEach(el => {
      el.setAttribute('tabindex', '0')
      el.setAttribute('role', 'button')
      el.addEventListener('keydown', handleKeyActivation)
    })
  }

  document.querySelectorAll('.demo-sidebar-mini .sidebar-ch').forEach(ch => {
    ch.style.cursor = 'pointer'
    ch.addEventListener('click', () => {
      const sidebar = ch.closest('.demo-sidebar-mini')
      sidebar.querySelectorAll('.sidebar-ch').forEach(c => c.classList.remove('active'))
      ch.classList.add('active')

      const name = ch.textContent.replace(/#/g, '').replace(/\d+$/g, '').trim()
      const msgs = chatChannels[name]
      if (!msgs) return

      const win = ch.closest('.demo-window')
      const title = win.querySelector('.demo-title')
      if (title) title.textContent = '# ' + name

      const container = win.querySelector('.demo-messages')
      const hasTyping = name === 'général' || name === 'projet-web'
      renderMessages(container, msgs, hasTyping)

      // Re-trigger entry animations
      container.querySelectorAll('.demo-msg, .demo-typing').forEach(el => {
        el.style.opacity = '0'
        el.style.animation = 'none'
        void el.offsetHeight // force reflow
        el.style.animation = `msgAppear 350ms var(--ease-smooth) forwards`
        el.style.animationDelay = el.style.getPropertyValue('--delay') || getComputedStyle(el).getPropertyValue('--delay')
      })
    })
  })

  // ── Clickable reactions ─────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const rx = e.target.closest('.reaction')
    if (!rx) return
    const match = rx.textContent.match(/(.+?)\s*(\d+)/)
    if (!match) return
    const emoji = match[1].trim()
    let count = parseInt(match[2])
    if (rx.dataset.toggled) {
      count--
      delete rx.dataset.toggled
      rx.style.background = ''
    } else {
      count++
      rx.dataset.toggled = '1'
      rx.style.background = 'rgba(99, 102, 241, 0.15)'
    }
    rx.textContent = `${emoji} ${count}`
  })

  // ── Devoirs demo: expandable items ──────────────────────────────────────
  const devoirDetails = {
    'Projet Web E4': { type: 'Livrable', date: '15 mars 2026', note: 'A', desc: 'Application web responsive avec authentification et CRUD.' },
    'TP Algo':       { type: 'TP individuel', date: '30 mars 2026', note: 'En attente', desc: 'Implémentation d\'un arbre AVL avec rotations.' },
    'Rapport stage': { type: 'Mémoire', date: '15 juin 2026', note: 'En attente', desc: 'Rapport de stage de fin d\'études (40-60 pages).' },
  }

  document.querySelectorAll('.devoir-item').forEach(item => {
    item.style.cursor = 'pointer'
    item.addEventListener('click', () => {
      const next = item.nextElementSibling
      if (next?.classList.contains('devoir-detail')) { next.remove(); return }
      document.querySelectorAll('.devoir-detail').forEach(d => d.remove())

      const name = item.querySelector('.devoir-name')?.textContent || ''
      const d = devoirDetails[name] || { type: 'Devoir', date: '-', note: '-', desc: '' }

      const el = document.createElement('div')
      el.className = 'devoir-detail'
      el.innerHTML = `<div class="detail-row"><span class="detail-label">Type</span><span>${d.type}</span></div><div class="detail-row"><span class="detail-label">Échéance</span><span>${d.date}</span></div><div class="detail-row"><span class="detail-label">Note</span><span>${d.note}</span></div><div class="detail-desc">${d.desc}</div>`
      item.after(el)
    })
  })

  // ══════════════════════════════════════════════════════════════════════
  //  LIVE QUIZ - multi-questions interactif
  // ══════════════════════════════════════════════════════════════════════
  const quizQuestions = [
    { q: 'Quelle est la complexité d\'un tri fusion ?', opts: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], correct: 1, stats: [12, 68, 15, 5], count: 28 },
    { q: 'Quel protocole utilise le port 443 ?', opts: ['HTTP', 'FTP', 'HTTPS', 'SSH'], correct: 2, stats: [8, 4, 79, 9], count: 31 },
    { q: 'Que signifie le S dans SOLID ?', opts: ['Scalable', 'Single Responsibility', 'Secure', 'Stateless'], correct: 1, stats: [15, 62, 12, 11], count: 26 },
  ]

  const quizContainer = document.getElementById('live-quiz-demo')
  if (quizContainer) {
    const optsEl = document.getElementById('live-quiz-opts')
    const statsEl = document.getElementById('live-quiz-stats')
    const badgeEl = document.getElementById('live-q-badge')
    const textEl = document.getElementById('live-q-text')
    const countEl = document.getElementById('live-q-count')
    const timerEl = document.getElementById('live-q-timer')
    let qIdx = 0, revealed = false, revealT = null, nextT = null, timerIv = null

    function startTimer(seconds) {
      if (timerIv) clearInterval(timerIv)
      let remaining = seconds
      timerEl.textContent = `0:${String(remaining).padStart(2, '0')}`
      if (prefersReducedMotion) return
      timerIv = setInterval(() => {
        remaining--
        if (remaining <= 0) { clearInterval(timerIv); timerIv = null; return }
        timerEl.textContent = `0:${String(remaining).padStart(2, '0')}`
      }, 1000)
    }

    function renderQuiz(idx) {
      const q = quizQuestions[idx]
      revealed = false
      clearTimeout(revealT); clearTimeout(nextT)
      badgeEl.textContent = `Question ${idx + 1}/${quizQuestions.length}`
      textEl.textContent = q.q
      countEl.textContent = `${q.count} réponses`
      startTimer(30)
      optsEl.innerHTML = q.opts.map((o, i) =>
        `<div class="live-opt" data-idx="${i}" data-correct="${i === q.correct ? 1 : 0}" tabindex="0" role="button"><span class="live-opt-letter">${'ABCD'[i]}</span><span class="live-opt-text">${o}</span><span class="live-check">&#10003;</span></div>`
      ).join('')
      statsEl.innerHTML = q.opts.map((_, i) =>
        `<div class="live-stat-bar"><div class="live-stat-fill${i === q.correct ? ' live-stat-fill--correct' : ''}" style="--w:${q.stats[i]}%"></div><span class="live-stat-label">${'ABCD'[i]}</span><span class="live-stat-pct">${q.stats[i]}%</span></div>`
      ).join('')
      statsEl.classList.remove('revealed')
      optsEl.querySelectorAll('.live-opt').forEach(opt => {
        opt.addEventListener('click', () => onQuizClick(opt, q))
        opt.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opt.click() } })
      })
    }

    function onQuizClick(opt, q) {
      if (revealed) return
      optsEl.querySelectorAll('.live-opt').forEach(o => o.classList.remove('selected'))
      opt.classList.add('selected')
      revealT = setTimeout(() => {
        revealed = true
        if (timerIv) { clearInterval(timerIv); timerIv = null }
        optsEl.querySelectorAll('.live-opt').forEach((o, i) => {
          o.style.transitionDelay = `${i * 80}ms`
          o.classList.add(parseInt(o.dataset.idx) === q.correct ? 'revealed-correct' : 'revealed-wrong')
        })
        statsEl.classList.add('revealed')
        nextT = setTimeout(() => { qIdx = (qIdx + 1) % quizQuestions.length; renderQuiz(qIdx) }, 3000)
      }, 800)
    }

    renderQuiz(0)
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RDV (mini-Calendly) — 3 onglets : Types / Disponibilités / Mes RDV
  // ══════════════════════════════════════════════════════════════════════
  const rdvData = {
    types: [
      { name: 'Suivi individuel',    duration: 30, color: '#0EA5E9', desc: 'Point hebdomadaire projet' },
      { name: 'Soutenance',          duration: 60, color: '#8B5CF6', desc: 'Jury + 2 intervenants' },
      { name: 'Rattrapage CCTL',     duration: 45, color: '#F59E0B', desc: 'Session de recuperation' },
    ],
    disponibilites: [
      { day: 'Lun', slots: ['09:00', '10:00', '14:00', '15:30'] },
      { day: 'Mar', slots: ['10:00', '14:00'] },
      { day: 'Jeu', slots: ['09:00', '11:00', '14:00', '15:00', '16:00'] },
      { day: 'Ven', slots: ['10:30', '14:00'] },
    ],
    bookings: [
      { who: 'Emma L.',  when: 'Jeu. 9h00',   type: 'Suivi individuel', teams: true },
      { who: 'Jean D.',  when: 'Jeu. 14h00',  type: 'Suivi individuel', teams: true },
      { who: 'Sara B.',  when: 'Ven. 10h30',  type: 'Soutenance',       teams: false },
    ],
  }

  const rexDemo = document.getElementById('rex-demo')
  if (rexDemo) {
    function renderRdv(tab) {
      const panel = rexDemo.querySelector(`[data-rex-panel="${tab}"]`)
      if (!panel) return
      let h = ''
      if (tab === 'types') {
        h = '<div class="rdv-types">' + rdvData.types.map((t, i) => `
          <div class="rdv-type" style="--ic:${t.color};--d:${i * 100}ms">
            <span class="rdv-type-dot"></span>
            <div class="rdv-type-info">
              <span class="rdv-type-name">${t.name}</span>
              <span class="rdv-type-desc">${t.desc}</span>
            </div>
            <span class="rdv-type-duration">${t.duration} min</span>
          </div>
        `).join('') + '</div>'
      } else if (tab === 'disponibilites') {
        h = '<div class="rdv-week">' + rdvData.disponibilites.map((row, i) => `
          <div class="rdv-day" style="--d:${i * 80}ms">
            <span class="rdv-day-label">${row.day}</span>
            <div class="rdv-day-slots">
              ${row.slots.map(s => `<span class="rdv-slot">${s}</span>`).join('')}
            </div>
          </div>
        `).join('') + '</div>'
      } else if (tab === 'bookings') {
        h = '<div class="rdv-bookings">' + rdvData.bookings.map((b, i) => `
          <div class="rdv-booking" style="--d:${i * 100}ms">
            <div class="rdv-booking-when">${b.when}</div>
            <div class="rdv-booking-info">
              <span class="rdv-booking-who">${b.who}</span>
              <span class="rdv-booking-type">${b.type}</span>
            </div>
            ${b.teams ? '<span class="rdv-booking-teams" title="Reunion Teams auto">Teams</span>' : ''}
          </div>
        `).join('') + '</div>'
      }
      panel.innerHTML = h
    }

    function switchTab(tab) {
      rexDemo.querySelectorAll('.rex-tab').forEach(t => {
        const isActive = t.dataset.rexTab === tab
        t.classList.toggle('rex-tab--active', isActive)
        t.setAttribute('aria-selected', String(isActive))
      })
      rexDemo.querySelectorAll('.rex-panel').forEach(p => p.classList.toggle('rex-panel--active', p.dataset.rexPanel === tab))
      renderRdv(tab)
    }

    rexDemo.querySelectorAll('.rex-tab').forEach(t => {
      t.addEventListener('click', () => switchTab(t.dataset.rexTab))
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click() } })
    })
    switchTab('types')
  }

  // ── Docs demo: clickable files with preview ─────────────────────────────
  document.querySelectorAll('.doc-item').forEach(item => {
    item.style.cursor = 'pointer'
    item.addEventListener('click', () => {
      const body = item.closest('.demo-docs-body')
      const old = body.querySelector('.doc-preview')
      if (old) old.remove()

      const name = item.querySelector('span')?.textContent || 'Document'
      const icon = item.querySelector('.doc-icon')?.textContent || ''
      const color = getComputedStyle(item).getPropertyValue('--doc-color').trim() || '#6366F1'
      const previews = { PDF: '📄 Aperçu PDF - 12 pages', DOC: '📝 Document Word - 3 pages', XLS: '📊 Tableur - 45 lignes', URL: '🔗 Lien externe' }

      const el = document.createElement('div')
      el.className = 'doc-preview'
      el.innerHTML = `<div class="preview-header" style="border-left:3px solid ${color}"><span class="preview-name">${name}</span><span class="preview-close">&times;</span></div><div class="preview-body"><div class="preview-placeholder">${previews[icon] || '📎 Fichier'}</div></div>`
      body.appendChild(el)
      el.querySelector('.preview-close').addEventListener('click', e => { e.stopPropagation(); el.remove() })
    })
  })
})
