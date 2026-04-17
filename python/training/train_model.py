import json
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from joblib import dump
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from python.common.model_features import load_feature_spec


@dataclass
class DatasetSplit:
    train_x: list[list[float]]
    train_y: list[int]
    valid_x: list[list[float]]
    valid_y: list[int]
    test_x: list[list[float]]
    test_y: list[int]


def load_rows(path: Path) -> list[dict[str, Any]]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def chronological_split(rows: list[dict[str, Any]]) -> DatasetSplit:
    ordered = sorted(rows, key=lambda row: row["asOfDate"])
    count = len(ordered)
    train_end = max(1, int(count * 0.7))
    valid_end = max(train_end + 1, int(count * 0.85))
    features = load_feature_spec()

    def build(chunk: list[dict[str, Any]]) -> tuple[list[list[float]], list[int]]:
        return (
            [[float(row["features"].get(feature, 0.0)) for feature in features] for row in chunk],
            [int(row["target"]) for row in chunk],
        )

    train = ordered[:train_end]
    valid = ordered[train_end:valid_end]
    test = ordered[valid_end:]

    train_x, train_y = build(train)
    valid_x, valid_y = build(valid)
    test_x, test_y = build(test)

    return DatasetSplit(train_x, train_y, valid_x, valid_y, test_x, test_y)


def metric_summary(model: LogisticRegression, x: list[list[float]], y: list[int]) -> dict[str, float]:
    if not x or not y or len(set(y)) < 2:
        return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "roc_auc": 0.0}

    predictions = model.predict(x)
    probabilities = model.predict_proba(x)[:, 1]
    return {
        "accuracy": float(accuracy_score(y, predictions)),
        "precision": float(precision_score(y, predictions, zero_division=0)),
        "recall": float(recall_score(y, predictions, zero_division=0)),
        "f1": float(f1_score(y, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, probabilities)),
    }


def train() -> dict[str, Any]:
    data_path = REPO_ROOT / "python" / "artifacts" / "training-data.json"
    artifact_dir = REPO_ROOT / "python" / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)

    rows = load_rows(data_path)
    feature_spec = load_feature_spec()

    if len(rows) < 12:
        payload = {
            "version": f"disabled-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "algorithm": "logistic_regression",
            "enabled": False,
            "horizon_days": 7,
            "features": feature_spec,
            "intercept": 0.0,
            "coefficients": [0.0 for _ in feature_spec],
            "metrics": {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "roc_auc": 0.0},
            "trained_at": datetime.now(timezone.utc).isoformat(),
        }
        with (artifact_dir / "current-model.json").open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
        return payload

    split = chronological_split(rows)
    model = LogisticRegression(max_iter=400, class_weight="balanced")
    model.fit(split.train_x, split.train_y)

    valid_metrics = metric_summary(model, split.valid_x, split.valid_y)
    test_metrics = metric_summary(model, split.test_x, split.test_y)
    enabled = valid_metrics["f1"] >= 0.45 and test_metrics["accuracy"] >= 0.45
    version = datetime.now(timezone.utc).strftime("logreg-%Y%m%d%H%M%S")

    payload = {
        "version": version,
        "algorithm": "logistic_regression",
        "enabled": enabled,
        "horizon_days": 7,
        "features": feature_spec,
        "intercept": float(model.intercept_[0]),
        "coefficients": [float(value) for value in model.coef_[0].tolist()],
        "metrics": {
            **{f"valid_{key}": value for key, value in valid_metrics.items()},
            **{f"test_{key}": value for key, value in test_metrics.items()},
        },
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    with (artifact_dir / "current-model.json").open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)

    dump(model, artifact_dir / "current-model.joblib")
    return payload


if __name__ == "__main__":
    result = train()
    print(json.dumps(result, indent=2))
