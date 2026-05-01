# ICICSO Block 8 Specification

Version: draft-1
Status: canonical working specification
Scope: `post-execution systemic control`, `institutional risk`, `quality`, `drift`, `governed feedback`

## 1. Purpose

Block 8 converts supervised case execution into institutional intelligence without interfering with the active clinical act.

Canonical transformation:

`executed case artifacts (STC + ESL + overrides) -> aggregate systemic signals -> institutional performance evaluation -> drift/risk detection -> governed upstream feedback`

Hard rules:

- Block 8 does not modify the running case.
- Block 8 does not mutate `CPO` in real time.
- Block 8 does not rewrite `EO`.
- Block 8 does not perform direct write-back into `CCCL`.
- Block 8 may measure, detect, alert, recommend and escalate for governed upstream review.

This block is where `ICICSO` becomes adaptive without becoming epistemically unstable.

## 2. What Block 8 solves

### 2.1 Institutional learning

Each executed case stops being an isolated event and becomes part of an institutional signal layer.

### 2.2 Real risk visibility

Block 8 detects emergent systemic risk before it becomes obvious through delayed operational or clinical recognition.

### 2.3 Outcome-based quality

Quality is evaluated through real outcomes and execution trace quality, not only checklist compliance.

### 2.4 Drift detection

Block 8 detects separation between real practice and:

- evidence base,
- expected `CPO` pattern,
- institutional baseline.

### 2.5 Controlled improvement loop

Block 8 creates a feedback loop toward `GCL`, `GHL`, `KBOL` and related upstream governance processes without allowing uncontrolled runtime adaptation.

## 3. Internal subdomains

Block 8 is composed of five institutional subdomains:

1. `LCCB` — Loop Clinical Control Bus
2. `SRM` — Systemic Risk Monitor
3. `DTQ` — Data Trust & Quality
4. `CQOI` — Clinical Quality Outcome Intelligence
5. `DDE` — Drift Detection Engine

Note on terminology:

- current repository documents already use `DTQ` in some places for simulation-oriented outputs associated with the digital twin service;
- this specification uses `DTQ` as `Data Trust & Quality` because that is the correct function required inside Block 8;
- terminology reconciliation must happen before code-level implementation to avoid semantic collision.

## 4. Position in the continuum

Block 8 starts after supervised case execution emits auditable artifacts.

Minimal upstream dependencies:

- `CCCL` executed case state
- `STC`
- `ESL`
- override records
- operational metrics
- outcome snapshots

Minimal downstream consumers:

- `GCL`
- `GHL`
- `KBOL`
- ethics and governance review domains
- institutional dashboards and audit surfaces

Invariant:

- the relation is `execution -> observation -> aggregation -> governance escalation`
- never `execution -> analytics -> direct clinical mutation`

## 5. LCCB — Loop Clinical Control Bus

### 5.1 What LCCB is

`LCCB` is the institutional event bus that connects case execution artifacts to Block 8 analytic and governance surfaces.

It is not a live clinical command channel.

### 5.2 What LCCB carries

- `STC` events
- `ESL` snapshots
- override events
- operational feasibility metrics
- outcome records
- traceability references to source execution artifacts

### 5.3 Required properties

- asynchronous
- append-only
- execution-decoupled
- replayable
- auditable
- anonymizable or pseudonymizable for downstream aggregation when required

### 5.4 Minimum logical schema: `lccb_event`

- `event_id`
- `case_id`
- `event_type`
- `source_domain = CCCL`
- `payload_reference`
- `timestamp`
- `sensitivity_class`
- `aggregation_flag`

### 5.5 Boundary rules

`LCCB` may:

- expose signals to `SRM`, `DTQ`, `CQOI`, `DDE`
- carry operational and outcome references
- trigger institutional escalation workflows

`LCCB` must not:

- mutate clinical indication
- inject orders into runtime
- alter pathway thresholds
- bypass governance review

## 6. SRM — Systemic Risk Monitor

### 6.1 What SRM is

`SRM` detects emergent institutional risk.

It does not evaluate the individual bedside risk of one patient. Its scope is the behavior of the system.

### 6.2 What SRM monitors

Examples:

- `AKI post-CABG`
- postoperative atrial fibrillation
- mortality
- infectious complications
- bleeding
- saturation-sensitive adverse trends

### 6.3 Minimum logical schema: `systemic_risk_signal`

- `signal_id`
- `domain`
- `metric_name`
- `baseline_value`
- `observed_value`
- `deviation`
- `severity_level`
- `detection_timestamp`
- `confidence_level`

### 6.4 Example

`CABG x3` aggregate:

- expected `AKI incidence = 12%`
- observed `AKI incidence = 18%`
- deviation `= +6 percentage points`
- severity `= medium`

### 6.5 Allowed actions

`SRM` may:

- alert
- escalate to review
- trigger `CQOI` deep analysis
- emit institutional recommendations

`SRM` must not:

- change an active case
- change thresholds autonomously
- reconfigure runtime pathways directly

## 7. DTQ — Data Trust & Quality

### 7.1 What DTQ is

`DTQ` evaluates the quality and trustworthiness of post-execution generated data.

Its scope is not input certification from Block 2. Its scope is the reliability of execution-derived evidence entering institutional learning.

### 7.2 What DTQ evaluates

- `STC` completeness
- timestamp consistency
- `ESL` integrity
- override documentation quality
- traceability continuity
- anomaly presence

