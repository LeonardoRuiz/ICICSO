# Indice clinico ICICSO

Estado del documento: generado automaticamente.

Este indice no reemplaza el glosario curado. Es la capa amplia y machine-readable para busqueda clinica, autocomplete medico, binding terminologico y futuros motores de rutas criticas.

## Salidas

- `docs/generated/clinical-concepts.json`: indice completo para motores.
- `docs/generated/clinical-concepts-search.json`: indice ligero para busqueda/autocomplete.
- `docs/clinical-concepts.html`: explorador dark con busqueda/autocomplete.
- `docs/clinical-concepts.md`: resumen humano del barrido.

## Resumen

- Generado: 2026-04-29T19:26:15.093Z
- Conceptos totales: 93519
- Route-ready ICICSO: 2091
- Terminology-only: 91123
- Diagnosticos: 11559
- Procedimientos: 79202
- Candidatos EO: 1024

## Fuentes procesadas

- ICICSO_TERMINOLOGIAS/01_RAW/ICD10/icd10_claml.xml: processed (11539 conceptos)
- ICICSO_TERMINOLOGIAS/01_RAW/ICD10_PCS/icd10pcs_codes/icd10pcs_codes_2026.txt: processed (79193 conceptos)
- ICICSO_TERMINOLOGIAS/01_RAW/ATC_DDD/atc_index.csv: processed (391 conceptos)
- ICICSO_TERMINOLOGIAS/01_RAW/MESH/mesh.xml: skipped (MeSH local es placeholder; no contiene DescriptorRecord.)
- packages/evidence-intelligence/ontology: processed (169 conceptos)
- packages/evidence-intelligence/seeds: processed (164 conceptos)
- packages/evidence-intelligence/examples/valid: processed (22 conceptos)
- dashboard/generated/eo_extraction_engine_summary.json: processed (7 documentos; 1024 candidatos EO)
- icicso/packages/domain/ghl/service.ts: processed (6 conceptos)
- icicso/packages/domain/cpo/examples/cabg-case.ts: processed (8 conceptos)
- evidence/cabg_non_plus_ultra/processed: processed (100 conceptos)

## Ejemplo de autocomplete: `infarto de`

- Myocardial Infarction (mi) - outcome, ICICSO_ONTOLOGY, route-anchor
  Alias: mi, Use when MI is explicit as component or outcome., infarto de miocardio, infarto agudo de miocardio, IAM
- Acute myocardial infarction (I21) - diagnosis, ICD10, route-anchor
  Alias: myocardial infarction specified as acute or with a stated duration of 4 weeks (28 days) or less from onset, certain current complications following acute myocardial infarction (I23.-), myocardial infarction: old (I25.2), myocardial infarction: specified as chronic or with a stated duration of more than 4 weeks (more than 28 days) from onset (I25.8), myocardial infarction: subsequent (I22.-)
- Acute myocardial infarction, unspecified (I21.9) - diagnosis, ICD10, route-anchor
  Alias: Myocardial infarction (acute) NOS, infarto de miocardio, infarto agudo de miocardio, IAM, MI
- Acute subendocardial myocardial infarction (I21.4) - diagnosis, ICD10, route-anchor
  Alias: Myocardial infarction with non-ST elevation, Nontransmural myocardial infarction NOS, infarto de miocardio, infarto agudo de miocardio, IAM
- Acute transmural myocardial infarction of anterior wall (I21.0) - diagnosis, ICD10, route-anchor
  Alias: Transmural infarction (acute)(of): anterior (wall) NOS, Transmural infarction (acute)(of): anteroapical, Transmural infarction (acute)(of): anterolateral, Transmural infarction (acute)(of): anteroseptal, infarto de miocardio
- Acute transmural myocardial infarction of inferior wall (I21.1) - diagnosis, ICD10, route-anchor
  Alias: Transmural infarction (acute)(of): diaphragmatic wall, Transmural infarction (acute)(of): inferior (wall) NOS, Transmural infarction (acute)(of): inferolateral, Transmural infarction (acute)(of): inferoposterior, infarto de miocardio
- Acute transmural myocardial infarction of other sites (I21.2) - diagnosis, ICD10, route-anchor
  Alias: Transmural infarction (acute)(of): apical-lateral, Transmural infarction (acute)(of): basal-lateral, Transmural infarction (acute)(of): high lateral, Transmural infarction (acute)(of): lateral (wall) NOS, Transmural infarction (acute)(of): posterior (true)
- Acute transmural myocardial infarction of unspecified site (I21.3) - diagnosis, ICD10, route-anchor
  Alias: Transmural myocardial infarction NOS, infarto de miocardio, infarto agudo de miocardio, IAM, MI
- Atrial septal defect as current complication following acute myocardial infarction (I23.1) - diagnosis, ICD10, route-anchor
  Alias: infarto de miocardio, infarto agudo de miocardio, IAM, MI
