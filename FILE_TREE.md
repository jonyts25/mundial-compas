# Árbol de archivos — Mundial Compas

Generado para contexto externo. Excluye: `node_modules/`, `.git/`, `.next/`, `dist/`, `build/`.

```
mundial-compas/
├── .env.example
├── .env.local                    # local only — NO commitear
├── .gitignore
├── .railwayignore
├── AGENTS.md
├── CLAUDE.md
├── Dockerfile.livescore-relay
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── railway.livescore-relay.toml
├── README.md
├── tsconfig.json
├── docs/
│   ├── MANUAL_TEST_SUITE.md
│   ├── PILOT_CHAMPIONS.md
│   ├── PILOT_CONCACAF.md
│   ├── PUSH_NOTIFICATIONS.md
│   ├── RAILWAY_CRON_LINEUPS.md
│   ├── RAILWAY_DEPLOY.md
│   └── RAILWAY_LIVESCORE_RELAY.md
├── public/
│   ├── manifest.webmanifest
│   ├── sw.js
│   └── icons/
├── scripts/
│   ├── apifootball-livescore-relay.mjs
│   ├── cargar-pilot-*.mjs
│   ├── check-db-migrations.mjs
│   ├── recargar-mundial.mjs
│   ├── replay-penalty-finale.mjs
│   ├── sync-*-cron.mjs
│   ├── test-webhook.mjs
│   └── *.ps1
├── src/
│   ├── middleware.ts
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── (app)/                 # rutas autenticadas
│   │   │   ├── page.tsx           # home
│   │   │   ├── quiniela/
│   │   │   ├── leaderboard/
│   │   │   ├── posiciones/
│   │   │   ├── chat-general/
│   │   │   └── partidos/[id]/
│   │   ├── (auth)/                # login, callback, password
│   │   └── api/
│   │       ├── admin/
│   │       ├── push/
│   │       ├── partidos/
│   │       └── webhooks/
│   ├── components/
│   │   ├── home/
│   │   ├── partidos/
│   │   ├── quiniela/
│   │   ├── chat-general/
│   │   ├── push/
│   │   └── pilot/
│   ├── hooks/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── apifootball/webhook/   # livescore principal
│   │   ├── api-football/          # legado / fixtures
│   │   ├── partidos/
│   │   ├── quiniela/
│   │   ├── push/
│   │   ├── narracion/
│   │   └── ...
│   └── types/
└── supabase/
    ├── migrations/                # 17 archivos SQL
    └── seeds/
```

**Conteo aproximado:** ~210 archivos fuente (sin `.next` ni `node_modules`).