### 7.3 Minimum logical schema: `data_quality_record`

- `dq_id`
- `case_id`
- `completeness_score`
- `consistency_score`
- `traceability_score`
- `anomaly_flag`
- `issues_detected[]`
- `timestamp`

### 7.4 Example

Incomplete `STC` during `ICU` phase:

- completeness score drops
- anomaly flag becomes active
- downstream learning eligibility is restricted

### 7.5 Institutional impact

`DTQ` affects:

- reliability of institutional learning
- eligibility for `CQOI`
- confidence in derived performance signals

## 8. CQOI — Clinical Quality Outcome Intelligence

### 8.1 What CQOI is

`CQOI` is the outcome intelligence domain of Block 8.

It does not measure process compliance as its primary objective. It measures real-world results.

### 8.2 What CQOI evaluates

- mortality
- `ICU` length of stay
- readmission
- complications
- therapeutic success
- longitudinal outcome deviation against baseline

### 8.3 Minimum logical schema: `cqoi_metric`

- `metric_id`
- `domain`
- `metric_name`
- `baseline`
- `observed`
- `delta`
- `percentile`
- `confidence_interval`
- `timestamp`

### 8.4 Example

`CABG x3` aggregate:

- `ICU LOS baseline = 48h`
- `ICU LOS observed = 60h`
- `delta = +25%`

### 8.5 Allowed uses

- benchmarking
- longitudinal quality review
- institutional improvement programs
- indirect governed input to `GHL` and `KBOL`

## 9. DDE — Drift Detection Engine

### 9.1 What DDE is

`DDE` detects systematic separation between real practice and institutional expectation.

Reference anchors:

- expected `CPO`
- evidence base
- institutional baseline

### 9.2 Drift classes

1. `clinical_drift`
   Real decisions diverge from expected evidence-bound pattern.
2. `operational_drift`
   `RO` or operational readiness patterns are not followed in practice.
3. `outcome_drift`
   outcomes become worse or unexpectedly different from baseline.

### 9.3 Minimum logical schema: `drift_record`

- `drift_id`
- `domain`
- `drift_type`
- `expected_pattern`
- `observed_pattern`
- `deviation_score`
- `significance_level`
- `timestamp`

### 9.4 Example

`PBM guideline` expectation:

- expected transfusion threshold around `Hb < 8`
- observed recurrent transfusion at `Hb 9.5`
- drift record generated

### 9.5 Consequences

Detected drift may trigger:

- `GHL` review
- `KBOL` review
- `ETE` recalibration review
- ethics or bias review if applicable

No direct runtime structural mutation is allowed.

## 10. Integrated flow

Canonical flow:

1. `CCCL` completes supervised execution.
2. `STC`, `ESL`, overrides and outcome traces are emitted to `LCCB`.
3. `DTQ` validates whether generated evidence is trustworthy enough for downstream analysis.
4. `SRM` evaluates emerging institutional risk.
5. `CQOI` measures aggregate outcomes against baseline.
6. `DDE` detects divergence between expected and observed practice.
7. Signals are escalated upstream through governance paths.

Result:

- the system learns without interfering with the active clinical act.

## 11. Concrete outputs

Block 8 does not exist to generate a static report.

Its real output is a continuous institutional intelligence layer.

Concrete outputs:

- `SRM` risk signals
- `CQOI` outcome metrics
- `DTQ` trust and quality records
- `DDE` drift records
- `LCCB` aggregate event streams
- governed escalation candidates for upstream review

One-line definition:

Block 8 converts clinical execution into institutional intelligence without interfering with active care.

## 12. CABG x3 reference scenario

Expected sequence:

1. supervised case execution completes
2. `STC + ESL` are captured
3. `DTQ` validates execution-derived data quality
4. `CQOI` measures outcomes
5. `SRM` detects aggregate risk deviations
6. `DDE` detects systematic divergence from expected practice
7. the case contributes to institutional learning

The case is therefore not only closed; it is absorbed into a controlled improvement loop.

## 13. Failure modes

### 13.1 Block 8 is not separated from execution

Consequence:

- clinically dangerous interference

### 13.2 Weak `SRM`

Consequence:

- institutional risk remains invisible until harm is already evident

### 13.3 Superficial `CQOI`

Consequence:

- false sense of quality

### 13.4 No effective drift detection

Consequence:

- silent degradation of the institutional system

### 13.5 Direct write-back

Consequence:

- corruption of the model and loss of epistemic stability

## 14. Gold rule

Block 8 observes, but does not intervene directly.

## 15. Architectural criterion

Any implementation of Block 8 is invalid if it:

- mixes analytics with runtime execution,
- auto-adjusts clinical decisions in real time without governance,
- writes back into `CCCL` or active `CPO`,
- bypasses append-only traceability,
- performs individual clinical action under the guise of institutional learning.

## 16. Cross-reference with current repository contracts

This specification refines and extends:

- `ICICSO_CANONICAL_CONTINUUM.md` for `L9` and `L10`
- `ICICSO_IO_CONTRACTS.md` for `LCCB` and `CQOI / SRM / DTQ`
- `ICICSO_SERVICE_BOUNDARIES.md` for forbidden couplings and service separation
- `ICICSO_ENTITY_MODEL.md` for downstream systemic entities

Implementation note:

- before code implementation, current `DTQ` naming in contracts and entity models must be reconciled with this Block 8 meaning so the repository does not keep two incompatible definitions under one acronym.