- Cerebral infarction (I63) - diagnosis, ICD10, route-anchor
  Alias: occlusion and stenosis of cerebral and precerebral arteries (including truncus brachiocephalicus), resulting in cerebral infarction, sequelae of cerebral infarction (I69.3), infarto cerebral, ictus isquemico, EVC isquemico
- Cerebral infarction due to cerebral venous thrombosis, nonpyogenic (I63.6) - diagnosis, ICD10, route-anchor
  Alias: infarto cerebral, ictus isquemico, EVC isquemico
- Cerebral infarction due to embolism of cerebral arteries (I63.4) - diagnosis, ICD10, route-anchor
  Alias: infarto cerebral, ictus isquemico, EVC isquemico
- Cerebral infarction due to embolism of precerebral arteries (I63.1) - diagnosis, ICD10, route-anchor
  Alias: infarto cerebral, ictus isquemico, EVC isquemico
- Cerebral infarction due to thrombosis of cerebral arteries (I63.3) - diagnosis, ICD10, route-anchor
  Alias: infarto cerebral, ictus isquemico, EVC isquemico

## Queratocono

- Keratoconus (H18.6) - diagnosis, ICD10, route-anchor
  Alias: queratocono

## Anchors route-ready desde informacion ICICSO

- CABG - intervention, ICICSO_EO_ENGINE
- CABG (to include a left internal mammary artery [LIMA] graft to the LAD) - intervention, ICICSO_EO_ENGINE
- CABG (to include a left internal mammary artery [LIMA] graft to the LAD) is reasonable - route-action, ICICSO_EO_ENGINE
- CABG (with a LIMA to the LAD) - intervention, ICICSO_EO_ENGINE
- CABG (with a LIMA to the LAD) is recommended - route-action, ICICSO_EO_ENGINE
- CABG case reading sequence - clinical-evidence-source, ICICSO_CABG_EVIDENCE_PACK
- CABG is reasonable - route-action, ICICSO_EO_ENGINE
- CABG is recommended - route-action, ICICSO_EO_ENGINE
- CABG non plus ultra matrix - clinical-evidence-source, ICICSO_CABG_EVIDENCE_PACK
- CABG of the non-infarct artery should include a Heart Team discussion - comparator, ICICSO_EO_ENGINE
- CABG Strategy - clinical-topic, ICICSO_EO_ENGINE
- CABG x3 - procedure, ICICSO_CPO_CASE
- CABG Strategy: In patients undergoing CABG, the routine use of epiaortic ultrasound scanning can be useful to evaluate the presence, location, and severity of plaque in the ascending aorta to red... (GR-DF1A41770FAF) - eo-candidate, ICICSO_EO_ENGINE
- Coronary Artery Bypass Graft (CABG) - clinical-condition, ICICSO_GHL
- CABG Strategy: In patients referred for urgent CABG, clopidogrel and ticagrelor should be discontinued for at least 24 hours before surgery to reduce major bleeding complications (GR-6DCAA99884EC) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients undergoing CABG, a comprehensive approach to reduce sternal wound infection is recommended (GR-4B76E6A52A61) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients undergoing CABG, bilateral IMA (BIMA) grafting by experienced operators can be beneficial in appropriate patients to improve long-term cardiac outcomes (GR-B78EA6253231) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients undergoing CABG, preoperative amiodarone is reasonable to reduce the incidence of postoperative atrial fibrillation (GR-3F562A5D9707) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients undergoing elective CABG, the risks and benefits of beta-blocker and amiodarone administration before surgery should be carefully considered (GR-88DA7BF6A6C7) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients who are being considered for CABG, calculation of the STS risk score is recommended to help stratify patient risk (GR-EF463550FA97) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients with angina but no anatomic or physiological criteria for revascularization, neither CABG nor PCI should be performed (GR-14C0676E6C40) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients with previous CABG and complex CAD, it may be reasonable to choose CABG over PCI when an IMA can be used as a conduit to the LAD (GR-3FE833178BB5) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients with previous CABG with a patent LIMA to the LAD who need repeat revascularization, if PCI is feasible, it is reasonable to choose PCI over CABG (GR-46CE1B72B05D) - eo-candidate, ICICSO_EO_ENGINE
- CABG Strategy: In patients with symptomatic recurrent diffuse ISR with an indication for revascularization, CABG can be useful over repeat PCI to reduce recurrent events (GR-AC0D1B8C4852) - eo-candidate, ICICSO_EO_ENGINE

## Politica

- `terminology-only`: viene de ICD-10, ICD-10-PCS o ATC/DDD y sirve como vocabulario/binding.
- `icicso-generated`: viene de seeds, ontologias, casos o paquetes de evidencia creados en el repo.
- `route-ready`: viene de candidatos EO, CPO/casos o artefactos que ya tienen forma de decision, trigger, poblacion, intervencion u outcome.
- El glosario curado solo debe promover entradas desde esta capa cuando exista valor conceptual, fuente y definicion.

