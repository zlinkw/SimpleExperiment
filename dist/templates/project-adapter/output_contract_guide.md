# ZLK standard AI experiment output
Summary, case-level, curve, checkpoint, env, prediction and log outputs for paper-grade analysis.
## Required Files
- metrics_summary.csv: summary_csv
- config_snapshot.yaml: config_snapshot
- env_snapshot.json: env_snapshot

## Optional Files
- metrics_case.csv: case_csv
- training_curve.csv: curve_csv
- checkpoint_manifest.json: checkpoint_manifest
- prediction_index.csv: prediction_index
- logs/train.log: log

## Required Columns
### metrics_summary
- experiment_id (string)
- suite (string)
- method (string)
- dataset (string)
- split (string)
- seed (string)
- metric (string)
- value (number)
### metrics_case
- experiment_id (string)
- case_id (string)
- dataset (string)
- split (string)
- method (string)

## Python metrics_summary writer
```python
import csv
from datetime import datetime

def write_metrics_summary(path, rows):
    fieldnames = ["experiment_id","attempt_id","study_id","plan_id","suite","method","dataset","split","fold","seed","metric","value","unit","higher_is_better","epoch","step","timestamp"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
```

## Python metrics_case writer
```python
import csv
from datetime import datetime

def write_metrics_case(path, rows):
    fieldnames = ["experiment_id","attempt_id","case_id","patient_id","dataset","split","fold","seed","method","label","prediction","probability","metric","value","error_type","subgroup","image_path","table_row_id","timestamp"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
```