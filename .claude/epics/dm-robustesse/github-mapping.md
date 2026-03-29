# GitHub Mapping — dm-robustesse

| File | Issue | Title |
|------|-------|-------|
| epic.md | [#72](https://github.com/rohanfosse/cursus/issues/72) | Epic: dm-robustesse — Robustesse DMs + DMs etudiant-etudiant |
| 73.md | [#73](https://github.com/rohanfosse/cursus/issues/73) | Queue offline + retry envoi DM |
| 74.md | [#74](https://github.com/rohanfosse/cursus/issues/74) | Search limit 200 + validation destinataire |
| 75.md | [#75](https://github.com/rohanfosse/cursus/issues/75) | Tests Phase 1 robustesse DMs |
| 76.md | [#76](https://github.com/rohanfosse/cursus/issues/76) | Backend DMs etudiant-etudiant |
| 77.md | [#77](https://github.com/rohanfosse/cursus/issues/77) | Frontend DMs etudiant-etudiant |
| 78.md | [#78](https://github.com/rohanfosse/cursus/issues/78) | Tests Phase 2 DMs etudiant-etudiant |

## Dependencies

```
Phase 1:
  #73 Queue offline + retry ──────┐
  #74 Search limit + validation ──┼──→ #75 Tests Phase 1
                                  │
Phase 2:                          │
  #74 ──→ #76 Backend etudiant ──┼──→ #78 Tests Phase 2
           #76 ──→ #77 Frontend ──┘
```

## Labels

- `epic` + `feature` on #72
- `task` + `epic:dm-robustesse` on #73-#78
