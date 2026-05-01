# Auditoría de alineación HTML, runtime y repo

Fecha base de auditoría: 2026-04-06

## Objetivo

Determinar por qué el dashboard HTML no representa fielmente la realidad actual del repo ICICSO, por qué varios elementos no llevan a ningún lado útil y cómo alinear:

- repo real;
- runtime vigente;
- carpeta operativa del escritorio;
- superficies HTML expuestas al usuario.

## Resumen ejecutivo

La causa principal no es un bug aislado de links. El problema es que hoy conviven al menos tres líneas de superficie distintas:

1. una línea legacy en raíz:
   - `docker-compose.yml`
   - `dashboard/index.html`
   - `health-check/`
   - `start-icicso.bat`
   - `START_DOCKER.md`
2. una línea vigente de runtime local:
   - `scripts/start-icicso-mockup.ps1`
   - `icicso-local/apps/desktop-emulator/`
   - `scripts/Invoke-ContinuumDoctor.ps1`
   - `http://127.0.0.1:8090/index.html`
3. una línea de hub de escritorio:
   - `C:\Users\leona\OneDrive\Desktop\ICICSO Local\START_HERE.cmd`
   - `C:\Users\leona\OneDrive\Desktop\ICICSO Local\01_Start_Here\ICICSO Local Cockpit.html`
   - `tools/desktop-launcher/ICICSO-Local.html`

El dashboard problemático de raíz no está conectado al runtime vigente. Representa otra topología, con otros puertos, otro health service y otra narrativa operativa. Por eso:

- pinta estados ficticios;
- expone links muertos o inútiles;
- promueve un path de arranque distinto al oficial;
- contradice documentación más reciente del repo;
- compite con el hub del escritorio y con el emulador real.

## Verdad operativa actual

La documentación reciente y los launchers vigentes convergen en esta realidad:

- entrada documental principal: `START_HERE.md`
- arranque operativo real del mockup: `scripts/start-icicso-mockup.ps1`
- mockup HTML vigente: `http://127.0.0.1:8090/index.html`
- gateway vigente: `http://127.0.0.1:3100/health`
- canon emulator: `http://127.0.0.1:8098/index.html`

Esto aparece consistente en:

- `README.md`
- `START_HERE.md`
- `RUNBOOK_LOCAL.md`
- `CURRENT_ENTRYPOINTS.md`
- `SYSTEM_STATUS.md`
- `docs/local-development.md`
- `scripts/start-icicso-mockup.ps1`
- `scripts/Invoke-ContinuumDoctor.ps1`

La línea legacy de raíz define otra realidad:

- dashboard en `3000`
- health-check en `3100`
- Kafka UI en `8888`
- narrativa “docker-compose up -d” desde raíz

Esto aparece en:

- `docker-compose.yml`
- `dashboard/index.html`
- `health-check/index.js`
- `start-icicso.bat`
- `start-icicso.sh`
- `START_DOCKER.md`
- `DOCKER_SETUP_SUMMARY.md`
- `DOCKER_QUICK_START.md`

## Mapa de archivos HTML/CSS/JS/assets involucrados

