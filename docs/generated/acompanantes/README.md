# Modelo de integración de Acompañantes para ICICSO

## Propósito
Integrar `Acompañantes` al repo vivo como una capa clínica explícita, trazable y reutilizable, sin cambiar el modelo vigente de `Area`, `Subespecialidad`, `Tema` ni el contrato actual de `26` filtros.

## Regla principal
`Acompañantes` no sustituye la jerarquía principal del catálogo.

Su rol es describir capas clínicas transversales que cambian:
- selección del paciente
- riesgo perioperatorio
- estrategia diagnóstica
- ejecución intraoperatoria
- soporte crítico
- recuperación
- seguimiento

## Regla de fidelidad
- Mantener `Acompañantes` como filtro `01` del bloque numerado vigente.
- Mantener el orden histórico visible de los `26` filtros.
- No fusionar `Acompañantes` con `Area`, `Atajos`, `Subespecialidad` o `Tema`.
- No reclasificar retrospectivamente los `927` registros activos sin trazabilidad editorial.
- Preservar `No especificado` en registros históricos cuando no exista base razonable para asignación fina.

## Núcleos de acompañantes integrados
1. Anestesia cardiotorácica, perfusión y cuidados críticos
2. Cardiorrenal y nefrocardiología
3. Cardiometabólica y endocrina
4. Fragilidad, geriatría, prehabilitación y rehabilitación
5. Hematología, hemostasia y medicina transfusional
6. Hepatología, gastroenterología y medicina sistémica asociada
7. Imagen cardiovascular e integración diagnóstica
8. Infectología y soporte antimicrobiano
9. Inmunología, inflamación y respuesta biológica
10. Neumología, cuidados respiratorios y pleura
11. Neurología perioperatoria y neurovascular
12. Nutrición clínica, sarcopenia y reserva funcional
13. Oncología y cardio-oncología
14. Psiquiatría, psicología clínica y salud mental perioperatoria

## Reglas de uso
- Un recurso puede tener uno o varios acompañantes.
- La asignación debe reflejar utilidad clínica real, no mera mención incidental.
- Si un recurso afecta conducta perioperatoria, organoprotección o seguimiento, `Acompañantes` debe capturarlo.
- Nutrición y salud mental quedan visibles como capas propias para no esconderlas dentro de metabólica o fragilidad.

## Regla operativa para crecimiento
Nuevas corridas:
1. conservar el filtro numerado
2. clasificar recursos nuevos con uno o más acompañantes
3. revisar retroclasificación solo por lotes editoriales coherentes
4. recompilar HTML sin perder vínculo funcional del filtro

## Relación institucional ICICSO
- Naturaleza: Terminology Governance + Knowledge Base Operative Layer
- Artefacto derivable: taxonomía operativa de filtro
- Relación con repo: crecimiento del corpus clínico, no reemplazo del continuum canónico
