# ICICSO State Machines

Version: draft-1

## 1. Principio general

ICICSO requiere dos niveles de maquina de estados:

1. State machine estructural del conocimiento
2. State machine dinamica del caso clinico

Nunca deben mezclarse.

---

## 2. State machine estructural de conocimiento

### 2.1 SER lifecycle

States:

- `drafted`
- `submitted`
- `validated`
- `translated`
- `superseded`
- `obsolete`

Transitions:

- `drafted -> submitted`
- `submitted -> validated`
- `validated -> translated`
- `translated -> superseded`
- `translated -> obsolete`

Rules:

- solo `validated` puede originar `EO` institucional
- `superseded` no se borra
- `obsolete` permanece trazable

### 2.2 EO lifecycle

States:

- `active`
- `under_review`
- `deprecated`

Transitions:

- `active -> under_review`
- `under_review -> active`
- `under_review -> deprecated`
- `active -> deprecated`

Triggers:

- guideline update
- drift signal
- conflict escalation
- sunset decision

### 2.3 GP lifecycle

States:

- `draft`
- `harmonized`
- `approved`
- `active`
- `under_revision`
- `frozen`
- `deprecated`

Transitions:

- `draft -> harmonized`
- `harmonized -> approved`
- `approved -> active`
- `active -> under_revision`
- `under_revision -> active`
- `active -> frozen`
- `frozen -> under_revision`
- `under_revision -> deprecated`

### 2.4 Framework lifecycle

States:

- `draft`
- `active`
- `collision_review`
- `under_review`
- `suspended`
- `sunset`

Transitions:

- `draft -> active`
- `active -> collision_review`
- `collision_review -> active`
- `collision_review -> suspended`
- `active -> under_review`
- `under_review -> active`
- `under_review -> suspended`
- `active -> sunset`
- `suspended -> active`

### 2.5 CPO lifecycle

States:

- `draft`
- `validated`
- `ready`
- `active`
- `frozen`
- `suspended`
- `deprecated`

Transitions:

- `draft -> validated`
- `validated -> ready`
- `ready -> active`
- `active -> frozen`
- `frozen -> validated`
- `active -> suspended`
- `suspended -> active`
- `active -> deprecated`
- `suspended -> deprecated`

Activation prerequisites:

- linked `GP` active
- linked `EO` active or under allowed review policy
- `TAM` present
- `EVT` present
- `RDY-G` present
- `DDMO-Gate = PASS`
- formal human validation recorded
- `CAE` matrix present
- consent structure defined
- active `VRN` issued

---

## 3. State machine dinamica del caso clinico

### 3.1 Activacion del caso

Precondition mandatory:

- documented medical order in `EHR`
- formal medical validation
- active `VRN`
- minimum dependencies complete

If any missing:

- state = `pending_activation`

If all complete:

- state = `activated`

### 3.2 Canonical case states

States:

- `pending_activation`
- `activated`
- `pre_op_ready`
- `pre_op_in_progress`
- `intra_op_ready`
- `intra_op_in_progress`
- `cec_active`
- `transfer_to_icu`
- `icu_active`
- `floor_active`
- `discharge_ready`
- `discharged`
- `complication_active`
- `contingency_active`
- `suspended`
- `frozen`
- `closed`

### 3.3 Canonical transitions

1. `pending_activation -> activated`
Trigger:
- all 4 irreversible inputs satisfied

2. `activated -> pre_op_ready`
Trigger:
- `CPO` instantiated
- `TAM` initialized
- pre-op dependencies complete

3. `pre_op_ready -> pre_op_in_progress`
Trigger:
- `RDY-G` induction satisfied
- formal validation recorded

4. `pre_op_in_progress -> intra_op_ready`
Trigger:
- `OR/logistics` available
- no unresolved critical conflict
- required documentation signed

5. `intra_op_ready -> intra_op_in_progress`
Trigger:
- induction event completed
- operative team validated

6. `intra_op_in_progress -> cec_active`
Trigger:
- `RDY-G CEC-Start` satisfied

7. `cec_active -> intra_op_in_progress`
Trigger:
- `RDY-G CEC-Stop` satisfied

8. `intra_op_in_progress -> transfer_to_icu`
Trigger:
- `RDY-G Intra->UCI` satisfied

9. `transfer_to_icu -> icu_active`
Trigger:
- `ICU` handoff validated

10. `icu_active -> floor_active`
Trigger:
- `RDY-G UCI->Piso` satisfied

11. `floor_active -> discharge_ready`
Trigger:
- discharge criteria satisfied
- required complications resolved or controlled

12. `discharge_ready -> discharged`
Trigger:
- discharge validation signed

13. `discharged -> closed`
Trigger:
- case closure summary complete
- `ESL` final closure generated

### 3.4 Universal interrupt states

Any active state can transition to:

- `complication_active`
- `contingency_active`
- `suspended`
- `frozen`

#### complication_active

Trigger:

- `CAE` detected

Examples:

- `AKI`
- `FA`
- reexploration
- sternal infection
- low cardiac output
- stroke
- device failure

Exit:

- resolved back to previous pathway state
- escalated to `contingency_active`
- or `closed` if terminal closure decision

#### contingency_active

Trigger:

- operational contingency
- critical resource unavailability
- systemic threshold signal
- severe inter-framework conflict
- ethical conflict

Exit:

- return to clinical pathway state
- `suspended`
- `frozen`

#### suspended

Trigger:

- temporary clinical or governance pause

Requires:

- suspension record
- reason
- authorized actor

Exit:

- reactivation only with formal validation

#### frozen

Trigger:

- integrity conflict
- legal hold
- critical unresolved discrepancy

Exit:

- only via governance resolution

---

## 4. EVT interaction model

EVT types:

- `EVT-LAB`
- `EVT-HEMO`
- `EVT-ELEC`
- `EVT-SURG`
- `EVT-INF`
- `EVT-DEVICE`
- `EVT-PHARM`
- `EVT-DOC`

EVT may trigger:

- `RDY-G` evaluation
- conditional runbook
- state transition
- ethical escalation
- `CAE` activation

---

## 5. RDY-G interaction model

Each readiness gate has:

- `source_phase`
- `target_phase`
- minimum criteria
- required structured evidence
- required formal validation
- optional logistics checks

Important:

- logistics never overrides clinical indication
- logistics can block execution feasibility and escalate

---

## 6. Override model

Override scopes:

- individual clinical override
- structural override

Rules:

- every override requires justification
- individual override belongs to case layer
- structural override belongs to governance layer
- all overrides append-only
- all overrides visible in `ESL` where applicable

---

## 7. Case closure state machine

States:

- `closure_pending`
- `closure_validated`
- `esl_finalized`
- `outcome_monitoring`
- `archived`

Transitions:

- `discharged -> closure_pending`
- `closure_pending -> closure_validated`
- `closure_validated -> esl_finalized`
- `esl_finalized -> outcome_monitoring`
- `outcome_monitoring -> archived`

Required artifacts:

- Case Closure Summary
- `ESL Final Closure`
- `CQOI` linkage
- device traceability reconciliation
- consent status reconciliation

## 8. Uso canonico

Este documento define las maquinas de estado canonicas que deben gobernar:

- el ciclo estructural de conocimiento
- la activacion y ejecucion del caso
- las transiciones append-only relevantes
- los puntos de interrupcion, override y cierre

Las implementaciones en `schemas/`, servicios y persistencia deben derivarse de estas maquinas sin mezclar el plano estructural con el plano dinamico del caso.
