/* ══════════════════════════════════════════════════════════════════════════
   Cursus Landing - app.js
   Scroll-triggered mini-demos, dark mode, version fetch
   ══════════════════════════════════════════════════════════════════════════ */

// ── Reduced motion preference ─────────────────────────────────────────────
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ── Dark mode (pill toggle, both icons always visible) ────────────────────
const saved = localStorage.getItem('cursus-landing-theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const initial = saved || (prefersDark ? 'dark' : 'light')
document.documentElement.dataset.theme = initial

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('cursus-landing-theme')) {
    document.documentElement.dataset.theme = e.matches ? 'dark' : 'light'
  }
})

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.dataset.theme = next
  localStorage.setItem('cursus-landing-theme', next)
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Lucide icons
  if (window.lucide) lucide.createIcons()

  // ── Version fetch ─────────────────────────────────────────────────────
  fetch('/download')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data?.version) return
      const v = data.version
      ;['pill-version', 'footer-version'].forEach(id => {
        const el = document.getElementById(id)
        if (el) el.textContent = v
      })
    }).catch(() => {})

  // ── OS detection for download cards ───────────────────────────────────
  const ua = navigator.userAgent.toLowerCase()
  const os = ua.includes('win') ? 'win' : ua.includes('mac') ? 'mac' : 'web'
  document.getElementById('dl-' + os)?.classList.add('recommended')

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
})
