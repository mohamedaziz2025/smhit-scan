# SMHIT — Digitalisation des fiches de lutte antiparasitaire

Monorepo : App mobile **Flutter** + Dashboard web **Next.js** + Backend
**Express/MongoDB** + Microservice **IA/OCR autonome** (FastAPI, sans API
tierce). Voir le cahier des charges complet fourni pour le détail
fonctionnel (§1 à §13) et le découpage en modules (§14).

## Structure du monorepo

```
.
├── api/            Backend Express.js (TypeScript) — REST API, auth JWT+RBAC, moteur de rapport
├── web/            Dashboard Next.js 14 (App Router, TypeScript) — Admin/SuperAdmin
├── ai-ocr/         Microservice FastAPI (Python) — pipeline OCR/OpenCV/RapidFuzz
├── mobile/         App Flutter — Agent (scan/fiches) + Admin/SuperAdmin (parité web)
├── products.json   Seed catalogue produits (64 réfs)
└── docker-compose.yml
```

## Démarrer (Docker)

```bash
cp .env.example .env   # puis éditer les secrets
docker compose up --build
```

| Service | URL |
|---|---|
| Web (dashboard) | http://localhost:3000 |
| API | http://localhost:4000/api/health |
| IA/OCR | http://localhost:8000/health |
| MinIO console | http://localhost:9001 |

## Démarrer en local (sans Docker, par app)

```bash
# API
cd api && cp .env.example .env && npm install && npm run dev

# Web
cd web && cp .env.example .env && npm install && npm run dev

# IA/OCR
cd ai-ocr && python3 -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000

# Mobile
cd mobile && flutter pub get && flutter run
```

## État d'avancement (voir §14 pour l'ordre des modules)

- [x] **Module 1** — Monorepo & infra : docker-compose (6 services), squelette des 4 apps
- [ ] Module 2 — Backend modèles & auth (Mongoose, JWT+RBAC, seed produits)
- [ ] Module 3 — Microservice IA/OCR (pipeline OpenCV/PaddleOCR complet)
- [ ] Module 4 — Backend fiches (scan/edit/validate, règle 1 fiche/jour)
- [ ] Module 5 — Moteur de rapport (calculs + rendu PDF)
- [ ] Module 6 — Mobile Flutter (auth, scan, écran fiche, validation)
- [ ] Module 7 — Web Next.js (dashboard, viewer, éditeur rapport, analytics)
- [ ] Module 8 — Admin/SuperAdmin (users/clients/produits/paramètres, audit)
- [ ] Module 9 — Design system appliqué partout

### Détail Module 1

- `api/` : Express + TS, health check (`/api/health`) vérifiant Mongo + Redis, config env validée par Zod, structure prête pour modèles/routes/seed (Module 2).
- `web/` : Next.js 14 App Router + Tailwind, palette/typo SMHIT posées dans `globals.css`/`tailwind.config.ts`.
- `ai-ocr/` : FastAPI, contrat d'API complet (§7.3) posé, `/match-product` déjà fonctionnel (RapidFuzz + corrections OCR O/0, I/1, S/5, B/8), templates de layout JSON pour les 3 types de fiches.
- `mobile/` : Flutter, navigation complète par rôle (go_router + guards Riverpod), design system, écrans placeholder — `flutter analyze` et `flutter test` passent.
