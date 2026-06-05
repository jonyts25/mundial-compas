# Legado económico — quiniela global (solo referencia)

La quiniela global es **gratuita y de honor**. No hay UI ni rutas para acuerdos de paga, liquidación ni chat general.

## Rutas

| Ruta | Estado |
|------|--------|
| `/chat-general` | Redirige a `/` |
| `/quiniela` | Sin UI de paga, acuerdo ni tablón |
| `/leaderboard` | Sin acuerdo informativo; sin badge 👑 |

## Componentes UI (sin importar en páginas)

- `src/components/quiniela/QuinielaHonorBanner.tsx`
- `src/components/quiniela/HonorTermsModal.tsx`
- `src/components/quiniela/AcuerdoPagoInformativo.tsx`
- `src/components/quiniela/TablonLiquidacion.tsx`
- `src/components/admin/ModeradorAcuerdoPanel.tsx`
- `src/components/chat-general/ChatGeneral.tsx`

## Server actions deshabilitadas (global)

- `acceptHonorTerms` — no activa `quiniela_paga`
- `guardarAcuerdoPago` — no escribe `acuerdo_pago` en liga global
- `sendChatGeneralMessage` — chat general retirado
- `guardarDepositoGanador` / `reportarDepositoRealizado` / `confirmarRecepcionPago` — tablón global retirado
- `applyPendingHonorTermsIfAny` — solo limpia localStorage, no marca paga

## Base de datos (intacta)

- `usuarios.quiniela_paga`, `quiniela_paga_at`, `terminos_honor_*`
- `liquidacion_pagos` (liga_id = liga global)
- `ligas_privadas.configuracion.acuerdo_pago`
- `mensajes_chat` con `sala: liga_general` (histórico)
- RPC `evaluar_ganador_inalcanzable` (puede seguir en BD; sin UI global de liquidación)

## Cooperacha futura

Solo **grupos privados** con `modo_competencia: cooperacion`. Tablón/acuerdo por liga privada: pendiente de Fase 4+.
