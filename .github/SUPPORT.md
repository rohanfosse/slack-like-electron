# Obtenir de l'aide

Avant d'ouvrir une issue, voici comment trouver de l'aide selon ce que tu
cherches.

## J'ai une question

[**GitHub Discussions**](https://github.com/rohanfosse/cursus/discussions) est
le bon endroit pour :

- Comprendre comment utiliser une fonctionnalité
- Demander un avis sur une approche d'intégration
- Partager un retour d'expérience
- Discuter d'une idée avant de la formaliser en feature request

Les Discussions restent ouvertes plus longtemps qu'une issue et
permettent à d'autres utilisateurs de retrouver les réponses.

## J'ai trouvé un bug

Ouvre une [**issue avec le template bug**](https://github.com/rohanfosse/cursus/issues/new?template=bug_report.yml).
Le formulaire guide la collecte des infos nécessaires (étapes, plateforme,
version, console).

## J'ai une idée de fonctionnalité

Ouvre une [**issue avec le template feature**](https://github.com/rohanfosse/cursus/issues/new?template=feature_request.yml).
Plus tu décris le problème que la feature résout, plus la suggestion a de
chances d'aboutir.

## J'ai trouvé une faille de sécurité

**N'ouvre pas d'issue publique.** Utilise les
[GitHub Security Advisories](https://github.com/rohanfosse/cursus/security/advisories/new)
ou contacte directement `contact@rohanfosse.com`. Voir
[SECURITY.md](../SECURITY.md) pour les détails.

## Je veux contribuer du code

Lis [**CONTRIBUTING.md**](../CONTRIBUTING.md) — il couvre la mise en place
locale, les conventions, le workflow PR et les règles de style.

## J'ai un problème avec mon installation

Vérifie d'abord :

1. Tu utilises **Node.js 20+** (CI tourne sur 22)
2. Le serveur est démarré sur le bon port (`PORT=3001` par défaut)
3. La base SQLite existe (créée auto au premier lancement)
4. Les variables d'environnement nécessaires sont définies (cf.
   [README — Variables d'environnement](../README.md#deploiement))

Si le problème persiste, ouvre une issue avec les logs serveur et la
console DevTools.

## Réponse

Cursus est maintenu individuellement sur du temps personnel. Les réponses
aux questions générales arrivent en best-effort, dans l'ordre de priorité :

1. **Failles de sécurité** : sous 72 h
2. **Bugs bloquants** (l'app ne démarre pas, perte de données) : sous 7 jours
3. **Bugs non bloquants** : best-effort
4. **Suggestions de fonctionnalités** : revues quand le temps le permet
5. **Questions générales (Discussions)** : best-effort

Merci pour ta patience.
