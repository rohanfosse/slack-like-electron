# Changelog

## v1.0.16 (2026-03-28)

### Corrections

- Les noms des membres du groupe s'affichent maintenant correctement pour les etudiants (l'API utilisee etait reservee aux enseignants)
- Le widget customizer met a jour les widgets immediatement sans recharger la page
- Les bookmarks s'affichent correctement dans le widget (mauvaise cle localStorage corrigee)

### Ameliorations

- Nouveau panneau de personnalisation des widgets : sections Actifs/Disponibles, drag-and-drop pour reordonner, toggles visuels
- 15+ casts `as any` supprimes, types precis ajoutes dans l'API IPC (getDmFiles, getEngagementScores, getTeacherNotes, getStudentProfile)
- Accessibilite : navigation clavier (Space/Enter) sur les boutons de widgets, aria-labels sur les widgets non-interactifs, role=tablist sur le dashboard
- Sections collapsibles de la sidebar accessibles au clavier (Enter/Space + aria-expanded)
- Recherche debounced dans l'historique Quiz et REX (nouveau composable `useDebounce`)
- Couleurs de notes unifiees entre dashboard etudiant et analytique enseignant
- Cles localStorage centralisees dans `STORAGE_KEYS` (bookmarks, quicklinks, remember_token)
- `.sa-empty` deduplique dans un CSS partage au lieu de 7 copies
- `numericGradeClass()` et `gradeColor()` extraits dans `utils/grade.ts`
- Performances : WidgetGroupMembers passe de N³ appels API a 3 requetes, WidgetRecentDoc optimise (reduce au lieu de sort)

### Tests

- 21 nouveaux tests : `grade.test.ts` (15) + `useDebounce.test.ts` (6)
- Total frontend : 12 fichiers, 149 tests, 100% pass

### Infrastructure

- Configuration Playwright E2E prete (playwright.config.ts, tests/e2e/auth.spec.ts)
- Agent distant programme toutes les heures pour ameliorer la qualite du code et la securite
- Scripts `test:e2e` et `test:e2e:ui` ajoutes

---

## v1.0.13 et avant

Voir l'historique git pour les versions precedentes.
