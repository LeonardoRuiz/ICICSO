# Guideline Hierarchy Layer (GHL)

## Overview

The Guideline Hierarchy Layer provides structured navigation of clinical guidelines organized by medical specialty and clinical conditions. It creates a hierarchical taxonomy that enables fast queries and evidence-based decision support.

## Architecture

### Core Concepts

- **Medical Specialties**: Hierarchical organization of medical domains (Cardiology, Neurology, etc.)
- **Clinical Conditions**: Specific medical conditions within specialties (CABG, Atrial Fibrillation, etc.)
- **Hierarchy Nodes**: Connection points between conditions and evidence with recommendation levels
- **Recommendation Classes**: ACC/AHA-style classification (Class I, IIa, IIb, III)

### Data Flow

```
Evidence Lake Records → GHL Taxonomy → Hierarchical Navigation
                      ↓
            Specialty → Condition → Recommendation Level → Evidence
```

## API Reference

### Service Methods

#### Navigation Methods

- `getSpecialtyHierarchy(specialtyCode)`: Get complete hierarchy for a specialty
- `getConditionNodes(conditionCode)`: Get all nodes for a specific condition
- `getEvidenceByRecommendation(specialtyCode, level)`: Get evidence IDs by recommendation level

#### Management Methods

- `rebuildHierarchy(specialtyCode)`: Rebuild hierarchy from evidence data
- `updateNodeReferences(nodeId, evidenceIds)`: Update evidence references for a node

## Usage Example

```typescript
import { createGuidelineHierarchyLayerService } from "@icicso/ghl";

const ghlService = createGuidelineHierarchyLayerService();

// Get cardiology hierarchy
const cardioHierarchy = await ghlService.getSpecialtyHierarchy("CARD");

// Find atrial fibrillation recommendations
const afibNodes = await ghlService.getConditionNodes("AFIB");

// Get Class I evidence for cardiology
const classIEvidence = await ghlService.getEvidenceByRecommendation("CARD", "Class I");
```

## Medical Taxonomy

### Supported Specialties

- `CARD`: Cardiology
- `CARD-SURG`: Cardiac Surgery (child of Cardiology)
- `NEURO`: Neurology
- `ONCO`: Oncology

### Supported Conditions

- `CABG`: Coronary Artery Bypass Graft
- `AFIB`: Atrial Fibrillation

## Events

- `ghl.hierarchy.rebuilt`: Fired when a hierarchy is rebuilt
- `ghl.node.updated`: Fired when node evidence references are updated

## Dependencies

- `shared-kernel`: Core utilities and types
- `evidence-lake`: Source of evidence records for hierarchy building

## Testing

Run the test suite:

```bash
cd packages/domain/ghl
deno test test-ghl.ts
```

## Future Enhancements

- Integration with SNOMED CT and ICD-10 for expanded condition mapping
- Dynamic hierarchy updates based on new evidence
- Multi-language support for international guidelines
- Integration with clinical decision support systems
