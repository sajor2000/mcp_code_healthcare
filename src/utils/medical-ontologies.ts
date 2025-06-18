/**
 * Medical Ontologies and Code Systems
 * Comprehensive support for ICD-10, RxNorm, LOINC, and SNOMED CT
 * 
 * Citations:
 * 
 * ICD-10-CM:
 * World Health Organization. International Statistical Classification of Diseases 
 * and Related Health Problems 10th Revision (ICD-10). WHO; 2019.
 * License: Public Domain
 * 
 * RxNorm:
 * Nelson SJ, Zeng K, Kilbourne J, et al. Normalized names for clinical drugs: 
 * RxNorm at 6 years. J Am Med Inform Assoc. 2011;18(4):441-8.
 * Source: U.S. National Library of Medicine
 * License: Public Domain (U.S. Government Work)
 * 
 * LOINC:
 * McDonald CJ, Huff SM, Suico JG, et al. LOINC, a universal standard for 
 * identifying laboratory observations: a 5-year update. Clin Chem. 2003;49(4):624-33.
 * Source: Regenstrief Institute
 * License: LOINC License (free for use)
 * 
 * SNOMED CT:
 * SNOMED International. SNOMED CT. SNOMED International; 2023.
 * License: SNOMED CT Affiliate License
 * Note: Implementation uses publicly available subset for demonstration
 */

