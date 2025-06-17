# Synthetic ICU Dataset

## Overview
This synthetic dataset contains 500 ICU patients with realistic clinical data.
The data is available in three formats: MIMIC, CLIF, and OMOP CDM.

## Dataset Statistics
- **Patients**: 500
- **Hospital Admissions**: 666
- **ICU Stays**: 608
- **Diagnoses**: 1615
- **Medications**: 1938
- **Procedures**: 295
- **Vital Signs**: 235,767
- **Lab Results**: 65,214

## Clinical Characteristics
- **Sepsis Cases**: 261
- **Overall Mortality Rate**: 24.3%

## Data Formats

### MIMIC Format
Located in `mimic_format/` directory. Follows MIMIC-III/IV table structure.

### CLIF Format
Located in `clif_format/` directory. Follows Common Longitudinal ICU Format specification.

### OMOP CDM Format
Located in `omop_format/` directory. Follows OMOP Common Data Model v5.4.

## Usage Examples

### Load MIMIC format data:
```python
import pandas as pd

patients = pd.read_csv('mimic_format/patients.csv')
admissions = pd.read_csv('mimic_format/admissions.csv')
diagnoses = pd.read_csv('mimic_format/diagnoses.csv')
```

### Load OMOP format data:
```python
person = pd.read_csv('omop_format/person.csv')
visit_occurrence = pd.read_csv('omop_format/visit_occurrence.csv')
condition_occurrence = pd.read_csv('omop_format/condition_occurrence.csv')
```

## Important Notes
- This is **synthetic data** for testing and development only
- All patient identifiers are fictional
- Clinical values are randomly generated but clinically plausible
- Timestamps start from January 1, 2024

## Conditions Included
- Sepsis (A41.9)
- Pneumonia (J18.9)
- Acute Kidney Injury (N17.9)
- Heart Failure (I50.9)
- ARDS (J80)
- Stroke (I63.9)
- COPD Exacerbation (J44.1)
- GI Bleed (K92.2)

## Medications Included
- Vancomycin (RxNorm: 11124)
- Norepinephrine (RxNorm: 7512)
- Piperacillin-Tazobactam (RxNorm: 33533)
- Propofol (RxNorm: 8782)
- Fentanyl (RxNorm: 4337)
- Heparin (RxNorm: 5224)
- Insulin (RxNorm: 5856)
- Furosemide (RxNorm: 4603)
