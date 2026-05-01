# Evidence Intelligence Architecture

## Ubicación canónica

`packages/evidence-intelligence` es la ubicación correcta del dominio porque:

- vive en el workspace reutilizable del monorepo;
- separa conocimiento canónico de implementaciones de aplicación;
- permite que `services/ingestion-orquestador`, motores clínicos y futuras apps importen el mismo contrato.

## Decisiones estructurales

1. El canon declarativo vive en JSON versionable:
   - `ontology/` contiene catálogos controlados y reglas de resolución.
   - `schemas/` contiene contratos machine-readable para validación automática.
   - `seeds/` contiene bundles realistas listos para pruebas de integración.
2. La semántica operativa vive en TypeScript:
   - `src/models` define contratos fuertes.
   - `src/validators` valida objetos sin depender de librerías externas.
   - `src/mappers` transforma SER a EO ejecutable.
3. La trazabilidad legal es de primer nivel:
   - todos los artefactos incluyen versión semántica, vigencia, aprobación, jurisdicción y cadena de custodia.
4. La interoperabilidad se modela desde origen:
   - cada entidad clínica puede portar bindings futuros a SNOMED CT, LOINC, ICD-10/11, RxNorm, ATC, CPT y referencias FHIR.

## Límite del módulo

Este paquete no hace parsing de PDFs ni extracción NLP. Su responsabilidad es definir el canon semántico y operacional sobre el que otros módulos deben producir y consumir evidencia estructurada.

## Siguiente integración prevista

`services/ingestion-orquestador` debe:

- clasificar documentos fuente contra `ontology/evidence-types`;
- materializar `EvidenceDocument`;
- producir `StructuredEvidenceRecord`;
- validar contra `schemas/*.json` y `src/validators`;
- mapear a `EvidenceObject` usando `mapSerToEvidenceObject`.