| Superficie | Tipo | Archivos principales | Estado | Rol real |
| --- | --- | --- | --- | --- |
| Legacy root dashboard | HTML inline | `dashboard/index.html` | desalineado | dashboard estático de una topología vieja |
| Legacy root health service | JS backend | `health-check/index.js`, `health-check/package.json` | desalineado | expone `/health` y bloques ficticios/antiguos |
| Root legacy runtime | compose/scripts/docs | `docker-compose.yml`, `start-icicso.bat`, `start-icicso.sh`, `START_DOCKER.md`, `DOCKER_SETUP_SUMMARY.md`, `DOCKER_QUICK_START.md` | desalineado | path de arranque viejo |
| Mockup vigente | HTML | `icicso-local/apps/desktop-emulator/index.html` | vigente | shell HTML mínima |
| Mockup vigente | CSS | `icicso-local/apps/desktop-emulator/styles.css` | vigente | estilos del emulador |
| Mockup vigente | JS runtime | `icicso-local/apps/desktop-emulator/app.js` | vigente | render, fetch, walkthrough y acciones |
| Mockup vigente | JS server | `icicso-local/apps/desktop-emulator/server.js` | vigente | server Node estático con `/health/*` y `/metrics` |
| Mockup vigente | Docker | `icicso-local/apps/desktop-emulator/Dockerfile` | vigente | empaquetado del emulador |
| Launcher repo HTML | HTML inline | `tools/desktop-launcher/ICICSO-Local.html` | parcialmente desalineado | landing HTML alternativa en repo |
| Launcher repo cmd | BAT | `tools/desktop-launcher/Activar-ICICSO-Local.bat` | vigente | wrapper al launcher principal |
| Hub escritorio principal | HTML inline | `C:\Users\leona\OneDrive\Desktop\ICICSO Local\01_Start_Here\ICICSO Local Cockpit.html` | vigente pero frágil | cockpit/hub real del escritorio |
| Hub escritorio backups | HTML inline | `...Cockpit.backup.20260405.html`, `...Cockpit.backup.20260405.v2.html` | ruido | copias que elevan riesgo de divergencia |
| Canon emulator | HTML/CSS/JS | `icicso/apps/emulator/index.html`, `icicso/apps/emulator/src/main.js`, `icicso/apps/emulator/src/styles.css` | vigente | superficie canónica separada del mockup |
| Assets del hub escritorio | SVG | `C:\Users\leona\OneDrive\Desktop\ICICSO Local\06_Assets\*.svg` | accesorios | assets visuales del hub del escritorio |

## Mapa de superficies y ownership real

| Superficie visible | Fuente de verdad actual | Cómo se abre | Qué debería representar |
| --- | --- | --- | --- |
| `dashboard/index.html` | ninguna vigente | root `docker-compose.yml` o abrir archivo | legacy root stack, no runtime actual |
| `http://127.0.0.1:8090/index.html` | `icicso-local/apps/desktop-emulator/*` | `scripts/start-icicso-mockup.ps1` | runtime demo local real |
| `http://127.0.0.1:8098/index.html` | `icicso/apps/emulator/*` | `scripts/start-icicso-canon-emulator.ps1` | canon emulator |
| `C:\Users\leona\OneDrive\Desktop\ICICSO Local\01_Start_Here\ICICSO Local Cockpit.html` | copia en escritorio | `START_HERE.cmd` del escritorio | hub operativo del usuario |
| `tools/desktop-launcher/ICICSO-Local.html` | repo | `Open Desktop Launcher HTML.cmd` | landing HTML alternativa del repo |

## Mapa de links, botones, cards, módulos y destinos

### 1. `dashboard/index.html`

#### Cards y módulos

| Elemento | Tipo | Destino | Estado |
| --- | --- | --- | --- |
| PostgreSQL Database | card | `http://localhost:5050` | válido solo en stack legacy/root |
| Redis Cache | card sin CTA | ninguno | informativo, no navega |
| Apache Kafka | card | `http://localhost:8888` | válido solo en stack legacy/root |
| MinIO Storage | card | `http://localhost:9001` | válido en ambos stacks si MinIO existe |
| Gateway API | card | `http://localhost:3100/health` | ambiguo: en root significa health-check; en runtime vigente significa gateway real |
| Clinical Emulator | card | `http://localhost:8090/index.html` | solo válido si el mockup vigente está arriba |
| Ingestion Service | card sin CTA | ninguno | informativo, no navega |
| Control Center | card | ninguno | autoreferencial, no valida nada |

#### Links de documentación

| Texto | Destino | Estado |
| --- | --- | --- |
| Start Here (START_HERE.md) | `#` | muerto |
| System Status | `#` | muerto |
| Local Development | `#` | muerto |
| Architecture Overview | `#` | muerto |

