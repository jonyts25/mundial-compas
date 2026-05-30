# Despliegue en Railway (sin GitHub) — Mundial Compas

## Scripts de producción (`package.json`)

```json
"build": "next build",
"start": "next start -H 0.0.0.0"
```

- **build:** estándar Next.js 16 — correcto para Railway.
- **start:** `-H 0.0.0.0` escucha en todas las interfaces del contenedor (requerido en Docker/Railway).
- Railway inyecta `PORT` automáticamente; Next.js 16 lo respeta sin flags extra.
- No hace falta `next start -p $PORT` salvo que quieras forzarlo manualmente.

---

## 1. Instalar Railway CLI en Windows

### Opción A — npm (recomendada)

```powershell
npm install -g @railway/cli
railway --version
```

### Opción B — Scoop

```powershell
scoop install railway
railway --version
```

---

## 2. Iniciar sesión

```powershell
cd D:\apps\mundial-compas
railway login
```

Se abre el navegador para autorizar la CLI.

---

## 3. Crear proyecto y vincular carpeta local

### Proyecto nuevo

```powershell
cd D:\apps\mundial-compas
railway init
```

- Elige **Create new project**.
- Asigna un nombre (ej. `mundial-compas`).

### Vincular carpeta existente (si ya creaste el proyecto en la web)

```powershell
railway link
```

Selecciona tu proyecto y el **service** (entorno de la app Next.js).

---

## 4. Variables de entorno en Railway

Copia desde tu `.env.local` al panel **Variables** del service (o con CLI):

```powershell
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
railway variables set SUPABASE_SERVICE_ROLE_KEY="eyJ..."
railway variables set API_FOOTBALL_KEY="tu-apikey-apifootball"
railway variables set APIFOOTBALL_LEAGUE_ID="28"
railway variables set API_FOOTBALL_WEBHOOK_SECRET="tu-secret-largo-aleatorio"
railway variables set ADMIN_CARGAR_PARTIDOS_SECRET="otro-secret-largo"
railway variables set APIFOOTBALL_TIMEZONE="America/Mexico_City"
railway variables set APIFOOTBALL_WORLD_CUP_FROM="2026-06-01"
railway variables set APIFOOTBALL_WORLD_CUP_TO="2026-07-31"
```

Opcional:

```powershell
railway variables set API_FOOTBALL_WEBHOOK_SIGNATURE_HEADER="x-apifootball-webhook-secret"
railway variables set API_FOOTBALL_BASE_URL="https://apiv3.apifootball.com/"
```

### Tabla resumen

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente Supabase (browser + server) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server Actions, webhooks, queries admin |
| `API_FOOTBALL_KEY` | Carga partidos apifootball.com |
| `APIFOOTBALL_LEAGUE_ID` | Mundial = `28` |
| `API_FOOTBALL_WEBHOOK_SECRET` | Bearer del webhook `/api/webhooks/football` |
| `ADMIN_CARGAR_PARTIDOS_SECRET` | Bearer de `/api/admin/cargar-partidos` |
| `NEXT_PUBLIC_APP_URL` | URL pública sin `/` final (ej. `https://mundial-compas.up.railway.app`) — **recuperar contraseña** |

**Importante:** las variables `NEXT_PUBLIC_*` deben existir también en Railway para el build.

### Supabase Auth (recuperar contraseña)

En [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto → **Authentication** → **URL Configuration**:

| Campo | Valor |
|-------|--------|
| **Site URL** | `https://mundial-compas.up.railway.app` (no `localhost`) |
| **Redirect URLs** | Añade estas líneas (una por línea): |

```
https://mundial-compas.up.railway.app/callback
https://mundial-compas.up.railway.app/callback?next=/actualizar-contrasena
http://localhost:3000/callback
```

Si el correo sigue abriendo `localhost:3000`, el enlace viejo ya estaba generado — pide **otro** correo desde la app en producción después de guardar lo anterior.

---

## 5. Desplegar

```powershell
cd D:\apps\mundial-compas
railway up
```

- Sube el código local (sin GitHub).
- Railway ejecuta `npm install`, `npm run build`, `npm run start`.
- Al terminar, muestra la URL pública: `https://mundial-compas-production.up.railway.app`

### Dominio y webhook

Configura en apifootball (relay o integración HTTP):

```
POST https://TU-APP.up.railway.app/api/webhooks/football
Authorization: Bearer <API_FOOTBALL_WEBHOOK_SECRET>
Content-Type: application/json
```

Prueba manual:

```powershell
curl -X GET "https://TU-APP.up.railway.app/api/webhooks/football"
```

---

## 6. Post-deploy

1. Cargar partidos en producción:

```powershell
curl -X POST "https://TU-APP.up.railway.app/api/admin/cargar-partidos" `
  -H "Authorization: Bearer TU_ADMIN_CARGAR_PARTIDOS_SECRET"
```

2. Aplicar migraciones Supabase (SQL Editor) si aún no están todas.

3. Habilitar Realtime en `partidos` y `mensajes_chat`.

4. Probar login, Home, quiniela, detalle partido, leaderboard.

---

## 7. Comandos útiles

```powershell
railway status
railway logs
railway open          # abre el dashboard del proyecto
railway variables     # lista variables
```
