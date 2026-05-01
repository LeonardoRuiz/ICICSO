# SYSTEM MAP

## 1. Topología real

```text
ICICSO/
├─ README.md
├─ package.json
├─ pnpm-workspace.yaml
├─ Launch-ICICSO-Continuum.cmd
├─ .github/workflows/
├─ config/
├─ docs/
├─ infra/
├─ scripts/
├─ services/
│  └─ ingestion-orquestador/
├─ icicso/
├─ icicso-local/
├─ 08_Plataforma_Digital/
│  └─ icicso-foundation/
├─ domain/
├─ packages/
├─ tools/
│  └─ desktop-launcher/
├─ ICICSO_PAPERS/
├─ ICICSO_TERMINOLOGIAS/
├─ evidence/
├─ logs/
├─ dist/
├─ 03_Outputs/
└─ _quarantine/
```

## 2. Núcleos reales

### Núcleo 1. Canon mínimo

Ruta:

- `icicso/`

Entradas:

- `icicso/package.json`
- `icicso/apps/emulator/index.html`
- `scripts/start-icicso-canon-emulator.ps1`

Estado:

- funcional parcial;
- pruebas pasan;
- API canónica aún placeholder.

### Núcleo 2. Runtime local integral

Ruta:

- `icicso-local/`

Entradas:

- `icicso-local/package.json`
- `icicso-local/docker-compose.yml`
- `scripts/start-icicso-mockup.ps1`
- `scripts/start-icicso-mockup.bat`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\Abrir ICICSO Mockup Local.cmd`

Conectividad principal:

- `gateway-api` depende de:
  - `auth-service`
  - `identity-service`
  - `audit-service`
  - `storage-service`
  - `ingestion-service`
  - `terminology-service`
  - `data-governance-service`
  - `evidence-lake-service`
  - `ghl-service`
  - `kbol-service`
  - `runbook-service`
  - `readiness-service`
  - `case-control-service`
  - `systemic-risk-service`
  - `cqoi-service`
  - `semantic-terminology-engine` opcional

### Núcleo 3. Backend Python documental

Ruta:

- `services/ingestion-orquestador/`

Entradas:

- `services/ingestion-orquestador/pyproject.toml`
- `services/ingestion-orquestador/app/main.py`

Estado:

- corrible;
- probado;
- integrado débilmente con el resto.

### Núcleo 4. Foundation alterno

Ruta:

- `08_Plataforma_Digital/icicso-foundation/`

Entradas:

- `08_Plataforma_Digital/icicso-foundation/package.json`
- `08_Plataforma_Digital/icicso-foundation/docker-compose.yml`
- `08_Plataforma_Digital/icicso-foundation/apps/api/src/server.ts`
- `08_Plataforma_Digital/icicso-foundation/apps/web/src/main.tsx`

Estado:

- apps con código real;
- build global roto.

## 3. Mapa de conectividad

### `icicso/`

```text
scripts/start-icicso-canon-emulator.ps1
  -> icicso/apps/emulator/
     -> src/main.js
     -> src/data/architectureMap.*
```

No hay backend real equivalente en `icicso/apps/api`; es placeholder.

### `icicso-local/`

```text
scripts/start-icicso-mockup.ps1
  -> compila packages/config, logger, contracts, database, canonical-types
  -> compila apps/*
  -> valida docker infra externa
  -> levanta Node dist/index.js de cada servicio
  -> levanta desktop-emulator

desktop launchers externos
  -> Launch-ICICSO-Continuum.cmd
     -> scripts/start-icicso-mockup.bat
        -> scripts/start-icicso-mockup.ps1
```

Gateway:

```text
gateway-api
  -> /block1/overview
     -> auth-service
     -> identity-service
     -> audit-service

  -> /block2/*
     -> storage-service
     -> ingestion-service
     -> terminology-service
     -> data-governance-service

  -> /block3/*
     -> evidence-lake-service

  -> /block5/*
     -> ghl-service
     -> kbol-service

  -> /block6/*
     -> runbook-service
     -> readiness-service

  -> /block7/*
     -> case-control-service

  -> /block8/*
     -> systemic-risk-service
     -> cqoi-service
```

Dependencias transversales verificadas:

- `@icicso/config`
- `@icicso/contracts`
- `@icicso/database`
- `@icicso/logger`

Infra requerida por launcher:

- PostgreSQL `5432`
- Redis `6379`
- Kafka `9092`
- MinIO `9000`

### `services/ingestion-orquestador/`

```text
app/main.py
  -> app/api/router.py
  -> app/core/config.py
  -> app/services/catalog_repository.py
  -> sqlite/catalog layer
```

### `08_Plataforma_Digital/icicso-foundation/`

```text
apps/web
  -> apps/api
  -> docs/emulator/block-1-foundation.json

apps/api
  -> @icicso/database
  -> @icicso/domain
  -> @icicso/events
  -> @icicso/rules
  -> @icicso/shared
```

Fallos de conectividad:

- varios paquetes referencian `@icicso/shared-kernel`, pero ese paquete no existe en ese workspace.

## 4. Árboles huérfanos o de baja conectividad

- `domain/`
- `engines/`
- `packages/evidence-intelligence`
- `apps/` raíz vacío
- `analytics/` vacío
- `client-ops/` vacío
- `integrations/` vacío
- `legal/` vacío
- `simulation/` vacío
- `icicso-local/infrastructure/` vacío
- `icicso-local/shared/` vacío

## 5. Puntos de entrada actuales

### Reales

- `scripts/start-icicso-mockup.ps1`
- `scripts/start-icicso-canon-emulator.ps1`
- `services/ingestion-orquestador/app/main.py`
- `08_Plataforma_Digital/icicso-foundation/apps/api/src/server.ts`
- `08_Plataforma_Digital/icicso-foundation/apps/web/src/main.tsx`

### Indirectos / wrappers

- `Launch-ICICSO-Continuum.cmd`
- `tools/desktop-launcher/Activar-ICICSO-Local.bat`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\Abrir ICICSO Mockup Local.cmd`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\Abrir ICICSO Canon Emulator.cmd`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\Abrir Portada ICICSO Local.cmd`

## 6. Zonas críticas

Zona de mayor deuda técnica:

- `08_Plataforma_Digital/icicso-foundation/`

Zona de mayor desconexión:

- `domain/`

Zona de mayor simulación:

- root del repo y README(s) cuando presentan un sistema unificado ya convergido.
