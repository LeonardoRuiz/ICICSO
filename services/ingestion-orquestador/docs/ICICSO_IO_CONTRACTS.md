# ICICSO Input / Output Contracts

Version: 2026-04-05-renewed

## Estado del documento

Este documento sigue siendo canónico a nivel de dominios y propagación, pero debe leerse junto con el estado operativo actual del repo:

- el canon documental vive en `START_HERE.md`
- el runtime demo local vive en `icicso-local/`
- los contratos TypeScript exportados desde `icicso/packages/shared-kernel/contracts.ts` actúan como barrel técnico mínimo activo

## Alcance

Este documento no describe la jerarquía del cockpit ni la arquitectura del hub local.

Describe:

- contratos inter-dominio
- restricciones de propagación
- validaciones mínimas
- prohibiciones de write-back upstream

## 1. Reglas universales

- Todo contrato debe declarar dominio de origen y dominio de destino.
- Todo contrato debe declarar si el payload es:
  - cientifico
  - clinico legal
  - dinamico
  - paciente reportado
  - operativo
  - sistemico
  - economico
  - comercial
  - etico
  - tecnico
  - federado
- Todo contrato debe declarar restricciones de propagacion.
- Todo contrato debe declarar requisitos de validacion.
- Ningun contrato downstream puede hacer write-back upstream clinico.

---

## 2. Contract: SER Intake -> EL

### Name

`ser_intake_to_evidence_lake`

### Source domain

Epistemic intake

### Target domain

`EGL / EL`

### Input schema

- `doi: string`
- `reference_vancouver: string`
- `reference_toronto: string`
- `cor: string`
- `loe: string`
- `mim: string`
- `study_type: enum`
- `sample_size: number`
- `effect_measure_type: string?`
- `effect_measure_value: number?`
- `ci_lower: number?`
- `ci_upper: number?`
- `p_value: number?`
- `clinical_domain: string`
- `target_population: string`
- `status: enum`
- `institutional_validation_date: datetime`
- `scientific_owner: string`
- `institutional_version: string`
- `hash: string`
- `signature_ref: string`

### Validation

- DOI required
- scientific owner required
- institutional validation required
- hash required
- signature required
- prohibited fields rejected:
  - patient data
  - economic data
  - operational signals
  - `PRI`
  - commercial metrics

### Output

- `EO` candidate created
- immutable evidence lake entry created

---

## 3. Contract: EO -> ETE

### Name

`eo_to_ete_translation`

### Source domain

`EGL`

### Target domain

`ETE`

### Input schema

- `eo_id`
- `loe`
- `mim`
- `effect_profile`
- `consistency_metrics`
- `heterogeneity_metrics`
- `confidence_interval_data`
- `linked_icdr_refs[]`

### Validation

- `EO` must be validated
- no patient-level payload allowed
- no external runtime data allowed

### Output schema

- `ecs: number`
- `uci: number`
- `contextual_applicability_matrix: object`
- `minimum_required_dependencies: array`
- `translation_version`
- `translation_hash`

---

## 4. Contract: ETE -> EUL

### Name

`ete_to_eul_uncertainty_classification`

### Input schema

- `ecs`
- `uci`
- `confidence_interval_summary`
- `heterogeneity_metrics`
- `preliminary_conflict_signal`
- `threshold_registry_ref`

### Output schema

- `uncertainty_level: enum [I, II, III, IV]`
- `threshold_applied`
- `epistemic_friction_level`
- `reinforced_validation_required: boolean`

---

## 5. Contract: EUL/GHL -> KBOL

### Name

`harmonized_guidance_to_operational_compilation`

### Input schema

- `active_gp_ids[]`
- `uncertainty_classification`
- `minimum_required_dependencies[]`
- `approved_thresholds[]`
- `active_consensus_records[]`
- `framework_bindings[]`

### Validation

- `KBOL` rejects dynamic patient inputs
- `KBOL` rejects economic inputs
- all inputs require active version and `VRN` linkage
- `KBOL` only accepts `GP` emitted by `GHL`; direct `EO -> CPO` compilation is invalid
- `DDMO-Gate` must be `PASS` before `CPO` can be marked instantiable

### Output schema

- `cpo_id`
- `ro_ids[]`
- `bom_ids[]`
- `tam_id`
- `evt_catalog_id`
- `rdyg_set_id`
- `cae_matrix_id`
- `context_module_id`
- `srm_hooks[]`
- `active_vrn`

---

## 6. Contract: Clinical data sources -> CCCL

### Name

`clinical_runtime_event_ingestion`

### Source systems

- `EHR/LCR`
- `LIS`
- `RIS/PACS`
- medication system
- device telemetry
- monitoring systems

### Input schema

- `ilc_id`
- `case_id`
- `event_id`
- `source_system`
- `source_event_type`
- `standard_code_system`
- `standard_code`
- `value`
- `unit`
- `event_time`
- `authored_by`
- `payload_class [legal, dynamic, document, image_ref, medication, device]`

