# SMHIT — Microservice IA/OCR

FastAPI autonome, sans dépendance à une API Claude/OpenAI. Voir §7 du
cahier des charges pour le contrat d'API complet.

## Démarrer en local (sans Docker)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

`GET /health` doit répondre `{"status": "ok", ...}`.

## État actuel (Module 1 — squelette)

- ✅ Contrat d'API posé (`/health`, `/extract`, `/match-product`, `/reload-layouts`)
- ✅ `/match-product` fonctionnel (RapidFuzz + corrections OCR O/0, I/1, S/5, B/8)
- ✅ Templates de layout JSON pour les 3 types de fiches (`layouts/`)
- ⏳ Pipeline OpenCV (deskew, détection tableau/cases) — **Module 3**
- ⏳ OCR PaddleOCR — **Module 3** (dépendances lourdes commentées dans `requirements.txt`)
