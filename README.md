# AI Value Blueprint — System

A two-part web system for delivering personalised AI Value Blueprints to clients.

## Structure

```
ai-value-blueprint/
├── frontend/   ← Next.js 14, deployed to Vercel
└── backend/    ← Node.js/Express/TypeScript, deployed to Railway
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and other values in .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to your backend URL
npm install
npm run dev
```

## ⚠️ Before First Run: Replace SKILL.md Files

The `backend/src/skills/` directory contains **placeholder** SKILL.md files.
Replace these with your actual skill files:

- `blueprint-intake.md`
- `blueprint-maturity.md`
- `blueprint-opportunities.md`
- `blueprint-roadmap.md`
- `blueprint-assembly.md`
- `methodology-and-contracts.md`

## Environment Variables

### Backend (.env on Railway)
| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `DATABASE_PATH` | Path to SQLite DB (default: `./data/jobs.db`) |
| `UPLOADS_DIR` | Where uploaded files are stored |
| `JOBS_DIR` | Where job outputs and DOCX files are stored |
| `REVIEWER_SECRET_TOKEN` | Token for admin API access |
| `FRONTEND_URL` | Your Vercel frontend URL (for CORS) |

### Frontend (.env.local on Vercel)
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Password for the `/admin` page |

## Deployment

1. **Backend → Railway**: Connect repo, set env vars, deploy. Mount a volume at `/app/data`.
2. **Frontend → Vercel**: Connect repo, set `NEXT_PUBLIC_API_URL` to your Railway URL, deploy.

## Pipeline Flow

```
Client submits form → POST /api/intake
  → Step A: Parse uploaded documents
  → Step B: blueprint-intake skill (dossier)
  → Step C: blueprint-maturity skill (readiness scores)
  → Step D: blueprint-opportunities skill (opportunity map)
  → Step D2: blueprint-roadmap skill (action sequence)
  → Step E: blueprint-assembly skill (final text)
  → DOCX generation
  → Status: review_ready → reviewer approves → Status: approved
```

## Admin Interface

Access at `/admin`. Uses the `NEXT_PUBLIC_ADMIN_PASSWORD` / `REVIEWER_SECRET_TOKEN`.

Features:
- Live job list with status and progress
- Confidence scores per pipeline step (green ≥80%, amber 60–79%, red <60%)
- Reviewer flags highlighting issues
- DOCX download
- Intermediate output downloads (Steps B–E)
- One-click approval
