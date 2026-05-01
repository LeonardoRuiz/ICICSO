from pathlib import Path
from textwrap import dedent
R=Path(__file__).resolve().parents[1]
def w(p,s): p.parent.mkdir(parents=True,exist_ok=True); p.write_text(dedent(s).strip()+"\n",encoding="utf-8")
def q(xs): return ', '.join(f'"{x}"' for x in xs)
def slug(s): return ''.join(c for c in s if c.isalpha())
mods=[
('packages/domain/ingest','Ingesta','Ingest Module','Normalizar fuentes entrantes hacia entradas canónicas del continuum.',['documentos fuente','metadatos de procedencia'],['SERInput'],['shared-kernel']),
('packages/domain/terminology','TERM','Terminology Module','Resolver terminologías clínicas y catálogos semánticos para todo el continuum.',['códigos clínicos','diccionarios'],['conceptos normalizados'],['shared-kernel']),
('packages/domain/ser','SER','Source Evidence Record Module','Representar evidencia fuente validada antes de EO.',['entradas de ingesta'],['SERInput versionado'],['shared-kernel','ingest']),
('packages/domain/eo','EO','Evidence Object Module','Convertir SER en Evidence Object versionado y auditable.',['SERInput'],['EvidenceObject'],['shared-kernel','ser']),
('packages/domain/evidence-lake','EL','Evidence Lake Module','Persistir EO en un repositorio consultable y trazable.',['EvidenceObject'],['EvidenceLakeRecord'],['shared-kernel','eo']),
('packages/domain/cpo','CPO','Clinical Pathway Object Module','Construir Clinical Pathway Objects a partir de evidencia armonizada.',['EvidenceObject','GuidelinePackage','DDMO'],['ClinicalPathwayObject'],['shared-kernel','eo','guideline-harmonization']),
('packages/domain/bom','BOM','Bill of Materials Module','Derivar materialidad estructurada desde un CPO.',['ClinicalPathwayObject'],['BillOfMaterials'],['shared-kernel','cpo']),
('packages/domain/tam','TAM','Temporal Activation Model Module','Ordenar la activación temporal de un CPO.',['ClinicalPathwayObject'],['TemporalActivationModel'],['shared-kernel','cpo']),
('packages/domain/evt','EVT','Event Trigger Module','Definir disparadores operativos derivados del CPO.',['ClinicalPathwayObject'],['EventTriggerCatalog'],['shared-kernel','cpo']),
('packages/domain/readiness-gates','RDY-G','Readiness Gates Module','Validar transiciones por reglas y estado.',['estado del caso','reglas'],['ReadinessGateResult'],['shared-kernel','evt','tam']),
('packages/domain/adverse-events','CAE','Clinical Adverse Events Module','Registrar eventos adversos clínicos de forma estructurada.',['eventos clínicos'],['ClinicalAdverseEventRecord'],['shared-kernel','evt']),
('packages/domain/case-control','CCCL','Case Control Module','Mantener la máquina de estados y control del caso.',['estado del caso'],['CaseControlState'],['shared-kernel','readiness-gates','adverse-events']),
('packages/domain/legal-snapshots','ESL','Evidence Snapshot Legal Module','Congelar snapshots legales auditables del caso.',['artefactos del caso'],['EvidenceSnapshotLegal'],['shared-kernel','case-control']),
('packages/domain/outcomes','CQOI','Clinical Quality Outcomes Intelligence Module','Medir resultados y métricas CQOI.',['resultados del caso'],['CQOIMetricSet'],['shared-kernel','case-control']),
('packages/domain/drift','Drift','Drift Module','Detectar deriva entre outcomes y evidencia vigente.',['outcomes','evidencia'],['DriftAlert'],['shared-kernel','outcomes','eo']),
('packages/domain/scientific-governance','Gov','Scientific Governance Module','Registrar decisiones de gobernanza científica y arbitraje.',['artefactos auditables','hallazgos de deriva'],['ScientificGovernanceRecord'],['shared-kernel','drift']),
('packages/engines/evidence-translation','ETE','Evidence Translation Engine','Traducir evidencia a aplicabilidad contextual MAC/ECS/UCI.',['EvidenceObject'],['EvidenceTranslationResult'],['shared-kernel','eo']),
('packages/engines/epistemic-uncertainty','EUL','Epistemic Uncertainty Engine','Clasificar incertidumbre epistemológica derivada de la evidencia.',['EvidenceObject','EvidenceTranslationResult'],['señales de incertidumbre'],['shared-kernel','eo','evidence-translation']),
('packages/engines/guideline-harmonization','GHL','Guideline Harmonization Engine','Armonizar múltiples EO en paquetes de guía reutilizables.',['EvidenceObject[]'],['GuidelinePackage'],['shared-kernel','eo','epistemic-uncertainty']),
('packages/execution/clinical-execution','CEL','Clinical Execution Module','Materializar la ejecución clínica desde pathway y estado.',['ClinicalPathwayObject','CaseControlState'],['órdenes y acciones clínicas'],['shared-kernel','cpo','case-control']),
('packages/execution/resource-orchestration','ROL','Resource Orchestration Module','Coordinar recursos operativos y disponibilidad para ejecución.',['BillOfMaterials','TemporalActivationModel'],['plan de recursos'],['shared-kernel','bom','tam']),
('packages/integration/integration-layer','IIL','Integration Layer Module','Intercambiar artefactos con sistemas externos sin romper contratos canónicos.',['artefactos canónicos','mensajes externos'],['payloads integrados'],['shared-kernel']),
('packages/intelligence/device-intelligence','DIL','Device Intelligence Module','Enriquecer pathway y ejecución con señales de dispositivos.',['device telemetry','device UDI'],['insights de dispositivo'],['shared-kernel','integration-layer']),
('packages/intelligence/financial-intelligence','FIL','Financial Intelligence Module','Relacionar pathway con señal económica y restricción financiera.',['costos','ClinicalPathwayObject'],['insights financieros'],['shared-kernel','cpo']),
('packages/operations/client-operations','COL','Client Operations Module','Coordinar operación cliente e implementación local del continuum.',['estado operativo','servicios disponibles'],['acciones operativas'],['shared-kernel','resource-orchestration']),
('packages/simulation/simulation-engine','SIM','Simulation Engine Module','Simular escenarios clínicos y operativos sobre los artefactos del continuum.',['ClinicalPathwayObject','BillOfMaterials','TemporalActivationModel'],['escenarios simulados'],['shared-kernel','cpo','bom','tam']),
]
svcs=[
('services/cpo-service','CPO Service','Exponer orquestación de Clinical Pathway Objects.',['ClinicalPathwayObject'],['APIs de CPO'],['packages/domain/cpo','packages/shared-kernel']),
('services/bom-service','BOM Service','Exponer materialidad estructurada para ejecución y planeación.',['BillOfMaterials'],['APIs de BOM'],['packages/domain/bom','packages/shared-kernel']),
('services/legal-service','Legal Service','Exponer snapshots legales y trazabilidad jurídica.',['EvidenceSnapshotLegal'],['APIs legales'],['packages/domain/legal-snapshots','packages/shared-kernel']),
('services/outcomes-service','Outcomes Service','Exponer métricas CQOI y resultados clínicos.',['CQOIMetricSet'],['APIs de outcomes'],['packages/domain/outcomes','packages/shared-kernel']),
('services/drift-service','Drift Service','Exponer señales de deriva y alertamiento científico.',['DriftAlert'],['APIs de drift'],['packages/domain/drift','packages/shared-kernel']),
]
arch=[
('domain','ingest','Ingesta','packages/domain/ingest'),('domain','terminology','TERM','packages/domain/terminology'),('domain','ser','SER','packages/domain/ser'),('domain','eo','EO','packages/domain/eo'),('domain','evidence-lake','EL','packages/domain/evidence-lake'),('engines','evidence-translation','ETE','packages/engines/evidence-translation'),('engines','epistemic-uncertainty','EUL','packages/engines/epistemic-uncertainty'),('engines','guideline-harmonization','GHL','packages/engines/guideline-harmonization'),('domain','cpo','CPO','packages/domain/cpo'),('domain','bom','BOM','packages/domain/bom'),('domain','tam','TAM','packages/domain/tam'),('domain','evt','EVT','packages/domain/evt'),('domain','readiness-gates','RDY-G','packages/domain/readiness-gates'),('domain','adverse-events','CAE','packages/domain/adverse-events'),('domain','case-control','CCCL','packages/domain/case-control'),('domain','legal-snapshots','ESL','packages/domain/legal-snapshots'),('domain','outcomes','CQOI','packages/domain/outcomes'),('domain','drift','Drift','packages/domain/drift'),('domain','scientific-governance','Gov','packages/domain/scientific-governance'),('integration','integration-layer','IIL','packages/integration/integration-layer'),('execution','clinical-execution','CEL','packages/execution/clinical-execution'),('execution','resource-orchestration','ROL','packages/execution/resource-orchestration'),('intelligence','device-intelligence','DIL','packages/intelligence/device-intelligence'),('intelligence','financial-intelligence','FIL','packages/intelligence/financial-intelligence'),('operations','client-operations','COL','packages/operations/client-operations'),('simulation','simulation-engine','SIM','packages/simulation/simulation-engine'),('services','cpo-service','svc','services/cpo-service'),('services','bom-service','svc','services/bom-service'),('services','legal-service','svc','services/legal-service'),('services','outcomes-service','svc','services/outcomes-service'),('services','drift-service','svc','services/drift-service')]
def base():
 w(R/'package.json','''
 {"name":"@icicso/canonical-repo","private":true,"version":"0.1.0","description":"Canonical ICICSO monorepo scaffold for the full continuum.","workspaces":["apps/*","packages/*","packages/domain/*","packages/engines/*","packages/execution/*","packages/integration/*","packages/intelligence/*","packages/operations/*","packages/simulation/*","services/*"],"scripts":{"check":"tsc --project tsconfig.json --noEmit","emulator:start":"npx serve apps/emulator"},"devDependencies":{"typescript":"^5.6.3"}}
 ''')
 w(R/'tsconfig.json','''
 {"compilerOptions":{"target":"ES2022","module":"ES2022","moduleResolution":"bundler","lib":["ES2022","DOM"],"strict":true,"declaration":true,"declarationMap":true,"skipLibCheck":true,"resolveJsonModule":true,"esModuleInterop":true,"forceConsistentCasingInFileNames":true,"baseUrl":"."},"include":["apps/**/*.ts","packages/**/*.ts","services/**/*.ts","infra/**/*.ts"]}
 ''')
 w(R/'pnpm-workspace.yaml','''
 packages:
   - apps/*
   - packages/*
   - packages/domain/*
   - packages/engines/*
   - packages/execution/*
   - packages/integration/*
   - packages/intelligence/*
   - packages/operations/*
   - packages/simulation/*
   - services/*
 ''')
 w(R/'README.md','''
 # ICICSO Canonical Repo
 Base canónica del continuum completo ICICSO para desarrollo formal por módulos.
 ## Capas soportadas
 Ingesta -> SER -> EO -> EL -> ETE -> EUL -> GHL -> CPO -> BOM -> TAM -> EVT -> RDY-G -> CAE -> CCCL -> ESL -> CQOI -> Drift -> Gobernanza científica
 ## Capas transversales
 IIL, CEL, ROL, DIL, FIL, COL, SIM.
 ## Estado
 Scaffold inicial completo, con contratos mínimos, mapas de arquitectura y emulador base conectado al árbol canónico.
 ''')
 w(R/'packages/shared-kernel/types.ts','''
 export type Brand<T,B extends string>=T&{readonly __brand:B};
 export type VRN=Brand<string,"VRN">; export type ILC=Brand<string,"ILC">; export type eo_id=Brand<string,"eo_id">; export type cpo_id=Brand<string,"cpo_id">; export type bom_id=Brand<string,"bom_id">; export type evt_id=Brand<string,"evt_id">; export type gate_id=Brand<string,"gate_id">; export type cae_id=Brand<string,"cae_id">; export type esl_id=Brand<string,"esl_id">; export type case_id=Brand<string,"case_id">; export type device_udi=Brand<string,"device_udi">;
 export type ModuleStatus="scaffolded"|"in-progress"|"ready-for-development";
 export interface CanonicalIdentifierSet{vrn:VRN;ilc:ILC;caseId:case_id}
 export interface ModuleDescriptor{code:string;name:string;layer:string;path:string;status:ModuleStatus;inputs:string[];outputs:string[];dependencies:string[]}
 export interface VersionedArtifact<T>{id:string;vrn:VRN;createdAt:string;payload:T}
 ''')
 w(R/'packages/shared-kernel/contracts.ts','''
 import type {VRN,ILC,eo_id,cpo_id,bom_id,evt_id,gate_id,cae_id,esl_id,case_id,VersionedArtifact} from "./types";
 export interface SERInput{sourceDocumentId:string;sourceType:string;ingestedAt:string;extractedClaims:string[]}
 export interface EvidenceObject extends VersionedArtifact<{eoId:eo_id;serId:string;evidenceType:string;claims:string[];provenance:string[]}>{}
 export interface EvidenceLakeRecord{eoId:eo_id;indexedAt:string;repositoryPath:string;queryTags:string[]}
 export interface EvidenceTranslationResult{eoId:eo_id;mac:string[];ecs:number;uci:number}
 export interface GuidelinePackage extends VersionedArtifact<{packageId:string;evidenceObjects:eo_id[];conflicts:string[];recommendations:string[]}>{}
 export interface ClinicalPathwayObject extends VersionedArtifact<{cpoId:cpo_id;evidenceObjects:eo_id[];guidelinePackageId:string;ddmo:string[];steps:string[]}>{}
 export interface BillOfMaterials{bomId:bom_id;cpoId:cpo_id;resources:string[]}
 export interface TemporalActivationModel{cpoId:cpo_id;milestones:string[]}
 export interface EventTriggerCatalog{evtIds:evt_id[];cpoId:cpo_id;triggers:string[]}
 export interface ReadinessGateResult{gateId:gate_id;caseId:case_id;accepted:boolean;reasons:string[]}
 export interface ClinicalAdverseEventRecord{caeId:cae_id;caseId:case_id;events:string[]}
 export interface CaseControlState{caseId:case_id;currentState:string;allowedTransitions:string[]}
 export interface EvidenceSnapshotLegal{eslId:esl_id;caseId:case_id;snapshotAt:string;supportingArtifacts:string[]}
 export interface CQOIMetricSet{caseId:case_id;outcomes:string[];metrics:Record<string,number>}
 export interface DriftAlert{alertId:string;caseId:case_id;signal:string;severity:"low"|"medium"|"high"}
 export interface ScientificGovernanceRecord{governanceId:string;vrn:VRN;ilc:ILC;reviewedArtifacts:string[];decisions:string[]}
 ''')
 w(R/'packages/shared-kernel/service.ts','''
 import type {ILC,ModuleDescriptor,VRN} from "./types";
 export const createVrn=(v:string):VRN=>v as VRN; export const createIlc=(v:string):ILC=>v as ILC; export const describeModule=(d:ModuleDescriptor):ModuleDescriptor=>d;
 ''')
 w(R/'packages/shared-kernel/repository.ts','''
 import type {ModuleDescriptor} from "./types";
 export interface SharedKernelRepository{listModules():Promise<ModuleDescriptor[]>}
 export const createInMemorySharedKernelRepository=(modules:ModuleDescriptor[]=[]):SharedKernelRepository=>({async listModules(){return modules;}});
 ''')
 w(R/'packages/shared-kernel/index.ts','''export * from "./types"; export * from "./contracts"; export * from "./service"; export * from "./repository";''')
 w(R/'packages/shared-kernel/README.md','''# shared-kernel
 ## Propósito del módulo
 Centralizar tipos base, identificadores canónicos, contratos transversales y descriptores mínimos del continuum.
 ## Inputs
 Artefactos canónicos, IDs versionados, contratos entre módulos.
 ## Outputs
 Tipos globales reutilizables, contratos de integración y utilidades mínimas de identificación.
 ## Dependencias
 Ninguna. Este módulo es la raíz tipada del repo canónico.
 ## Estado inicial
 Scaffolded. Listo para servir como contrato base del desarrollo formal.
 ''')
