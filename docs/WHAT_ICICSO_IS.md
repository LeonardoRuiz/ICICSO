# What ICICSO Is

## Definición corta

ICICSO es un repositorio para construir un continuum canónico de evidencia clínica.

Ese continuum busca convertir documentos, fuentes normativas y evidencia en artefactos estructurados, versionados, auditables y listos para alimentar capas posteriores de decisión, gobernanza, readiness y ejecución.

## Traducción práctica

No estamos construyendo sólo una web.

No estamos construyendo sólo un backend.

No estamos construyendo sólo un mockup.

Estamos construyendo una cadena de transformación con varias superficies:

- una superficie canónica de modelado y pruebas;
- una superficie documental y de catálogo;
- una superficie de demo/runtime local;
- una superficie histórica de referencia.

## La imagen mental correcta

Piensa ICICSO así:

`documentos -> ingesta -> artefactos canónicos -> governance -> motores -> ejecución`

Hoy esa cadena está madura sobre todo al inicio:

`ING -> SER -> EO -> EL`

Después de eso, el repo ya define bastante estructura para capas siguientes, pero no todo está implementado con el mismo nivel de realidad.

## Qué árbol usar para cada cosa

### `icicso/`

Canon TypeScript.

Úsalo para:

- entender el modelo objetivo;
- extender el continuum;
- correr pruebas del slice canónico;
- revisar el emulador.

### `services/ingestion-orquestador/`

Backend Python real.

Úsalo para:

- catálogo documental;
- ingesta;
- materialización;
- governance records;
- audit feed;
- persistencia SQLite.

### `icicso-local/`

Runtime local de demo.

Úsalo para:

- levantar superficies HTTP;
- navegar servicios;
- probar launchers y wiring local;
- demostrar bloques en entorno degradado.

### `_archive/`

Histórico.

Úsalo sólo como referencia.

## Regla de interpretación

Cuando leas el repo:

- nombre fuerte no implica implementación completa;
- superficie visible no implica flujo end-to-end;
- carpeta archivada no implica ruta recomendada;
- documento viejo no implica fuente de verdad actual.

## Estado actual en una frase

ICICSO ya tiene un primer slice canónico real y un backend documental útil; el resto del continuum todavía está en proceso de convergencia hacia esa base.