### Validation

- `ilc_id` required
- `case_id` required when case active
- standard coding required where applicable
- envelope required for documents
- image payload must arrive as reference, not binary blob
- invalid terminology mapping rejected or quarantined

### Output schema

- `structured_event_ref`
- `evt_match_result`
- `rdyg_candidate_evaluation`
- `case_timeline_append`
- `possible_escalation_signal`

---

## 7. Contract: PRI -> Firewall -> CCCL

### Name

`pri_firewalled_ingestion`

### Input schema

- `ilc_id`
- `case_id?`
- `pri_source`
- `pri_type`
- `reported_value`
- `timestamp`
- `confidence_hint?`

### Validation

- `PRI` cannot directly mutate `LCR`
- mandatory classification:
  - low
  - medium
  - high
- review requirement based on classification
- audit trail mandatory

### Output schema

- `pri_record_id`
- `pri_classification`
- `review_required: boolean`
- `potential_cccl_signal`
- `no_direct_lcr_write = true`

---

## 8. Contract: CCCL -> Decision Card

### Name

`case_context_to_decision_card`

### Input schema

- `case_id`
- `active_cpo_id`
- `active_vrn`
- `eul_level`
- `srm_risk_summary`
- `structured_alternatives[]`
- `critical_dependencies[]`
- `scientific_references[]`
- `timestamp`

### Output properties

- clinician visible
- not a medical order
- auditable
- contextual only

---

## 9. Contract: CCCL -> ESL

### Name

`case_snapshot_to_legal_evidence_snapshot`

### Input schema

- `case_id`
- `esl_type`
- `active_eo_ids[]`
- `applied_cpo_id`
- `active_vrn`
- `active_consents[]`
- `executed_rdyg[]`
- `activated_evt[]`
- `occurred_cae[]`
- `overrides[]`
- `registered_udi[]`
- `signatures[]`
- `timestamp`

### Validation

- append-only snapshot
- must be reproducible retrospectively
- hash required
- signature required where policy applies

### Output properties

- medico-legal
- reproducible
- closure-capable
- audit ready

---

## 10. Contract: LCCB operational signals

### Name

`operational_feasibility_signal`

### Input schema

- `or_capacity`
- `icu_capacity`
- `staffing_criticality`
- `inventory_status`
- `device_availability`
- `contingency_flags`
- `saturation_index`

### Validation

- no direct change to clinical indication
- conflicts must escalate to `GCL/BEG` when policy threshold met

### Output schema

- `feasibility_status`
- `rescheduling_signal`
- `contingency_activation`
- `escalation_record_ref`

---

## 11. Contract: Runtime / systemic outputs -> ANON

### Name

`downstream_anonymization_gate`

### Source domain

- `CCCL`
- `ESL`
- `SRM`
- `CQOI`
- senales operativas certificadas

### Target domain

`ANON`

### Input schema

- `source_refs[]`
- `case_level_records[]`
- `clinical_variables`
- `timing_variables`
- `outcomes`
- `operational_signals`
- `anonymization_profile_ref`
- `release_purpose`

### Validation

- direct identifiers prohibited in output
- quasi-identifiers must be generalized or suppressed
- source lineage mandatory
- release purpose must be policy-approved
- anonymization is mandatory before downstream patient-derived use

### Output schema

- `anon_id`
- `dataset_hash`
- `case_hashes[]`
- `generalized_timestamps`
- `clinical_variables`
- `outcomes`
- `release_certificate_ref`

---

## 12. Contract: ANON -> EEM / OPL / CML / SIM / EXPORT

### Common restriction

- aggregate only where specified
- no individual clinical write-back
- no threshold mutation without governance
- no direct identified payload propagation

### EEM output

- `economic_episode_report`
- `cost_of_care`
- `revenue`
- `margin`
- `drg_costing`
- `capex_opex_models`

### OPL output

- `capacity_model`
- `utilization_report`
- `bottleneck_flag`
- `forecast_demand`
- `throughput_projection`

### CML output

- `commercial_package`
- `pricing_report`
- `target_market_profile`
- `channel_strategy`
- `no_upstream_influence = true`

### SIM output

- `scenario_report`
- `projected_outcomes`
- `icu_simulation`
- `comparative_scenarios`
- `sensitivity_analysis`
- `no_writeback = true`

### EXPORT output

- `dashboard_feed`
- `warehouse_extract`
- `regulatory_report`
- `investor_pack`
- `lineage_manifest`

## 13. Uso canonico

Este documento define contratos canonicos de entrada y salida entre dominios ICICSO. Las implementaciones en `schemas/`, servicios, colas, APIs y persistencia deben derivarse de estos contratos y preservar:

- declaracion explicita de origen y destino
- clase de payload
- restricciones de propagacion
- requisitos de validacion
- prohibicion de write-back downstream sobre capas clinicas upstream
