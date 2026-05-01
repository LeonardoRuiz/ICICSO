# ICICSO Block 5 Specification

Version: draft-1
Status: canonical working specification
Scope: `L4 Harmonization` + `L5 Operative compilation`

## 1. Purpose

Block 5 transforms governed evidence that already passed `ETE`, `EUL`, and active `VRN` validation into:

- a domain-bounded `GuidelinePackage (GP)`,
- a modular operative layer `KBOL`,
- a versioned `ClinicalPathwayObject (CPO)`.

This block converts scientific coexistence into operative structure without turning that structure into clinical action.

Hard rule:

- without active `EL-VRN`, no clinical activation may be derived from this block.

## 2. Structural sequence

Canonical sequence:

1. `EUL classified + active EO + ICDR + active EL-VRN`
2. `GHL` groups `EO` into a `GP`
3. `GP` is handed to `KBOL`
4. `KBOL` organizes `EO` into modular operative frameworks
5. `KBOL` emits a versioned `CPO`
6. `CPO` becomes export-ready toward `RO`, `BOM/BO`, `TAM`, `EVT`, `RDY-G`, `CAE`

Forbidden shortcut:

- `active EO -> direct CPO`

This shortcut violates scientific sovereignty because it skips harmonization.

## 3. Domain split

`GHL` and `KBOL` are adjacent but not equivalent.

`GHL` belongs to the scientific domain:

- groups active `EO` under a formally declared clinical domain,
- records coexistence,
- maps divergences through `ICDR`,
- emits `GP`.

`KBOL` belongs to the operative structural domain:

- consumes active `GP`,
- compiles modular frameworks,
- emits `CPO`, `RO`, `BOM/BO`, `TAM`, `EVT`, `RDY-G`, `CAE`,
- remains pre-executable.

## 4. GHL

### 4.1 What GHL is

`GHL` is the institutional layer that groups active `EO` under a formally defined domain, documents structural coexistence of multiple guidelines, records divergences, and produces an audit-ready versioned `GP`.

### 4.2 What GHL must not do

`GHL` must not:

- fuse guidelines into a new hybrid guideline,
- rewrite scientific recommendations,
- privilege one scientific authority over another,
- modify `COR`, `LOE`, `MIM`, or `EUL`,
- resolve downstream case execution.

`GHL` groups; it does not synthesize free-form science.

### 4.3 GHL required inputs

- `eo_active_set`
- `icdr_open_set`
- `eul_classification`
- `mac_matrix`
- `ddmo_gate_status = PASS`
- `el_vrn`
- `case_domain_id`

### 4.4 Formal domain boundary

`GHL` may only group `EO` inside a formally declared ontologic domain.

Minimum domain fields:

- `domain_id`
- `parent_domain_id`
- `ontology_level`
- `domain_type`
- `semantic_scope`
- `inclusion_criteria`
- `exclusion_criteria`
- `active_status`
- `governance_owner`
- `created_vrn`

## 5. Guideline Package

### 5.1 What GP is

`GP` is the institutional versioned container that groups coexistence-ready `EO` for one concrete clinical domain.

`GP` is not:

- a new guideline,
- a PDF,
- a final recommendation,
- a case order.

### 5.2 GP activation prerequisites

- `EUL` level `I-III`
- `MAC` confirms applicable `EO`
- `DDMO-Gate = PASS`
- active `EL-VRN`

### 5.3 GP minimum content

- grouped `EO` with complete metadata
- quantified `ICDR` map
- coexistence map
- neutrality declaration
- population scope
- sunset policy
- `KBOL` interface sheet
- `VRN` linkage
- cryptographic hash
- institutional digital signature

### 5.4 GP subartifacts

1. `GHL-EO-LIST`
   Fields:
   - `eo_id`
   - `source_ser_id`
   - `eo_vrn`
   - `status`
   - `cor`
   - `loe`
   - `mim`
   - `el_vrn_dependency_verified`
   - `cross_compatibility_flag`
   - `last_reviewed_at`
2. `GHL-ICDR-MAP`
   Fields:
   - `icdr_id`
   - `affected_eo_ids[]`
   - `divergence_type`
   - `structural_severity`
   - `impact_score`
   - `affects_cos`
   - `affects_icu`
   - `status`
3. `GHL-SUNSET-POLICY`
   Rules:
   - max validity without review: `24 months`
   - `under_review` if source `SER` changes materially
   - automatic freeze if evidence becomes obsolete
   - automatic trigger if `EL-VRN` changes
4. `GHL-NEUTRALITY-DECLARATION`
   Declares:
   - no national-over-international bias
   - no recency-over-methodology bias
   - no original-text alteration
   - no authority hierarchy imposed
5. `GHL-KBOL-INTERFACE-SHEET`
   Maps:
   - `EO-T -> KBOL-T`
   - `EO-O -> KBOL-O`
   - `EO-P -> KBOL-P`
   - `EO-S -> KBOL-S`
   - `executability_label = hard|soft`
6. `GHL-VRN-SHEET`
   Fields:
   - `gp_id`
   - `ghl_vrn`
   - `version`
   - `activation_date`
   - `el_vrn_dependency`
   - `change_history`
7. `GHL-HASH-CHAIN`
   - cryptographically chains the `GP` to the upstream `EUL` package

### 5.5 GP minimum logical schema

