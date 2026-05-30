# Notificaciones push (PWA — iOS y Android)

Web Push para avisar de **goles**, **tarjetas rojas** y **fases del partido** (inicio, medio tiempo, segundo tiempo y final) cuando la app está instalada como PWA.

## Requisitos por plataforma

| Plataforma | Qué hace falta |
|------------|----------------|
| **iOS 16.4+** | Instalar la app en pantalla de inicio (Safari → Compartir → «Añadir a inicio»). Push **solo** funciona en modo PWA, no en Safari normal. |
| **Android** | Chrome: funciona en PWA instalada o, en muchos equipos, también en el navegador. Recomendado instalar la PWA igual. |
| **Servidor** | HTTPS obligatorio (Railway ya lo tiene). Claves VAPID en variables de entorno. |

## 1. Migración Supabase

Aplica la migración `20260530120000_push_subscriptions.sql` (SQL Editor o CLI):

- Tabla `push_subscriptions`
- Tipo de notificación `tarjeta_roja`

## 2. Generar claves VAPID

```powershell
node scripts/generate-vapid-keys.mjs
```

Añade en **Railway** y **`.env.local`**:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=https://mundial-compas.up.railway.app
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` debe existir también en Railway **antes del build** (igual que las otras `NEXT_PUBLIC_*`).

## 3. Desplegar

```powershell
npx railway up
```

## 4. Probar en iPhone

1. Abre `https://mundial-compas.up.railway.app` en **Safari**
2. Inicia sesión
3. Compartir → **Añadir a pantalla de inicio**
4. Abre la app desde el icono (modo standalone)
5. Debe aparecer el banner «¿Te avisamos de goles y tarjetas rojas?»
6. Toca **Activar notificaciones** y acepta el permiso de iOS

## 5. Probar en Android

1. Chrome → menú → **Instalar aplicación** / **Añadir a pantalla de inicio**
2. Abre la PWA, inicia sesión y activa notificaciones

## Cómo funciona en código

1. El webhook de apifootball encola filas en `notificaciones` (gol / tarjeta roja).
2. Si el usuario tiene fila en `push_subscriptions`, el servidor envía Web Push con `web-push`.
3. El service worker (`public/sw.js`) muestra la notificación; al tocarla abre el partido.

## No hace falta Firebase (FCM) para PWA

Esta implementación usa **Web Push estándar** (VAPID). Es lo que soporta iOS 16.4+ en PWAs instaladas.

Si más adelante quisieras app nativa en App Store / Play Store, ahí sí usarías FCM + APNs por separado.

## Troubleshooting

| Problema | Solución |
|----------|----------|
| No aparece el banner en iOS | Debe abrirse desde el icono de inicio, no Safari. iOS &lt; 16.4 no soporta push web. |
| «Push no disponible en el servidor» | Faltan claves VAPID o no redeployaste tras añadirlas. |
| Llega el correo pero no push | Usuario no activó notificaciones o `push_habilitado = false` en `usuarios`. |
| Notificación en BD pero no al teléfono | Revisa `push_subscriptions` para ese `usuario_id`. |