def mod(path,code,name,purpose,ins,outs,deps):
 t=slug(name); imp='../packages/shared-kernel' if path.startswith('services/') else '../../shared-kernel'
 w(R/f'{path}/types.ts',f'''import type {{ ModuleDescriptor }} from "{imp}";
 export interface {t}Contract{{module:ModuleDescriptor;inputs:string[];outputs:string[]}}
 export const {t}Descriptor: ModuleDescriptor={{code:"{code}",name:"{name}",layer:"{path.replace('packages/','').replace('services/','services/')}",path:"{path}",status:"scaffolded",inputs:[{q(ins)}],outputs:[{q(outs)}],dependencies:[{q(deps)}]}};
 ''')
 w(R/f'{path}/service.ts',f'''import {{ {t}Descriptor }} from "./types"; import type {{ {t}Contract }} from "./types";
 export const create{t}Service=(): {t}Contract=>({{module:{t}Descriptor,inputs:[...{t}Descriptor.inputs],outputs:[...{t}Descriptor.outputs]}});
 ''')
 w(R/f'{path}/repository.ts',f'''import type {{ {t}Contract }} from "./types";
 export interface {t}Repository{{save(contract:{t}Contract):Promise<void>;load():Promise<{t}Contract|null>}}
 export const createInMemory{t}Repository=(): {t}Repository=>({{async save(){{return Promise.resolve();}},async load(){{return Promise.resolve(null);}}}});
 ''')
 w(R/f'{path}/index.ts','''export * from "./types"; export * from "./service"; export * from "./repository";''')
 w(R/f'{path}/README.md',f'''# {Path(path).name}
 ## Propósito del módulo
 {purpose}
 ## Inputs
 {', '.join(ins)}
 ## Outputs
 {', '.join(outs)}
 ## Dependencias
 {', '.join(deps)}
 ## Estado inicial
 Scaffolded. Contrato base creado y listo para implementación formal.
 ''')
