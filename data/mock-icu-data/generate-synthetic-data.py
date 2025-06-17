#!/usr/bin/env python3
"""
Generate Synthetic ICU Dataset
Creates realistic mock data compatible with both MIMIC and CLIF formats
500 patients with ICU stays including sepsis cases
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import json
import os
from pathlib import Path

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Create output directory
output_dir = Path("data/mock-icu-data")
output_dir.mkdir(parents=True, exist_ok=True)

# Common conditions in ICU
CONDITIONS = {
    'sepsis': {'icd10': 'A41.9', 'frequency': 0.3, 'mortality': 0.25},
    'pneumonia': {'icd10': 'J18.9', 'frequency': 0.25, 'mortality': 0.15},
    'acute_kidney_injury': {'icd10': 'N17.9', 'frequency': 0.2, 'mortality': 0.3},
    'heart_failure': {'icd10': 'I50.9', 'frequency': 0.15, 'mortality': 0.2},
    'ARDS': {'icd10': 'J80', 'frequency': 0.1, 'mortality': 0.4},
    'stroke': {'icd10': 'I63.9', 'frequency': 0.1, 'mortality': 0.25},
    'COPD_exacerbation': {'icd10': 'J44.1', 'frequency': 0.1, 'mortality': 0.1},
    'GI_bleed': {'icd10': 'K92.2', 'frequency': 0.05, 'mortality': 0.15},
}

# Common medications in ICU
MEDICATIONS = {
    'vancomycin': {'rxnorm': '11124', 'for_conditions': ['sepsis', 'pneumonia'], 'dose_range': (15, 20), 'unit': 'mg/kg'},
    'norepinephrine': {'rxnorm': '7512', 'for_conditions': ['sepsis', 'heart_failure'], 'dose_range': (0.01, 0.5), 'unit': 'mcg/kg/min'},
    'piperacillin_tazobactam': {'rxnorm': '33533', 'for_conditions': ['sepsis', 'pneumonia'], 'dose_range': (3.375, 4.5), 'unit': 'g'},
    'propofol': {'rxnorm': '8782', 'for_conditions': ['all'], 'dose_range': (5, 50), 'unit': 'mcg/kg/min'},
    'fentanyl': {'rxnorm': '4337', 'for_conditions': ['all'], 'dose_range': (25, 200), 'unit': 'mcg/hr'},
    'heparin': {'rxnorm': '5224', 'for_conditions': ['all'], 'dose_range': (5000, 10000), 'unit': 'units'},
    'insulin': {'rxnorm': '5856', 'for_conditions': ['all'], 'dose_range': (0.5, 10), 'unit': 'units/hr'},
    'furosemide': {'rxnorm': '4603', 'for_conditions': ['heart_failure', 'acute_kidney_injury'], 'dose_range': (20, 80), 'unit': 'mg'},
}

def generate_demographics(n_patients=500):
    """Generate patient demographics"""
    patients = []
    
    for i in range(1, n_patients + 1):
        age = np.random.normal(65, 15)
        age = max(18, min(95, int(age)))  # Clamp between 18-95
        
        patient = {
            'subject_id': i,
            'gender': np.random.choice(['M', 'F'], p=[0.55, 0.45]),
            'age': age,
            'ethnicity': np.random.choice(['WHITE', 'BLACK', 'HISPANIC', 'ASIAN', 'OTHER'], 
                                        p=[0.6, 0.15, 0.15, 0.05, 0.05]),
            'weight': np.random.normal(80 if age < 65 else 75, 20),
            'height': np.random.normal(170 if np.random.random() > 0.45 else 160, 10)
        }
        patients.append(patient)
    
    return pd.DataFrame(patients)

def generate_admissions(patients_df):
    """Generate hospital and ICU admissions"""
    admissions = []
    icustays = []
    
    base_date = datetime(2024, 1, 1)
    
    for _, patient in patients_df.iterrows():
        # Some patients may have multiple admissions
        n_admissions = np.random.choice([1, 2, 3], p=[0.7, 0.25, 0.05])
        
        for adm_num in range(n_admissions):
            # Random admission date
            admit_offset = random.randint(0, 365) + adm_num * random.randint(30, 180)
            admit_time = base_date + timedelta(days=admit_offset, 
                                              hours=random.randint(0, 23),
                                              minutes=random.randint(0, 59))
            
            # Length of stay
            los_days = np.random.gamma(3, 2)  # Skewed distribution
            los_days = max(1, min(30, int(los_days)))
            
            # Primary diagnosis
            frequencies = [c['frequency'] for c in CONDITIONS.values()]
            # Normalize to ensure sum equals 1
            frequencies = np.array(frequencies) / sum(frequencies)
            primary_dx = np.random.choice(list(CONDITIONS.keys()), p=frequencies)
            
            # Mortality based on condition
            mortality_prob = CONDITIONS[primary_dx]['mortality']
            died = np.random.random() < mortality_prob
            
            discharge_time = admit_time + timedelta(days=los_days)
            death_time = discharge_time if died else None
            
            hadm_id = patient['subject_id'] * 1000 + adm_num + 1
            
            admission = {
                'subject_id': patient['subject_id'],
                'hadm_id': hadm_id,
                'admittime': admit_time,
                'dischtime': discharge_time,
                'deathtime': death_time,
                'admission_type': np.random.choice(['EMERGENCY', 'ELECTIVE', 'URGENT'], 
                                                 p=[0.7, 0.2, 0.1]),
                'admission_location': np.random.choice(['EMERGENCY ROOM', 'TRANSFER FROM HOSPITAL', 
                                                      'CLINIC REFERRAL', 'PHYSICIAN REFERRAL'],
                                                     p=[0.6, 0.2, 0.1, 0.1]),
                'discharge_location': 'DIED' if died else np.random.choice(['HOME', 'SNF', 'REHAB'], 
                                                                          p=[0.6, 0.3, 0.1]),
                'insurance': np.random.choice(['Medicare', 'Private', 'Medicaid', 'Self Pay'],
                                            p=[0.5, 0.3, 0.15, 0.05]),
                'language': 'ENGLISH',
                'marital_status': np.random.choice(['MARRIED', 'SINGLE', 'WIDOWED', 'DIVORCED'],
                                                 p=[0.5, 0.2, 0.2, 0.1]),
                'ethnicity': patient['ethnicity'],
                'diagnosis': primary_dx.replace('_', ' ').title(),
                'hospital_expire_flag': 1 if died else 0
            }
            admissions.append(admission)
            
            # ICU stay (most admissions have ICU stay in this dataset)
            if np.random.random() < 0.9:  # 90% have ICU stay
                icu_offset_hours = random.randint(0, 24)
                icu_intime = admit_time + timedelta(hours=icu_offset_hours)
                icu_los_days = min(los_days - icu_offset_hours/24, np.random.gamma(2, 1.5))
                icu_los_days = max(0.5, icu_los_days)
                
                icustay = {
                    'subject_id': patient['subject_id'],
                    'hadm_id': hadm_id,
                    'icustay_id': hadm_id * 10 + 1,
                    'first_careunit': np.random.choice(['MICU', 'SICU', 'CCU', 'CSRU'],
                                                     p=[0.4, 0.3, 0.2, 0.1]),
                    'last_careunit': np.random.choice(['MICU', 'SICU', 'CCU', 'CSRU'],
                                                    p=[0.4, 0.3, 0.2, 0.1]),
                    'intime': icu_intime,
                    'outtime': icu_intime + timedelta(days=icu_los_days),
                    'los': icu_los_days
                }
                icustays.append(icustay)
    
    return pd.DataFrame(admissions), pd.DataFrame(icustays)

def generate_diagnoses(admissions_df):
    """Generate diagnosis codes for each admission"""
    diagnoses = []
    
    for _, admission in admissions_df.iterrows():
        # Primary diagnosis
        primary_dx = admission['diagnosis'].lower().replace(' ', '_')
        if primary_dx in CONDITIONS:
            diag = {
                'subject_id': admission['subject_id'],
                'hadm_id': admission['hadm_id'],
                'seq_num': 1,
                'icd10_code': CONDITIONS[primary_dx]['icd10'],
                'description': admission['diagnosis']
            }
            diagnoses.append(diag)
            
            # Add comorbidities
            n_comorbidities = np.random.poisson(2)
            other_conditions = [c for c in CONDITIONS.keys() if c != primary_dx]
            
            for i, comorbidity in enumerate(random.sample(other_conditions, 
                                                         min(n_comorbidities, len(other_conditions)))):
                diag = {
                    'subject_id': admission['subject_id'],
                    'hadm_id': admission['hadm_id'],
                    'seq_num': i + 2,
                    'icd10_code': CONDITIONS[comorbidity]['icd10'],
                    'description': comorbidity.replace('_', ' ').title()
                }
                diagnoses.append(diag)
    
    return pd.DataFrame(diagnoses)

def generate_vital_signs(icustays_df):
    """Generate vital signs time series"""
    vitals = []
    
    vital_types = {
        'heart_rate': {'mean': 80, 'std': 15, 'unit': 'bpm', 'itemid': 220045},
        'sbp': {'mean': 120, 'std': 20, 'unit': 'mmHg', 'itemid': 220179},
        'dbp': {'mean': 70, 'std': 10, 'unit': 'mmHg', 'itemid': 220180},
        'map': {'mean': 80, 'std': 10, 'unit': 'mmHg', 'itemid': 220052},
        'respiratory_rate': {'mean': 18, 'std': 4, 'unit': 'breaths/min', 'itemid': 220210},
        'temperature': {'mean': 37.0, 'std': 0.8, 'unit': 'C', 'itemid': 223761},
        'spo2': {'mean': 96, 'std': 3, 'unit': '%', 'itemid': 220277},
    }
    
    for _, stay in icustays_df.iterrows():
        # Generate measurements every hour
        current_time = pd.to_datetime(stay['intime'])
        end_time = pd.to_datetime(stay['outtime'])
        
        while current_time < end_time:
            for vital_name, vital_info in vital_types.items():
                # Add some patient-specific variation
                patient_offset = np.random.normal(0, vital_info['std'] * 0.3)
                
                # Generate value with temporal correlation
                if vital_name == 'temperature' and np.random.random() < 0.3:  # 30% chance of fever
                    value = np.random.normal(38.5, 0.5)
                else:
                    value = np.random.normal(vital_info['mean'] + patient_offset, 
                                           vital_info['std'] * 0.5)
                
                # Ensure reasonable bounds
                if vital_name == 'spo2':
                    value = max(85, min(100, value))
                elif vital_name == 'heart_rate':
                    value = max(40, min(180, value))
                
                vital = {
                    'subject_id': stay['subject_id'],
                    'hadm_id': stay['hadm_id'],
                    'icustay_id': stay['icustay_id'],
                    'charttime': current_time,
                    'itemid': vital_info['itemid'],
                    'label': vital_name,
                    'value': round(value, 1),
                    'valuenum': round(value, 1),
                    'valueuom': vital_info['unit']
                }
                vitals.append(vital)
            
            # Move to next hour
            current_time += timedelta(hours=1)
    
    return pd.DataFrame(vitals)

def generate_lab_results(admissions_df):
    """Generate laboratory results"""
    labs = []
    
    lab_tests = {
        'hemoglobin': {'mean': 12, 'std': 2, 'unit': 'g/dL', 'itemid': 51222, 'loinc': '718-7'},
        'wbc': {'mean': 10, 'std': 5, 'unit': 'K/uL', 'itemid': 51301, 'loinc': '6690-2'},
        'platelet': {'mean': 250, 'std': 100, 'unit': 'K/uL', 'itemid': 51265, 'loinc': '777-3'},
        'creatinine': {'mean': 1.0, 'std': 0.5, 'unit': 'mg/dL', 'itemid': 50912, 'loinc': '2160-0'},
        'bun': {'mean': 20, 'std': 10, 'unit': 'mg/dL', 'itemid': 51006, 'loinc': '3094-0'},
        'sodium': {'mean': 140, 'std': 5, 'unit': 'mEq/L', 'itemid': 50983, 'loinc': '2951-2'},
        'potassium': {'mean': 4.0, 'std': 0.5, 'unit': 'mEq/L', 'itemid': 50971, 'loinc': '2823-3'},
        'lactate': {'mean': 2.0, 'std': 1.5, 'unit': 'mmol/L', 'itemid': 50813, 'loinc': '2524-7'},
        'glucose': {'mean': 120, 'std': 40, 'unit': 'mg/dL', 'itemid': 50931, 'loinc': '2345-7'},
    }
    
    for _, admission in admissions_df.iterrows():
        # Generate labs every 6-12 hours
        current_time = pd.to_datetime(admission['admittime'])
        end_time = pd.to_datetime(admission['dischtime'])
        
        while current_time < end_time:
            for lab_name, lab_info in lab_tests.items():
                if np.random.random() < 0.7:  # 70% chance of each lab being ordered
                    # Adjust values based on diagnosis
                    value = np.random.normal(lab_info['mean'], lab_info['std'])
                    
                    # Sepsis adjustments
                    if 'sepsis' in admission['diagnosis'].lower():
                        if lab_name == 'wbc':
                            value = np.random.normal(15, 5)  # Elevated
                        elif lab_name == 'lactate':
                            value = np.random.normal(4, 2)  # Elevated
                        elif lab_name == 'creatinine':
                            value = np.random.normal(1.5, 0.5)  # Kidney injury
                    
                    lab = {
                        'subject_id': admission['subject_id'],
                        'hadm_id': admission['hadm_id'],
                        'charttime': current_time,
                        'itemid': lab_info['itemid'],
                        'label': lab_name,
                        'value': round(value, 2),
                        'valuenum': round(value, 2),
                        'valueuom': lab_info['unit'],
                        'flag': 'abnormal' if abs(value - lab_info['mean']) > 2 * lab_info['std'] else 'normal',
                        'loinc_code': lab_info['loinc']
                    }
                    labs.append(lab)
            
            # Move to next lab draw time
            current_time += timedelta(hours=int(np.random.choice([6, 8, 12])))
    
    return pd.DataFrame(labs)

def generate_medications(admissions_df, diagnoses_df):
    """Generate medication administration records"""
    medications = []
    
    for _, admission in admissions_df.iterrows():
        # Get diagnoses for this admission
        adm_diagnoses = diagnoses_df[diagnoses_df['hadm_id'] == admission['hadm_id']]['description'].tolist()
        
        # Determine which medications to give
        start_time = pd.to_datetime(admission['admittime'])
        
        for med_name, med_info in MEDICATIONS.items():
            # Check if medication is appropriate for conditions
            give_med = False
            if 'all' in med_info['for_conditions']:
                give_med = np.random.random() < 0.3  # 30% chance for general meds
            else:
                for condition in med_info['for_conditions']:
                    if any(condition in diag.lower() for diag in adm_diagnoses):
                        give_med = True
                        break
            
            if give_med:
                # Generate prescription
                dose = np.random.uniform(*med_info['dose_range'])
                max_days = int((pd.to_datetime(admission['dischtime']) - start_time).days)
                duration_days = np.random.randint(1, max(2, min(7, max_days)))
                
                med = {
                    'subject_id': admission['subject_id'],
                    'hadm_id': admission['hadm_id'],
                    'startdate': start_time + timedelta(hours=np.random.randint(0, 24)),
                    'enddate': start_time + timedelta(days=duration_days),
                    'drug': med_name.replace('_', ' ').title(),
                    'drug_name_generic': med_name.replace('_', ' ').title(),
                    'rxnorm_code': med_info['rxnorm'],
                    'dose_val_rx': round(dose, 2),
                    'dose_unit_rx': med_info['unit'],
                    'route': 'IV' if med_name in ['vancomycin', 'norepinephrine', 'piperacillin_tazobactam'] else 'PO'
                }
                medications.append(med)
    
    return pd.DataFrame(medications)

def generate_procedures(admissions_df):
    """Generate procedure records"""
    procedures = []
    
    procedure_types = {
        'mechanical_ventilation': {'icd10': '5A1935Z', 'for_conditions': ['ARDS', 'pneumonia'], 'prob': 0.3},
        'central_line': {'icd10': '02HV33Z', 'for_conditions': ['sepsis'], 'prob': 0.5},
        'arterial_line': {'icd10': '02HW33Z', 'for_conditions': ['sepsis', 'heart_failure'], 'prob': 0.4},
        'dialysis': {'icd10': '5A1D70Z', 'for_conditions': ['acute_kidney_injury'], 'prob': 0.3},
        'bronchoscopy': {'icd10': '0BJ08ZZ', 'for_conditions': ['pneumonia', 'ARDS'], 'prob': 0.2},
    }
    
    for _, admission in admissions_df.iterrows():
        primary_dx = admission['diagnosis'].lower().replace(' ', '_')
        
        for proc_name, proc_info in procedure_types.items():
            # Check if procedure is appropriate
            if any(cond in primary_dx for cond in proc_info['for_conditions']):
                if np.random.random() < proc_info['prob']:
                    proc = {
                        'subject_id': admission['subject_id'],
                        'hadm_id': admission['hadm_id'],
                        'chartdate': pd.to_datetime(admission['admittime']) + timedelta(hours=np.random.randint(0, 48)),
                        'icd10_code': proc_info['icd10'],
                        'description': proc_name.replace('_', ' ').title()
                    }
                    procedures.append(proc)
    
    return pd.DataFrame(procedures)

def create_clif_format(patients_df, admissions_df, icustays_df, vitals_df, labs_df, meds_df):
    """Convert to CLIF format structure"""
    clif_data = {}
    
    # Patient table
    clif_data['patient'] = patients_df.rename(columns={
        'subject_id': 'patient_id',
        'gender': 'sex',
        'ethnicity': 'race_ethnicity'
    })
    
    # Hospitalization table
    clif_data['hospitalization'] = admissions_df.rename(columns={
        'subject_id': 'patient_id',
        'hadm_id': 'hospitalization_id',
        'admittime': 'admission_dttm',
        'dischtime': 'discharge_dttm',
        'deathtime': 'death_dttm',
        'hospital_expire_flag': 'discharge_disposition'
    })
    
    # Vitals table
    clif_data['vitals'] = vitals_df.rename(columns={
        'subject_id': 'patient_id',
        'hadm_id': 'hospitalization_id',
        'charttime': 'recorded_dttm',
        'value': 'vital_value',
        'valuenum': 'vital_value_numeric',
        'valueuom': 'vital_unit'
    })
    
    # Labs table
    clif_data['labs'] = labs_df.rename(columns={
        'subject_id': 'patient_id',
        'hadm_id': 'hospitalization_id',
        'charttime': 'collection_dttm',
        'value': 'lab_value',
        'valuenum': 'lab_value_numeric',
        'valueuom': 'lab_unit',
        'flag': 'abnormal_flag'
    })
    
    # Medication orders table
    clif_data['medication_orders'] = meds_df.rename(columns={
        'subject_id': 'patient_id',
        'hadm_id': 'hospitalization_id',
        'startdate': 'order_dttm',
        'drug': 'medication_name',
        'dose_val_rx': 'dose',
        'dose_unit_rx': 'dose_unit',
        'route': 'route_name'
    })
    
    return clif_data

def create_omop_format(patients_df, admissions_df, diagnoses_df, procedures_df, labs_df, meds_df):
    """Convert to OMOP CDM format structure"""
    omop_data = {}
    
    # Person table
    omop_data['person'] = pd.DataFrame({
        'person_id': patients_df['subject_id'],
        'gender_concept_id': patients_df['gender'].map({'M': 8507, 'F': 8532}),
        'year_of_birth': 2024 - patients_df['age'],
        'race_concept_id': patients_df['ethnicity'].map({
            'WHITE': 8527, 'BLACK': 8516, 'HISPANIC': 8515, 
            'ASIAN': 8515, 'OTHER': 0
        }),
        'ethnicity_concept_id': patients_df['ethnicity'].map({
            'HISPANIC': 38003563, 'WHITE': 38003564, 'BLACK': 38003564,
            'ASIAN': 38003564, 'OTHER': 0
        })
    })
    
    # Visit occurrence table
    omop_data['visit_occurrence'] = pd.DataFrame({
        'visit_occurrence_id': admissions_df['hadm_id'],
        'person_id': admissions_df['subject_id'],
        'visit_concept_id': 9201,  # Inpatient visit
        'visit_start_date': pd.to_datetime(admissions_df['admittime']).dt.date,
        'visit_start_datetime': admissions_df['admittime'],
        'visit_end_date': pd.to_datetime(admissions_df['dischtime']).dt.date,
        'visit_end_datetime': admissions_df['dischtime'],
        'visit_type_concept_id': 44818517,  # Visit derived from EHR
        'discharge_to_concept_id': admissions_df['discharge_location'].map({
            'HOME': 8536, 'DIED': 4216643, 'SNF': 8863, 'REHAB': 8920
        })
    })
    
    # Condition occurrence table
    condition_id = 1
    conditions = []
    for _, diag in diagnoses_df.iterrows():
        condition = {
            'condition_occurrence_id': condition_id,
            'person_id': diag['subject_id'],
            'condition_concept_id': 0,  # Would map ICD10 to SNOMED
            'condition_start_date': admissions_df[admissions_df['hadm_id'] == diag['hadm_id']]['admittime'].iloc[0],
            'condition_type_concept_id': 32817,  # EHR diagnosis
            'condition_source_value': diag['icd10_code'],
            'visit_occurrence_id': diag['hadm_id']
        }
        conditions.append(condition)
        condition_id += 1
    
    omop_data['condition_occurrence'] = pd.DataFrame(conditions)
    
    # Measurement table (for labs)
    measurement_id = 1
    measurements = []
    for _, lab in labs_df.iterrows():
        measurement = {
            'measurement_id': measurement_id,
            'person_id': lab['subject_id'],
            'measurement_concept_id': 0,  # Would map LOINC to concept
            'measurement_date': pd.to_datetime(lab['charttime']).date(),
            'measurement_datetime': lab['charttime'],
            'measurement_type_concept_id': 44818702,  # Lab result
            'value_as_number': lab['valuenum'],
            'unit_concept_id': 0,  # Would map units
            'measurement_source_value': lab['loinc_code'],
            'visit_occurrence_id': lab['hadm_id']
        }
        measurements.append(measurement)
        measurement_id += 1
    
    omop_data['measurement'] = pd.DataFrame(measurements)
    
    # Drug exposure table
    drug_id = 1
    drug_exposures = []
    for _, med in meds_df.iterrows():
        drug = {
            'drug_exposure_id': drug_id,
            'person_id': med['subject_id'],
            'drug_concept_id': 0,  # Would map RxNorm
            'drug_exposure_start_date': pd.to_datetime(med['startdate']).date(),
            'drug_exposure_start_datetime': med['startdate'],
            'drug_exposure_end_date': pd.to_datetime(med['enddate']).date(),
            'drug_exposure_end_datetime': med['enddate'],
            'drug_type_concept_id': 38000177,  # Prescription written
            'quantity': med['dose_val_rx'],
            'drug_source_value': med['rxnorm_code'],
            'route_concept_id': 4132161 if med['route'] == 'IV' else 4132636,  # IV vs Oral
            'visit_occurrence_id': med['hadm_id']
        }
        drug_exposures.append(drug)
        drug_id += 1
    
    omop_data['drug_exposure'] = pd.DataFrame(drug_exposures)
    
    return omop_data

def save_datasets(mimic_data, clif_data, omop_data):
    """Save all datasets to files"""
    # Create subdirectories
    (output_dir / 'mimic_format').mkdir(exist_ok=True)
    (output_dir / 'clif_format').mkdir(exist_ok=True)
    (output_dir / 'omop_format').mkdir(exist_ok=True)
    
    # Save MIMIC format
    for name, df in mimic_data.items():
        df.to_csv(output_dir / 'mimic_format' / f'{name}.csv', index=False)
    
    # Save CLIF format
    for name, df in clif_data.items():
        df.to_csv(output_dir / 'clif_format' / f'{name}.csv', index=False)
    
    # Save OMOP format
    for name, df in omop_data.items():
        df.to_csv(output_dir / 'omop_format' / f'{name}.csv', index=False)
    
    # Create a summary report
    summary = {
        'dataset_info': {
            'n_patients': len(mimic_data['patients']),
            'n_admissions': len(mimic_data['admissions']),
            'n_icu_stays': len(mimic_data['icustays']),
            'n_diagnoses': len(mimic_data['diagnoses']),
            'n_medications': len(mimic_data['medications']),
            'n_procedures': len(mimic_data['procedures']),
            'n_vitals': len(mimic_data['vitals']),
            'n_labs': len(mimic_data['labs'])
        },
        'conditions': {
            'sepsis_cases': len(mimic_data['diagnoses'][mimic_data['diagnoses']['icd10_code'] == 'A41.9']),
            'mortality_rate': mimic_data['admissions']['hospital_expire_flag'].mean()
        },
        'formats_available': ['MIMIC', 'CLIF', 'OMOP']
    }
    
    with open(output_dir / 'dataset_summary.json', 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    
    # Create README
    readme_content = f"""# Synthetic ICU Dataset

