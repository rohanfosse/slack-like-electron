---
subject: Refonte vue devoir (GestionDevoirModal) — vue fusionnee sans onglets
type: brownfield
rounds: 7
ambiguity: 16%
created: 2026-03-30
---

# Specification : Refonte de la modale de consultation/edition de devoir

## Scores de clarte

| Dimension | Score | Poids | Contribution |
|-----------|-------|-------|-------------|
| Objectif | 0.90 | 35% | 0.32 |
| Contraintes | 0.70 | 25% | 0.18 |
| Criteres de succes | 0.80 | 25% | 0.20 |
| Contexte | 0.80 | 15% | 0.12 |
| **Total** | | | **0.84 (16% ambiguite)** |

## Objectif

Refondre GestionDevoirModal (948 lignes, 3 onglets) en une vue unique scrollable sans onglets. Les informations cles (meta, rendus, notes) doivent etre visibles d'un coup d'oeil sans navigation. La rubrique de notation, rarement utilisee, devient un panneau depliable optionnel.

## Hierarchie de l'information (du haut vers le bas)

1. **Meta** — Titre, type (badge couleur), deadline (avec countdown), progression (barre rendus), projet/categorie, status (brouillon/publie/expire)
2. **Rendus** — Liste des etudiants avec status (rendu/manquant), fichier/lien, date de soumission
3. **Notes** — Note inline par etudiant, feedback rapide, note mode (A-F / numerique)
4. **Edition** — Boutons d'action : modifier deadline, publier, envoyer rappel, toggle requires_submission
5. **Rubrique** (depliable) — Criteres + poids, rarement consulte

## Contraintes

- Remplacer les 3 onglets (Apercu/Rendus/Rubrique) par une seule vue scrollable
- Garder la modale (pas de page entiere) — coherent avec le reste de l'app
- La rubrique devient un `<details>` ou panneau repliable, fermee par defaut
- Ajouter le toggle `requires_submission` editable apres creation
- Reutiliser les composants existants (Modal.vue, DateTimePicker, Toast, etc.)
- Ne pas casser le flux existant : clic sur devoir dans la liste -> modale s'ouvre
- Garder le reminder builder (rappel) accessible depuis la vue

## Non-objectifs (hors scope)

- Refondre la vue liste (prof) — elle est OK en l'etat
- Refondre la vue etudiant — report a un chantier ulterieur
- Unifier NewDevoirModal + NewTravailModal — hors scope ici
- Migrer les champs description vers des colonnes DB (room, duree, etc.) — dette technique, pas ce chantier
- Refondre le systeme de rubrique — il reste tel quel, juste replie

## Criteres d'acceptation

- [ ] Zero onglet : tout visible dans une seule vue scrollable
- [ ] Meta visible sans scroll (titre, type badge, deadline, progression)
- [ ] Liste rendus inline avec status etudiant (rendu/manquant/note)
- [ ] Toggle requires_submission editable par le prof
- [ ] Rubrique en panneau depliable, fermee par defaut
- [ ] Rappel accessible (bouton ou section depliable)
- [ ] Edition inline fluide (titre, deadline, description)
- [ ] Modale taille large (size="lg") pour accommoder le contenu
- [ ] Responsive : lisible sur tablette (min 768px)
- [ ] Dark mode fonctionne

## Ameliorations secondaires (si le temps le permet)

- [ ] Vue etudiant : ameliorer la lecture d'un devoir (même principe de vue unique)
- [ ] Unifier `isEventType` dans un seul endroit
- [ ] Ajouter le DateTimePicker dans l'edition inline de deadline

## Hypotheses exposees et resolues

| Hypothese | Challenge | Resolution |
|-----------|-----------|-----------|
| "Les deux vues sont confuses" | Est-ce la vue liste ou la modale de lecture ? | C'est la modale de lecture (GestionDevoirModal) |
| "La vue prof est a refaire" | La liste prof a deja des filtres et du grouping | Confirmé : la liste est OK, c'est la modale qui pose probleme |
| "Il faut tout montrer" | 3 onglets = trop de contenu pour une seule vue ? | La rubrique est rarement utilisee, elle peut etre repliee |
| "Rendus en priorite" | Que veut-on voir en premier ? | Meta d'abord (titre, deadline, progression), puis rendus, puis notes |

## Contexte technique

### Fichier principal a refondre
```
src/renderer/src/components/modals/GestionDevoirModal.vue (948 lignes → objectif ~500)
```

### Fichiers impactes
```
src/renderer/src/composables/useTeacherGrading.ts — notation inline
src/renderer/src/composables/useDevoirsTeacher.ts — données
src/renderer/src/stores/travaux.ts — actions (setNote, setFeedback)
src/renderer/src/components/ui/DateTimePicker.vue — pour edition deadline
```

### Pain points a corriger dans ce chantier
- #3: requires_submission non editable → ajouter toggle
- #5: isEventType inconsistant → unifier (si temps)

### Pain points hors scope
- #2: Description comme pseudo-BDD (dette technique future)
- #4: 2 modales de creation dupliquees (chantier separe)

## Transcription

<details><summary>Voir les Q&R</summary>

**Round 1 — Objectif** : Quel probleme te gene le plus ?
→ Vue devoirs confuse

**Round 2 — Objectif** : Vue etudiant, prof, ou les deux ?
→ Les deux

**Round 3 — Criteres** : Que veux-tu voir comme prof en 5 secondes ?
→ Liste filtrable (dense, efficace)

**Round 4 — Objectif (Contradicteur)** : La vue prof a deja une liste. Le vrai probleme ?
→ C'est la modale de lecture d'un devoir qui derange (GestionDevoirModal)

**Round 5 — Criteres** : Qu'est-ce qui frustre dans la modale ?
→ Trop d'onglets, infos fragmentees

**Round 6 — Contraintes (Simplificateur)** : La rubrique est-elle necessaire a chaque consultation ?
→ Rarement utilisee, peut etre cachee/optionnelle

**Round 7 — Criteres** : Hierarchie de l'information ?
→ Meta → Rendus → Notes → Edit

</details>