// ICD-10 Common Codes for Healthcare Research
export const ICD10_CODES = {
  // Infectious Diseases
  sepsis: {
    A40: 'Streptococcal sepsis',
    'A40.0': 'Sepsis due to streptococcus, group A',
    'A40.1': 'Sepsis due to streptococcus, group B',
    'A40.3': 'Sepsis due to Streptococcus pneumoniae',
    'A40.8': 'Other streptococcal sepsis',
    'A40.9': 'Streptococcal sepsis, unspecified',
    A41: 'Other sepsis',
    'A41.0': 'Sepsis due to Staphylococcus aureus',
    'A41.01': 'Sepsis due to Methicillin susceptible Staphylococcus aureus',
    'A41.02': 'Sepsis due to Methicillin resistant Staphylococcus aureus',
    'A41.1': 'Sepsis due to other specified staphylococcus',
    'A41.2': 'Sepsis due to unspecified staphylococcus',
    'A41.3': 'Sepsis due to Hemophilus influenzae',
    'A41.4': 'Sepsis due to anaerobes',
    'A41.5': 'Sepsis due to other Gram-negative organisms',
    'A41.50': 'Gram-negative sepsis, unspecified',
    'A41.51': 'Sepsis due to Escherichia coli [E. coli]',
    'A41.52': 'Sepsis due to Pseudomonas',
    'A41.53': 'Sepsis due to Serratia',
    'A41.59': 'Other Gram-negative sepsis',
    'A41.8': 'Other specified sepsis',
    'A41.81': 'Sepsis due to Enterococcus',
    'A41.89': 'Other specified sepsis',
    'A41.9': 'Sepsis, unspecified organism',
    R65: 'Symptoms and signs specifically associated with systemic inflammation and infection',
    'R65.1': 'Systemic inflammatory response syndrome (SIRS) of infectious origin',
    'R65.10': 'SIRS of infectious origin without acute organ dysfunction',
    'R65.11': 'SIRS of infectious origin with acute organ dysfunction',
    'R65.2': 'Severe sepsis',
    'R65.20': 'Severe sepsis without septic shock',
    'R65.21': 'Severe sepsis with septic shock'
  },
  
  pneumonia: {
    J12: 'Viral pneumonia, not elsewhere classified',
    'J12.0': 'Adenoviral pneumonia',
    'J12.1': 'Respiratory syncytial virus pneumonia',
    'J12.2': 'Parainfluenza virus pneumonia',
    'J12.8': 'Other viral pneumonia',
    'J12.81': 'Pneumonia due to SARS-associated coronavirus',
    'J12.82': 'Pneumonia due to coronavirus disease 2019',
    'J12.89': 'Other viral pneumonia',
    'J12.9': 'Viral pneumonia, unspecified',
    J13: 'Pneumonia due to Streptococcus pneumoniae',
    J14: 'Pneumonia due to Hemophilus influenzae',
    J15: 'Bacterial pneumonia, not elsewhere classified',
    'J15.0': 'Pneumonia due to Klebsiella pneumoniae',
    'J15.1': 'Pneumonia due to Pseudomonas',
    'J15.2': 'Pneumonia due to staphylococcus',
    'J15.20': 'Pneumonia due to staphylococcus, unspecified',
    'J15.21': 'Pneumonia due to Staphylococcus aureus',
    'J15.211': 'Pneumonia due to Methicillin susceptible Staphylococcus aureus',
    'J15.212': 'Pneumonia due to Methicillin resistant Staphylococcus aureus',
    'J15.29': 'Pneumonia due to other staphylococcus',
    'J15.3': 'Pneumonia due to streptococcus, group B',
    'J15.4': 'Pneumonia due to other streptococci',
    'J15.5': 'Pneumonia due to Escherichia coli',
    'J15.6': 'Pneumonia due to other Gram-negative bacteria',
    'J15.7': 'Pneumonia due to Mycoplasma pneumoniae',
    'J15.8': 'Pneumonia due to other specified bacteria',
    'J15.9': 'Unspecified bacterial pneumonia',
    J16: 'Pneumonia due to other infectious organisms',
    J17: 'Pneumonia in diseases classified elsewhere',
    J18: 'Pneumonia, unspecified organism',
    'J18.0': 'Bronchopneumonia, unspecified organism',
    'J18.1': 'Lobar pneumonia, unspecified organism',
    'J18.2': 'Hypostatic pneumonia, unspecified organism',
    'J18.8': 'Other pneumonia, unspecified organism',
    'J18.9': 'Pneumonia, unspecified organism'
  },
  
  heart_failure: {
    I50: 'Heart failure',
    'I50.1': 'Left ventricular failure, unspecified',
    'I50.2': 'Systolic (congestive) heart failure',
    'I50.20': 'Unspecified systolic (congestive) heart failure',
    'I50.21': 'Acute systolic (congestive) heart failure',
    'I50.22': 'Chronic systolic (congestive) heart failure',
    'I50.23': 'Acute on chronic systolic (congestive) heart failure',
    'I50.3': 'Diastolic (congestive) heart failure',
    'I50.30': 'Unspecified diastolic (congestive) heart failure',
    'I50.31': 'Acute diastolic (congestive) heart failure',
    'I50.32': 'Chronic diastolic (congestive) heart failure',
    'I50.33': 'Acute on chronic diastolic (congestive) heart failure',
    'I50.4': 'Combined systolic (congestive) and diastolic (congestive) heart failure',
    'I50.40': 'Unspecified combined systolic and diastolic heart failure',
    'I50.41': 'Acute combined systolic and diastolic heart failure',
    'I50.42': 'Chronic combined systolic and diastolic heart failure',
    'I50.43': 'Acute on chronic combined systolic and diastolic heart failure',
    'I50.8': 'Other heart failure',
    'I50.81': 'Right heart failure',
    'I50.810': 'Right heart failure, unspecified',
    'I50.811': 'Acute right heart failure',
    'I50.812': 'Chronic right heart failure',
    'I50.813': 'Acute on chronic right heart failure',
    'I50.814': 'Right heart failure due to left heart failure',
    'I50.82': 'Biventricular heart failure',
    'I50.83': 'High output heart failure',
    'I50.84': 'End stage heart failure',
    'I50.89': 'Other heart failure',
    'I50.9': 'Heart failure, unspecified'
  },
  
  diabetes: {
    E10: 'Type 1 diabetes mellitus',
    'E10.1': 'Type 1 diabetes mellitus with ketoacidosis',
    'E10.2': 'Type 1 diabetes mellitus with kidney complications',
    'E10.3': 'Type 1 diabetes mellitus with ophthalmic complications',
    'E10.4': 'Type 1 diabetes mellitus with neurological complications',
    'E10.5': 'Type 1 diabetes mellitus with circulatory complications',
    'E10.6': 'Type 1 diabetes mellitus with other specified complications',
    'E10.8': 'Type 1 diabetes mellitus with unspecified complications',
    'E10.9': 'Type 1 diabetes mellitus without complications',
    E11: 'Type 2 diabetes mellitus',
    'E11.0': 'Type 2 diabetes mellitus with hyperosmolarity',
    'E11.1': 'Type 2 diabetes mellitus with ketoacidosis',
    'E11.2': 'Type 2 diabetes mellitus with kidney complications',
    'E11.3': 'Type 2 diabetes mellitus with ophthalmic complications',
    'E11.4': 'Type 2 diabetes mellitus with neurological complications',
    'E11.5': 'Type 2 diabetes mellitus with circulatory complications',
    'E11.6': 'Type 2 diabetes mellitus with other specified complications',
    'E11.8': 'Type 2 diabetes mellitus with unspecified complications',
    'E11.9': 'Type 2 diabetes mellitus without complications'
  },
  
  acute_kidney_injury: {
    N17: 'Acute kidney failure',
    'N17.0': 'Acute kidney failure with tubular necrosis',
    'N17.1': 'Acute kidney failure with acute cortical necrosis',
    'N17.2': 'Acute kidney failure with medullary necrosis',
    'N17.8': 'Other acute kidney failure',
    'N17.9': 'Acute kidney failure, unspecified'
  },
  
  respiratory_failure: {
    J96: 'Respiratory failure, not elsewhere classified',
    'J96.0': 'Acute respiratory failure',
    'J96.00': 'Acute respiratory failure, unspecified whether with hypoxia or hypercapnia',
    'J96.01': 'Acute respiratory failure with hypoxia',
    'J96.02': 'Acute respiratory failure with hypercapnia',
    'J96.1': 'Chronic respiratory failure',
    'J96.10': 'Chronic respiratory failure, unspecified whether with hypoxia or hypercapnia',
    'J96.11': 'Chronic respiratory failure with hypoxia',
    'J96.12': 'Chronic respiratory failure with hypercapnia',
    'J96.2': 'Acute and chronic respiratory failure',
    'J96.20': 'Acute and chronic respiratory failure, unspecified whether with hypoxia or hypercapnia',
    'J96.21': 'Acute and chronic respiratory failure with hypoxia',
    'J96.22': 'Acute and chronic respiratory failure with hypercapnia',
    'J96.9': 'Respiratory failure, unspecified',
    'J96.90': 'Respiratory failure, unspecified, unspecified whether with hypoxia or hypercapnia',
    'J96.91': 'Respiratory failure, unspecified with hypoxia',
    'J96.92': 'Respiratory failure, unspecified with hypercapnia'
  }
};

