# ICICSO Service Boundaries
Version: draft-1

## 1. Objetivo

Definir límites de servicio estrictos para evitar acoplamiento peligroso y mezcla indebida entre ciencia, caso clínico, operación, analítica, ética, tecnología y comercial.

---

## 2. Boundary map

### Service A — governance-ledger-service
Scope:
- GCL
Owns:
- VRN
- CR
- GCA
- deprecations
- release notes
- threshold registry
- drift records
Rules:
- append-only
- no patient clinical payload ownership
- sole authority for structural precedence and irreversible governance records

### Service B — identity-consent-governance-service
Scope:
- ILC
- consent
- data classification
Owns:
- identity longitudinal model
- collision resolution
- consent lifecycle
- data certification rules
Rules:
- mandatory dependency for clinical activation
- no scientific evidence transformation

### Service C — terminology-service
Scope:
- TG
Owns:
- terminology registry
- code mappings
- semantic impact records
Rules:
- all clinical payload normalization passes here or through certified cache
- no runtime case orchestration

### Service D — evidence-ingestion-service
Scope:
- SER intake
- EO creation
- EL indexing
Owns:
- evidence lake persistence
- source validation
- provenance integrity
Rules:
- no patient data
- no economic data
- no operational data

### Service E — evidence-translation-service
Scope:
- ETE
Owns:
- ECS
- UCI pre-computation inputs
- contextual applicability matrix
- minimum dependencies
Rules:
- only validated EO/GP input
- no runtime patient signals

### Service F — uncertainty-classification-service
Scope:
- EUL
Owns:
- uncertainty levels
- threshold application
- reinforced validation flags
Rules:
- consumes ETE outputs + GCL thresholds
- no direct clinician-facing output as order

### Service G — harmonization-service
Scope:
- GHL
- ICDR consumption
Owns:
- guideline package
- conflict matrix
- coexistence registry
- neutrality declaration
- review schedule
Rules:
- may consult governance
- no direct case execution
- must not privilege one scientific authority over another
- must not rewrite source recommendations

### Service H — framework-registry-service
Scope:
- FR
Owns:
- framework lifecycle
- collision registry
- adherence metric definitions
- sunset records
Rules:
- versioned independently from CPO
- no runtime event ownership

### Service I — operative-compiler-service
Scope:
- KBOL
Owns:
- CPO
- RO
- BOM/BO
- TAM
- EVT
- RDY-G
- CAE
- CAE-CTX
- SRM hooks
Rules:
- pre-executable only
- rejects dynamic patient input
- rejects economic input
- cannot auto-instantiate a case without human validation
- cannot mutate scientific grades inherited from `EO`

### Service J — clinical-integration-service
Scope:
- runtime clinical ingestion
Owns:
- normalized event ingestion
- document envelopes
- image references
- source interoperability contracts
Rules:
- does not decide clinical pathway
- forwards structured events to CCCL
- stores references, not authoritative binaries

### Service K — case-orchestration-service
Scope:
- CCCL
Owns:
- case state machine
- transitions
- override records
- case timeline
- activation validation
Rules:
- requires 4 irreversible inputs
- central runtime authority for case flow
- no binary storage
- no structural governance override

### Service L — legal-snapshot-service
Scope:
- ESL
Owns:
- phase snapshots
- closure snapshots
- reproducible legal freeze of applied evidence/pathway
Rules:
- append-only
- derived from case + active structural references

### Service M — clinician-context-service
Scope:
- Decision Cards
- contextual clinician views
Owns:
- contextual recommendations display
Rules:
- not a medical order service
- read-only contextual surface

### Service N — logistics-coordination-service
Scope:
- LCCB
Owns:
- OR scheduling
- ICU capacity
- critical availability
- contingencies
Rules:
- cannot alter clinical indication
- must escalate distributive conflicts

### Service O — med-device-safety-service
Scope:
- medication safety
- device traceability
Owns:
- alerts
- reconciliation
- UDI tracking
- recall logic
Rules:
- can signal CCCL and ESL
- cannot alter governance thresholds autonomously

### Service P — systemic-risk-service
Scope:
- SRM
Owns:
- aggregate risk models
- saturation signals
- systemic drift signals
Rules:
- aggregate logic only
- no individual act write-back