## Overview
This synthetic dataset contains {summary['dataset_info']['n_patients']} ICU patients with realistic clinical data.
The data is available in three formats: MIMIC, CLIF, and OMOP CDM.

## Dataset Statistics
- **Patients**: {summary['dataset_info']['n_patients']}
- **Hospital Admissions**: {summary['dataset_info']['n_admissions']}
- **ICU Stays**: {summary['dataset_info']['n_icu_stays']}
- **Diagnoses**: {summary['dataset_info']['n_diagnoses']}
- **Medications**: {summary['dataset_info']['n_medications']}
- **Procedures**: {summary['dataset_info']['n_procedures']}
- **Vital Signs**: {summary['dataset_info']['n_vitals']:,}
- **Lab Results**: {summary['dataset_info']['n_labs']:,}

## Clinical Characteristics
- **Sepsis Cases**: {summary['conditions']['sepsis_cases']}
- **Overall Mortality Rate**: {summary['conditions']['mortality_rate']:.1%}

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
"""
    
    with open(output_dir / 'README.md', 'w') as f:
        f.write(readme_content)
    
    print(f"✅ Synthetic ICU dataset created successfully!")
    print(f"📁 Output directory: {output_dir}")
    print(f"📊 Total patients: {summary['dataset_info']['n_patients']}")
    print(f"🏥 Total admissions: {summary['dataset_info']['n_admissions']}")
    print(f"💊 Sepsis cases: {summary['conditions']['sepsis_cases']}")
    print(f"📈 Mortality rate: {summary['conditions']['mortality_rate']:.1%}")

# Main execution
if __name__ == "__main__":
    print("🏥 Generating Synthetic ICU Dataset...")
    print("=" * 50)
    
    # Generate base data
    patients_df = generate_demographics(500)
    print(f"✓ Generated {len(patients_df)} patients")
    
    admissions_df, icustays_df = generate_admissions(patients_df)
    print(f"✓ Generated {len(admissions_df)} admissions and {len(icustays_df)} ICU stays")
    
    diagnoses_df = generate_diagnoses(admissions_df)
    print(f"✓ Generated {len(diagnoses_df)} diagnoses")
    
    vitals_df = generate_vital_signs(icustays_df)
    print(f"✓ Generated {len(vitals_df):,} vital sign measurements")
    
    labs_df = generate_lab_results(admissions_df)
    print(f"✓ Generated {len(labs_df):,} lab results")
    
    medications_df = generate_medications(admissions_df, diagnoses_df)
    print(f"✓ Generated {len(medications_df)} medication records")
    
    procedures_df = generate_procedures(admissions_df)
    print(f"✓ Generated {len(procedures_df)} procedures")
    
    # Create MIMIC format dataset
    mimic_data = {
        'patients': patients_df,
        'admissions': admissions_df,
        'icustays': icustays_df,
        'diagnoses': diagnoses_df,
        'vitals': vitals_df,
        'labs': labs_df,
        'medications': medications_df,
        'procedures': procedures_df
    }
    
    # Create CLIF format
    clif_data = create_clif_format(patients_df, admissions_df, icustays_df, 
                                  vitals_df, labs_df, medications_df)
    print("✓ Created CLIF format")
    
    # Create OMOP format
    omop_data = create_omop_format(patients_df, admissions_df, diagnoses_df, 
                                  procedures_df, labs_df, medications_df)
    print("✓ Created OMOP CDM format")
    
    # Save all datasets
    save_datasets(mimic_data, clif_data, omop_data)
    print("\n✨ Dataset generation complete!")