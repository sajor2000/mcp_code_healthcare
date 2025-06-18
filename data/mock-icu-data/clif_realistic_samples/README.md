# Realistic CLIF Dataset (Sample)

This synthetic dataset matches real CLIF consortium statistics from 2011-2024.

## Real vs Synthetic Statistics Comparison

| Metric | Real CLIF Data | Our Synthetic Data |
|--------|----------------|-------------------|
| Female | 45.0% | 42.6% |
| White | 63.4% | 64.4% |
| Hispanic | 6.0% | 6.6% |
| IMV Encounters | 35.6% | 35.5% |
| Vasopressors | 36.8% | 36.7% |
| Median LOS | 6.9 days | 7.0 days |
| Mortality | 13.9% | 16.4% |

## Dataset Contents

- 500 synthetic patients
- 654 ICU encounters
- 8 core CLIF tables with realistic clinical patterns
- Temporal data spanning full ICU stays

## Generating Full Dataset

```bash
python3 data/mock-icu-data/generate-realistic-clif-dataset.py
```

This creates the complete dataset in `data/mock-icu-data/clif_realistic/`

## Clinical Realism Features

1. **Age Distribution**: Gamma distribution centered around elderly patients
2. **SOFA Scores**: Component-based calculation with realistic organ dysfunction patterns
3. **Vital Signs**: Severity-correlated patterns with ICU-appropriate frequencies
4. **Laboratory Values**: 30% abnormal results with ICU-relevant tests
5. **Medication Timing**: Vasopressors start within 24h, realistic durations
6. **Respiratory Support**: IMV patients have longer durations, appropriate settings

## Use Cases

- Healthcare research requiring realistic ICU data
- Testing clinical decision support systems
- Training machine learning models
- Validating CLIF-compatible tools