// RxNorm codes for common medications
export const RXNORM_CODES = {
  antibiotics: {
    vancomycin: {
      '11124': 'Vancomycin',
      '1807628': 'Vancomycin 1 GM Injection',
      '1807632': 'Vancomycin 500 MG Injection',
      '1807636': 'Vancomycin 750 MG Injection',
      '1719286': 'Vancomycin 125 MG Oral Capsule',
      '1719290': 'Vancomycin 250 MG Oral Capsule'
    },
    meropenem: {
      '29561': 'Meropenem',
      '1807886': 'Meropenem 1 GM Injection',
      '1807890': 'Meropenem 500 MG Injection'
    },
    piperacillin_tazobactam: {
      '203134': 'Piperacillin / Tazobactam',
      '1659149': 'Piperacillin 2000 MG / Tazobactam 250 MG Injection',
      '1659151': 'Piperacillin 3000 MG / Tazobactam 375 MG Injection',
      '1659153': 'Piperacillin 4000 MG / Tazobactam 500 MG Injection'
    },
    ceftriaxone: {
      '2193': 'Ceftriaxone',
      '1665515': 'Ceftriaxone 1 GM Injection',
      '1665519': 'Ceftriaxone 2 GM Injection',
      '1665523': 'Ceftriaxone 250 MG Injection',
      '1665527': 'Ceftriaxone 500 MG Injection'
    },
    azithromycin: {
      '18631': 'Azithromycin',
      '141962': 'Azithromycin 250 MG Oral Tablet',
      '141963': 'Azithromycin 500 MG Oral Tablet',
      '248656': 'Azithromycin 100 MG/5ML Oral Suspension',
      '248657': 'Azithromycin 200 MG/5ML Oral Suspension'
    },
    levofloxacin: {
      '82122': 'Levofloxacin',
      '197516': 'Levofloxacin 250 MG Oral Tablet',
      '197517': 'Levofloxacin 500 MG Oral Tablet',
      '197518': 'Levofloxacin 750 MG Oral Tablet',
      '847366': 'Levofloxacin 25 MG/ML Injectable Solution'
    }
  },
  
  vasopressors: {
    norepinephrine: {
      '7512': 'Norepinephrine',
      '1745276': 'Norepinephrine 0.001 MG/ML Injectable Solution',
      '1745280': 'Norepinephrine 1 MG/ML Injectable Solution'
    },
    epinephrine: {
      '3992': 'Epinephrine',
      '1870230': 'Epinephrine 0.1 MG/ML Injectable Solution',
      '1870234': 'Epinephrine 1 MG/ML Injectable Solution'
    },
    dopamine: {
      '3616': 'Dopamine',
      '1114888': 'Dopamine 40 MG/ML Injectable Solution',
      '1114892': 'Dopamine 80 MG/ML Injectable Solution'
    },
    vasopressin: {
      '11149': 'Vasopressin',
      '1654851': 'Vasopressin 20 UNT/ML Injectable Solution'
    },
    phenylephrine: {
      '8163': 'Phenylephrine',
      '1807513': 'Phenylephrine 10 MG/ML Injectable Solution'
    }
  },
  
  sedatives: {
    propofol: {
      '8782': 'Propofol',
      '1807548': 'Propofol 10 MG/ML Injectable Emulsion'
    },
    midazolam: {
      '6960': 'Midazolam',
      '1807565': 'Midazolam 1 MG/ML Injectable Solution',
      '1807569': 'Midazolam 5 MG/ML Injectable Solution'
    },
    fentanyl: {
      '4337': 'Fentanyl',
      '1115573': 'Fentanyl 0.05 MG/ML Injectable Solution',
      '1807474': 'Fentanyl 0.1 MG/2ML Transdermal System'
    },
    dexmedetomidine: {
      '42348': 'Dexmedetomidine',
      '1807452': 'Dexmedetomidine 0.004 MG/ML Injectable Solution'
    }
  },
  
  cardiac_medications: {
    furosemide: {
      '4603': 'Furosemide',
      '197417': 'Furosemide 20 MG Oral Tablet',
      '197418': 'Furosemide 40 MG Oral Tablet',
      '197419': 'Furosemide 80 MG Oral Tablet',
      '1719751': 'Furosemide 10 MG/ML Injectable Solution'
    },
    metoprolol: {
      '6918': 'Metoprolol',
      '866426': 'Metoprolol Tartrate 25 MG Oral Tablet',
      '866427': 'Metoprolol Tartrate 50 MG Oral Tablet',
      '866428': 'Metoprolol Tartrate 100 MG Oral Tablet',
      '866508': 'Metoprolol Succinate 25 MG Extended Release Oral Tablet',
      '866511': 'Metoprolol Succinate 50 MG Extended Release Oral Tablet'
    },
    lisinopril: {
      '29046': 'Lisinopril',
      '197884': 'Lisinopril 2.5 MG Oral Tablet',
      '197885': 'Lisinopril 5 MG Oral Tablet',
      '197886': 'Lisinopril 10 MG Oral Tablet',
      '197887': 'Lisinopril 20 MG Oral Tablet',
      '197888': 'Lisinopril 40 MG Oral Tablet'
    },
    spironolactone: {
      '9997': 'Spironolactone',
      '313096': 'Spironolactone 25 MG Oral Tablet',
      '313097': 'Spironolactone 50 MG Oral Tablet',
      '313098': 'Spironolactone 100 MG Oral Tablet'
    },
    carvedilol: {
      '20352': 'Carvedilol',
      '200031': 'Carvedilol 3.125 MG Oral Tablet',
      '200032': 'Carvedilol 6.25 MG Oral Tablet',
      '200033': 'Carvedilol 12.5 MG Oral Tablet',
      '200034': 'Carvedilol 25 MG Oral Tablet'
    }
  },
  
  anticoagulants: {
    heparin: {
      '5224': 'Heparin',
      '1361029': 'Heparin Sodium 1000 UNT/ML Injectable Solution',
      '1361033': 'Heparin Sodium 5000 UNT/ML Injectable Solution',
      '1361037': 'Heparin Sodium 10000 UNT/ML Injectable Solution'
    },
    enoxaparin: {
      '67108': 'Enoxaparin',
      '1804730': 'Enoxaparin Sodium 30 MG/0.3ML Injectable Solution',
      '1804734': 'Enoxaparin Sodium 40 MG/0.4ML Injectable Solution',
      '1804738': 'Enoxaparin Sodium 60 MG/0.6ML Injectable Solution',
      '1804742': 'Enoxaparin Sodium 80 MG/0.8ML Injectable Solution'
    },
    warfarin: {
      '11289': 'Warfarin',
      '855288': 'Warfarin Sodium 1 MG Oral Tablet',
      '855290': 'Warfarin Sodium 2 MG Oral Tablet',
      '855292': 'Warfarin Sodium 2.5 MG Oral Tablet',
      '855294': 'Warfarin Sodium 3 MG Oral Tablet',
      '855296': 'Warfarin Sodium 4 MG Oral Tablet',
      '855298': 'Warfarin Sodium 5 MG Oral Tablet',
      '855300': 'Warfarin Sodium 7.5 MG Oral Tablet',
      '855302': 'Warfarin Sodium 10 MG Oral Tablet'
    }
  }
};

