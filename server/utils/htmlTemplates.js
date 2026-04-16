/**
 * htmlTemplates.js — Server-rendered HTML pages for public booking routes.
 */
const { escHtml } = require('./escHtml')

/** Generates the HTML cancel confirmation page shown to the tutor. */
function cancelConfirmationPage({ eventTitle, rebookUrl }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>RDV annule</title>
<style>body{font-family:-apple-system,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f8fafc;margin:0}
.card{background:#fff;border-radius:16px;padding:40px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:400px}
h1{color:#ef4444;font-size:24px}p{color:#64748b;line-height:1.6}
a{display:inline-block;margin-top:16px;padding:12px 24px;background:#3b82f6;color:#fff;text-decoration:none;border-radius:8px;font-weight:600}</style>
</head>
<body><div class="card">
  <h1>RDV annule</h1>
  <p>Votre rendez-vous <strong>${escHtml(eventTitle)}</strong> a ete annule avec succes.</p>
  <a href="${escHtml(rebookUrl)}">Reserver un autre creneau</a>
</div></body></html>`
}

module.exports = { cancelConfirmationPage }