#### Módulos lógicos declarados

| Módulo declarado | Fuente real de datos | Observación |
| --- | --- | --- |
| status online/offline | ninguna | estado hardcoded |
| métricas de puerto | hardcoded | no derivan del runtime |
| quick start `docker-compose up -d` | root stack | contradice arranque oficial del mockup |
| auto health check a `localhost:3100/health` | fetch JS inline | no cambia UI, solo loguea a consola |

### 2. `icicso-local/apps/desktop-emulator/`

#### Navegación interna

Todos estos links son anclas internas dentro del mismo documento renderizado por `app.js`:

| Link | Destino |
| --- | --- |
| Continuum | `#continuum-overview` |
| Case | `#case-workspace` |
| Knowledge | `#knowledge-workspace` |
| Pathway | `#pathway-workspace` |
| Readiness | `#readiness-workspace` |
| State | `#state-machine-workspace` |
| Systemic | `#systemic-workspace` |
| Operator | `#walkthrough-rail` |

#### Controles operativos

| Control | Tipo | Destino/acción | Fuente real |
| --- | --- | --- | --- |
| `gatewayBase` | input | cambia base URL del gateway | localStorage/query/origin |
| Refresh ahora | botón | `refresh()` | fetch directo |
| Auto-refresh | botón | `syncTimer()` | fetch directo |
| Ejecutar walkthrough completo | botón | login + upload + compile + readiness + activate + transition | endpoints reales vía gateway |
| Iniciar sesión | form submit | `POST /auth/login` | gateway |
| Cerrar sesión local | botón | limpia `localStorage` | cliente |
| Simular upload estructurado | form submit | `POST /ingestion/ingestions/structured` | gateway |
| Compilar GP/CPO | botón | `POST /ghl/packages/publish`, `POST /kbol/cpo/generate`, `POST /runbook/runbook/generate` | gateway |
| Reevaluar readiness | botón | `POST /readiness/readiness/evaluate` | gateway |
| Activar caso | botón | `POST /case-control/activate` | gateway |
| Avanzar estado | botón | `POST /case-control/transition` | gateway |

#### Módulos y hooks esperados

| Módulo | Hook |
| --- | --- |
| overview | `/health`, `/block1/overview` |
| dataset certificación | `/block2/overview` y `/block2/dataset-status?caseId=...` |
| evidence lake | `/block3/evidence-lake/summary` |
| ETE | `/block3/ete/summary` |
| EUL | `/block3/eul/summary` |
| GP/CPO | `/block5/gp-cpo/summary` |
| readiness | `/block6/readiness/summary` |
| state machine | `/block7/case-control/summary` |
| systemic | `/block8/systemic-control/summary` |
| downstream | `/block9/downstream/summary` |

Observación: no todo hook tiene todavía fetch directo en `refresh()`. Hay módulos narrados en el catálogo visible que todavía no tienen la misma profundidad operativa en el runtime.

### 3. Hub del escritorio `ICICSO Local Cockpit.html`

#### Navegación interna

| Link | Destino |
| --- | --- |
| Launchers | `#launchers` |
| Producto | `#product` |
| Documentación | `#docs` |
| Diagnóstico | `#ops` |
| Abrir superficies de producto | `#product` |
| Ver launchers correctos | `#launchers` |

#### Documentación

| Link visible | Destino | Estado |
| --- | --- | --- |
| START_HERE | `file:///C:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/START_HERE.md` | válido pero frágil |
| SYSTEM_STATUS | `file:///.../SYSTEM_STATUS.md` | válido pero frágil |
| NEXT_ACTIONS | `file:///.../NEXT_ACTIONS.md` | válido pero frágil |
| SYSTEM_MAP | `file:///.../SYSTEM_MAP.md` | válido pero frágil |
| LOCAL RUNBOOK | `file:///.../docs/local-development.md` | válido pero frágil |
| AUDIT_REPORT | `file:///.../AUDIT_REPORT.md` | válido pero frágil |