// LOINC codes for common laboratory tests
export const LOINC_CODES = {
  chemistry: {
    glucose: {
      '2345-7': 'Glucose [Mass/volume] in Serum or Plasma',
      '2339-0': 'Glucose [Mass/volume] in Blood',
      '2340-8': 'Glucose [Mass/volume] in Blood by Automated test strip',
      '41653-7': 'Glucose [Mass/volume] in Capillary blood by Glucometer'
    },
    creatinine: {
      '2160-0': 'Creatinine [Mass/volume] in Serum or Plasma',
      '38483-4': 'Creatinine [Mass/volume] in Blood',
      '14682-9': 'Creatinine [Moles/volume] in Serum or Plasma'
    },
    bun: {
      '3094-0': 'Urea nitrogen [Mass/volume] in Serum or Plasma',
      '6299-2': 'Urea nitrogen [Mass/volume] in Blood'
    },
    sodium: {
      '2951-2': 'Sodium [Moles/volume] in Serum or Plasma',
      '2947-0': 'Sodium [Moles/volume] in Blood'
    },
    potassium: {
      '2823-3': 'Potassium [Moles/volume] in Serum or Plasma',
      '6298-4': 'Potassium [Moles/volume] in Blood'
    },
    chloride: {
      '2075-0': 'Chloride [Moles/volume] in Serum or Plasma',
      '2069-3': 'Chloride [Moles/volume] in Blood'
    },
    bicarbonate: {
      '2028-9': 'Carbon dioxide, total [Moles/volume] in Serum or Plasma',
      '1959-6': 'Bicarbonate [Moles/volume] in Blood'
    },
    calcium: {
      '17861-6': 'Calcium [Mass/volume] in Serum or Plasma',
      '2000-8': 'Calcium.ionized [Moles/volume] in Serum or Plasma'
    },
    magnesium: {
      '2601-3': 'Magnesium [Moles/volume] in Serum or Plasma',
      '2593-2': 'Magnesium [Mass/volume] in Blood'
    },
    phosphate: {
      '2777-1': 'Phosphate [Mass/volume] in Serum or Plasma',
      '14879-1': 'Phosphate [Moles/volume] in Serum or Plasma'
    }
  },
  
  liver_function: {
    alt: {
      '1742-6': 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
      '1743-4': 'Alanine aminotransferase [Enzymatic activity/volume] in Blood'
    },
    ast: {
      '1920-8': 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma',
      '30239-8': 'Aspartate aminotransferase [Enzymatic activity/volume] in Blood'
    },
    alkaline_phosphatase: {
      '6768-6': 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma',
      '1777-2': 'Alkaline phosphatase [Enzymatic activity/volume] in Blood'
    },
    bilirubin_total: {
      '1975-2': 'Bilirubin.total [Mass/volume] in Serum or Plasma',
      '42719-5': 'Bilirubin.total [Mass/volume] in Blood'
    },
    bilirubin_direct: {
      '1968-7': 'Bilirubin.direct [Mass/volume] in Serum or Plasma',
      '14629-0': 'Bilirubin.direct [Mass/volume] in Blood'
    },
    albumin: {
      '1751-7': 'Albumin [Mass/volume] in Serum or Plasma',
      '54347-0': 'Albumin [Mass/volume] in Blood'
    },
    protein_total: {
      '2885-2': 'Protein [Mass/volume] in Serum or Plasma',
      '11274-1': 'Protein [Mass/volume] in Blood'
    }
  },
  
  hematology: {
    hemoglobin: {
      '718-7': 'Hemoglobin [Mass/volume] in Blood',
      '30313-1': 'Hemoglobin [Mass/volume] in Arterial blood',
      '30350-3': 'Hemoglobin [Mass/volume] in Venous blood'
    },
    hematocrit: {
      '4544-3': 'Hematocrit [Volume Fraction] of Blood by Automated count',
      '32354-3': 'Hematocrit [Volume Fraction] of Blood',
      '41654-5': 'Hematocrit [Volume Fraction] of Blood by Estimated'
    },
    wbc: {
      '6690-2': 'Leukocytes [#/volume] in Blood by Automated count',
      '804-5': 'Leukocytes [#/volume] in Blood by Manual count',
      '26464-8': 'Leukocytes [#/volume] in Blood'
    },
    platelet: {
      '777-3': 'Platelets [#/volume] in Blood by Automated count',
      '26515-7': 'Platelets [#/volume] in Blood',
      '778-1': 'Platelets [#/volume] in Blood by Manual count'
    },
    neutrophils: {
      '26499-4': 'Neutrophils [#/volume] in Blood',
      '751-8': 'Neutrophils [#/volume] in Blood by Automated count',
      '30450-1': 'Neutrophils [#/volume] in Blood by Manual count'
    },
    lymphocytes: {
      '26474-7': 'Lymphocytes [#/volume] in Blood',
      '731-0': 'Lymphocytes [#/volume] in Blood by Automated count',
      '30364-4': 'Lymphocytes [#/volume] in Blood by Manual count'
    }
  },
  
  cardiac_markers: {
    troponin_i: {
      '10839-9': 'Troponin I.cardiac [Mass/volume] in Serum or Plasma',
      '42757-5': 'Troponin I.cardiac [Mass/volume] in Blood',
      '49563-0': 'Troponin I.cardiac [Mass/volume] in Serum or Plasma by High sensitivity method'
    },
    troponin_t: {
      '6598-7': 'Troponin T.cardiac [Mass/volume] in Serum or Plasma',
      '48425-3': 'Troponin T.cardiac [Mass/volume] in Blood',
      '67151-1': 'Troponin T.cardiac [Mass/volume] in Serum or Plasma by High sensitivity method'
    },
    bnp: {
      '30934-4': 'Natriuretic peptide.B [Mass/volume] in Serum or Plasma',
      '33762-6': 'Natriuretic peptide.B [Mass/volume] in Blood'
    },
    nt_probnp: {
      '33763-4': 'Natriuretic peptide.B prohormone N-Terminal [Mass/volume] in Serum or Plasma',
      '71425-3': 'Natriuretic peptide.B prohormone N-Terminal [Mass/volume] in Blood'
    },
    ck_mb: {
      '13969-1': 'Creatine kinase.MB [Mass/volume] in Serum or Plasma',
      '49136-5': 'Creatine kinase.MB [Mass/volume] in Blood'
    }
  },
  
  coagulation: {
    pt: {
      '5902-2': 'Prothrombin time (PT)',
      '6301-6': 'INR in Blood by Coagulation assay',
      '5964-2': 'Prothrombin time (PT) in Blood by Coagulation assay'
    },
    ptt: {
      '14979-9': 'aPTT in Blood by Coagulation assay',
      '3173-2': 'aPTT in Platelet poor plasma by Coagulation assay'
    },
    fibrinogen: {
      '3255-7': 'Fibrinogen [Mass/volume] in Platelet poor plasma by Coagulation assay',
      '30902-3': 'Fibrinogen [Mass/volume] in Blood by Coagulation assay'
    },
    d_dimer: {
      '48065-7': 'Fibrin D-dimer FEU [Mass/volume] in Platelet poor plasma',
      '48066-5': 'Fibrin D-dimer DDU [Mass/volume] in Platelet poor plasma',
      '30240-6': 'Fibrin D-dimer [Mass/volume] in Platelet poor plasma'
    }
  },
  
  blood_gas: {
    ph: {
      '2744-1': 'pH of Blood',
      '2745-9': 'pH of Arterial blood',
      '2746-6': 'pH of Venous blood'
    },
    pco2: {
      '2019-8': 'Carbon dioxide [Partial pressure] in Arterial blood',
      '2021-4': 'Carbon dioxide [Partial pressure] in Venous blood',
      '2020-6': 'Carbon dioxide [Partial pressure] in Blood'
    },
    po2: {
      '2703-7': 'Oxygen [Partial pressure] in Arterial blood',
      '2705-2': 'Oxygen [Partial pressure] in Venous blood',
      '2704-5': 'Oxygen [Partial pressure] in Blood'
    },
    lactate: {
      '2518-9': 'Lactate [Moles/volume] in Blood',
      '2519-7': 'Lactate [Moles/volume] in Arterial blood',
      '2520-5': 'Lactate [Moles/volume] in Venous blood',
      '32693-4': 'Lactate [Moles/volume] in Capillary blood'
    },
    base_excess: {
      '1925-7': 'Base excess in Arterial blood by calculation',
      '1927-3': 'Base excess in Venous blood by calculation',
      '1926-5': 'Base excess in Blood by calculation'
    }
  },
  
  infection_markers: {
    procalcitonin: {
      '33959-8': 'Procalcitonin [Mass/volume] in Serum or Plasma',
      '75241-0': 'Procalcitonin [Mass/volume] in Blood'
    },
    crp: {
      '1988-5': 'C reactive protein [Mass/volume] in Serum or Plasma',
      '30522-7': 'C reactive protein [Mass/volume] in Blood by High sensitivity method',
      '71426-1': 'C reactive protein [Mass/volume] in Blood'
    },
    esr: {
      '30341-2': 'Erythrocyte sedimentation rate',
      '4537-7': 'Erythrocyte sedimentation rate by Westergren method',
      '18184-2': 'Erythrocyte sedimentation rate by Wintrobe method'
    }
  },
  
  urine: {
    urinalysis: {
      '5811-5': 'Specific gravity of Urine by Test strip',
      '2756-5': 'pH of Urine by Test strip',
      '5792-7': 'Glucose [Mass/volume] in Urine by Test strip',
      '5797-6': 'Ketones [Mass/volume] in Urine by Test strip',
      '5794-3': 'Hemoglobin [Mass/volume] in Urine by Test strip',
      '5802-4': 'Nitrite [Presence] in Urine by Test strip',
      '5799-2': 'Leukocyte esterase [Presence] in Urine by Test strip',
      '5804-0': 'Protein [Mass/volume] in Urine by Test strip'
    },
    urine_culture: {
      '630-4': 'Bacteria identified in Urine by Culture',
      '6463-4': 'Bacteria [#/volume] in Urine by Automated count'
    }
  }
};

