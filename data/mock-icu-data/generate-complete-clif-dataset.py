#!/usr/bin/env python3
"""
Generate Complete CLIF Dataset
Creates a full synthetic ICU dataset with all 23 CLIF tables
Based on CLIF v2.0.0 specification
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
output_dir = Path("data/mock-icu-data/clif_complete")
output_dir.mkdir(parents=True, exist_ok=True)

# Constants for data generation
N_PATIENTS = 500
BASE_DATE = datetime(2024, 1, 1)

# Medical constants
ADMISSION_TYPES = ['Inpatient', 'ED to Inpatient', 'Acute Care Transfer', 'Pre-op']
DISCHARGE_CATEGORIES = ['Home', 'SNF', 'Expired', 'Acute Inpatient Rehab Facility', 'Hospice', 'LTACH', 'AMA']
ICU_TYPES = ['MICU', 'SICU', 'CCU', 'CSRU', 'NICU', 'PICU']
LOCATION_CATEGORIES = ['ed', 'ward', 'stepdown', 'icu', 'procedural', 'l&d', 'hospice', 'psych', 'rehab', 'radiology', 'dialysis', 'other']

def generate_patients(n=N_PATIENTS):
    """Generate patient demographics table"""
    patients = []
    
    for i in range(1, n + 1):
        # Age distribution: more elderly in ICU
        age = np.random.choice(
            [25, 35, 45, 55, 65, 75, 85],
            p=[0.05, 0.10, 0.15, 0.20, 0.25, 0.20, 0.05]
        )
        
        # Generate birth date based on age
        birth_date = BASE_DATE - timedelta(days=int(age*365))
        
        # 25% mortality rate in ICU
        death_prob = 0.25
        if age > 70:
            death_prob = 0.35
        
        death_dttm = None
        if np.random.random() < death_prob:
            # Death occurs during study period
            days_to_death = np.random.randint(1, 365)
            death_dttm = BASE_DATE + timedelta(days=days_to_death)
        
        patient = {
            'patient_id': f'P{i:06d}',
            'race_name': np.random.choice(['White', 'Black or African-American', 'Asian', 'Other']),
            'race_category': np.random.choice(['White', 'Black or African American', 'Asian', 'Other']),
            'ethnicity_name': np.random.choice(['Not Hispanic', 'Hispanic or Latino']),
            'ethnicity_category': np.random.choice(['Non-Hispanic', 'Hispanic']),
            'sex_name': np.random.choice(['Male', 'Female']),
            'sex_category': np.random.choice(['Male', 'Female']),
            'birth_date': birth_date.strftime('%Y-%m-%d'),
            'death_dttm': death_dttm.strftime('%Y-%m-%d %H:%M:%S+00:00') if death_dttm else None,
            'language_name': np.random.choice(['English', 'Spanish', 'Chinese', 'Other'], p=[0.7, 0.15, 0.05, 0.1]),
            'language_category': np.random.choice(['English', 'Spanish', 'Chinese', 'Other'], p=[0.7, 0.15, 0.05, 0.1])
        }
        patients.append(patient)
    
    return pd.DataFrame(patients)

def generate_hospitalizations(patients_df):
    """Generate hospitalization encounters"""
    hospitalizations = []
    hosp_id = 1000
    
    for _, patient in patients_df.iterrows():
        # Each patient has 1-3 hospitalizations
        n_hosps = np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1])
        
        patient_death = pd.to_datetime(patient['death_dttm']).replace(tzinfo=None) if patient['death_dttm'] else None
        
        for h in range(n_hosps):
            # Random admission date
            admission_offset = h * np.random.randint(30, 180) + np.random.randint(0, 200)
            admission_dttm = BASE_DATE + timedelta(days=int(admission_offset))
            
            # Length of stay (ICU patients have longer stays)
            los_days = np.random.gamma(5, 3)  # Average 15 days
            los_days = max(1, min(60, int(los_days)))
            
            discharge_dttm = admission_dttm + timedelta(days=int(los_days))
            
            # Check if patient dies during this hospitalization
            discharge_category = np.random.choice(DISCHARGE_CATEGORIES[:-1])  # Exclude 'Expired' initially
            if patient_death and admission_dttm <= patient_death <= discharge_dttm:
                discharge_category = 'Expired'
                discharge_dttm = patient_death
            
            # Calculate age at admission
            birth_date = pd.to_datetime(patient['birth_date'])
            age_at_admission = int((admission_dttm - birth_date).days / 365.25)
            
            hosp = {
                'patient_id': patient['patient_id'],
                'hospitalization_id': f'H{hosp_id:08d}',
                'hospitalization_joined_id': f'HJ{hosp_id:08d}',  # Same as hospitalization_id for simplicity
                'admission_dttm': admission_dttm.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'discharge_dttm': discharge_dttm.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'age_at_admission': age_at_admission,
                'admission_type_name': np.random.choice(ADMISSION_TYPES),
                'admission_type_category': np.random.choice(ADMISSION_TYPES),
                'discharge_name': discharge_category,
                'discharge_category': discharge_category,
                'zipcode_five_digit': f'{np.random.randint(10000, 99999)}',
                'zipcode_nine_digit': f'{np.random.randint(100000000, 999999999)}',
                'census_block_group_code': f'{np.random.randint(100000000000, 999999999999)}',
                'latitude': round(np.random.uniform(25.0, 49.0), 5),
                'longitude': round(np.random.uniform(-125.0, -66.0), 5)
            }
            hospitalizations.append(hosp)
            hosp_id += 1
    
    return pd.DataFrame(hospitalizations)

def generate_adt(hospitalizations_df):
    """Generate ADT (Admission, Discharge, Transfer) events"""
    adt_events = []
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Generate patient movement through hospital
        current_time = admission_time
        locations = []
        
        # Start in ED (70% of cases)
        if np.random.random() < 0.7:
            ed_duration = timedelta(hours=np.random.randint(2, 12))
            locations.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'hospital_id': 'MAIN',
                'hospital_type': 'academic',
                'in_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'out_dttm': (current_time + ed_duration).strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'location_name': f'ED-{np.random.randint(1, 20)}',
                'location_category': 'ed',
                'location_type': None
            })
            current_time += ed_duration
        
        # Move to ICU (all patients in this dataset)
        icu_duration = timedelta(days=int(np.random.randint(1, 14)))
        icu_type = np.random.choice(ICU_TYPES)
        locations.append({
            'hospitalization_id': hosp['hospitalization_id'],
            'hospital_id': 'MAIN',
            'hospital_type': 'academic',
            'in_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
            'out_dttm': min(current_time + icu_duration, discharge_time).strftime('%Y-%m-%d %H:%M:%S+00:00'),
            'location_name': f'{icu_type}-{np.random.randint(1, 30)}',
            'location_category': 'icu',
            'location_type': icu_type
        })
        current_time = min(current_time + icu_duration, discharge_time)
        
        # Move to ward if not discharged
        if current_time < discharge_time:
            locations.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'hospital_id': 'MAIN',
                'hospital_type': 'academic',
                'in_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'out_dttm': discharge_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'location_name': f'Ward-{np.random.randint(1, 10)}',
                'location_category': 'ward',
                'location_type': None
            })
        
        adt_events.extend(locations)
    
    return pd.DataFrame(adt_events)

def generate_vitals(hospitalizations_df):
    """Generate vital signs data"""
    vitals = []
    
    vital_configs = {
        'temp_c': {'mean': 37.0, 'std': 0.8, 'min': 35.0, 'max': 41.0},
        'heart_rate': {'mean': 80, 'std': 20, 'min': 40, 'max': 180},
        'sbp': {'mean': 120, 'std': 25, 'min': 70, 'max': 200},
        'dbp': {'mean': 70, 'std': 15, 'min': 40, 'max': 120},
        'map': {'mean': 85, 'std': 15, 'min': 50, 'max': 130},
        'respiratory_rate': {'mean': 18, 'std': 6, 'min': 8, 'max': 40},
        'spo2': {'mean': 96, 'std': 4, 'min': 80, 'max': 100},
        'height_cm': {'mean': 170, 'std': 10, 'min': 140, 'max': 210},
        'weight_kg': {'mean': 80, 'std': 20, 'min': 40, 'max': 150}
    }
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Height and weight measured once at admission
        for vital_type in ['height_cm', 'weight_kg']:
            config = vital_configs[vital_type]
            value = np.random.normal(config['mean'], config['std'])
            value = max(config['min'], min(config['max'], value))
            
            vitals.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'recorded_dttm': admission_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'vital_name': vital_type.upper(),
                'vital_category': vital_type,
                'vital_value': round(value, 1),
                'meas_site_name': 'unspecified'
            })
        
        # Other vitals measured every 4 hours
        current_time = admission_time
        while current_time < discharge_time:
            for vital_type in ['temp_c', 'heart_rate', 'sbp', 'dbp', 'respiratory_rate', 'spo2']:
                config = vital_configs[vital_type]
                
                # Add some patient-specific variation
                patient_offset = np.random.normal(0, config['std'] * 0.2)
                value = np.random.normal(config['mean'] + patient_offset, config['std'] * 0.5)
                value = max(config['min'], min(config['max'], value))
                
                vitals.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'vital_name': vital_type.upper().replace('_', ' '),
                    'vital_category': vital_type,
                    'vital_value': round(value, 1),
                    'meas_site_name': 'unspecified'
                })
            
            # Calculate MAP from SBP and DBP
            if 'sbp' in locals() and 'dbp' in locals():
                map_value = (value + 2 * value) / 3  # Simplified MAP calculation
                vitals.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'vital_name': 'MEAN ARTERIAL PRESSURE',
                    'vital_category': 'map',
                    'vital_value': round(map_value, 1),
                    'meas_site_name': 'arterial'
                })
            
            current_time += timedelta(hours=4)
    
    return pd.DataFrame(vitals)

def generate_labs(hospitalizations_df):
    """Generate laboratory results"""
    labs = []
    
    lab_configs = {
        'hemoglobin': {'mean': 12, 'std': 2, 'unit': 'g/dL', 'loinc': '718-7', 'category': 'hemoglobin'},
        'wbc': {'mean': 10, 'std': 5, 'unit': '10^3/uL', 'loinc': '6690-2', 'category': 'wbc'},
        'platelet': {'mean': 250, 'std': 100, 'unit': '10^3/uL', 'loinc': '777-3', 'category': 'platelet'},
        'sodium': {'mean': 140, 'std': 5, 'unit': 'mmol/L', 'loinc': '2951-2', 'category': 'sodium'},
        'potassium': {'mean': 4.0, 'std': 0.5, 'unit': 'mmol/L', 'loinc': '2823-3', 'category': 'potassium'},
        'creatinine': {'mean': 1.0, 'std': 0.5, 'unit': 'mg/dL', 'loinc': '2160-0', 'category': 'creatinine'},
        'lactate': {'mean': 2.0, 'std': 1.5, 'unit': 'mmol/L', 'loinc': '2524-7', 'category': 'lactate'},
        'ph': {'mean': 7.4, 'std': 0.05, 'unit': '', 'loinc': '2744-1', 'category': 'ph'},
        'pco2': {'mean': 40, 'std': 5, 'unit': 'mmHg', 'loinc': '2019-8', 'category': 'pco2'},
        'po2': {'mean': 90, 'std': 10, 'unit': 'mmHg', 'loinc': '2703-7', 'category': 'po2'},
        'bicarbonate': {'mean': 24, 'std': 3, 'unit': 'mmol/L', 'loinc': '2028-3', 'category': 'bicarbonate'}
    }
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Labs drawn every 6-12 hours
        current_time = admission_time
        while current_time < discharge_time:
            # Order time is 30 minutes before collection
            order_time = current_time - timedelta(minutes=30)
            collect_time = current_time
            result_time = current_time + timedelta(minutes=np.random.randint(30, 120))
            
            # Select which labs to order (random subset)
            labs_to_order = random.sample(list(lab_configs.keys()), k=np.random.randint(4, 8))
            
            for lab_name in labs_to_order:
                config = lab_configs[lab_name]
                value = np.random.normal(config['mean'], config['std'])
                
                # Determine specimen type
                if lab_name in ['ph', 'pco2', 'po2', 'bicarbonate']:
                    specimen = 'arterial blood'
                    specimen_category = 'blood/plasma/serum'
                elif lab_name in ['creatinine'] and np.random.random() < 0.3:
                    specimen = 'urine'
                    specimen_category = 'urine'
                else:
                    specimen = 'venous blood'
                    specimen_category = 'blood/plasma/serum'
                
                lab = {
                    'hospitalization_id': hosp['hospitalization_id'],
                    'lab_order_dttm': order_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'lab_collect_dttm': collect_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'lab_result_dttm': result_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'lab_order_name': f'{lab_name.upper()} Panel',
                    'lab_name': lab_name.upper(),
                    'lab_category': config['category'],
                    'lab_value': str(round(value, 2)),
                    'lab_value_numeric': round(value, 2),
                    'reference_unit': config['unit'],
                    'lab_loinc_code': config['loinc'],
                    'lab_specimen_name': specimen,
                    'lab_specimen_category': specimen_category
                }
                labs.append(lab)
            
            # Next lab draw in 6-12 hours
            current_time += timedelta(hours=np.random.randint(6, 12))
    
    return pd.DataFrame(labs)

def generate_patient_assessments(hospitalizations_df):
    """Generate patient assessment scores (GCS, RASS, etc.)"""
    assessments = []
    
    assessment_configs = {
        'gcs_eye': {'name': 'GCS Eye Opening', 'category': 'gcs_eye', 'group': 'Neurological', 'min': 1, 'max': 4},
        'gcs_verbal': {'name': 'GCS Verbal Response', 'category': 'gcs_verbal', 'group': 'Neurological', 'min': 1, 'max': 5},
        'gcs_motor': {'name': 'GCS Motor Response', 'category': 'gcs_motor', 'group': 'Neurological', 'min': 1, 'max': 6},
        'gcs_total': {'name': 'GCS Total', 'category': 'gcs_total', 'group': 'Neurological', 'min': 3, 'max': 15},
        'rass': {'name': 'Richmond Agitation-Sedation Scale', 'category': 'rass', 'group': 'Sedation', 'min': -5, 'max': 4},
        'braden': {'name': 'Braden Scale', 'category': 'braden_total', 'group': 'Nursing Risk', 'min': 6, 'max': 23},
        'pain': {'name': 'Numeric Pain Scale', 'category': 'pain_numeric', 'group': 'Pain', 'min': 0, 'max': 10}
    }
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Assessments done every 8 hours
        current_time = admission_time
        while current_time < discharge_time:
            # GCS components and total
            gcs_eye = np.random.randint(1, 5)
            gcs_verbal = np.random.randint(1, 6)
            gcs_motor = np.random.randint(1, 7)
            gcs_total = gcs_eye + gcs_verbal + gcs_motor
            
            for component, value in [('gcs_eye', gcs_eye), ('gcs_verbal', gcs_verbal), 
                                     ('gcs_motor', gcs_motor), ('gcs_total', gcs_total)]:
                config = assessment_configs[component]
                assessments.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'assessment_name': config['name'],
                    'assessment_category': config['category'],
                    'assessment_group': config['group'],
                    'numerical_value': float(value),
                    'categorical_value': None,
                    'text_value': None
                })
            
            # Other assessments
            for assessment_type in ['rass', 'braden', 'pain']:
                if np.random.random() < 0.7:  # 70% chance of being recorded
                    config = assessment_configs[assessment_type]
                    value = np.random.randint(config['min'], config['max'] + 1)
                    
                    assessments.append({
                        'hospitalization_id': hosp['hospitalization_id'],
                        'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'assessment_name': config['name'],
                        'assessment_category': config['category'],
                        'assessment_group': config['group'],
                        'numerical_value': float(value),
                        'categorical_value': None,
                        'text_value': None
                    })
            
            # SAT Screen (categorical)
            if np.random.random() < 0.5:
                assessments.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'assessment_name': 'SAT Screen',
                    'assessment_category': 'sat_delivery_pass_fail',
                    'assessment_group': 'Sedation',
                    'numerical_value': None,
                    'categorical_value': np.random.choice(['Pass', 'Fail']),
                    'text_value': None
                })
            
            current_time += timedelta(hours=8)
    
    return pd.DataFrame(assessments)

def generate_respiratory_support(hospitalizations_df):
    """Generate respiratory support data"""
    respiratory_support = []
    
    # 60% of ICU patients need respiratory support
    hosp_sample = hospitalizations_df.sample(frac=0.6)
    
    for _, hosp in hosp_sample.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Start with high flow or non-invasive
        current_time = admission_time
        device_progression = ['High Flow NC', 'NIPPV', 'IMV']
        current_device_idx = 0
        
        while current_time < discharge_time and current_device_idx < len(device_progression):
            device_category = device_progression[current_device_idx]
            
            # Duration on this device
            duration = timedelta(days=int(np.random.randint(1, 5)))
            end_time = min(current_time + duration, discharge_time)
            
            # Record settings every 4 hours
            record_time = current_time
            while record_time < end_time:
                if device_category == 'High Flow NC':
                    resp_support = {
                        'hospitalization_id': hosp['hospitalization_id'],
                        'recorded_dttm': record_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'device_name': 'OptiFlow',
                        'device_category': device_category,
                        'mode_name': None,
                        'mode_category': None,
                        'vent_brand_name': None,
                        'tracheostomy': 0,
                        'fio2_set': round(np.random.uniform(0.3, 0.8), 2),
                        'lpm_set': float(np.random.randint(30, 60)),
                        'tidal_volume_set': None,
                        'resp_rate_set': None,
                        'pressure_control_set': None,
                        'pressure_support_set': None,
                        'flow_rate_set': None,
                        'peak_inspiratory_pressure_set': None,
                        'inspiratory_time_set': None,
                        'peep_set': None,
                        'tidal_volume_obs': None,
                        'resp_rate_obs': float(np.random.randint(12, 30)),
                        'plateau_pressure_obs': None,
                        'peak_inspiratory_pressure_obs': None,
                        'peep_obs': None,
                        'minute_vent_obs': None,
                        'mean_airway_pressure_obs': None
                    }
                elif device_category == 'NIPPV':
                    resp_support = {
                        'hospitalization_id': hosp['hospitalization_id'],
                        'recorded_dttm': record_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'device_name': 'BiPAP',
                        'device_category': device_category,
                        'mode_name': 'BiPAP S/T',
                        'mode_category': 'Pressure Support/CPAP',
                        'vent_brand_name': 'Respironics',
                        'tracheostomy': 0,
                        'fio2_set': round(np.random.uniform(0.3, 0.6), 2),
                        'lpm_set': None,
                        'tidal_volume_set': None,
                        'resp_rate_set': None,
                        'pressure_control_set': None,
                        'pressure_support_set': float(np.random.randint(8, 15)),
                        'flow_rate_set': None,
                        'peak_inspiratory_pressure_set': float(np.random.randint(15, 25)),
                        'inspiratory_time_set': None,
                        'peep_set': float(np.random.randint(5, 10)),
                        'tidal_volume_obs': None,
                        'resp_rate_obs': float(np.random.randint(12, 25)),
                        'plateau_pressure_obs': None,
                        'peak_inspiratory_pressure_obs': None,
                        'peep_obs': float(np.random.randint(5, 10)),
                        'minute_vent_obs': None,
                        'mean_airway_pressure_obs': None
                    }
                else:  # IMV
                    mode = np.random.choice(['Assist Control-Volume Control', 'Pressure Control', 'SIMV'])
                    resp_support = {
                        'hospitalization_id': hosp['hospitalization_id'],
                        'recorded_dttm': record_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'device_name': 'Ventilator',
                        'device_category': device_category,
                        'mode_name': mode,
                        'mode_category': mode,
                        'vent_brand_name': np.random.choice(['Puritan Bennett', 'Hamilton', 'Drager']),
                        'tracheostomy': 1 if np.random.random() < 0.2 else 0,
                        'fio2_set': round(np.random.uniform(0.3, 0.8), 2),
                        'lpm_set': None,
                        'tidal_volume_set': float(np.random.randint(400, 600)) if 'Volume' in mode else None,
                        'resp_rate_set': float(np.random.randint(12, 20)),
                        'pressure_control_set': float(np.random.randint(15, 30)) if 'Pressure' in mode else None,
                        'pressure_support_set': float(np.random.randint(5, 15)),
                        'flow_rate_set': float(np.random.randint(40, 60)),
                        'peak_inspiratory_pressure_set': None,
                        'inspiratory_time_set': round(np.random.uniform(0.8, 1.2), 1),
                        'peep_set': float(np.random.randint(5, 15)),
                        'tidal_volume_obs': float(np.random.randint(380, 580)),
                        'resp_rate_obs': float(np.random.randint(12, 25)),
                        'plateau_pressure_obs': float(np.random.randint(15, 30)),
                        'peak_inspiratory_pressure_obs': float(np.random.randint(20, 35)),
                        'peep_obs': float(np.random.randint(5, 15)),
                        'minute_vent_obs': round(np.random.uniform(6, 12), 1),
                        'mean_airway_pressure_obs': float(np.random.randint(10, 20))
                    }
                
                respiratory_support.append(resp_support)
                record_time += timedelta(hours=4)
            
            current_time = end_time
            current_device_idx += 1
    
    return pd.DataFrame(respiratory_support)

def generate_medication_orders(hospitalizations_df):
    """Generate medication orders"""
    med_orders = []
    order_id = 1
    
    medications = {
        'antibiotics': [
            {'name': 'Vancomycin', 'route': 'IV', 'dose': '15 mg/kg', 'frequency': 'q12h'},
            {'name': 'Piperacillin-Tazobactam', 'route': 'IV', 'dose': '4.5 g', 'frequency': 'q6h'},
            {'name': 'Ceftriaxone', 'route': 'IV', 'dose': '2 g', 'frequency': 'daily'},
            {'name': 'Meropenem', 'route': 'IV', 'dose': '1 g', 'frequency': 'q8h'}
        ],
        'sedation': [
            {'name': 'Propofol', 'route': 'IV', 'dose': '50 mcg/kg/min', 'frequency': 'continuous'},
            {'name': 'Dexmedetomidine', 'route': 'IV', 'dose': '0.5 mcg/kg/hr', 'frequency': 'continuous'},
            {'name': 'Midazolam', 'route': 'IV', 'dose': '2 mg', 'frequency': 'q2h prn'}
        ],
        'analgesia': [
            {'name': 'Fentanyl', 'route': 'IV', 'dose': '50 mcg/hr', 'frequency': 'continuous'},
            {'name': 'Morphine', 'route': 'IV', 'dose': '2 mg', 'frequency': 'q4h prn'},
            {'name': 'Hydromorphone', 'route': 'IV', 'dose': '0.5 mg', 'frequency': 'q4h prn'}
        ],
        'cardiovascular': [
            {'name': 'Norepinephrine', 'route': 'IV', 'dose': '0.1 mcg/kg/min', 'frequency': 'continuous'},
            {'name': 'Vasopressin', 'route': 'IV', 'dose': '0.04 units/min', 'frequency': 'continuous'},
            {'name': 'Metoprolol', 'route': 'PO', 'dose': '25 mg', 'frequency': 'BID'}
        ]
    }
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Each patient gets multiple medications
        for category, med_list in medications.items():
            if np.random.random() < 0.7:  # 70% chance of needing this category
                selected_meds = random.sample(med_list, k=np.random.randint(1, min(3, len(med_list))))
                
                for med in selected_meds:
                    # Random start time within first 24 hours
                    start_offset = timedelta(hours=np.random.randint(0, 24))
                    order_time = admission_time + start_offset
                    
                    # Duration varies by medication type
                    if category == 'antibiotics':
                        duration_days = np.random.randint(5, 14)
                    elif med['frequency'] == 'continuous':
                        duration_days = np.random.randint(2, 7)
                    else:
                        duration_days = np.random.randint(1, 5)
                    
                    end_time = min(order_time + timedelta(days=int(duration_days)), discharge_time)
                    
                    med_order = {
                        'med_order_id': f'MO{order_id:08d}',
                        'hospitalization_id': hosp['hospitalization_id'],
                        'order_dttm': order_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'med_name': med['name'],
                        'med_category': category,
                        'med_route': med['route'],
                        'med_dose': med['dose'],
                        'med_frequency': med['frequency'],
                        'start_dttm': order_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'end_dttm': end_time.strftime('%Y-%m-%d %H:%M:%S+00:00')
                    }
                    med_orders.append(med_order)
                    order_id += 1
    
    return pd.DataFrame(med_orders)

def generate_medication_admin_continuous(med_orders_df):
    """Generate continuous medication administration records"""
    continuous_admin = []
    
    # Filter for continuous medications
    continuous_meds = med_orders_df[med_orders_df['med_frequency'] == 'continuous'].copy()
    
    med_categories = {
        'Propofol': {'category': 'propofol', 'group': 'sedation', 'unit': 'mcg/kg/min'},
        'Dexmedetomidine': {'category': 'dexmedetomidine', 'group': 'sedation', 'unit': 'mcg/kg/hr'},
        'Fentanyl': {'category': 'fentanyl', 'group': 'analgesia', 'unit': 'mcg/hr'},
        'Norepinephrine': {'category': 'norepinephrine', 'group': 'vasoactives', 'unit': 'mcg/kg/min'},
        'Vasopressin': {'category': 'vasopressin', 'group': 'vasoactives', 'unit': 'units/min'}
    }
    
    for _, med in continuous_meds.iterrows():
        if med['med_name'] not in med_categories:
            continue
            
        med_info = med_categories[med['med_name']]
        start_time = pd.to_datetime(med['start_dttm'])
        end_time = pd.to_datetime(med['end_dttm'])
        
        # Initial rate
        if med_info['group'] == 'vasoactives':
            current_rate = np.random.uniform(0.05, 0.2)
        elif med_info['group'] == 'sedation':
            current_rate = np.random.uniform(20, 50)
        else:
            current_rate = np.random.uniform(25, 100)
        
        # New bag/start
        continuous_admin.append({
            'hospitalization_id': med['hospitalization_id'],
            'med_order_id': med['med_order_id'],
            'admin_dttm': start_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
            'med_name': f"{med['med_name']} infusion",
            'med_category': med_info['category'],
            'med_group': med_info['group'],
            'med_route_name': 'Intravenous',
            'med_route_category': 'IV',
            'med_dose': round(current_rate, 4),
            'med_dose_unit': med_info['unit'],
            'mar_action_name': 'New Bag',
            'mar_action_category': 'Start'
        })
        
        # Rate changes
        current_time = start_time
        while current_time < end_time:
            # Rate change every 2-6 hours
            next_change = current_time + timedelta(hours=np.random.randint(2, 6))
            if next_change >= end_time:
                break
                
            # Adjust rate up or down
            if np.random.random() < 0.5:
                current_rate *= np.random.uniform(0.5, 0.8)  # Decrease
            else:
                current_rate *= np.random.uniform(1.2, 1.5)  # Increase
            
            # Keep within reasonable bounds
            if med_info['group'] == 'vasoactives':
                current_rate = max(0.01, min(0.5, current_rate))
            elif med_info['group'] == 'sedation':
                current_rate = max(5, min(100, current_rate))
            else:
                current_rate = max(10, min(200, current_rate))
            
            continuous_admin.append({
                'hospitalization_id': med['hospitalization_id'],
                'med_order_id': med['med_order_id'],
                'admin_dttm': next_change.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'med_name': f"{med['med_name']} infusion",
                'med_category': med_info['category'],
                'med_group': med_info['group'],
                'med_route_name': 'Intravenous',
                'med_route_category': 'IV',
                'med_dose': round(current_rate, 4),
                'med_dose_unit': med_info['unit'],
                'mar_action_name': 'Rate Change',
                'mar_action_category': 'Adjust'
            })
            
            current_time = next_change
        
        # Stop infusion
        continuous_admin.append({
            'hospitalization_id': med['hospitalization_id'],
            'med_order_id': med['med_order_id'],
            'admin_dttm': end_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
            'med_name': f"{med['med_name']} infusion",
            'med_category': med_info['category'],
            'med_group': med_info['group'],
            'med_route_name': 'Intravenous',
            'med_route_category': 'IV',
            'med_dose': 0.0,
            'med_dose_unit': med_info['unit'],
            'mar_action_name': 'Stopped',
            'mar_action_category': 'Stop'
        })
    
    return pd.DataFrame(continuous_admin)

def generate_medication_admin_intermittent(med_orders_df):
    """Generate intermittent medication administration records"""
    intermittent_admin = []
    
    # Filter for non-continuous medications
    intermittent_meds = med_orders_df[med_orders_df['med_frequency'] != 'continuous'].copy()
    
    frequency_hours = {
        'daily': 24,
        'BID': 12,
        'q12h': 12,
        'q8h': 8,
        'q6h': 6,
        'q4h': 4,
        'q4h prn': 4,
        'q2h prn': 2
    }
    
    for _, med in intermittent_meds.iterrows():
        start_time = pd.to_datetime(med['start_dttm'])
        end_time = pd.to_datetime(med['end_dttm'])
        
        # Determine administration interval
        interval_hours = frequency_hours.get(med['med_frequency'], 6)
        is_prn = 'prn' in med['med_frequency']
        
        current_time = start_time
        while current_time < end_time:
            # For PRN meds, only give sometimes
            if is_prn and np.random.random() < 0.4:
                current_time += timedelta(hours=interval_hours)
                continue
            
            admin = {
                'hospitalization_id': med['hospitalization_id'],
                'med_order_id': med['med_order_id'],
                'admin_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'med_name': med['med_name'],
                'med_category': med['med_category'],
                'med_route': med['med_route'],
                'med_dose': med['med_dose'],
                'med_frequency': med['med_frequency'],
                'mar_action': 'Given' if np.random.random() > 0.05 else 'Held'
            }
            intermittent_admin.append(admin)
            
            current_time += timedelta(hours=interval_hours)
    
    return pd.DataFrame(intermittent_admin)

def generate_crrt_therapy(hospitalizations_df):
    """Generate CRRT (Continuous Renal Replacement Therapy) data"""
    crrt_records = []
    
    # 10% of ICU patients need CRRT
    crrt_patients = hospitalizations_df.sample(frac=0.1)
    
    crrt_modes = {
        'CVVHDF': {'blood_flow': 200, 'pre_filter': 1000, 'post_filter': 500, 'dialysate': 800},
        'CVVH': {'blood_flow': 180, 'pre_filter': 1200, 'post_filter': 300, 'dialysate': None},
        'CVVHD': {'blood_flow': 160, 'pre_filter': None, 'post_filter': None, 'dialysate': 1000},
        'SCUF': {'blood_flow': 150, 'pre_filter': None, 'post_filter': None, 'dialysate': None}
    }
    
    for _, hosp in crrt_patients.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Start CRRT 1-3 days after admission
        start_offset = timedelta(days=int(np.random.randint(1, 3)))
        crrt_start = admission_time + start_offset
        
        # Duration 3-10 days
        duration = timedelta(days=int(np.random.randint(3, 10)))
        crrt_end = min(crrt_start + duration, discharge_time)
        
        # Choose CRRT mode
        mode = np.random.choice(list(crrt_modes.keys()))
        mode_config = crrt_modes[mode]
        
        # Record parameters every 4 hours
        current_time = crrt_start
        while current_time < crrt_end:
            record = {
                'hospitalization_id': hosp['hospitalization_id'],
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'crrt_mode_name': mode,
                'crrt_mode_category': mode.lower(),
                'dialysis_machine_name': f'Machine-{np.random.randint(1, 10)}',
                'blood_flow_rate': float(mode_config['blood_flow'] + np.random.randint(-20, 20)),
                'pre_filter_replacement_fluid_rate': float(mode_config['pre_filter'] + np.random.randint(-100, 100)) if mode_config['pre_filter'] else None,
                'post_filter_replacement_fluid_rate': float(mode_config['post_filter'] + np.random.randint(-50, 50)) if mode_config['post_filter'] else None,
                'dialysate_flow_rate': float(mode_config['dialysate'] + np.random.randint(-100, 100)) if mode_config['dialysate'] else None,
                'ultrafiltration_out': float(np.random.randint(500, 2000))
            }
            crrt_records.append(record)
            
            current_time += timedelta(hours=4)
    
    return pd.DataFrame(crrt_records)

def generate_ecmo_mcs(hospitalizations_df):
    """Generate ECMO/MCS (Mechanical Circulatory Support) data"""
    ecmo_records = []
    
    # 2% of ICU patients need ECMO/MCS
    ecmo_patients = hospitalizations_df.sample(frac=0.02)
    
    device_types = {
        'ECMO VV': {'category': 'ECMO', 'group': 'ECMO', 'has_sweep': True},
        'ECMO VA': {'category': 'ECMO', 'group': 'ECMO', 'has_sweep': True},
        'Impella': {'category': 'Impella', 'group': 'temporary_LVAD', 'has_sweep': False},
        'Centrimag': {'category': 'Centrimag', 'group': 'temporary_LVAD', 'has_sweep': False}
    }
    
    for _, hosp in ecmo_patients.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Start within first 48 hours
        start_offset = timedelta(hours=np.random.randint(0, 48))
        device_start = admission_time + start_offset
        
        # Duration 3-14 days
        duration = timedelta(days=int(np.random.randint(3, 14)))
        device_end = min(device_start + duration, discharge_time)
        
        # Choose device type
        device_name = np.random.choice(list(device_types.keys()))
        device_info = device_types[device_name]
        
        # Record parameters every 2 hours
        current_time = device_start
        while current_time < device_end:
            record = {
                'hospitalization_id': hosp['hospitalization_id'],
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'device_name': device_name,
                'device_category': device_info['category'],
                'mcs_group': device_info['group'],
                'side': 'both' if 'ECMO' in device_name else np.random.choice(['left', 'right']),
                'device_metric_name': 'RPMs' if device_info['category'] != 'ECMO' else 'Flow Rate',
                'device_rate': float(np.random.randint(2500, 3500)) if device_info['category'] != 'ECMO' else None,
                'flow': round(np.random.uniform(3.5, 5.5), 1),
                'sweep': round(np.random.uniform(1.0, 4.0), 1) if device_info['has_sweep'] else None,
                'fdo2': round(np.random.uniform(0.6, 1.0), 2) if device_info['has_sweep'] else None
            }
            ecmo_records.append(record)
            
            current_time += timedelta(hours=2)
    
    return pd.DataFrame(ecmo_records)

def generate_position(hospitalizations_df):
    """Generate patient positioning data"""
    position_records = []
    
    # 30% of patients have positioning documented (focus on prone positioning)
    positioned_patients = hospitalizations_df.sample(frac=0.3)
    
    positions = [
        {'name': 'Supine', 'category': 'not_prone'},
        {'name': 'Supine–turn R', 'category': 'not_prone'},
        {'name': 'Supine–turn L', 'category': 'not_prone'},
        {'name': '30 Degrees', 'category': 'not_prone'},
        {'name': 'Prone', 'category': 'prone'},
        {'name': 'Prone–turn R', 'category': 'prone'},
        {'name': 'Prone–turn L', 'category': 'prone'}
    ]
    
    for _, hosp in positioned_patients.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Position changes every 2-4 hours
        current_time = admission_time
        is_proned = False
        
        while current_time < discharge_time:
            # Decide if patient needs proning (20% chance if not already proned)
            if not is_proned and np.random.random() < 0.2:
                is_proned = True
                
            # Select position based on current state
            if is_proned:
                # Prone for 16 hours, then back to supine
                position_options = [p for p in positions if p['category'] == 'prone']
                duration = timedelta(hours=16)
                is_proned = False  # Will flip back next time
            else:
                position_options = [p for p in positions if p['category'] == 'not_prone']
                duration = timedelta(hours=np.random.randint(2, 4))
            
            position = np.random.choice(position_options)
            
            position_records.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'position_name': position['name'],
                'position_category': position['category']
            })
            
            current_time += duration
    
    return pd.DataFrame(position_records)

def generate_procedures(hospitalizations_df):
    """Generate procedures data"""
    procedures = []
    
    procedure_types = [
        {'name': 'Central Line Placement', 'duration': 30, 'probability': 0.7},
        {'name': 'Arterial Line Placement', 'duration': 20, 'probability': 0.6},
        {'name': 'Intubation', 'duration': 15, 'probability': 0.5},
        {'name': 'Bronchoscopy', 'duration': 45, 'probability': 0.3},
        {'name': 'Chest Tube Placement', 'duration': 30, 'probability': 0.2},
        {'name': 'Lumbar Puncture', 'duration': 30, 'probability': 0.1},
        {'name': 'Paracentesis', 'duration': 30, 'probability': 0.1},
        {'name': 'Thoracentesis', 'duration': 30, 'probability': 0.1}
    ]
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        
        for proc in procedure_types:
            if np.random.random() < proc['probability']:
                # Procedure within first 48 hours usually
                proc_offset = timedelta(hours=np.random.randint(0, 48))
                proc_time = admission_time + proc_offset
                
                procedures.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'procedure_dttm': proc_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'procedure_name': proc['name'],
                    'procedure_duration_minutes': proc['duration']
                })
    
    return pd.DataFrame(procedures)

def generate_intake_output(hospitalizations_df):
    """Generate intake/output (fluid balance) data"""
    io_records = []
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Record I/O every 8 hours
        current_time = admission_time
        while current_time < discharge_time:
            # Intake sources
            iv_fluids = np.random.randint(200, 1000)
            medications = np.random.randint(50, 200)
            oral_intake = np.random.randint(0, 500) if np.random.random() < 0.3 else 0
            blood_products = np.random.randint(250, 500) if np.random.random() < 0.1 else 0
            total_intake = iv_fluids + medications + oral_intake + blood_products
            
            # Output sources
            urine = np.random.randint(100, 800)
            stool = np.random.randint(0, 200) if np.random.random() < 0.3 else 0
            drainage = np.random.randint(50, 300) if np.random.random() < 0.2 else 0
            blood_loss = np.random.randint(50, 200) if np.random.random() < 0.1 else 0
            total_output = urine + stool + drainage + blood_loss
            
            io_records.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'intake_oral': float(oral_intake),
                'intake_iv_fluids': float(iv_fluids),
                'intake_medications': float(medications),
                'intake_blood_products': float(blood_products),
                'intake_total': float(total_intake),
                'output_urine': float(urine),
                'output_stool': float(stool),
                'output_drainage': float(drainage),
                'output_blood_loss': float(blood_loss),
                'output_total': float(total_output),
                'net_balance': float(total_intake - total_output)
            })
            
            current_time += timedelta(hours=8)
    
    return pd.DataFrame(io_records)

def generate_microbiology_culture(hospitalizations_df):
    """Generate microbiology culture data"""
    cultures = []
    culture_id = 1
    
    specimen_types = ['Blood', 'Urine', 'Sputum', 'Wound', 'CSF', 'Stool']
    organisms = [
        'Staphylococcus aureus',
        'Escherichia coli',
        'Klebsiella pneumoniae',
        'Pseudomonas aeruginosa',
        'Enterococcus faecalis',
        'Streptococcus pneumoniae',
        'Candida albicans',
        'No growth'
    ]
    
    # 60% of patients have cultures taken
    for _, hosp in hospitalizations_df.sample(frac=0.6).iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Multiple cultures during stay
        n_cultures = np.random.randint(1, 5)
        
        for _ in range(n_cultures):
            # Random time during stay
            culture_offset = timedelta(days=np.random.uniform(0, (discharge_time - admission_time).days))
            order_time = admission_time + culture_offset
            collect_time = order_time + timedelta(minutes=30)
            result_time = collect_time + timedelta(hours=np.random.randint(24, 72))
            
            specimen = np.random.choice(specimen_types)
            organism = np.random.choice(organisms)
            
            cultures.append({
                'culture_id': f'C{culture_id:08d}',
                'hospitalization_id': hosp['hospitalization_id'],
                'order_dttm': order_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'collect_dttm': collect_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'result_dttm': result_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'specimen_type': specimen,
                'organism': organism,
                'growth': 'Positive' if organism != 'No growth' else 'Negative'
            })
            culture_id += 1
    
    return pd.DataFrame(cultures)

def generate_sensitivity(cultures_df):
    """Generate antibiotic sensitivity data"""
    sensitivities = []
    
    antibiotics = {
        'Vancomycin': ['Staphylococcus aureus', 'Enterococcus faecalis', 'Streptococcus pneumoniae'],
        'Ceftriaxone': ['Escherichia coli', 'Klebsiella pneumoniae', 'Streptococcus pneumoniae'],
        'Ciprofloxacin': ['Escherichia coli', 'Klebsiella pneumoniae', 'Pseudomonas aeruginosa'],
        'Piperacillin-Tazobactam': ['Escherichia coli', 'Klebsiella pneumoniae', 'Pseudomonas aeruginosa'],
        'Meropenem': ['Escherichia coli', 'Klebsiella pneumoniae', 'Pseudomonas aeruginosa'],
        'Gentamicin': ['Escherichia coli', 'Klebsiella pneumoniae', 'Pseudomonas aeruginosa', 'Enterococcus faecalis'],
        'Fluconazole': ['Candida albicans']
    }
    
    # Only positive cultures get sensitivities
    positive_cultures = cultures_df[cultures_df['growth'] == 'Positive']
    
    for _, culture in positive_cultures.iterrows():
        organism = culture['organism']
        
        # Test relevant antibiotics
        for antibiotic, susceptible_organisms in antibiotics.items():
            if organism in susceptible_organisms:
                # Determine sensitivity
                sensitivity_result = np.random.choice(['S', 'I', 'R'], p=[0.7, 0.2, 0.1])
                mic_value = np.random.choice(['≤0.5', '1', '2', '4', '8', '>16'])
                
                sensitivities.append({
                    'culture_id': culture['culture_id'],
                    'hospitalization_id': culture['hospitalization_id'],
                    'antibiotic': antibiotic,
                    'sensitivity': sensitivity_result,
                    'mic': mic_value,
                    'interpretation': {
                        'S': 'Susceptible',
                        'I': 'Intermediate',
                        'R': 'Resistant'
                    }[sensitivity_result]
                })
    
    return pd.DataFrame(sensitivities)

def generate_microbiology_non_culture(hospitalizations_df):
    """Generate non-culture microbiology tests"""
    non_culture_tests = []
    
    test_types = [
        {'name': 'COVID-19 PCR', 'component': 'SARS-CoV-2 RNA', 'specimen': 'Nasopharyngeal swab'},
        {'name': 'Influenza PCR', 'component': 'Influenza A/B RNA', 'specimen': 'Nasopharyngeal swab'},
        {'name': 'C. difficile PCR', 'component': 'C. difficile toxin', 'specimen': 'Stool'},
        {'name': 'Respiratory Panel', 'component': 'Multiple pathogens', 'specimen': 'Nasopharyngeal swab'},
        {'name': 'Legionella Antigen', 'component': 'Legionella antigen', 'specimen': 'Urine'},
        {'name': 'Strep Pneumo Antigen', 'component': 'S. pneumoniae antigen', 'specimen': 'Urine'}
    ]
    
    # 40% of patients get non-culture tests
    for _, hosp in hospitalizations_df.sample(frac=0.4).iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        
        # Select tests
        n_tests = np.random.randint(1, 4)
        selected_tests = random.sample(test_types, min(n_tests, len(test_types)))
        
        for test in selected_tests:
            # Test within first 24 hours usually
            test_offset = timedelta(hours=np.random.randint(0, 24))
            order_time = admission_time + test_offset
            collect_time = order_time + timedelta(minutes=15)
            result_time = collect_time + timedelta(hours=np.random.randint(1, 6))
            
            result = np.random.choice(['Positive', 'Negative', 'Detected', 'Not Detected'], 
                                    p=[0.1, 0.7, 0.1, 0.1])
            
            non_culture_tests.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'order_dttm': order_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'collect_dttm': collect_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'result_dttm': result_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'fluid_name': test['specimen'],
                'component_category': test['component'],
                'result_unit_category': 'Qualitative',
                'result_category': result
            })
    
    return pd.DataFrame(non_culture_tests)

def generate_admission_diagnosis(hospitalizations_df):
    """Generate admission diagnoses"""
    diagnoses = []
    
    diagnosis_codes = {
        'Sepsis': {'icd10': 'A41.9', 'icd9': '038.9'},
        'Pneumonia': {'icd10': 'J18.9', 'icd9': '486'},
        'Acute kidney injury': {'icd10': 'N17.9', 'icd9': '584.9'},
        'Heart failure': {'icd10': 'I50.9', 'icd9': '428.9'},
        'ARDS': {'icd10': 'J80', 'icd9': '518.82'},
        'Stroke': {'icd10': 'I63.9', 'icd9': '434.91'},
        'COPD exacerbation': {'icd10': 'J44.1', 'icd9': '491.21'},
        'GI bleed': {'icd10': 'K92.2', 'icd9': '578.9'},
        'Diabetes': {'icd10': 'E11.9', 'icd9': '250.00'},
        'Hypertension': {'icd10': 'I10', 'icd9': '401.9'}
    }
    
    for _, hosp in hospitalizations_df.iterrows():
        # Primary diagnosis
        primary_dx = np.random.choice(list(diagnosis_codes.keys())[:8])  # First 8 are acute
        
        # Use ICD-10 (90% of time) or ICD-9
        use_icd10 = np.random.random() < 0.9
        code_format = 'icd10' if use_icd10 else 'icd9'
        
        diagnoses.append({
            'hospitalization_id': hosp['hospitalization_id'],
            'diagnostic_code': diagnosis_codes[primary_dx][code_format],
            'diagnosis_code_format': code_format,
            'start_dttm': hosp['admission_dttm'],
            'end_dttm': hosp['discharge_dttm'] if hosp['discharge_category'] != 'Expired' else None
        })
        
        # Add comorbidities
        n_comorbidities = np.random.poisson(2)
        comorbidities = random.sample(list(diagnosis_codes.keys()), 
                                    min(n_comorbidities, len(diagnosis_codes)))
        
        for comorbidity in comorbidities:
            if comorbidity != primary_dx:
                diagnoses.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'diagnostic_code': diagnosis_codes[comorbidity][code_format],
                    'diagnosis_code_format': code_format,
                    'start_dttm': hosp['admission_dttm'],
                    'end_dttm': hosp['discharge_dttm']
                })
    
    return pd.DataFrame(diagnoses)

def generate_code_status(hospitalizations_df):
    """Generate code status changes"""
    code_status_records = []
    
    code_statuses = ['Full', 'DNR', 'DNR/DNI', 'Comfort Care Only']
    
    # 30% of patients have code status documented
    for _, hosp in hospitalizations_df.sample(frac=0.3).iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Start with Full Code
        current_status = 'Full'
        current_time = admission_time
        
        code_status_records.append({
            'hospitalization_id': hosp['hospitalization_id'],
            'start_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
            'code_status_name': 'Full Code',
            'code_status_category': current_status
        })
        
        # Possible status changes
        if hosp['discharge_category'] == 'Expired':
            # More likely to change code status
            n_changes = np.random.randint(1, 3)
        else:
            n_changes = np.random.randint(0, 2)
        
        for _ in range(n_changes):
            # Change happens after some days
            days_offset = np.random.randint(1, max(2, int((discharge_time - admission_time).days)))
            change_time = admission_time + timedelta(days=days_offset)
            
            if change_time < discharge_time:
                # Progress towards more limited code status
                if current_status == 'Full':
                    current_status = np.random.choice(['DNR', 'DNR/DNI'])
                elif current_status == 'DNR':
                    current_status = 'DNR/DNI'
                elif current_status == 'DNR/DNI':
                    current_status = 'Comfort Care Only'
                
                code_status_records.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'start_dttm': change_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'code_status_name': current_status,
                    'code_status_category': current_status
                })
    
    return pd.DataFrame(code_status_records)

def generate_provider(hospitalizations_df):
    """Generate provider information"""
    providers = []
    provider_id = 1
    
    # Generate pool of providers
    provider_pool = []
    specialties = ['Critical Care', 'Pulmonology', 'Cardiology', 'Nephrology', 'Infectious Disease']
    
    for i in range(50):  # 50 providers in the hospital
        provider_pool.append({
            'provider_id': f'PROV{provider_id:05d}',
            'provider_name': f'Dr. {random.choice(["Smith", "Johnson", "Williams", "Brown", "Jones"])} {random.choice(["A", "B", "C", "D"])}',
            'specialty': np.random.choice(specialties),
            'role': np.random.choice(['Attending', 'Fellow', 'Resident'])
        })
        provider_id += 1
    
    # Assign providers to hospitalizations
    for _, hosp in hospitalizations_df.iterrows():
        # Each patient gets 2-4 providers
        n_providers = np.random.randint(2, 5)
        selected_providers = random.sample(provider_pool, n_providers)
        
        for provider in selected_providers:
            providers.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'provider_id': provider['provider_id'],
                'provider_name': provider['provider_name'],
                'provider_specialty': provider['specialty'],
                'provider_role': provider['role']
            })
    
    return pd.DataFrame(providers)

def generate_therapy_session(hospitalizations_df):
    """Generate therapy session data"""
    therapy_sessions = []
    session_id = 1
    
    therapy_types = ['Physical Therapy', 'Occupational Therapy', 'Speech Therapy', 'Respiratory Therapy']
    
    # 40% of patients receive therapy
    for _, hosp in hospitalizations_df.sample(frac=0.4).iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Start therapy after stabilization (2-5 days)
        therapy_start = admission_time + timedelta(days=np.random.randint(2, 5))
        
        if therapy_start < discharge_time:
            # Select therapy types
            selected_therapies = random.sample(therapy_types, k=np.random.randint(1, 3))
            
            for therapy_type in selected_therapies:
                # Sessions every 1-2 days
                current_time = therapy_start
                while current_time < discharge_time:
                    session_duration = np.random.randint(30, 60)  # minutes
                    
                    therapy_sessions.append({
                        'session_id': f'TS{session_id:08d}',
                        'hospitalization_id': hosp['hospitalization_id'],
                        'therapy_type': therapy_type,
                        'session_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'duration_minutes': session_duration,
                        'therapist_notes': f'{therapy_type} session completed'
                    })
                    session_id += 1
                    
                    # Next session in 1-2 days
                    current_time += timedelta(days=np.random.randint(1, 3))
    
    return pd.DataFrame(therapy_sessions)

def generate_therapy_details(therapy_sessions_df):
    """Generate detailed therapy information"""
    therapy_details = []
    
    pt_activities = ['Bed mobility', 'Transfer training', 'Gait training', 'Strengthening exercises']
    ot_activities = ['ADL training', 'Upper extremity exercises', 'Cognitive tasks', 'Fine motor skills']
    st_activities = ['Swallow evaluation', 'Communication exercises', 'Cognitive-linguistic tasks']
    rt_activities = ['Breathing exercises', 'Airway clearance', 'Ventilator weaning', 'Oxygen titration']
    
    activity_map = {
        'Physical Therapy': pt_activities,
        'Occupational Therapy': ot_activities,
        'Speech Therapy': st_activities,
        'Respiratory Therapy': rt_activities
    }
    
    for _, session in therapy_sessions_df.iterrows():
        activities = activity_map.get(session['therapy_type'], [])
        selected_activities = random.sample(activities, k=min(2, len(activities)))
        
        for activity in selected_activities:
            therapy_details.append({
                'session_id': session['session_id'],
                'hospitalization_id': session['hospitalization_id'],
                'activity_name': activity,
                'activity_duration_minutes': session['duration_minutes'] // len(selected_activities),
                'patient_response': np.random.choice(['Good', 'Fair', 'Poor']),
                'notes': f'Patient participated in {activity}'
            })
    
    return pd.DataFrame(therapy_details)

def save_clif_tables(output_dir):
    """Generate and save all CLIF tables"""
    print("Generating Complete CLIF Dataset...")
    print("=" * 50)
    
    # Core tables
    print("Generating patient demographics...")
    patients_df = generate_patients()
    patients_df.to_csv(output_dir / 'patient.csv', index=False)
    print(f"✓ Generated {len(patients_df)} patients")
    
    print("Generating hospitalizations...")
    hospitalizations_df = generate_hospitalizations(patients_df)
    hospitalizations_df.to_csv(output_dir / 'hospitalization.csv', index=False)
    print(f"✓ Generated {len(hospitalizations_df)} hospitalizations")
    
    print("Generating ADT events...")
    adt_df = generate_adt(hospitalizations_df)
    adt_df.to_csv(output_dir / 'adt.csv', index=False)
    print(f"✓ Generated {len(adt_df)} ADT events")
    
    print("Generating vital signs...")
    vitals_df = generate_vitals(hospitalizations_df)
    vitals_df.to_csv(output_dir / 'vitals.csv', index=False)
    print(f"✓ Generated {len(vitals_df):,} vital signs")
    
    print("Generating laboratory results...")
    labs_df = generate_labs(hospitalizations_df)
    labs_df.to_csv(output_dir / 'labs.csv', index=False)
    print(f"✓ Generated {len(labs_df):,} lab results")
    
    print("Generating patient assessments...")
    assessments_df = generate_patient_assessments(hospitalizations_df)
    assessments_df.to_csv(output_dir / 'patient_assessments.csv', index=False)
    print(f"✓ Generated {len(assessments_df):,} assessments")
    
    print("Generating respiratory support...")
    respiratory_df = generate_respiratory_support(hospitalizations_df)
    respiratory_df.to_csv(output_dir / 'respiratory_support.csv', index=False)
    print(f"✓ Generated {len(respiratory_df):,} respiratory support records")
    
    print("Generating medication orders...")
    med_orders_df = generate_medication_orders(hospitalizations_df)
    med_orders_df.to_csv(output_dir / 'medication_orders.csv', index=False)
    print(f"✓ Generated {len(med_orders_df)} medication orders")
    
    print("Generating continuous medication administration...")
    med_admin_cont_df = generate_medication_admin_continuous(med_orders_df)
    med_admin_cont_df.to_csv(output_dir / 'medication_admin_continuous.csv', index=False)
    print(f"✓ Generated {len(med_admin_cont_df)} continuous med admin records")
    
    print("Generating intermittent medication administration...")
    med_admin_int_df = generate_medication_admin_intermittent(med_orders_df)
    med_admin_int_df.to_csv(output_dir / 'medication_admin_intermittent.csv', index=False)
    print(f"✓ Generated {len(med_admin_int_df)} intermittent med admin records")
    
    print("Generating CRRT therapy...")
    crrt_df = generate_crrt_therapy(hospitalizations_df)
    crrt_df.to_csv(output_dir / 'crrt_therapy.csv', index=False)
    print(f"✓ Generated {len(crrt_df)} CRRT records")
    
    print("Generating ECMO/MCS...")
    ecmo_df = generate_ecmo_mcs(hospitalizations_df)
    ecmo_df.to_csv(output_dir / 'ecmo_mcs.csv', index=False)
    print(f"✓ Generated {len(ecmo_df)} ECMO/MCS records")
    
    print("Generating patient positioning...")
    position_df = generate_position(hospitalizations_df)
    position_df.to_csv(output_dir / 'position.csv', index=False)
    print(f"✓ Generated {len(position_df)} position records")
    
    print("Generating procedures...")
    procedures_df = generate_procedures(hospitalizations_df)
    procedures_df.to_csv(output_dir / 'procedures.csv', index=False)
    print(f"✓ Generated {len(procedures_df)} procedures")
    
    print("Generating intake/output...")
    io_df = generate_intake_output(hospitalizations_df)
    io_df.to_csv(output_dir / 'intake_output.csv', index=False)
    print(f"✓ Generated {len(io_df)} I/O records")
    
    print("Generating microbiology cultures...")
    cultures_df = generate_microbiology_culture(hospitalizations_df)
    cultures_df.to_csv(output_dir / 'microbiology_culture.csv', index=False)
    print(f"✓ Generated {len(cultures_df)} cultures")
    
    print("Generating antibiotic sensitivities...")
    sensitivity_df = generate_sensitivity(cultures_df)
    sensitivity_df.to_csv(output_dir / 'sensitivity.csv', index=False)
    print(f"✓ Generated {len(sensitivity_df)} sensitivity results")
    
    print("Generating non-culture microbiology...")
    non_culture_df = generate_microbiology_non_culture(hospitalizations_df)
    non_culture_df.to_csv(output_dir / 'microbiology_non_culture.csv', index=False)
    print(f"✓ Generated {len(non_culture_df)} non-culture tests")
    
    print("Generating admission diagnoses...")
    diagnoses_df = generate_admission_diagnosis(hospitalizations_df)
    diagnoses_df.to_csv(output_dir / 'admission_diagnosis.csv', index=False)
    print(f"✓ Generated {len(diagnoses_df)} diagnoses")
    
    print("Generating code status...")
    code_status_df = generate_code_status(hospitalizations_df)
    code_status_df.to_csv(output_dir / 'code_status.csv', index=False)
    print(f"✓ Generated {len(code_status_df)} code status records")
    
    print("Generating providers...")
    providers_df = generate_provider(hospitalizations_df)
    providers_df.to_csv(output_dir / 'provider.csv', index=False)
    print(f"✓ Generated {len(providers_df)} provider assignments")
    
    print("Generating therapy sessions...")
    therapy_sessions_df = generate_therapy_session(hospitalizations_df)
    therapy_sessions_df.to_csv(output_dir / 'therapy_session.csv', index=False)
    print(f"✓ Generated {len(therapy_sessions_df)} therapy sessions")
    
    print("Generating therapy details...")
    therapy_details_df = generate_therapy_details(therapy_sessions_df)
    therapy_details_df.to_csv(output_dir / 'therapy_details.csv', index=False)
    print(f"✓ Generated {len(therapy_details_df)} therapy detail records")
    
    # Create summary
    summary = {
        'dataset_info': {
            'n_patients': len(patients_df),
            'n_hospitalizations': len(hospitalizations_df),
            'n_icu_locations': len(adt_df[adt_df['location_category'] == 'icu']),
            'mortality_rate': (patients_df['death_dttm'].notna().sum() / len(patients_df)),
            'tables_generated': 23
        },
        'table_counts': {
            'patient': len(patients_df),
            'hospitalization': len(hospitalizations_df),
            'adt': len(adt_df),
            'vitals': len(vitals_df),
            'labs': len(labs_df),
            'patient_assessments': len(assessments_df),
            'respiratory_support': len(respiratory_df),
            'medication_orders': len(med_orders_df),
            'medication_admin_continuous': len(med_admin_cont_df),
            'medication_admin_intermittent': len(med_admin_int_df),
            'crrt_therapy': len(crrt_df),
            'ecmo_mcs': len(ecmo_df),
            'position': len(position_df),
            'procedures': len(procedures_df),
            'intake_output': len(io_df),
            'microbiology_culture': len(cultures_df),
            'sensitivity': len(sensitivity_df),
            'microbiology_non_culture': len(non_culture_df),
            'admission_diagnosis': len(diagnoses_df),
            'code_status': len(code_status_df),
            'provider': len(providers_df),
            'therapy_session': len(therapy_sessions_df),
            'therapy_details': len(therapy_details_df)
        }
    }
    
    with open(output_dir / 'dataset_summary.json', 'w') as f:
        json.dump(summary, f, indent=2, default=str)
    
    # Create README
    readme_content = f"""# Complete CLIF Dataset