#### Producto

| Link visible | Destino | Estado |
| --- | --- | --- |
| Mockup Local | `http://127.0.0.1:8090/index.html` | válido si runtime arriba |
| Canon Emulator | `http://127.0.0.1:8098/index.html` | válido si canon arriba |
| Gateway Health | `http://127.0.0.1:3100/health` | válido si runtime arriba |
| Block 1 Overview | `http://127.0.0.1:3100/block1/overview` | válido si runtime arriba |

#### Diagnóstico

| Link visible | Destino | Estado |
| --- | --- | --- |
| Logs | `file:///.../logs` | válido pero frágil |
| Docker Compose Source | `file:///.../icicso-local/docker-compose.yml` | válido pero frágil |
| Evidence Assets | `file:///.../evidence` | válido pero frágil |
| Grafana | `http://127.0.0.1:3000` | frágil/ambiguo |

#### Tabs del preview

| Botón | `data-src` | Estado |
| --- | --- | --- |
| Mockup Local | `http://127.0.0.1:8090/index.html` | válido condicional |
| Canon Emulator | `http://127.0.0.1:8098/index.html` | válido condicional |
| Gateway Health | `http://127.0.0.1:3100/health` | válido condicional |
| Block 1 Overview | `http://127.0.0.1:3100/block1/overview` | válido condicional |

### 4. `tools/desktop-launcher/ICICSO-Local.html`

| Elemento | Destino | Estado |
| --- | --- | --- |
| Abrir emulador HTML | `http://127.0.0.1:8090/index.html` | válido condicional |
| Abrir gateway | `http://127.0.0.1:3100/health` | válido condicional |
| Abrir guía local | `file:///.../docs/local-development.md` | válido pero frágil |
| Texto “Usa el archivo Abrir ICICSO Mockup Local.cmd de esta misma carpeta” | archivo no presente | desalineado |

## Detección de links muertos

### Muertos en sentido estricto

| Ubicación | Elemento | Destino | Motivo |
| --- | --- | --- | --- |
| `dashboard/index.html` | Start Here (START_HERE.md) | `#` | no navega a nada |
| `dashboard/index.html` | System Status | `#` | no navega a nada |
| `dashboard/index.html` | Local Development | `#` | no navega a nada |
| `dashboard/index.html` | Architecture Overview | `#` | no navega a nada |
| `tools/desktop-launcher/ICICSO-Local.html` | referencia textual a `Abrir ICICSO Mockup Local.cmd` | archivo no existe en esa carpeta | instrucción falsa |

### Muertos respecto al runtime vigente

| Ubicación | Elemento | Destino | Motivo |
| --- | --- | --- | --- |
| `dashboard/index.html` | Control Center / Port 3000 | `http://localhost:3000` implícito | el runtime vigente no levanta ese dashboard |
| `start-icicso.bat` + `START_DOCKER.md` + `DOCKER_*` | dashboard principal | `http://localhost:3000` | path legacy, no path oficial |
| `dashboard/index.html` | quick start `docker-compose up -d` | root stack | contradice arranque oficial `scripts/start-icicso-mockup.ps1` |

## Detección de rutas frágiles