// SNOMED CT common concepts
export const SNOMED_CODES = {
  conditions: {
    sepsis: {
      '91302008': 'Sepsis',
      '10001005': 'Bacterial sepsis',
      '40819004': 'Gram-negative sepsis',
      '404204003': 'Gram-positive sepsis',
      '76571007': 'Septic shock',
      '238147009': 'Sepsis without organ dysfunction',
      '238148004': 'Sepsis with organ dysfunction',
      '2816009': 'Severe sepsis',
      '434771000124107': 'Sepsis due to Streptococcus',
      '448526003': 'Sepsis due to Staphylococcus',
      '448530000': 'Sepsis due to Escherichia coli',
      '448986005': 'Sepsis due to Pseudomonas'
    },
    pneumonia: {
      '233604007': 'Pneumonia',
      '62994001': 'Community acquired pneumonia',
      '129458007': 'Hospital acquired pneumonia',
      '429671000124103': 'Ventilator associated pneumonia',
      '233607000': 'Aspiration pneumonia',
      '312342009': 'Bacterial pneumonia',
      '233605008': 'Viral pneumonia',
      '441590008': 'Acute pneumonia',
      '278516003': 'Lobar pneumonia',
      '255210000': 'Bronchopneumonia',
      '882784691000119100': 'Pneumonia caused by severe acute respiratory syndrome coronavirus 2'
    },
    heart_failure: {
      '84114007': 'Heart failure',
      '42343007': 'Congestive heart failure',
      '417996009': 'Systolic heart failure',
      '418304008': 'Diastolic heart failure',
      '446221000': 'Heart failure with reduced ejection fraction',
      '446222007': 'Heart failure with preserved ejection fraction',
      '85232009': 'Left heart failure',
      '367363000': 'Right heart failure',
      '10335000': 'Chronic heart failure',
      '56675007': 'Acute heart failure',
      '195111005': 'Acute on chronic heart failure',
      '15629541000119106': 'Congestive heart failure due to left ventricular systolic dysfunction'
    },
    ards: {
      '67782005': 'Acute respiratory distress syndrome',
      '700250006': 'Acute lung injury',
      '233627003': 'Non-cardiogenic pulmonary edema'
    }
  },
  
  procedures: {
    mechanical_ventilation: {
      '40617009': 'Artificial respiration',
      '243147009': 'Controlled ventilation',
      '59427005': 'Synchronized intermittent mandatory ventilation',
      '74596007': 'Positive end expiratory pressure ventilation',
      '243144002': 'Patient triggered ventilation',
      '47545007': 'Continuous positive airway pressure ventilation',
      '428311008': 'Non-invasive ventilation',
      '4764004': 'Jet ventilation',
      '243142003': 'Dual controlled ventilation',
      '304577007': 'Adjustment of ventilator settings'
    },
    dialysis: {
      '108241001': 'Dialysis procedure',
      '302497006': 'Hemodialysis',
      '71192002': 'Peritoneal dialysis',
      '33461007': 'Continuous renal replacement therapy',
      '427053002': 'Continuous venovenous hemofiltration',
      '708932005': 'Continuous venovenous hemodialysis',
      '439278008': 'Continuous venovenous hemodiafiltration',
      '233586001': 'Slow continuous ultrafiltration'
    },
    intubation: {
      '112798008': 'Endotracheal intubation',
      '182840001': 'Nasotracheal intubation',
      '182841002': 'Orotracheal intubation',
      '182842009': 'Rapid sequence intubation',
      '304341002': 'Awake intubation',
      '429161000124103': 'Emergency intubation'
    }
  },
  
  medications: {
    antibiotics: {
      '387321007': 'Vancomycin',
      '387540000': 'Meropenem',
      '346628008': 'Piperacillin and tazobactam',
      '387467008': 'Ceftriaxone',
      '387531004': 'Azithromycin',
      '387552005': 'Levofloxacin',
      '387174006': 'Ciprofloxacin',
      '387325003': 'Metronidazole',
      '387170003': 'Ampicillin',
      '387088002': 'Cefepime'
    },
    vasopressors: {
      '387480006': 'Norepinephrine',
      '387362001': 'Epinephrine',
      '387145002': 'Dopamine',
      '421228002': 'Vasopressin',
      '387463003': 'Phenylephrine',
      '387144003': 'Dobutamine'
    },
    sedatives: {
      '387423006': 'Propofol',
      '387383007': 'Midazolam',
      '387568001': 'Fentanyl',
      '386837002': 'Dexmedetomidine',
      '387286002': 'Lorazepam',
      '387249003': 'Morphine'
    }
  },
  
  observations: {
    vital_signs: {
      '86290005': 'Respiratory rate',
      '364075005': 'Heart rate',
      '271649006': 'Systolic blood pressure',
      '271650006': 'Diastolic blood pressure',
      '386725007': 'Body temperature',
      '431314004': 'Peripheral oxygen saturation',
      '251076008': 'Non-invasive blood pressure',
      '75367002': 'Blood pressure'
    },
    assessment_scores: {
      '762675006': 'Sequential Organ Failure Assessment score',
      '444956000': 'Acute Physiology and Chronic Health Evaluation II score',
      '450737002': 'Acute Physiology and Chronic Health Evaluation III score',
      '386352003': 'Glasgow coma scale score',
      '457011001': 'Richmond Agitation-Sedation Scale',
      '450738007': 'Confusion Assessment Method for the ICU',
      '443394008': 'Modified Early Warning Score',
      '762676007': 'National Early Warning Score',
      '450755007': 'Pediatric Risk of Mortality III score'
    }
  },
  
  lab_tests: {
    chemistry: {
      '14749-6': 'Glucose measurement',
      '14682-9': 'Creatinine measurement',
      '14937-7': 'Urea nitrogen measurement',
      '15074-8': 'Sodium measurement',
      '15087-0': 'Potassium measurement',
      '14635-7': 'Bicarbonate measurement',
      '14633-2': 'Calcium measurement',
      '14879-1': 'Phosphate measurement',
      '14731-4': 'Magnesium measurement',
      '14629-0': 'Bilirubin measurement'
    },
    hematology: {
      '26464-8': 'White blood cell count',
      '26515-7': 'Platelet count',
      '41654-5': 'Hematocrit measurement',
      '718-7': 'Hemoglobin measurement',
      '26499-4': 'Absolute neutrophil count',
      '26474-7': 'Absolute lymphocyte count'
    },
    coagulation: {
      '5902-2': 'Prothrombin time',
      '14979-9': 'Activated partial thromboplastin time',
      '3255-7': 'Fibrinogen measurement',
      '48065-7': 'D-dimer measurement',
      '6301-6': 'International normalized ratio'
    },
    blood_gas: {
      '2744-1': 'pH measurement',
      '2019-8': 'Carbon dioxide partial pressure measurement',
      '2703-7': 'Oxygen partial pressure measurement',
      '1925-7': 'Base excess measurement',
      '2518-9': 'Lactate measurement',
      '1960-4': 'Bicarbonate measurement arterial'
    }
  }
};

