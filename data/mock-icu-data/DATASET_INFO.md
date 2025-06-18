# Synthetic ICU Dataset Information

This directory contains a synthetic ICU dataset with 500 patients for testing the Healthcare Research MCP Server.

## Dataset Statistics
- **Patients**: 500
- **Hospital Admissions**: 666
- **ICU Stays**: 608
- **Sepsis Cases**: 261
- **Mortality Rate**: 24.3%

## Available Formats

1. **MIMIC Format** (`mimic_format/`)
   - Standard MIMIC-III/IV table structure
   - Files: patients, admissions, icustays, diagnoses, medications, procedures, vitals, labs

2. **CLIF Format** (`clif_format/`)
   - Common Longitudinal ICU Format
   - Files: patient, hospitalization, vitals, labs, medication_orders

3. **OMOP CDM Format** (`omop_format/`)
   - OMOP Common Data Model v5.4
   - Files: person, visit_occurrence, condition_occurrence, drug_exposure, measurement

## Dataset Files

### Sample Files Included
- `sample-patients.csv` - 10 example patients
- `sample-diagnoses.csv` - Example diagnoses including sepsis
- `sample-medications.csv` - Example medications including vancomycin

### Full Dataset Generation

To generate the complete 500-patient dataset with all tables:
```bash
python3 generate-synthetic-data.py
```

This will create:
- 235,767 vital sign measurements
- 65,214 lab results  
- Complete MIMIC, CLIF, and OMOP format files

## Quick Access

The dataset includes realistic data for testing queries like:
- "Analyze sepsis patients in the ICU data"
- "Compare vancomycin effectiveness in sepsis"
- "Build mortality prediction models"

## Data Dictionary

### Key Variables
- **ICD-10 Codes**: A41.9 (Sepsis), J18.9 (Pneumonia), N17.9 (AKI)
- **Medications**: Vancomycin (11124), Norepinephrine (7512)
- **Vital Signs**: Heart rate, blood pressure, temperature, SpO2
- **Lab Tests**: CBC, BMP, lactate, creatinine

The data is synthetic and for testing purposes only.