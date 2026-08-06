# SMHIT — App mobile (Flutter)

Squelette Module 1 : navigation par rôle (go_router + guards Riverpod),
design system SMHIT (§12), écrans placeholder pour chaque route (§11).

## Démarrer

```bash
flutter pub get
flutter run
```

L'écran de connexion propose 3 boutons "démo" (Agent / Admin / Super Admin)
pour tester le routage RBAC sans backend — la vraie authentification
(POST /auth/login, JWT) arrive au **Module 6**.

## État actuel

- ✅ Navigation complète (§11) avec guards par rôle
- ✅ Design system (couleurs, thème Material 3) — §12
- ✅ `flutter analyze` : 0 issue · `flutter test` : smoke test passant
- ⏳ Écrans métier réels (scan caméra, édition fiche, clients, rapports, analytics, admin) — Modules 6/7/8
- ⏳ Client HTTP (Dio) + cache offline (Hive) — Module 6
