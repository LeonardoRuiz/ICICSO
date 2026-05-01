# Runbook Local

## Comando principal

```powershell
.\scripts\start-icicso-mockup.ps1
```

## Flujo recomendado

1. Arranque completo:

```powershell
.\scripts\start-icicso-mockup.ps1
```

2. Rearranque rápido sin recompilar:

```powershell
.\scripts\start-icicso-mockup.ps1 -NoBuild
```

3. Diagnóstico:

```powershell
.\scripts\Invoke-ContinuumDoctor.ps1
```

4. Detención:

```powershell
.\scripts\stop-icicso-mockup.ps1
```

## Configuración

- la fuente de verdad local es `config/env/.env.local`
- si no existe, el launcher la crea desde `config/env/.env.local.example`
- el launcher ejecuta `config-validate.ps1 -Environment local -Sync -AllowPlaceholders`

## Infraestructura opcional

El mockup puede arrancar en modo degradado sin PostgreSQL, Redis, Kafka o MinIO.

Para levantar infraestructura:

```powershell
cd .\icicso-local
docker compose up -d
```

## URLs principales

- mockup HTML: `http://127.0.0.1:8090/index.html`
- gateway live: `http://127.0.0.1:3100/health/live`
- gateway ready: `http://127.0.0.1:3100/health`
- canon emulator: `http://127.0.0.1:8098/index.html`
