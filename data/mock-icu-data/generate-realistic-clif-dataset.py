#!/usr/bin/env python3
"""
Generate Realistic CLIF Dataset
Creates a synthetic ICU dataset matching real CLIF statistics
Based on actual CLIF consortium data (2011-2024)
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
output_dir = Path("data/mock-icu-data/clif_realistic")
output_dir.mkdir(parents=True, exist_ok=True)

# Constants based on real CLIF data
N_PATIENTS = 500  # Scale down from 680,158 patients
MORTALITY_RATE = 0.139  # 13.9% mortality
FEMALE_RATE = 0.45  # 45% female
WHITE_RATE = 0.634  # 63.4% white
HISPANIC_RATE = 0.06  # 6% hispanic
IMV_RATE = 0.356  # 35.6% invasive mechanical ventilation
VASOPRESSOR_RATE = 0.368  # 36.8% vasopressors
MEDIAN_HOSPITAL_LOS = 6.9  # days
MEDIAN_SOFA = 4.0
BASE_DATE = datetime(2024, 1, 1)

# Medical constants
ADMISSION_TYPES = ['Inpatient', 'ED to Inpatient', 'Acute Care Transfer', 'Pre-op']
DISCHARGE_CATEGORIES = ['Home', 'SNF', 'Expired', 'Acute Inpatient Rehab Facility', 'Hospice', 'LTACH', 'AMA']
ICU_TYPES = ['MICU', 'SICU', 'CCU', 'CSRU', 'NICU', 'PICU']
LOCATION_CATEGORIES = ['ed', 'ward', 'stepdown', 'icu', 'procedural', 'l&d', 'hospice', 'psych', 'rehab', 'radiology', 'dialysis', 'other']

# Race distribution based on CLIF data
RACE_DISTRIBUTION = {
    'White': 0.634,
    'Black or African-American': 0.15,
    'Asian': 0.08,
    'American Indian': 0.02,
    'Pacific Islander': 0.01,
    'Other': 0.106
}

def generate_los_distribution():
    """Generate hospital length of stay with median 6.9 days"""
    # Use log-normal distribution to match typical hospital LOS patterns
    # Parameters tuned to achieve median ~6.9 days
    los = np.random.lognormal(mean=1.93, sigma=0.8)
    return max(0.5, min(365, los))  # Cap between 0.5 and 365 days

def generate_sofa_score():
    """Generate SOFA scores with median 4.0"""
    # SOFA score components (0-4 for each organ system, 6 systems total)
    # Tuned to achieve median total score of 4
    organ_scores = []
    for _ in range(6):
        # Most patients have low scores, some have high
        score = np.random.choice([0, 1, 2, 3, 4], p=[0.3, 0.35, 0.2, 0.1, 0.05])
        organ_scores.append(score)
    
    total_sofa = sum(organ_scores)
    # Adjust to center around median 4
    if total_sofa > 8:
        total_sofa = np.random.randint(3, 7)
    return total_sofa

def generate_patients(n=N_PATIENTS):
    """Generate patient demographics matching real CLIF data"""
    patients = []
    
    for i in range(1, n + 1):
        # Age distribution for ICU patients (skewed older)
        age = np.random.gamma(7.5, 8.5)  # Shape and scale for realistic age distribution
        age = max(18, min(105, int(age)))  # Cap between 18-105
        
        # Generate birth date based on age
        birth_date = BASE_DATE - timedelta(days=int(age*365.25))
        
        # Mortality rate: 13.9% overall, higher for elderly
        death_prob = MORTALITY_RATE
        if age > 80:
            death_prob = 0.25
        elif age > 70:
            death_prob = 0.18
            
        death_dttm = None
        if np.random.random() < death_prob:
            # Death occurs during study period
            days_to_death = np.random.randint(1, 365)
            death_dttm = BASE_DATE + timedelta(days=days_to_death)
        
        # Generate sex: 45% female
        sex = np.random.choice(['Female', 'Male'], p=[FEMALE_RATE, 1-FEMALE_RATE])
        
        # Generate race based on distribution
        races = list(RACE_DISTRIBUTION.keys())
        race_probs = list(RACE_DISTRIBUTION.values())
        race = np.random.choice(races, p=race_probs)
        
        # Generate ethnicity: 6% Hispanic
        ethnicity = np.random.choice(['Hispanic or Latino', 'Not Hispanic'], 
                                   p=[HISPANIC_RATE, 1-HISPANIC_RATE])
        
        patient = {
            'patient_id': f'P{i:06d}',
            'race_name': race,
            'race_category': race,
            'ethnicity_name': ethnicity,
            'ethnicity_category': 'Hispanic' if ethnicity == 'Hispanic or Latino' else 'Non-Hispanic',
            'sex_name': sex,
            'sex_category': sex,
            'birth_date': birth_date.strftime('%Y-%m-%d'),
            'death_dttm': death_dttm.strftime('%Y-%m-%d %H:%M:%S+00:00') if death_dttm else None,
            'language_name': np.random.choice(['English', 'Spanish', 'Chinese', 'Other'], 
                                            p=[0.75, 0.12, 0.05, 0.08]),
            'language_category': np.random.choice(['English', 'Spanish', 'Chinese', 'Other'], 
                                                p=[0.75, 0.12, 0.05, 0.08])
        }
        patients.append(patient)
    
    return pd.DataFrame(patients)

def generate_hospitalizations(patients_df):
    """Generate hospitalization encounters with realistic LOS"""
    hospitalizations = []
    hosp_id = 1000
    
    # Track which patients need IMV and vasopressors
    total_encounters = 0
    imv_encounters = 0
    vasopressor_encounters = 0
    
    for _, patient in patients_df.iterrows():
        # Most patients have 1 hospitalization, some have multiple
        n_hosps = np.random.choice([1, 2, 3], p=[0.7, 0.25, 0.05])
        
        patient_death = pd.to_datetime(patient['death_dttm']).replace(tzinfo=None) if patient['death_dttm'] else None
        
        for h in range(n_hosps):
            total_encounters += 1
            
            # Random admission date
            admission_offset = h * np.random.randint(30, 180) + np.random.randint(0, 200)
            admission_dttm = BASE_DATE + timedelta(days=int(admission_offset))
            
            # Length of stay with median 6.9 days
            los_days = generate_los_distribution()
            los_days = max(1, int(los_days))
            
            discharge_dttm = admission_dttm + timedelta(days=los_days)
            
            # Determine if this encounter needs IMV (35.6%)
            needs_imv = np.random.random() < IMV_RATE
            if needs_imv:
                imv_encounters += 1
                
            # Determine if this encounter needs vasopressors (36.8%)
            needs_vasopressors = np.random.random() < VASOPRESSOR_RATE
            if needs_vasopressors:
                vasopressor_encounters += 1
            
            # Check if patient dies during this hospitalization
            discharge_category = np.random.choice(DISCHARGE_CATEGORIES[:-1])  # Exclude 'Expired' initially
            if patient_death and admission_dttm <= patient_death <= discharge_dttm:
                discharge_category = 'Expired'
                discharge_dttm = patient_death
            
            # Calculate age at admission
            birth_date = pd.to_datetime(patient['birth_date'])
            age_at_admission = int((admission_dttm - birth_date).days / 365.25)
            
            # Generate SOFA score
            sofa_score = generate_sofa_score()
            
            hosp = {
                'patient_id': patient['patient_id'],
                'hospitalization_id': f'H{hosp_id:06d}',
                'admission_dttm': admission_dttm.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'discharge_dttm': discharge_dttm.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'admission_type_name': np.random.choice(ADMISSION_TYPES),
                'admission_type_category': np.random.choice(ADMISSION_TYPES),
                'discharge_disposition_name': discharge_category,
                'discharge_disposition_category': discharge_category,
                'age_at_admission': age_at_admission,
                'hospital_los_days': los_days,
                'needs_imv': needs_imv,
                'needs_vasopressors': needs_vasopressors,
                'sofa_score': sofa_score
            }
            hospitalizations.append(hosp)
            hosp_id += 1
    
    df = pd.DataFrame(hospitalizations)
    
    # Print statistics to verify
    print(f"\nHospitalization Statistics:")
    print(f"Total encounters: {total_encounters}")
    print(f"IMV rate: {imv_encounters/total_encounters:.1%} (target: {IMV_RATE:.1%})")
    print(f"Vasopressor rate: {vasopressor_encounters/total_encounters:.1%} (target: {VASOPRESSOR_RATE:.1%})")
    print(f"Median LOS: {df['hospital_los_days'].median():.1f} days (target: {MEDIAN_HOSPITAL_LOS} days)")
    print(f"Median SOFA: {df['sofa_score'].median():.1f} (target: {MEDIAN_SOFA})")
    
    # Remove temporary columns before returning
    df = df.drop(columns=['hospital_los_days', 'needs_imv', 'needs_vasopressors', 'sofa_score'])
    
    return df

def generate_adt(hospitalizations_df):
    """Generate ADT (Admission, Discharge, Transfer) events"""
    adt_events = []
    event_id = 1
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm']).replace(tzinfo=None)
        discharge_time = pd.to_datetime(hosp['discharge_dttm']).replace(tzinfo=None)
        
        # Admission to ICU
        adt_events.append({
            'hospitalization_id': hosp['hospitalization_id'],
            'adt_id': f'ADT{event_id:06d}',
            'in_dttm': admission_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
            'out_dttm': None,
            'location_name': np.random.choice(['MICU', 'SICU', 'CCU', 'CSRU']),
            'location_category': 'icu'
        })
        event_id += 1
        
        # Some patients have transfers
        if np.random.random() < 0.3:
            # Transfer within ICU
            transfer_time = admission_time + timedelta(days=np.random.randint(1, 3))
            if transfer_time < discharge_time:
                adt_events[-1]['out_dttm'] = transfer_time.strftime('%Y-%m-%d %H:%M:%S+00:00')
                
                adt_events.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'adt_id': f'ADT{event_id:06d}',
                    'in_dttm': transfer_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'out_dttm': None,
                    'location_name': np.random.choice(['MICU', 'SICU', 'CCU', 'Step-down']),
                    'location_category': np.random.choice(['icu', 'stepdown'])
                })
                event_id += 1
        
        # Final discharge
        adt_events[-1]['out_dttm'] = discharge_time.strftime('%Y-%m-%d %H:%M:%S+00:00')
    
    return pd.DataFrame(adt_events)

def generate_respiratory_support(hospitalizations_df):
    """Generate respiratory support data with 35.6% IMV rate"""
    respiratory_records = []
    record_id = 1
    
    imv_count = 0
    total_count = len(hospitalizations_df)
    target_imv = int(total_count * IMV_RATE)
    
    for idx, (_, hosp) in enumerate(hospitalizations_df.iterrows()):
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Determine if this patient gets IMV based on remaining quota
        remaining_patients = total_count - idx
        remaining_imv_needed = target_imv - imv_count
        
        # Probability of IMV for this patient
        if remaining_patients > 0:
            imv_prob = remaining_imv_needed / remaining_patients
            needs_imv = np.random.random() < max(0, min(1, imv_prob))
        else:
            needs_imv = False
            
        if needs_imv:
            imv_count += 1
            
            # IMV typically starts early in admission
            start_offset = timedelta(hours=np.random.randint(0, 12))
            start_time = admission_time + start_offset
            
            # Duration of IMV (hours to days)
            duration_hours = np.random.gamma(48, 2)  # Average ~96 hours
            duration_hours = max(4, min(720, duration_hours))  # 4 hours to 30 days
            
            end_time = min(start_time + timedelta(hours=duration_hours), discharge_time)
            
            # Add IMV record
            respiratory_records.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'respiratory_support_id': f'RS{record_id:06d}',
                'start_dttm': start_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'stop_dttm': end_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'device_name': 'Invasive Mechanical Ventilation',
                'device_category': 'imv',
                'mode_name': np.random.choice(['SIMV', 'AC/VC', 'PS', 'PRVC']),
                'mode_category': np.random.choice(['simv', 'ac_vc', 'ps', 'prvc']),
                'fi_o2': round(np.random.uniform(0.3, 1.0), 2),
                'lpm': None,
                'peep': np.random.randint(5, 15),
                'tidal_volume': np.random.randint(350, 550),
                'resp_rate_set': np.random.randint(12, 20),
                'resp_rate_obs': np.random.randint(14, 28),
                'peak_inspiratory_pressure': np.random.randint(15, 35)
            })
            record_id += 1
        else:
            # Non-invasive support
            support_type = np.random.choice(['nasal_cannula', 'face_mask', 'high_flow', 'nippv'], 
                                          p=[0.4, 0.3, 0.2, 0.1])
            
            start_time = admission_time + timedelta(hours=np.random.randint(0, 6))
            duration_hours = np.random.randint(12, 72)
            end_time = min(start_time + timedelta(hours=duration_hours), discharge_time)
            
            device_names = {
                'nasal_cannula': 'Nasal Cannula',
                'face_mask': 'Face Mask',
                'high_flow': 'High Flow Nasal Cannula',
                'nippv': 'Non-invasive Positive Pressure Ventilation'
            }
            
            respiratory_records.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'respiratory_support_id': f'RS{record_id:06d}',
                'start_dttm': start_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'stop_dttm': end_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'device_name': device_names[support_type],
                'device_category': support_type,
                'mode_name': None,
                'mode_category': None,
                'fi_o2': round(np.random.uniform(0.21, 0.6), 2) if support_type != 'nasal_cannula' else None,
                'lpm': np.random.randint(1, 15) if support_type in ['nasal_cannula', 'face_mask'] else np.random.randint(20, 60),
                'peep': np.random.randint(5, 10) if support_type == 'nippv' else None,
                'tidal_volume': None,
                'resp_rate_set': None,
                'resp_rate_obs': np.random.randint(16, 30),
                'peak_inspiratory_pressure': None
            })
            record_id += 1
    
    df = pd.DataFrame(respiratory_records)
    actual_imv_rate = imv_count / total_count
    print(f"\nRespiratory Support Statistics:")
    print(f"IMV rate achieved: {actual_imv_rate:.1%} (target: {IMV_RATE:.1%})")
    
    return df

def generate_medication_orders(hospitalizations_df):
    """Generate medication orders with focus on vasopressors (36.8%)"""
    med_orders = []
    order_id = 1
    
    vasopressor_count = 0
    total_count = len(hospitalizations_df)
    target_vasopressor = int(total_count * VASOPRESSOR_RATE)
    
    # Common ICU medications
    VASOPRESSORS = [
        {'name': 'Norepinephrine', 'rxnorm': '00128'},
        {'name': 'Epinephrine', 'rxnorm': '00129'},
        {'name': 'Vasopressin', 'rxnorm': '00130'},
        {'name': 'Dopamine', 'rxnorm': '00131'},
        {'name': 'Phenylephrine', 'rxnorm': '00132'}
    ]
    
    OTHER_MEDS = [
        {'name': 'Propofol', 'rxnorm': '00201'},
        {'name': 'Fentanyl', 'rxnorm': '00202'},
        {'name': 'Midazolam', 'rxnorm': '00203'},
        {'name': 'Morphine', 'rxnorm': '00204'},
        {'name': 'Vancomycin', 'rxnorm': '00301'},
        {'name': 'Piperacillin-Tazobactam', 'rxnorm': '00302'},
        {'name': 'Meropenem', 'rxnorm': '00303'},
        {'name': 'Heparin', 'rxnorm': '00401'},
        {'name': 'Insulin', 'rxnorm': '00402'}
    ]
    
    for idx, (_, hosp) in enumerate(hospitalizations_df.iterrows()):
        admission_time = pd.to_datetime(hosp['admission_dttm'])
        discharge_time = pd.to_datetime(hosp['discharge_dttm'])
        
        # Determine if this patient gets vasopressors
        remaining_patients = total_count - idx
        remaining_vaso_needed = target_vasopressor - vasopressor_count
        
        if remaining_patients > 0:
            vaso_prob = remaining_vaso_needed / remaining_patients
            needs_vasopressor = np.random.random() < max(0, min(1, vaso_prob))
        else:
            needs_vasopressor = False
            
        if needs_vasopressor:
            vasopressor_count += 1
            
            # Add 1-3 vasopressors
            n_vasopressors = np.random.choice([1, 2, 3], p=[0.6, 0.3, 0.1])
            selected_vasopressors = np.random.choice(VASOPRESSORS, n_vasopressors, replace=False)
            
            for vaso in selected_vasopressors:
                # Vasopressors typically start within first 24 hours
                start_offset = timedelta(hours=np.random.randint(0, 24))
                order_time = admission_time + start_offset
                
                # Duration typically 1-7 days
                duration_days = np.random.gamma(2, 1.5)
                duration_days = max(0.5, min(14, duration_days))
                
                med_orders.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'medication_order_id': f'MO{order_id:06d}',
                    'order_dttm': order_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'medication_name': vaso['name'],
                    'rxnorm_code': vaso['rxnorm'],
                    'medication_category': 'vasopressor',
                    'route': 'IV',
                    'frequency': 'CONTINUOUS',
                    'duration_days': round(duration_days, 1)
                })
                order_id += 1
        
        # Add other common ICU medications
        n_other_meds = np.random.randint(3, 8)
        selected_meds = np.random.choice(OTHER_MEDS, n_other_meds, replace=False)
        
        for med in selected_meds:
            order_time = admission_time + timedelta(hours=np.random.randint(0, 48))
            
            med_orders.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'medication_order_id': f'MO{order_id:06d}',
                'order_dttm': order_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'medication_name': med['name'],
                'rxnorm_code': med['rxnorm'],
                'medication_category': 'other',
                'route': np.random.choice(['IV', 'PO', 'IM'], p=[0.7, 0.2, 0.1]),
                'frequency': np.random.choice(['Q6H', 'Q8H', 'Q12H', 'DAILY', 'CONTINUOUS'], 
                                            p=[0.2, 0.2, 0.2, 0.2, 0.2]),
                'duration_days': np.random.randint(1, 7)
            })
            order_id += 1
    
    df = pd.DataFrame(med_orders)
    actual_vaso_rate = vasopressor_count / total_count
    print(f"\nMedication Statistics:")
    print(f"Vasopressor rate achieved: {actual_vaso_rate:.1%} (target: {VASOPRESSOR_RATE:.1%})")
    
    return df

def generate_vitals(hospitalizations_df):
    """Generate vital signs with realistic ICU patterns"""
    vitals = []
    vital_id = 1
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm']).replace(tzinfo=None)
        discharge_time = pd.to_datetime(hosp['discharge_dttm']).replace(tzinfo=None)
        
        # Generate vitals every 1-4 hours
        current_time = admission_time
        while current_time < discharge_time:
            # More frequent monitoring in first 24 hours
            hours_since_admission = (current_time - admission_time).total_seconds() / 3600
            if hours_since_admission < 24:
                interval = timedelta(hours=1)
            else:
                interval = timedelta(hours=int(np.random.choice([1, 2, 4], p=[0.3, 0.5, 0.2])))
            
            # Generate realistic vital signs
            # Some correlation with severity (simplified)
            is_severe = np.random.random() < 0.3
            
            hr = np.random.normal(90 if is_severe else 75, 15)
            hr = max(40, min(180, int(hr)))
            
            sbp = np.random.normal(110 if is_severe else 120, 20)
            sbp = max(70, min(200, int(sbp)))
            
            dbp = np.random.normal(65 if is_severe else 75, 15)
            dbp = max(40, min(120, int(dbp)))
            
            temp = np.random.normal(37.5 if is_severe else 37.0, 0.5)
            temp = max(35.0, min(40.0, round(temp, 1)))
            
            rr = np.random.normal(22 if is_severe else 16, 4)
            rr = max(8, min(40, int(rr)))
            
            spo2 = np.random.normal(93 if is_severe else 97, 3)
            spo2 = max(85, min(100, int(spo2)))
            
            vitals.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'vitals_id': f'V{vital_id:06d}',
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'vital_name': 'Heart Rate',
                'vital_value': str(hr),
                'vital_units': 'bpm'
            })
            vital_id += 1
            
            vitals.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'vitals_id': f'V{vital_id:06d}',
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'vital_name': 'Systolic BP',
                'vital_value': str(sbp),
                'vital_units': 'mmHg'
            })
            vital_id += 1
            
            vitals.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'vitals_id': f'V{vital_id:06d}',
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'vital_name': 'Diastolic BP',
                'vital_value': str(dbp),
                'vital_units': 'mmHg'
            })
            vital_id += 1
            
            vitals.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'vitals_id': f'V{vital_id:06d}',
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'vital_name': 'Temperature',
                'vital_value': str(temp),
                'vital_units': 'C'
            })
            vital_id += 1
            
            vitals.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'vitals_id': f'V{vital_id:06d}',
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'vital_name': 'Respiratory Rate',
                'vital_value': str(rr),
                'vital_units': 'breaths/min'
            })
            vital_id += 1
            
            vitals.append({
                'hospitalization_id': hosp['hospitalization_id'],
                'vitals_id': f'V{vital_id:06d}',
                'recorded_dttm': current_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                'vital_name': 'SpO2',
                'vital_value': str(spo2),
                'vital_units': '%'
            })
            vital_id += 1
            
            current_time += interval
    
    return pd.DataFrame(vitals)

def generate_labs(hospitalizations_df):
    """Generate laboratory results with ICU-relevant tests"""
    labs = []
    lab_id = 1
    
    # Common ICU labs with normal ranges
    LAB_TESTS = [
        {'name': 'Hemoglobin', 'loinc': '718-7', 'units': 'g/dL', 'normal_low': 12.0, 'normal_high': 16.0},
        {'name': 'White Blood Cell Count', 'loinc': '6690-2', 'units': '10^3/uL', 'normal_low': 4.5, 'normal_high': 11.0},
        {'name': 'Platelet Count', 'loinc': '777-3', 'units': '10^3/uL', 'normal_low': 150, 'normal_high': 400},
        {'name': 'Sodium', 'loinc': '2951-2', 'units': 'mmol/L', 'normal_low': 136, 'normal_high': 145},
        {'name': 'Potassium', 'loinc': '2823-3', 'units': 'mmol/L', 'normal_low': 3.5, 'normal_high': 5.0},
        {'name': 'Creatinine', 'loinc': '2160-0', 'units': 'mg/dL', 'normal_low': 0.6, 'normal_high': 1.2},
        {'name': 'BUN', 'loinc': '3094-0', 'units': 'mg/dL', 'normal_low': 7, 'normal_high': 20},
        {'name': 'Glucose', 'loinc': '2345-7', 'units': 'mg/dL', 'normal_low': 70, 'normal_high': 100},
        {'name': 'Lactate', 'loinc': '2518-9', 'units': 'mmol/L', 'normal_low': 0.5, 'normal_high': 2.0},
        {'name': 'pH', 'loinc': '2744-1', 'units': '', 'normal_low': 7.35, 'normal_high': 7.45},
        {'name': 'PaO2', 'loinc': '2703-7', 'units': 'mmHg', 'normal_low': 80, 'normal_high': 100},
        {'name': 'PaCO2', 'loinc': '2019-8', 'units': 'mmHg', 'normal_low': 35, 'normal_high': 45},
        {'name': 'Bilirubin Total', 'loinc': '1975-2', 'units': 'mg/dL', 'normal_low': 0.1, 'normal_high': 1.2},
        {'name': 'ALT', 'loinc': '1742-6', 'units': 'U/L', 'normal_low': 7, 'normal_high': 56},
        {'name': 'AST', 'loinc': '1920-8', 'units': 'U/L', 'normal_low': 10, 'normal_high': 40},
        {'name': 'Troponin I', 'loinc': '10839-9', 'units': 'ng/mL', 'normal_low': 0, 'normal_high': 0.04},
        {'name': 'Procalcitonin', 'loinc': '33959-8', 'units': 'ng/mL', 'normal_low': 0, 'normal_high': 0.5}
    ]
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm']).replace(tzinfo=None)
        discharge_time = pd.to_datetime(hosp['discharge_dttm']).replace(tzinfo=None)
        
        # Daily basic metabolic panel, CBC
        # More frequent labs for sicker patients
        current_date = admission_time.date()
        end_date = discharge_time.date()
        
        while current_date <= end_date:
            # Morning labs (6 AM)
            lab_time = datetime.combine(current_date, datetime.min.time()) + timedelta(hours=6)
            
            if admission_time <= lab_time <= discharge_time:
                # Basic metabolic panel
                for test in ['Sodium', 'Potassium', 'Creatinine', 'BUN', 'Glucose']:
                    lab_info = next(l for l in LAB_TESTS if l['name'] == test)
                    
                    # Generate value with some abnormal results
                    if np.random.random() < 0.3:  # 30% abnormal
                        # Abnormal value
                        if np.random.random() < 0.5:
                            # Low
                            value = np.random.uniform(lab_info['normal_low'] * 0.7, lab_info['normal_low'])
                        else:
                            # High
                            value = np.random.uniform(lab_info['normal_high'], lab_info['normal_high'] * 1.3)
                    else:
                        # Normal value
                        value = np.random.uniform(lab_info['normal_low'], lab_info['normal_high'])
                    
                    labs.append({
                        'hospitalization_id': hosp['hospitalization_id'],
                        'lab_id': f'L{lab_id:06d}',
                        'collection_dttm': lab_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'lab_name': lab_info['name'],
                        'loinc_code': lab_info['loinc'],
                        'lab_value': round(value, 2),
                        'lab_units': lab_info['units'],
                        'reference_range': f"{lab_info['normal_low']}-{lab_info['normal_high']}"
                    })
                    lab_id += 1
                
                # CBC
                for test in ['Hemoglobin', 'White Blood Cell Count', 'Platelet Count']:
                    lab_info = next(l for l in LAB_TESTS if l['name'] == test)
                    
                    if np.random.random() < 0.3:  # 30% abnormal
                        if np.random.random() < 0.5:
                            value = np.random.uniform(lab_info['normal_low'] * 0.7, lab_info['normal_low'])
                        else:
                            value = np.random.uniform(lab_info['normal_high'], lab_info['normal_high'] * 1.3)
                    else:
                        value = np.random.uniform(lab_info['normal_low'], lab_info['normal_high'])
                    
                    labs.append({
                        'hospitalization_id': hosp['hospitalization_id'],
                        'lab_id': f'L{lab_id:06d}',
                        'collection_dttm': lab_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'lab_name': lab_info['name'],
                        'loinc_code': lab_info['loinc'],
                        'lab_value': round(value, 1 if test == 'Hemoglobin' else 0),
                        'lab_units': lab_info['units'],
                        'reference_range': f"{lab_info['normal_low']}-{lab_info['normal_high']}"
                    })
                    lab_id += 1
                
                # Additional tests based on condition
                if np.random.random() < 0.4:  # 40% get lactate
                    lab_info = next(l for l in LAB_TESTS if l['name'] == 'Lactate')
                    value = np.random.gamma(2, 0.8)  # Often elevated in ICU
                    
                    labs.append({
                        'hospitalization_id': hosp['hospitalization_id'],
                        'lab_id': f'L{lab_id:06d}',
                        'collection_dttm': lab_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'lab_name': lab_info['name'],
                        'loinc_code': lab_info['loinc'],
                        'lab_value': round(value, 1),
                        'lab_units': lab_info['units'],
                        'reference_range': f"{lab_info['normal_low']}-{lab_info['normal_high']}"
                    })
                    lab_id += 1
            
            current_date += timedelta(days=1)
    
    return pd.DataFrame(labs)

def generate_patient_assessments(hospitalizations_df):
    """Generate patient assessments including SOFA scores"""
    assessments = []
    assessment_id = 1
    
    # Assessment types
    ASSESSMENT_TYPES = [
        {'name': 'SOFA Score', 'category': 'severity_score'},
        {'name': 'Glasgow Coma Scale', 'category': 'neurological'},
        {'name': 'Richmond Agitation-Sedation Scale', 'category': 'sedation'},
        {'name': 'Confusion Assessment Method for ICU', 'category': 'delirium'},
        {'name': 'Braden Scale', 'category': 'skin'},
        {'name': 'Morse Fall Scale', 'category': 'fall_risk'}
    ]
    
    for _, hosp in hospitalizations_df.iterrows():
        admission_time = pd.to_datetime(hosp['admission_dttm']).replace(tzinfo=None)
        discharge_time = pd.to_datetime(hosp['discharge_dttm']).replace(tzinfo=None)
        
        # Daily SOFA scores
        current_date = admission_time.date()
        end_date = discharge_time.date()
        
        while current_date <= end_date:
            assessment_time = datetime.combine(current_date, datetime.min.time()) + timedelta(hours=8)
            
            if admission_time <= assessment_time <= discharge_time:
                # SOFA Score (always done)
                sofa_total = generate_sofa_score()
                
                assessments.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'assessment_id': f'PA{assessment_id:06d}',
                    'assessment_dttm': assessment_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'assessment_name': 'SOFA Score',
                    'assessment_category': 'severity_score',
                    'assessment_value': str(sofa_total),
                    'assessment_units': 'points'
                })
                assessment_id += 1
                
                # GCS (always done)
                gcs = np.random.choice([15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3], 
                                     p=[0.4, 0.15, 0.1, 0.08, 0.07, 0.05, 0.05, 0.04, 0.03, 0.02, 0.005, 0.003, 0.002])
                
                assessments.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'assessment_id': f'PA{assessment_id:06d}',
                    'assessment_dttm': assessment_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'assessment_name': 'Glasgow Coma Scale',
                    'assessment_category': 'neurological',
                    'assessment_value': str(gcs),
                    'assessment_units': 'points'
                })
                assessment_id += 1
                
                # RASS (Richmond Agitation-Sedation Scale)
                rass = np.random.choice([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4],
                                      p=[0.05, 0.05, 0.1, 0.15, 0.2, 0.25, 0.1, 0.05, 0.03, 0.02])
                
                assessments.append({
                    'hospitalization_id': hosp['hospitalization_id'],
                    'assessment_id': f'PA{assessment_id:06d}',
                    'assessment_dttm': assessment_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                    'assessment_name': 'Richmond Agitation-Sedation Scale',
                    'assessment_category': 'sedation',
                    'assessment_value': str(rass),
                    'assessment_units': 'score'
                })
                assessment_id += 1
                
                # CAM-ICU (50% of patients)
                if np.random.random() < 0.5:
                    cam_icu = np.random.choice(['Positive', 'Negative'], p=[0.3, 0.7])
                    
                    assessments.append({
                        'hospitalization_id': hosp['hospitalization_id'],
                        'assessment_id': f'PA{assessment_id:06d}',
                        'assessment_dttm': assessment_time.strftime('%Y-%m-%d %H:%M:%S+00:00'),
                        'assessment_name': 'Confusion Assessment Method for ICU',
                        'assessment_category': 'delirium',
                        'assessment_value': cam_icu,
                        'assessment_units': None
                    })
                    assessment_id += 1
            
            current_date += timedelta(days=1)
    
    return pd.DataFrame(assessments)

# Continue with other table generation functions...
# (The rest of the functions would follow similar patterns, adapted for realistic statistics)

def save_clif_tables(output_dir):
    """Generate and save all CLIF tables with realistic statistics"""
    print("Generating Realistic CLIF Dataset...")
    print("=" * 50)
    
    # Generate core tables
    print("Generating patient demographics...")
    patients_df = generate_patients()
    print(f"✓ Generated {len(patients_df)} patients")
    print(f"  - Female: {(patients_df['sex_name'] == 'Female').mean():.1%}")
    print(f"  - White: {(patients_df['race_name'] == 'White').mean():.1%}")
    print(f"  - Hispanic: {(patients_df['ethnicity_name'] == 'Hispanic or Latino').mean():.1%}")
    
    print("\nGenerating hospitalizations...")
    hospitalizations_df = generate_hospitalizations(patients_df)
    print(f"✓ Generated {len(hospitalizations_df)} hospitalizations")
    
    print("\nGenerating ADT events...")
    adt_df = generate_adt(hospitalizations_df)
    print(f"✓ Generated {len(adt_df)} ADT events")
    
    print("\nGenerating respiratory support...")
    respiratory_df = generate_respiratory_support(hospitalizations_df)
    print(f"✓ Generated {len(respiratory_df)} respiratory support records")
    
    print("\nGenerating medication orders...")
    med_orders_df = generate_medication_orders(hospitalizations_df)
    print(f"✓ Generated {len(med_orders_df)} medication orders")
    
    print("\nGenerating vital signs...")
    vitals_df = generate_vitals(hospitalizations_df)
    print(f"✓ Generated {len(vitals_df)} vital signs")
    
    print("\nGenerating laboratory results...")
    labs_df = generate_labs(hospitalizations_df)
    print(f"✓ Generated {len(labs_df)} lab results")
    
    print("\nGenerating patient assessments...")
    assessments_df = generate_patient_assessments(hospitalizations_df)
    print(f"✓ Generated {len(assessments_df)} assessments")
    
    # Save all tables
    print("\nSaving all tables...")
    patients_df.to_csv(output_dir / 'patient.csv', index=False)
    hospitalizations_df.to_csv(output_dir / 'hospitalization.csv', index=False)
    adt_df.to_csv(output_dir / 'adt.csv', index=False)
    respiratory_df.to_csv(output_dir / 'respiratory_support.csv', index=False)
    med_orders_df.to_csv(output_dir / 'medication_orders.csv', index=False)
    vitals_df.to_csv(output_dir / 'vitals.csv', index=False)
    labs_df.to_csv(output_dir / 'labs.csv', index=False)
    assessments_df.to_csv(output_dir / 'patient_assessments.csv', index=False)
    
    # Calculate final statistics
    mortality_rate = patients_df['death_dttm'].notna().mean()
    
    # Create summary
    summary = {
        'dataset_info': {
            'n_patients': len(patients_df),
            'n_hospitalizations': len(hospitalizations_df),
            'mortality_rate': round(mortality_rate, 3),
            'female_rate': round((patients_df['sex_name'] == 'Female').mean(), 3),
            'white_rate': round((patients_df['race_name'] == 'White').mean(), 3),
            'hispanic_rate': round((patients_df['ethnicity_name'] == 'Hispanic or Latino').mean(), 3),
            'median_age': int(patients_df.apply(lambda x: (BASE_DATE - pd.to_datetime(x['birth_date'])).days / 365.25, axis=1).median())
        },
        'table_counts': {
            'patient': len(patients_df),
            'hospitalization': len(hospitalizations_df),
            'adt': len(adt_df),
            'respiratory_support': len(respiratory_df),
            'medication_orders': len(med_orders_df),
            'vitals': len(vitals_df),
            'labs': len(labs_df),
            'patient_assessments': len(assessments_df)
        }
    }
    
    with open(output_dir / 'dataset_summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print("\n✅ Realistic CLIF dataset generated successfully!")
    print(f"📁 Output directory: {output_dir}")
    print("\nFinal Statistics:")
    print(f"  - Mortality rate: {mortality_rate:.1%} (target: {MORTALITY_RATE:.1%})")
    print(f"  - Female rate: {(patients_df['sex_name'] == 'Female').mean():.1%} (target: {FEMALE_RATE:.1%})")
    print(f"  - White rate: {(patients_df['race_name'] == 'White').mean():.1%} (target: {WHITE_RATE:.1%})")
    print(f"  - Hispanic rate: {(patients_df['ethnicity_name'] == 'Hispanic or Latino').mean():.1%} (target: {HISPANIC_RATE:.1%})")

if __name__ == "__main__":
    save_clif_tables(output_dir)