// Ontology lookup functions
export function lookupICD10(code: string): { code: string; description: string } | null {
  // Search through all categories
  for (const category of Object.values(ICD10_CODES)) {
    if (code in category) {
      return { code, description: category[code] };
    }
  }
  return null;
}

export function lookupRxNorm(code: string): { code: string; name: string; category: string } | null {
  for (const [category, drugs] of Object.entries(RXNORM_CODES)) {
    for (const [drugName, codes] of Object.entries(drugs)) {
      if (code in codes) {
        return { code, name: codes[code], category: drugName };
      }
    }
  }
  return null;
}

export function lookupLOINC(code: string): { code: string; name: string; category: string } | null {
  for (const [category, tests] of Object.entries(LOINC_CODES)) {
    for (const [testType, codes] of Object.entries(tests)) {
      if (code in codes) {
        return { code, name: codes[code], category: `${category}.${testType}` };
      }
    }
  }
  return null;
}

export function lookupSNOMED(code: string): { code: string; name: string; category: string } | null {
  for (const [category, subcategories] of Object.entries(SNOMED_CODES)) {
    for (const [subcategory, codes] of Object.entries(subcategories)) {
      if (code in codes) {
        return { code, name: codes[code], category: `${category}.${subcategory}` };
      }
    }
  }
  return null;
}

