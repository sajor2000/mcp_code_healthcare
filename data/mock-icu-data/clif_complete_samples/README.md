# Complete CLIF Dataset

## Overview
This synthetic dataset contains 500 ICU patients with complete CLIF v2.0.0 format data.
All 23 CLIF tables are included with realistic clinical data.

## Dataset Statistics
- **Patients**: 500
- **Hospitalizations**: 747
- **ICU Stays**: 747
- **Mortality Rate**: 29.6%
- **Total Tables**: 23

## CLIF Tables Included

### Patient and Encounter Tables
1. **patient.csv** - Patient demographics
2. **hospitalization.csv** - Hospital encounters
3. **adt.csv** - Admission, discharge, transfer events
4. **provider.csv** - Provider information
5. **admission_diagnosis.csv** - Admission diagnoses

### Clinical Measurements
6. **vitals.csv** - Vital signs (390,942 records)
7. **labs.csv** - Laboratory results (170,272 records)
8. **patient_assessments.csv** - Clinical scores (GCS, RASS, etc.)
9. **position.csv** - Patient positioning (including prone)

### Respiratory Support
10. **respiratory_support.csv** - Ventilator and oxygen therapy data

### Medications
11. **medication_orders.csv** - Medication orders
12. **medication_admin_intermittent.csv** - Intermittent doses
13. **medication_admin_continuous.csv** - Continuous infusions

### Procedures and Therapies
14. **procedures.csv** - Clinical procedures
15. **therapy_session.csv** - PT/OT/ST/RT sessions
16. **therapy_details.csv** - Detailed therapy information

### Specialized Support
17. **crrt_therapy.csv** - Continuous renal replacement therapy
18. **ecmo_mcs.csv** - ECMO and mechanical circulatory support
19. **intake_output.csv** - Fluid balance tracking

### Microbiology
20. **microbiology_culture.csv** - Culture results
21. **sensitivity.csv** - Antibiotic sensitivity results
22. **microbiology_non_culture.csv** - PCR and antigen tests

### Additional Tables
23. **code_status.csv** - Code status documentation

## Usage

```python
import pandas as pd

# Load patient data
patients = pd.read_csv('patient.csv')
hospitalizations = pd.read_csv('hospitalization.csv')

# Load clinical data
vitals = pd.read_csv('vitals.csv')
labs = pd.read_csv('labs.csv')

# Join tables
patient_vitals = vitals.merge(hospitalizations, on='hospitalization_id')
patient_vitals = patient_vitals.merge(patients, on='patient_id')
```

## Important Notes
- All datetime fields are in UTC with timezone notation
- This is synthetic data for testing and development only
- All patient identifiers are fictional
- Clinical values are randomly generated but clinically plausible

## CLIF Compliance
This dataset follows CLIF v2.0.0 specifications including:
- Standardized column names
- Required datetime formats (YYYY-MM-DD HH:MM:SS+00:00)
- Appropriate _category fields for controlled vocabularies
- Proper foreign key relationships between tables
