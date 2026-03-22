# Politique de securite

## Versions supportees

| Version | Supportee |
|---------|-----------|
| 0.1.x   | Oui       |

## Signaler une vulnerabilite

Si vous decouvrez une vulnerabilite de securite, merci de ne **pas** ouvrir une issue publique.

Contactez directement : **rohan.fosse@viacesi.fr**

Vous recevrez une reponse sous 48h. Nous corrigerons les vulnerabilites critiques dans les 7 jours suivant la confirmation.

## Mesures de securite en place

- Authentification JWT avec secret de 32+ caracteres
- Mots de passe hashes avec bcrypt (10 rounds)
- Context isolation et sandbox actives (Electron)
- Prepared statements SQL (pas d'interpolation directe)
- Validation des entrees avec Zod
- Content Security Policy restrictive
- CORS configure
- Rate limiting sur les endpoints d'authentification
