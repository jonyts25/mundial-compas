# MATCH-STATS-BACKFILL-1 — Reporte

**Fecha:** 2026-06-23T23:57:56.048Z
**Modo:** escritura real
**Entorno:** producción Supabase

## Resumen

| Métrica | Valor |
|---------|------:|
| Partidos finalizados con fixture | 46 |
| Ya con statistics (antes) | 1 |
| Candidatos sin statistics | 45 |
| Procesados | 45 |
| Actualizados | 45 |
| Omitidos | 0 |
| Fallidos | 0 |
| Llamadas API (aprox.) | 45 |
| batch-size | 3 |
| delay-ms | 7000 |

## Ejemplos actualizados

### Mexico vs South Africa

- partido_id: `e04a2b98-cc15-42cf-9798-9a64d3317641`
- fixture: `1489369`
- posesión: 61 / 39
- tiros: 16 / 3

### South Korea vs Czechia

- partido_id: `e8f64522-550c-4b2b-88e3-0c85f34ac7e8`
- fixture: `1538999`
- posesión: 62 / 38
- tiros: 15 / 7

### Canada vs Bosnia & Herzegovina

- partido_id: `38cf234c-4959-4942-9c75-697c24cf4c9b`
- fixture: `1539000`
- posesión: 61 / 39
- tiros: 13 / 8

### USA vs Paraguay

- partido_id: `1407cc11-7120-4cbb-b4c2-07de1ac94ef0`
- fixture: `1489370`
- posesión: 65 / 35
- tiros: 16 / 9

### Qatar vs Switzerland

- partido_id: `e6f2dbfa-bb69-4bb7-b60d-5970e73189a6`
- fixture: `1489373`
- posesión: 32 / 68
- tiros: 6 / 26

## Verificación post-backfill

| Métrica | Valor |
|---------|------:|
| Finalizados totales | 46 |
| Con `metadata.statistics` (api-sports) | **46** |
| Sin statistics | **0** |
| en_vivo / programado (no tocados) | 26 |

Duración aprox. del run: ~7 min (`batch-size=3`, `delay-ms=7000`).

## Notas

- Solo `estatus=finalizado` con `api_football_fixture_id`.
- No se tocaron partidos en_vivo ni programados.
- Rate limit: pausa entre partidos y entre lotes.