| Patrón | Dónde aparece | Riesgo |
| --- | --- | --- |
| `file:///C:/Users/leona/OneDrive/Desktop/MxRep/ICICSO/...` | cockpit del escritorio y launcher HTML del repo | se rompe si cambia la ruta local, el usuario, OneDrive o el navegador bloquea `file://` |
| paths absolutos `C:\Users\leona\OneDrive\Desktop\...` dentro de `.cmd` | carpeta de escritorio | acoplamiento total a una máquina concreta |
| hardcode de `127.0.0.1` y puertos | mockup, cockpit, launcher HTML | se rompe si se usa otro host/port o un reverse proxy |
| port `3000` | hub de escritorio | colisión semántica entre Grafana opcional y dashboard legacy |
| `py -m http.server 8090` | README del desktop-emulator y launcher mockup | sirve un modo distinto al `server.js` dockerizado |
| URL `http://127.0.0.1:8090/icicso-local/apps/desktop-emulator/index.html` | README del desktop-emulator | depende de servir desde raíz del repo, no del launcher oficial |
| `localhost` vs `127.0.0.1` | dashboard legacy y runtime vigente | inconsistencia innecesaria |
| root `docker-compose.yml` y `icicso-local/docker-compose.yml` | repo | dos definiciones de topología compitiendo |

## Detección de secciones ficticias o desalineadas del repo

### Ficticias o hardcoded

| Ubicación | Sección | Problema |
| --- | --- | --- |
| `dashboard/index.html` | estados “Connected”, “Ready”, “Running”, “Live” | están hardcoded; no vienen de checks reales |
| `dashboard/index.html` | “All systems operational” | afirmación fija, no derivada del estado real |
| `dashboard/index.html` | “Production-grade”, “Central API gateway for all microservices”, etc. | copy estable de marketing, no estado auditado |
| `health-check/index.js` | `/block1/overview`, `/block2/overview`, `/block3/overview` | devuelve servicios y puertos viejos `3001-3007`, no la topología actual `3101-3115` |
| `health-check/index.js` | health de gateway “running” | lo declara en JSON aunque el gateway real no sea ese proceso |

### Desalineadas con el repo actual

| Ubicación | Sección | Desalineación |
| --- | --- | --- |
| `dashboard/index.html` | docs/resources | no enlaza a la documentación canónica real |
| `dashboard/index.html` | quick start | empuja al stack legacy raíz en vez del mockup oficial |
| `START_DOCKER.md` y `DOCKER_*` | narrativa principal | presentan el dashboard legacy como entrada principal |
| `tools/desktop-launcher/ICICSO-Local.html` | instrucciones de uso | menciona un `.cmd` que no corresponde con la estructura actual |
| escritorio `Open Desktop Launcher HTML.cmd` | abre HTML del repo | pero el `START_HERE.cmd` del escritorio abre otro HTML distinto |
| escritorio | múltiples backups de cockpit | elevan divergencia y hacen incierto cuál es “el bueno” |

## Análisis de la carpeta del escritorio y su relación con el repo real

## Estructura encontrada

La carpeta `C:\Users\leona\OneDrive\Desktop\ICICSO Local` funciona como hub operativo externo al repo. Está organizada en:

- `01_Start_Here`
- `02_Launchers`
- `03_Documentation`
- `04_Reports`
- `05_Operations`
- `06_Assets`
- `_archive`

## Cómo se conecta con el repo

### Dependencia del repo

La carpeta del escritorio no es autónoma. Depende del repo real por paths absolutos:

- launchers `.cmd` llaman scripts del repo
- documentación abre archivos del repo
- operaciones abren URLs o carpetas del repo

### Relaciones concretas

| Carpeta del escritorio | Destino real |
| --- | --- |
| `START_HERE.cmd` | abre `01_Start_Here\ICICSO Local Cockpit.html` |
| `02_Launchers\Start Mockup Local.cmd` | llama `Launch-ICICSO-Continuum.cmd` del repo |
| `02_Launchers\Run Continuum Doctor.cmd` | llama `scripts/Invoke-ContinuumDoctor.ps1` del repo |
| `03_Documentation\*.cmd` | abren `.md` del repo |
| `04_Reports\*.cmd` | abren reportes del repo |
| `05_Operations\Open Emulator HTML.cmd` | abre `http://127.0.0.1:8090/index.html` |
| `05_Operations\Open Grafana.cmd` | abre `http://127.0.0.1:3000` |

## Problemas estructurales detectados