### Service Q — digital-twin-service
Scope:
- DTQ
- SVP support
Owns:
- simulations
- stress tests
- scenario comparisons
Rules:
- isolated
- no runtime execution
- no write-back

### Service R — outcomes-intelligence-service
Scope:
- CQOI
Owns:
- KPI
- longitudinal outcomes
- adherence analytics
- bias signals
Rules:
- certified data only
- may trigger BEG escalation

### Service S — ethics-governance-service
Scope:
- BEG
Owns:
- ethical escalation reviews
- bias adjudication
- sensitive secondary use reviews
Rules:
- receives signals from CQOI, SRM, governance and collision processes
- does not own pathway execution

### Service T — cybersecurity-integrity-service
Scope:
- CCI
Owns:
- access control
- audit logs
- hash chain
- signatures
- API version log
- technical integrity
Rules:
- transversal to all services
- no clinical decision ownership

### Service U — federated-intelligence-service
Scope:
- FCI
Owns:
- federated metrics
- secure benchmarking
- cross-node validation
Rules:
- aggregate/federated only

### Service V — economic-evaluation-service
Scope:
- EEM
Owns:
- economic episodes
- cost of care
- revenue models
- margin models
- DRG costing
- CAPEX/OPEX models
Rules:
- read-only against upstream clinical/scientific domains
- only consumes anonymized or aggregate-certified downstream datasets
- no upstream threshold mutation

### Service W — commercial-monetization-service
Scope:
- CML
Owns:
- commercial packages
- pricing catalogs
- contracts
- target market definitions
- monetization reports
Rules:
- aggregate only
- cannot alter clinical pathway or CPO structure
- no LCR access
- no upstream influence

### Service Y — anonymization-service
Scope:
- ANON
Owns:
- anonymization profiles
- de-identification pipelines
- generalized timestamps
- downstream release certification
Rules:
- mandatory gateway before patient-derived downstream use
- cannot emit identified data to economic/commercial/simulation domains
- append-only release trace for each anonymized dataset

### Service Z — operational-planning-service
Scope:
- OPL
Owns:
- capacity models
- utilization forecasts
- bottleneck detection
- throughput projections
Rules:
- read-only against CCCL, ESL and structural domains
- cannot modify clinical indication or activation logic
- may emit planning signals only to dashboards and governance views

### Service AA — simulation-service
Scope:
- SIM
Owns:
- scenario models
- sensitivity analyses
- volume/capacity simulations
- financial stress tests
Rules:
- isolated execution only
- input must be anonymized or aggregate-certified
- no runtime write-back

### Service AB — downstream-export-service
Scope:
- EXPORT
Owns:
- dashboard feeds
- BI extracts
- warehouse exports
- investor/regulatory packaged outputs
Rules:
- export policy validation mandatory
- no direct access to identified clinical payloads
- output lineage must retain source refs to anonymized or aggregate datasets

### Service X — institutional-governance-dashboard-service
Scope:
- IGD
Owns:
- structural compliance
- alert fatigue
- continuous audit
- go-live checklists
Rules:
- oversight only
- no direct pathway mutation outside governance process

---

## 3. Forbidden couplings

1. CML -> CCCL
2. EEM -> CPO activation
3. OPL -> clinical indication mutation
4. SIM -> runtime write-back
5. ANON bypass -> EEM/CML/SIM/EXPORT
6. PRI -> direct LCR mutation
7. DTQ -> runtime write-back
8. LCCB -> clinical indication mutation
9. ETE -> patient runtime consumption
10. KBOL -> dynamic patient ingestion
11. CQOI -> direct structural mutation without governance
12. CCI -> medical content authorship
13. EHR binary blobs -> CCCL raw storage

---

## 4. Required cross-service references

Mandatory reference chains:
- SER -> EO -> GP/FW -> CPO -> TAM/EVT/RDY-G/CAE -> Case -> ESL -> CQOI
- ILC -> Case -> DocumentEnvelope / StructuredEvent / DeviceTraceability
- GovernanceRecord -> VRN -> all active executable structural artifacts

---

## 5. Go-live conditions

A bounded service may go live only if:
- ownership is explicit
- input/output contract is defined
- forbidden couplings are tested
- audit logging exists
- version strategy exists
- rollback/sunset path exists if applicable
- governance dependencies are declared
- clinician validation path exists where clinically relevant
