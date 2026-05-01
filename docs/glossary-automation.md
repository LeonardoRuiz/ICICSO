# Automatizacion del Glosario ICICSO

Estado del documento: guía operativa.

## Objetivo

Mantener el Glosario ICICSO actualizado conforme crece el repo sin convertirlo en un volcado ruidoso.

## Capas

1. `docs/glossary.md`
   Fuente canónica curada. Sólo contiene términos revisados.
2. `docs/glossary-candidates.md`
   Cola generada automáticamente para revisión humana.
3. `docs/generated/glossary-candidates.json`
   Salida machine-readable del scanner.
4. `docs/glossary.html`
   Vista interactiva generada desde el Markdown canónico.
5. `docs/generated/clinical-concepts.json`
   Indice clinico amplio para motores futuros: diagnosticos, procedimientos, medicamentos/clases, candidatos EO y triggers.
6. `docs/generated/clinical-concepts-search.json`
   Version ligera para busqueda/autocomplete.
7. `docs/clinical-concepts.html`
   Vista dark para explorar conceptos clinicos y simular autocomplete medico.

## Comandos

```powershell
pnpm glossary:scan
```

Genera candidatos desde fuentes relevantes del repo.

```powershell
pnpm glossary:build
```

Regenera la vista interactiva desde `docs/glossary.md`.

```powershell
pnpm glossary:refresh
```

Ejecuta scanner y build en una sola corrida.

```powershell
pnpm clinical:refresh
```

Extrae el indice clinico amplio desde `ICICSO_TERMINOLOGIAS`, seeds, ontologias, candidatos EO, casos CPO y paquetes de evidencia generados en el repo.

```powershell
pnpm knowledge:refresh
```

Ejecuta el refresh completo de conocimiento: candidatos de glosario, indice clinico y vistas HTML.

## Politica de promocion

Un candidato entra a `docs/glossary.md` cuando cumple al menos una condicion:

- aparece en un `SER`, `EO`, seed, schema, modelo o documento canonico;
- representa una entidad, capa, estado, metrica, regla o artefacto propio de ICICSO;
- es un termino medico usado por un artefacto ICICSO, no solo presente en una terminologia externa;
- tiene menciones suficientes para justificar una definicion corta, una definicion larga y fuentes.

No se promueven automaticamente:

- tipos genericos de programacion;
- rutas HTTP o nombres de archivo;
- ruido de reportes de auditoria;
- insumos crudos de `ICICSO_TERMINOLOGIAS/01_RAW`;
- datasets externos sin uso dentro de artefactos ICICSO.

Excepcion controlada: un insumo crudo puede respaldar una entrada si se promueve explicitamente como `termino medico con binding terminologico` y queda marcado como pendiente de `SER/EO`.

## Frecuencia recomendada

- Despues de agregar nuevos `SER`, `EO`, seeds, schemas u ontologias: ejecutar `pnpm glossary:refresh`.
- Despues de materializar nuevos candidatos `EO`, rutas, documentos clinicos o terminologias: ejecutar `pnpm knowledge:refresh`.
- Antes de una revision documental o demo: revisar `docs/glossary-candidates.md`, promover entradas relevantes a `docs/glossary.md` y volver a ejecutar `pnpm glossary:refresh`.