1. Hay dos hubs HTML distintos:
   - el del escritorio;
   - el del repo en `tools/desktop-launcher/ICICSO-Local.html`.
2. El launcher `Open Desktop Launcher HTML.cmd` abre el HTML del repo, no el cockpit real del escritorio.
3. Existen backups HTML y legacy launchers archivados que dificultan saber cuál superficie es autoritativa.
4. La carpeta del escritorio documenta correctamente la separación entre launchers, producto, documentación e internals, pero esa separación no se refleja de forma unificada en todas las superficies del repo.

## Causa raíz

La carpeta del escritorio ya expresa una arquitectura más madura que el `dashboard/index.html` viejo, pero no está generada desde una fuente única del repo. Por eso:

- el escritorio y el repo se pueden desalinear;
- el repo conserva una superficie legacy competidora;
- el usuario ve dashboards distintos según por dónde entre.

## Conclusiones

1. `dashboard/index.html` no falla por detalle visual; falla porque responde a otro sistema.
2. El runtime vigente es `icicso-local/apps/desktop-emulator`, no el dashboard de raíz.
3. El root `health-check/` fabrica un modelo de bloques y puertos que no coincide con `icicso-local`.
4. El hub del escritorio es útil, pero está duplicado y acoplado por paths absolutos.
5. El principal origen de links muertos hoy está en:
   - `href="#"`;
   - referencias textuales a launchers que ya no existen;
   - promoción de una entrada legacy que ya no es la canónica.

## Propuesta concreta para alinear dashboard, repo y carpeta operativa

## Decisión de arquitectura recomendada

Adoptar una sola línea oficial:

- runtime oficial: `icicso-local`
- cockpit HTML oficial: el hub de escritorio, pero generado desde el repo
- dashboard legacy de raíz: degradado a legacy explícito o retirado de la ruta principal

## Plan de intervención específico

### Fase 1. Contención inmediata

Objetivo: eliminar ambigüedad en menos de una iteración.

Acciones:

1. Convertir `dashboard/index.html` en una página de deprecación controlada.
   - mensaje claro: “legacy root dashboard”
   - enlaces reales a:
     - `START_HERE.md`
     - `http://127.0.0.1:8090/index.html`
     - `http://127.0.0.1:8098/index.html`
     - `http://127.0.0.1:3100/health`
2. Marcar como legacy estos archivos root:
   - `docker-compose.yml`
   - `health-check/index.js`
   - `health-check/package.json`
   - `start-icicso.bat`
   - `start-icicso.sh`
   - `START_DOCKER.md`
   - `DOCKER_SETUP_SUMMARY.md`
   - `DOCKER_QUICK_START.md`
3. Quitar del discurso principal cualquier mención a “dashboard en 3000” salvo como legado u observabilidad opcional.

### Fase 2. Fuente única del hub HTML

Objetivo: que escritorio y repo muestren la misma superficie.

Acciones:

1. Elegir un solo archivo fuente en repo para el cockpit.
   - recomendación: `tools/desktop-launcher/ICICSO-Local.html`
2. Generar desde ese archivo el cockpit del escritorio:
   - `C:\Users\leona\OneDrive\Desktop\ICICSO Local\01_Start_Here\ICICSO Local Cockpit.html`
3. Eliminar la divergencia actual:
   - `Open Desktop Launcher HTML.cmd` debe abrir el mismo cockpit oficial o desaparecer
4. Limpiar backups operativos:
   - mover backups actuales a `_archive` o nombrarlos claramente como snapshot no operativo

### Fase 3. Manifest de entrypoints

Objetivo: que links y destinos no vuelvan a escribirse a mano en tres lugares distintos.

Crear un manifiesto en repo, por ejemplo:

- `config/runtime/entrypoints.local.json`

Contenido mínimo:

- producto:
  - mockup local
  - canon emulator
  - gateway health
  - block1 overview
