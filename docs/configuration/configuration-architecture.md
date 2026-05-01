# Configuration Architecture

## Fuente de verdad

- ejemplos versionados: [config/env](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\config\env)
- contrato máquina: [config.schema.json](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\config\schemas\config.schema.json)
- contratos humanos: [config/contracts](C:\Users\leona\OneDrive\Desktop\MxRep\ICICSO\config\contracts)

## Flujo local

1. Copiar `config/env/.env.local.example` a `config/env/.env.local`
2. Completar secretos reales
3. Ejecutar `config-validate -Sync`
4. El script genera:
   - `icicso-local/.env`
   - `infra/observability/.env`
   - `infra/k8s/secret-app.yaml`
   - `infra/k8s/secret-postgres.yaml`

## Separación sensible / no sensible

- no sensible: ConfigMap, `config/env/*.example`, documentación
- sensible: `config/env/.env.local`, `infra/k8s/secret-*.yaml`, `infra/observability/.env`

## Estado actual auditado

- había secretos efectivos en `infra/k8s/secret-app.yaml`
- `DATABASE_URL` con password estaba mezclado en ConfigMap
- `icicso-local/.env` y `_archive/noncanonical/08_Plataforma_Digital/icicso-foundation/.env` estaban versionados
- Compose y observabilidad tenían passwords hardcodeadas

## Evolución a cloud

La forma actual deja dos piezas estables:

- contratos y ejemplos versionados
- compatibilidad runtime generada localmente

Después puede sustituirse la generación local por:

- AWS Secrets Manager
- Vault
- External Secrets Operator

sin cambiar nombres ni contratos.