- `gp_id`
- `domain_id`
- `el_vrn`
- `ghl_vrn`
- `version`
- `status`
- `review_due_at`
- `neutrality_declaration_id`
- `sunset_policy_id`
- `icdr_map_id`
- `eul_dependency_id`
- `hash`
- `signature_id`

## 6. KBOL

### 6.1 What KBOL is

`KBOL` is the institutional layer that consumes `GP`, organizes `EO` into modular operative frameworks, and emits `CPO` plus the pre-executable structural artifacts required by downstream orchestration.

### 6.2 What KBOL must not do

`KBOL` must not:

- execute clinical actions,
- emit autonomous orders,
- modify `COR`, `LOE`, `MIM`, or `EUL`,
- substitute `EHR`,
- absorb local logistics, commercial, or economic optimization logic into scientific structure.

### 6.3 KBOL required inputs

- active `GP`
- `EUL` level
- active frameworks
- active `ConsensusRecord`
- active threshold registry references
- `hard|soft` executability labels
- sunset policy and `VRN` linkage

### 6.4 KBOL outputs

- `CPO`
- `RO`
- `BOM/BO`
- `TAM`
- `EVT`
- `RDY-G`
- `CAE`
- `CPO consent structure`

## 7. Operative frameworks

### 7.1 What a framework is

A framework is a modular operative unit derived from one or more `EO`, preserving source epistemic identity while defining its own scope, exclusions, conflict policy, and metrics.

### 7.2 Minimum framework fields

- `framework_id`
- `gp_id`
- `source_eo_ids[]`
- `framework_type`
- `title`
- `scope_statement`
- `exclusion_criteria`
- `conflict_policy`
- `executability`
- `primary_metric`
- `secondary_metrics[]`
- `status`
- `hash`
- `vrn_id`

### 7.3 Framework dependency matrix

Frameworks must not be treated as isolated modules. `KBOL` needs quantified dependencies to expose structural coupling and to support freeze, review, and rollback decisions.

Minimum dependency fields:

- `dependency_id`
- `source_framework_id`
- `target_framework_id`
- `dependency_type [direct, moderate, contextual]`
- `coefficient`
- `bidirectional_flag`
- `justification`
- `version`

## 8. CPO

### 8.1 What CPO is

`CPO` is the formal clinical-operative object that represents an institutional pathway for a bounded case profile. It is generated by `KBOL`, but it is only instantiable after authorized human validation.

`CPO` is not:

- a clinical order,
- a medical note,
- a checklist,
- an autonomous execution artifact.

### 8.2 CPO minimum fields

- `cpo_id`
- `domain_id`
- `subdomain_id`
- `cpo_type`
- `risk_profile`
- `eul_level`
- `irreversibility_level`
- `sensitivity_index`
- `el_vrn`
- `ghl_vrn`
- `kbol_vrn`
- `status`
- `activation_date`
- `review_due_at`
- `required_ddmo_set[]`
- `framework_ids[]`
- `freeze_mode_flag`
- `rollback_reference`
- `hash`
- `signature_id`

### 8.3 CPO hard instantiation rule

If `DDMO-Gate != PASS`, the `CPO` is not instantiable.

Minimum pathway dependencies remain explicit:

- domain evidence requirements
- mandatory baseline variables
- active dynamic consent
- validated identity linkage
- human validation record

## 9. Freeze, review, rollback

### 9.1 Freeze mode

Trigger examples:

- source `SER` deprecated,
- `ICDR` severity `>= 3`,
- critical `EO` change,
- active `EL-VRN` invalidated.

Consequences:

- `CPO.status = frozen`
- instantiation blocked
- downstream exports suspended until governance review

### 9.2 Under review

`Under review` allows restricted continuity, but:

- requires double human validation,
- requires expanded trace registration,
- cannot silently mutate linked frameworks.

### 9.3 Rollback

If a framework update produces incompatibility:

- prior version remains addressable,
- previous compatible `CPO` may be reactivated,
- hash lineage remains intact,
- rollback reason is mandatory.

## 10. Required Block 5 documents

### 10.1 GHL set

- `GP Master`
- `EO List`
- `ICDR Map`
- `Neutrality Declaration`
- `Sunset Policy`
- `KBOL Interface Sheet`
- `VRN Sheet`
- `Hash Chain`

### 10.2 KBOL set

- `Framework Catalog`
- `Framework Dependency Matrix`
- `Conflict Compatibility Matrix`
- `Freeze/Review Status Record`
- `Rollback Register`
- `CPO Master`
- `CPO DDMO Sheet`
- `CPO Metrics Sheet`
- `CPO Export Manifest`

## 11. Failure modes

- `GHL` fuses instead of grouping and creates invented science
- `GP` lacks sunset or clear `VRN`
- `KBOL` mixes scientific structure with local logistics or economic logic
- `CPO` becomes auto-executable
- framework dependencies are not quantified
- rollback does not exist

## 12. Canonical output

Block 5 output is not a simple protocol.

It is:

- an active, domain-bounded `GP`,
- a modular `KBOL`,
- a versioned, audit-ready, human-validated `CPO`,
- export-ready interfaces for `RO`, `BOM/BO`, `TAM`, `EVT`, `RDY-G`, `CAE`.

In one line:

Block 5 takes evidence that is already translated and classified, organizes it institutionally, and converts it into a formal clinical pathway that is still not executed.