def extra():
 w(R/'packages/domain/cpo/examples/cabg-case.ts','''
 import type { VRN, case_id, cpo_id, eo_id } from "../../../shared-kernel";
 export interface CabgReferenceCase{caseId:case_id;cpoId:cpo_id;evidenceObjects:eo_id[];vrn:VRN;diagnosis:string[];procedure:string;comorbidities:string[];ejectionFraction:string;renalStatus:string}
 export const cabgReferenceCase: CabgReferenceCase={caseId:"case-cabg-x3-nstemi" as case_id,cpoId:"cpo-cabg-x3-nstemi" as cpo_id,evidenceObjects:["eo-cabg-guideline-core" as eo_id,"eo-nstemi-risk-stratification" as eo_id],vrn:"vrn-cabg-reference-001" as VRN,diagnosis:["NSTEMI","Coronary multivessel disease"],procedure:"CABG x3",comorbidities:["DM2","FEVI 35%","ERC3"],ejectionFraction:"35%",renalStatus:"ERC3"};
 ''')
 w(R/'docs/architecture/README.md','''# Canonical Architecture Map
 La base canónica se organiza por capas explícitas del continuum y capas transversales.
 ## Reglas
 - Un módulo por responsabilidad.
 - Contratos tipados en `packages/shared-kernel`.
 - Servicios desacoplados de los paquetes de dominio.
 - Emulador leyendo `apps/emulator/src/data/architectureMap.ts`.
 ''')
 w(R/'docs/continuum/README.md','''# Canonical Continuum
 ## Flujo principal
 Ingesta -> SER -> EO -> EL -> ETE -> EUL -> GHL -> CPO -> BOM -> TAM -> EVT -> RDY-G -> CAE -> CCCL -> ESL -> CQOI -> Drift -> Gobernanza científica
 ## Capas transversales
 IIL, CEL, ROL, DIL, FIL, COL, SIM.
 ## Estado
 Todos los módulos existen como scaffolds tipados y auditables.
 ''')
 for n,p in {'config':'Concentrar configuración canónica y feature flags.','logging':'Definir puertos de logging y trazabilidad operacional.','events':'Definir canales de eventos e integración asíncrona.','security':'Definir controles base de seguridad y acceso.'}.items():
  w(R/f'infra/{n}/index.ts',f'export const {n}Module = "{n}";')
  w(R/f'infra/{n}/README.md',f'# {n}\n## Propósito del módulo\n{p}\n## Estado inicial\nScaffolded.\n')
 w(R/'tests/README.md','''# Tests
 El árbol `tests/` queda reservado para suites unitarias e integración sobre los módulos canónicos de `icicso/`.
 ''')
 w(R/'apps/api/README.md','''# api
 Backend canónico mínimo para exponer módulos del continuum por HTTP en fases posteriores.
 ''')
 w(R/'apps/api/src/index.ts','''export const apiApp = { name: "icicso-api", status: "scaffolded" } as const;''')
 w(R/'apps/emulator/README.md','''# emulator
 Emulador HTML navegable para inspeccionar el mapa de arquitectura, el estado de módulos y las rutas del repo canónico.
 ''')
 ts='\n'.join([f'  {{ layer: "{a}", module: "{b}", code: "{c}", route: "{d}", status: "scaffolded" }},' for a,b,c,d in arch])
 js='\n'.join([f'  {{ layer: "{a}", module: "{b}", code: "{c}", route: "{d}", status: "scaffolded" }},' for a,b,c,d in arch])
 w(R/'apps/emulator/src/data/architectureMap.ts',f'''export type ArchitectureNode={{layer:string;module:string;code:string;route:string;status:"scaffolded"|"in-progress"|"ready-for-development"}};
 export const architectureMap: ArchitectureNode[]=[\n{ts}\n];''')
 w(R/'apps/emulator/src/data/architectureMap.js',f'''export const architectureMap=[\n{js}\n];''')
 w(R/'apps/emulator/index.html','''<!doctype html><html lang="es"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>ICICSO Emulator</title><link rel="stylesheet" href="./src/styles.css" /></head><body><main class="shell"><header><p class="eyebrow">ICICSO Canonical Continuum</p><h1>Architecture Emulator</h1><p id="summary"></p></header><section><table><thead><tr><th>Capa</th><th>Módulo</th><th>Código</th><th>Ruta</th><th>Estado</th></tr></thead><tbody id="architecture-body"></tbody></table></section></main><script type="module" src="./src/main.js"></script></body></html>''')
 w(R/'apps/emulator/src/styles.css',''':root{color-scheme:light;--bg:#f3f0e8;--panel:#fffdf8;--ink:#17212b;--muted:#5d6772;--accent:#9b3d2f;--grid:#d8d1c3;}*{box-sizing:border-box;}body{margin:0;font-family:"Segoe UI",sans-serif;background:linear-gradient(135deg,#f7f1e6 0%,#e6ecef 100%);color:var(--ink);}.shell{max-width:1180px;margin:0 auto;padding:32px 20px 48px;}.eyebrow{text-transform:uppercase;letter-spacing:.12em;color:var(--accent);font-size:12px;}header h1{margin:0 0 8px;}header p{color:var(--muted);}table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--grid);border-radius:16px;overflow:hidden;}th,td{text-align:left;padding:12px 14px;border-bottom:1px solid var(--grid);font-size:14px;}th{background:#ede5d7;}tr:last-child td{border-bottom:none;}.status{display:inline-block;padding:4px 8px;border-radius:999px;background:#e7efe0;color:#2a5a2d;font-size:12px;}@media (max-width:720px){th,td{font-size:12px;padding:10px;}}''')
 w(R/'apps/emulator/src/main.js','''import { architectureMap } from "./data/architectureMap.js"; const summary=document.getElementById("summary"); const body=document.getElementById("architecture-body"); summary.textContent=`${architectureMap.length} módulos canónicos conectados al emulador.`; body.innerHTML=architectureMap.map((node)=>`<tr><td>${node.layer}</td><td>${node.module}</td><td>${node.code}</td><td>${node.route}</td><td><span class="status">${node.status}</span></td></tr>`).join("");''')
if __name__=='__main__':
 base()
 for m in mods: mod(*m)
 for p,n,pur,ins,outs,deps in svcs: mod(p,n.replace(" Service",""),n,pur,ins,outs,deps)
 extra()
