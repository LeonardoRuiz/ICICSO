export const implementedSlice = {
  title: "Implemented Canonical Slice",
  summary: "El canon ya resuelve un trayecto real desde documento fuente hasta Evidence Object auditable.",
  stages: [
    {
      code: "ING",
      name: "Ingest",
      status: "implemented",
      detail: "Normaliza documento, procedencia, hash y VRN del artefacto fuente.",
      path: "packages/domain/ingest",
    },
    {
      code: "SER",
      name: "Source Evidence Record",
      status: "implemented",
      detail: "Convierte el documento ingerido en evidencia fuente versionada y validada.",
      path: "packages/domain/ser",
    },
    {
      code: "EO",
      name: "Evidence Object",
      status: "implemented",
      detail: "Deriva un Evidence Object desde SER con claims, tags y hash encadenado.",
      path: "packages/domain/eo",
    },
    {
      code: "EL",
      name: "Evidence Lake",
      status: "implemented",
      detail: "Indexa el Evidence Object en un registro canónico consultable y trazable.",
      path: "packages/domain/evidence-lake",
    },
  ],
};