## Overview
This synthetic dataset contains {summary['dataset_info']['n_patients']} ICU patients with complete CLIF v2.0.0 format data.
All 23 CLIF tables are included with realistic clinical data.

## Dataset Statistics
- **Patients**: {summary['dataset_info']['n_patients']}
- **Hospitalizations**: {summary['dataset_info']['n_hospitalizations']}
- **ICU Stays**: {summary['dataset_info']['n_icu_locations']}
- **Mortality Rate**: {summary['dataset_info']['mortality_rate']:.1%}
- **Total Tables**: {summary['dataset_info']['tables_generated']}

## CLIF Tables Included

### Patient and Encounter Tables
1. **patient.csv** - Patient demographics
2. **hospitalization.csv** - Hospital encounters
3. **adt.csv** - Admission, discharge, transfer events
4. **provider.csv** - Provider information
5. **admission_diagnosis.csv** - Admission diagnoses

### Clinical Measurements
6. **vitals.csv** - Vital signs ({summary['table_counts']['vitals']:,} records)
7. **labs.csv** - Laboratory results ({summary['table_counts']['labs']:,} records)
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
"""
    
    with open(output_dir / 'README.md', 'w') as f:
        f.write(readme_content)
    
    print("\n✅ Complete CLIF dataset generated successfully!")
    print(f"📁 Output directory: {output_dir}")
    print(f"📊 Total records across all tables: {sum(summary['table_counts'].values()):,}")

# Main execution
if __name__ == "__main__":
    save_clif_tables(output_dir)