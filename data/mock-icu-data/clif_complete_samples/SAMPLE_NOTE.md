# Sample CLIF Dataset

This directory contains sample data (first 1000 rows) from the complete CLIF dataset.

## Full Dataset

To generate the complete dataset with all records:

```bash
cd /path/to/healthcare-research-mcp
python3 data/mock-icu-data/generate-complete-clif-dataset.py
```

This will create the full dataset in `data/mock-icu-data/clif_complete/` with:
- 500 patients
- 939,227 total records across all 23 CLIF tables
- Full temporal data for ICU stays

## Dataset Statistics

See `dataset_summary.json` for complete statistics.

## Why Samples?

The full dataset is quite large (90MB+) and not suitable for GitHub. These samples provide a quick preview of the data structure and format.