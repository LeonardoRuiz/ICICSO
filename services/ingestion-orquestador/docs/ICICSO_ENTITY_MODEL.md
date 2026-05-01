# ICICSO Entity Model

Version: draft-1

## 1. Reglas generales del modelo

- Toda entidad estructural relevante tiene:
  - `id`
  - `code`
  - `version`
  - `vrn`
  - `status`
  - `created_at`
  - `created_by`
  - `approved_at`
  - `approved_by`
  - `hash`
  - `signature_ref`
  - `lineage_ref`
- Ninguna entidad legal append-only se sobrescribe.
- Toda entidad clinica debe enlazarse a `ILC`.
- Toda entidad clinica utilizable debe codificarse terminologicamente.
- Toda entidad ejecutable debe poder rastrearse a `EO/GP/FW` fuente.

## 2. Entidades fundacionales

### 2.1 GovernanceRecord

Campos:

- `governance_record_id`
- `type [CR, GCA, override_structural, deprecation, drift_event, threshold_record, release_note]`
- `vrn`
- `severity`
- `description`
- `source_domain`
- `affected_entities[]`
- `effective_from`
- `effective_to`
- `append_only_flag = true`

### 2.2 IdentityLongitudinalClinical (ILC)

Campos:

- `ilc_id`
- `patient_master_ref`
- `tokenized_ref`
- `collision_status`
- `identity_version`
- `merge_history[]`
- `split_history[]`
- `status`

### 2.3 ConsentRecord

Campos:

- `consent_id`
- `ilc_id`
- `case_id nullable`
- `cpo_id nullable`
- `consent_type [cpo, secondary_use, aggregate_modeling, withdrawal]`
- `version`
- `effective_at`
- `withdrawn_at nullable`
- `linked_lcr_ref`

### 2.4 TerminologyConceptMap

Campos:

- `term_map_id`
- `source_system`
- `source_code`
- `source_display`
- `target_standard [SNOMED, ICD10, LOINC, RxNorm, ATC, UDI, DICOM]`
- `target_code`
- `target_display`
- `semantic_version`
- `impact_status`

## 3. Entidades epistemologicas

### 3.1 SER (Source Evidence Record)

Campos:

- `ser_id`
- `doi`
- `reference_vancouver`
- `reference_toronto`
- `cor`
- `loe`
- `mim`
- `study_type`
- `sample_size`
- `effect_measure_type`
- `effect_measure_value`
- `ci_lower`
- `ci_upper`
- `p_value`
- `clinical_domain`
- `target_population`
- `publication_date`
- `institutional_validation_date`
- `scientific_owner`
- `institutional_version`
- `status [active, under_review, obsolete]`
- `hash`
- `signature_ref`

### 3.2 EO (Evidence Object)

Campos:

- `eo_id`
- `source_ser_id`
- `eo_nature [EO-G, EO-RCT, EO-META, EO-REG, EO-OBS, EO-EXPERT]`
- `eo_function [EO-Core, EO-Preventive, EO-Conditional, EO-Contingency, EO-Device-Specific, EO-Threshold-Based]`
- `domain`
- `effective_date`
- `status [active, under_review, deprecated]`
- `vrn`
- `ecs`
- `uci`
- `ddmo[]`
- `linked_gp_ids[]`
- `lineage_ser_ids[]`

### 3.3 ICDRRecord

Campos:

- `icdr_id`
- `source_ser_a`
- `source_ser_b`
- `divergence_type`
- `divergence_severity [low, moderate, high]`
- `methodological_difference`
- `threshold_difference`
- `jurisdiction_difference`
- `committee_validation_ref`
- `append_only_flag = true`

### 3.4 GuidelinePackage (GP)

Campos:

- `gp_id`
- `title`
- `domain_id`
- `scientific_domain`
- `linked_eo_ids[]`
- `coexistence_summary`
- `neutrality_declaration_id`
- `icdr_map_id`
- `population_scope`
- `sunset_policy_id`
- `review_due_at`
- `el_vrn`
- `ghl_vrn`
- `active_version`
- `scientific_owner`
- `institutional_version`
- `vrn`
- `hash`
- `signature_ref`
- `status`

### 3.5 Framework (FW)

Campos:

- `fw_id`
- `name`
- `description`
- `applicable_cpo_count`
- `impacted_clinical_phases[]`
- `institutional_metrics[]`
- `source_eo_ids[]`
- `executability [hard, soft]`
- `exclusion_criteria`
- `conflict_policy`
- `primary_metric`
- `secondary_metrics[]`
- `collision_records[]`
- `sunset_record nullable`
- `active_version`
- `vrn`
- `hash`
- `status`

## 4. Entidades operativas pre-ejecutables

### 4.1 ClinicalPathwayObject (CPO)

Campos:

- `cpo_id`
- `cpo_type [PROC, COND, PREVENTIVE, CONTINGENCY, UCI, COMPOSITE, HIGH_RISK]`
- `title`
- `domain_id`
- `subdomain_id`
- `clinical_domain`
- `risk_profile`
- `eul_level`
- `irreversibility_level`
- `sensitivity_index`
- `source_gp_ids[]`
- `source_fw_ids[]`
- `source_eo_ids[]`
- `el_vrn`
- `ghl_vrn`
- `kbol_vrn`
- `active_vrn`
- `status [draft, validated, ready, active, frozen, suspended, deprecated]`
- `logical_dependencies[]`
- `required_ddmo[]`
- `linked_tam_id`
- `linked_evt_catalog_id`
- `linked_rdyg_set_id`
- `linked_cae_matrix_id`
- `linked_bom_ids[]`
- `linked_ro_ids[]`
- `freeze_mode_flag`
- `rollback_reference`
- `hash`
- `signature_ref`
- `consent_structure_id`
- `escalation_map_id`

### 4.2 RunbookObject (RO)

Campos:

- `ro_id`
- `cpo_id`
- `actor_role`
- `checklist_items[]`
- `alternate_scenarios[]`
- `preconditions[]`
- `escalation_paths[]`
- `active_vrn`

### 4.3 BillOfMaterials (BOM/BO)

Campos:

- `bom_id`
- `cpo_id`
- `bom_type [IB-BOM, P-BOM, E-BOM, CEC-BOM, ICU-BOM, D-BOM, EO-Mapped, Risk-Weighted, Outcome-Linked]`
- `items[]`
- `medication_refs[]`
- `device_refs[]`
- `human_resource_refs[]`
- `linked_udi_requirements[]`
- `risk_weights[]`
- `active_vrn`

### 4.4 TemporalActivationModel (TAM)

Campos:

- `tam_id`
- `cpo_id`
- `tam_type [linear, branching, parallel, composite, contingency_conditioned, high_risk]`
- `phases [pre_op, intra_op, cec, icu, floor, discharge]`
- `critical_windows[]`
- `phase_dependencies[]`
- `activation_rules[]`
- `active_vrn`

### 4.5 EventTriggerCatalog (EVT)

Campos:

- `evt_catalog_id`
- `cpo_id`
- `trigger_definitions[]`
  - `evt_id`
  - `evt_type [LAB, HEMO, ELEC, SURG, INF, DEVICE, PHARM, DOC]`
  - `severity [low, moderate, high, critical]`
  - `threshold_logic`
  - `source_system`
  - `downstream_actions[]`
- `active_vrn`

### 4.6 ReadinessGateDefinition (RDY-G)

Campos:

- `rdyg_set_id`
- `cpo_id`
- `gate_definitions[]`
  - `gate_id`
  - `gate_name`
  - `source_phase`
  - `target_phase`
  - `minimum_criteria[]`
  - `required_validations[]`
- `active_vrn`

### 4.7 ClinicalAdverseEventMatrix (CAE)

Campos:

- `cae_matrix_id`
- `cpo_id`
- `modeled_events[]`
  - `cae_id`
  - `event_name`
  - `phenotype_variants[]`
  - `severity_model`
  - `mitigation_routes[]`
  - `bom_links[]`
  - `outcome_links[]`
- `active_vrn`

### 4.8 ContextAdaptationModule (CAE-CTX)

Campos:

- `ctx_module_id`
- `cpo_id`
- `phenotype_rules[]`
- `risk_modifiers[]`
- `context_constraints[]`
- `adaptation_output_schema`

## 5. Entidades runtime por caso

### 5.1 Case

Campos:

- `case_id`
- `ilc_id`
- `episode_id`
- `active_cpo_id`
- `active_vrn`
- `medical_order_ref`
- `medical_validation_ref`
- `dependency_completion_status`
- `consent_refs[]`
- `case_status [pending_activation, active, suspended, frozen, closed]`

### 5.2 CaseState

Campos:

- `case_state_id`
- `case_id`
- `current_state`
- `current_phase`
- `entered_at`
- `validated_by`
- `validation_ref`

### 5.3 CaseTransitionRecord

Campos:

- `transition_id`
- `case_id`
- `from_state`
- `to_state`
- `trigger_type [evt, gate, manual_validation, override, contingency]`
- `trigger_ref`
- `justification`
- `timestamp`
- `actor_ref`
- `append_only_flag = true`

### 5.4 CaseOverrideRecord

Campos:

- `override_id`
- `case_id`
- `override_scope [clinical_individual, structural]`
- `rationale`
- `requested_by`
- `approved_by`
- `timestamp`
- `linked_governance_record nullable`

### 5.5 EvidenceSnapshotLegal (ESL)

Campos:

- `esl_id`
- `case_id`
- `esl_type [pre_op, intra_op, transition, complication, override, final_closure]`
- `active_eo_ids[]`
- `active_vrn`
- `applied_cpo_id`
- `executed_rdyg[]`
- `activated_evt[]`
- `occurred_cae[]`
- `active_consents[]`
- `registered_udi[]`
- `overrides[]`
- `global_hash`
- `signatures[]`
- `timestamp`

