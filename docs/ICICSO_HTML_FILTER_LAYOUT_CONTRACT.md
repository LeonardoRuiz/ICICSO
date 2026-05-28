# ICICSO HTML Filter And Layout Contract

## Purpose

This contract fixes the presentation rules that must survive future data integrations, recompilations, and UI adjustments for navigable ICICSO HTML artifacts.

It is intended to stop regressions where filters disappear, lose linkage, move into floating controls, or lose their numbered presentation.

## Non-negotiable layout rules

- Use a single unified filter block.
- Keep that block in normal document flow.
- Do not use sticky or floating filters.
- Place the block below the header and above auxiliary panels or the main map body.
- Preserve dark mode, vertical reading, and no horizontal scroll.

## Non-negotiable filter rules

- All approved filters must appear.
- Filters must remain functionally linked to the content they govern.
- Filters must be ordered alphabetically unless the user explicitly asks for another order.
- Filters must be visibly numbered in the interface.
- Numbering must remain stable enough to support repeated use, screenshots, and future guidance.
- Do not collapse the approved set into a simplified subset without explicit user approval.

## Approved filter set

1. Acompañantes
2. Area
3. Atajos
4. Año
5. Calidad
6. Confianza
7. Contexto
8. Decision
9. Enfoque
10. Estado
11. Evidencia
12. Fase
13. Frontera
14. Frontera tema
15. Fuente
16. Horizonte
17. Modo
18. Nivel
19. Orden
20. Prioridad
21. Revision
22. Rol clinico
23. Ruta
24. Subespecialidad
25. Tema
26. Tipo

## Linkage rule

Every filter must operate against explicit record metadata or explicit `data-*` attributes on rendered records. A visible filter without functional effect must be treated as a defect.

## Audit rule

When an artifact is regenerated, validation must explicitly check:

- complete approved filter presence
- alphabetical ordering
- numbered visible presentation
- non-floating placement
- functional linkage
- coherence with audit feeds and visible interface

## Growth rule

When new data is integrated, the design may expand, but it must not silently discard:

- filter coverage
- numbering
- linkage
- metadata visibility
- navigable hierarchy