// Search functions
export function searchICD10ByKeyword(keyword: string): Array<{ code: string; description: string }> {
  const results = [];
  const keywordLower = keyword.toLowerCase();
  
  for (const category of Object.values(ICD10_CODES)) {
    for (const [code, description] of Object.entries(category)) {
      if (description.toLowerCase().includes(keywordLower)) {
        results.push({ code, description });
      }
    }
  }
  
  return results;
}

export function searchRxNormByKeyword(keyword: string): Array<{ code: string; name: string; category: string }> {
  const results = [];
  const keywordLower = keyword.toLowerCase();
  
  for (const [category, drugs] of Object.entries(RXNORM_CODES)) {
    for (const [drugName, codes] of Object.entries(drugs)) {
      for (const [code, name] of Object.entries(codes)) {
        if (String(name).toLowerCase().includes(keywordLower) || drugName.includes(keywordLower)) {
          results.push({ code, name, category: drugName });
        }
      }
    }
  }
  
  return results;
}

export function getCodesForCondition(condition: string): {
  icd10: string[];
  snomed: string[];
} {
  const conditionLower = condition.toLowerCase().replace(/[^a-z]/g, '_');
  
  return {
    icd10: Object.keys(ICD10_CODES[conditionLower] || {}),
    snomed: Object.keys(SNOMED_CODES.conditions[conditionLower] || {})
  };
}