- documentación:
  - `START_HERE.md`
  - `SYSTEM_STATUS.md`
  - `NEXT_ACTIONS.md`
  - `SYSTEM_MAP.md`
  - `docs/local-development.md`
  - `AUDIT_REPORT.md`
- launchers:
  - `Start Mockup Local.cmd`
  - `Run Continuum Doctor.cmd`
  - `Start Canon Emulator.cmd`
  - `Stop Mockup Local.cmd`
  - `Stop Canon Emulator.cmd`
- internals:
  - logs
  - `icicso-local/docker-compose.yml`
  - evidence
  - Grafana opcional

Ese manifiesto debe alimentar:

- cockpit del escritorio
- launcher HTML del repo
- validación automática de links

### Fase 4. Validación automática de links y rutas

Objetivo: que la desalineación quede detectable en CI o en una revisión local.

Agregar:

- `scripts/validate-runtime-links.ps1`

Chequeos mínimos:

1. detectar `href="#"` en HTML oficiales;
2. validar que todo `file:///...` apunte a archivo/carpeta existente;
3. validar que toda referencia a launcher exista físicamente;
4. validar que ningún HTML oficial siga apuntando a `localhost:3000` como dashboard principal;
5. validar que los puertos oficiales coincidan con el manifiesto;
6. advertir si hay más de un cockpit HTML oficial.

### Fase 5. Alineación documental

Objetivo: que la documentación principal no vuelva a bifurcar el relato.

Actualizar:

- `README.md`
- `START_HERE.md`
- `RUNBOOK_LOCAL.md`
- `CURRENT_ENTRYPOINTS.md`
- `SYSTEM_MAP.md`

Con una tabla única:

| Clase | Entrada oficial |
| --- | --- |
| documentación | `START_HERE.md` |
| runtime mockup | `scripts/start-icicso-mockup.ps1` |
| mockup HTML | `http://127.0.0.1:8090/index.html` |
| canon emulator | `http://127.0.0.1:8098/index.html` |
| diagnóstico | `scripts/Invoke-ContinuumDoctor.ps1` |
| hub escritorio | `C:\Users\leona\OneDrive\Desktop\ICICSO Local\START_HERE.cmd` |

## Secuencia de implementación recomendada

1. Intervenir `dashboard/index.html` y marcar root stack como legacy.
2. Unificar cockpit repo/escritorio en una sola fuente.
3. Crear manifiesto de entrypoints.
4. Agregar validador de links/rutas.
5. Limpiar launchers y docs desalineados.
6. Archivar o etiquetar todo lo que siga apuntando a la topología vieja.

## Archivos que deberían cambiar en la intervención

### Prioridad alta

- `dashboard/index.html`
- `docker-compose.yml`
- `health-check/index.js`
- `START_DOCKER.md`
- `DOCKER_SETUP_SUMMARY.md`
- `DOCKER_QUICK_START.md`
- `tools/desktop-launcher/ICICSO-Local.html`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\01_Start_Here\ICICSO Local Cockpit.html`
- `C:\Users\leona\OneDrive\Desktop\ICICSO Local\02_Launchers\Open Desktop Launcher HTML.cmd`

### Archivos nuevos recomendados

- `config/runtime/entrypoints.local.json`
- `scripts/export-desktop-cockpit.ps1`
- `scripts/validate-runtime-links.ps1`

### Prioridad media

- `README.md`
- `START_HERE.md`
- `RUNBOOK_LOCAL.md`
- `CURRENT_ENTRYPOINTS.md`
- `SYSTEM_MAP.md`
- `docs/local-development.md`

## Criterio de cierre

La alineación se considerará resuelta cuando:

1. exista una sola superficie HTML oficial para el hub;
2. ningún HTML oficial tenga `href="#"`;
3. ningún dashboard oficial promueva `3000` como entrada principal del producto;
4. los launchers del escritorio abran exactamente las superficies declaradas en repo;
5. un validador automático pueda detectar cualquier divergencia futura.