### 5.6 DecisionCard

Campos:

- `decision_card_id`
- `case_id`
- `cpo_id`
- `active_vrn`
- `applied_eul_level`
- `srm_risk_summary`
- `structured_alternatives[]`
- `critical_dependencies[]`
- `scientific_references[]`
- `timestamp`
- `visible_to_roles[]`

## 6. Entidades de integracion clinica

### 6.1 StructuredClinicalEvent

Campos:

- `event_id`
- `ilc_id`
- `case_id`
- `source_system [EHR, LIS, RIS, PACS, device, pharmacy]`
- `source_event_type`
- `standard_code_system`
- `standard_code`
- `value`
- `unit`
- `event_time`
- `authored_by`
- `linked_evt_id nullable`

### 6.2 ClinicalDocumentEnvelope

Campos:

- `document_envelope_id`
- `ilc_id`
- `case_id`
- `document_type`
- `author`
- `authored_at`
- `version`
- `hash`
- `signature_ref`
- `consent_ref`
- `semantic_tags[]`
- `repository_pointer`
- `binary_storage_ref`

### 6.3 ImageReference

Campos:

- `image_ref_id`
- `ilc_id`
- `case_id`
- `study_uid`
- `series_uid`
- `instance_uid`
- `report_ref`
- `structured_summary nullable`

### 6.4 DeviceTraceabilityRecord

Campos:

- `device_trace_id`
- `ilc_id`
- `case_id`
- `udi`
- `gs1_ref`
- `implant_time`
- `device_status`
- `recall_status`
- `linked_safety_alerts[]`

## 7. Entidades sistemicas y downstream

### 7.1 SRMRecord

Campos:

- `srm_record_id`
- `time_window`
- `aggregate_risk_index`
- `saturation_index`
- `fw_adherence_impact`
- `systemic_drift_signal`
- `recommendation`
- `no_individual_writeback = true`

### 7.2 DTQScenario

Campos:

- `dtq_scenario_id`
- `scenario_type`
- `assumptions[]`
- `probabilistic_outputs[]`
- `icu_simulation`
- `capex_assessment`
- `comparative_report`
- `writeback_enabled = false`

### 7.3 CQOIRecord

Campos:

- `cqoi_record_id`
- `metric_type`
- `population_scope`
- `cpo_scope`
- `fw_scope`
- `value`
- `period`
- `bias_signal nullable`
- `ethical_escalation_ref nullable`

### 7.4 EEMRecord

Campos:

- `eem_record_id`
- `cost_of_care`
- `icer`
- `roi`
- `capex_model_ref`
- `opex_model_ref`
- `aggregate_only = true`

### 7.5 CMLRecord

Campos:

- `cml_record_id`
- `drg_group`
- `contract_ref`
- `monetization_report`
- `aggregate_only = true`
- `upstream_influence = false`

### 7.6 AnonymizedDataset

Campos:

- `anon_id`
- `dataset_hash`
- `case_hashes[]`
- `clinical_variables`
- `outcomes`
- `generalized_timestamps`
- `anonymization_profile_ref`
- `release_purpose`
- `release_certificate_ref`
- `source_refs[]`

### 7.7 EconomicEpisode

Campos:

- `econ_id`
- `case_hash`
- `drg_code`
- `clinical_domain`
- `total_cost`
- `revenue`
- `margin`
- `cost_breakdown`
- `resource_utilization`
- `timestamp`

### 7.8 CapacityModel

Campos:

- `capacity_model_id`
- `resource_type`
- `capacity`
- `utilization_rate`
- `bottleneck_flag`
- `forecast_demand`
- `scenario_horizon`
- `timestamp`

### 7.9 CommercialPackage

Campos:

- `package_id`
- `clinical_domain`
- `bundle_components`
- `price`
- `margin_target`
- `target_market`
- `channel`
- `version`

### 7.10 SimulationScenario

Campos:

- `scenario_id`
- `scenario_type [clinical_aggregate, operational, financial, expansion]`
- `input_variables`
- `assumptions`
- `projected_outcomes`
- `sensitivity_analysis`
- `created_at`
- `no_writeback = true`

### 7.11 ExportJob

Campos:

- `export_job_id`
- `export_type [dashboard, warehouse, investor, regulatory, api]`
- `dataset_ref`
- `target_interface`
- `aggregation_level`
- `policy_validation_ref`
- `generated_at`

## 8. Uso canonico

Este documento define el modelo canonico de entidades de alto nivel. Las implementaciones concretas en `schemas/`, persistencia y APIs deben derivarse de este modelo y preservar:

- versionado explicito
- trazabilidad entre fuente, compilacion y runtime
- separacion formal entre dominios
- `ANON` obligatorio antes de `EEM`, `OPL`, `CML`, `SIM` y `EXPORT` cuando exista dato derivado de caso
- restricciones de no write-back en capas sistemicas y downstream