export function getCodesForMedication(medication: string): {
  rxnorm: string[];
  snomed: string[];
} {
  const medLower = medication.toLowerCase().replace(/[^a-z]/g, '_');
  
  // Check RxNorm
  const rxnormCodes = [];
  for (const category of Object.values(RXNORM_CODES)) {
    if (medLower in category) {
      rxnormCodes.push(...Object.keys(category[medLower]));
    }
  }
  
  // Check SNOMED
  const snomedCodes = [];
  for (const category of Object.values(SNOMED_CODES.medications)) {
    for (const [code, name] of Object.entries(category)) {
      if (name.toLowerCase().includes(medication.toLowerCase())) {
        snomedCodes.push(code);
      }
    }
  }
  
  return { rxnorm: rxnormCodes, snomed: snomedCodes };
}

export function getCodesForLabTest(test: string): {
  loinc: string[];
  snomed: string[];
} {
  const testLower = test.toLowerCase().replace(/[^a-z]/g, '_');
  
  // Check LOINC
  const loincCodes = [];
  for (const category of Object.values(LOINC_CODES)) {
    if (testLower in category) {
      loincCodes.push(...Object.keys(category[testLower]));
    }
  }
  
  // Check SNOMED
  const snomedCodes = [];
  if (SNOMED_CODES.lab_tests.chemistry[testLower]) {
    snomedCodes.push(SNOMED_CODES.lab_tests.chemistry[testLower]);
  }
  if (SNOMED_CODES.lab_tests.hematology[testLower]) {
    snomedCodes.push(SNOMED_CODES.lab_tests.hematology[testLower]);
  }
  
  return { loinc: loincCodes, snomed: snomedCodes };
}