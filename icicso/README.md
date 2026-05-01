# ICICSO Canonical Repo

`icicso/` es el canon TypeScript del continuum.

No es todavía “la plataforma completa”. Es la base donde se está modelando y validando el flujo canónico, empezando por el primer slice que sí corre.

## Qué representa

Aquí viven:

- contratos y tipos compartidos;
- módulos de dominio del continuum;
- emulador canónico;
- pruebas del slice inicial;
- piezas transversales como `shared-kernel`, logging y eventos.

## Qué slice está vivo hoy

El slice con evidencia directa de ejecución es:

`ING -> SER -> EO -> EL`

Eso significa:

1. ingesta de documento;
2. derivación a `Source Evidence Record`;
3. derivación a `Evidence Object`;
4. indexación en `Evidence Lake`.

## Qué no debes inferir desde aquí

- que todos los paquetes bajo `packages/domain/*` están completos;
- que `apps/api` ya sea una API canónica operativa;
- que cada bounded context tenga persistencia y wiring reales;
- que el emulador pruebe el continuum completo.

## Qué sí puedes usar como evidencia

```powershell
npm test
```

Ese comando valida:

- shared-kernel;
- architecture map;
- wiring del emulador;
- pipeline `ingest -> ser -> eo`;
- pipeline `ingest -> ser -> eo -> evidence-lake`.

## Rol del emulador

`apps/emulator/` no es el producto final.

Es una superficie de inspección del canon: muestra capas, riesgos, slice implementado y feeds generados por los artefactos/documentos disponibles.

## Dirección de trabajo

Si vas a extender el continuum, la regla es:

- código nuevo del canon: aquí;
- backend documental y feeds: `../services/ingestion-orquestador/`;
- runtime demo multi-servicio: `../icicso-local/`;
- histórico: no aquí, sino `_archive/`.
