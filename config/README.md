# ICICSO Configuration

`config/env/.env.local` es la fuente operativa para desarrollo local. No se versiona.

## Flujo recomendado

1. Copiar [`.env.local.example`](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\config\env\.env.local.example) a `config/env/.env.local`
2. Ajustar secretos y endpoints locales
3. Ejecutar:

```powershell
.\scripts\config-validate.ps1 -Environment local -Sync
```

Ese flujo valida el contrato y genera archivos de compatibilidad ignorados por Git:

- `icicso-local/.env`
- `infra/observability/.env`
- `infra/k8s/secret-app.yaml`
- `infra/k8s/secret-postgres.yaml`

## Fuente de verdad

- máquina: [config.schema.json](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\config\schemas\config.schema.json)
- humana: contratos en [contracts](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\config\contracts)
