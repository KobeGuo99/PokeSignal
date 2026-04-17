import json
from pathlib import Path


def load_feature_spec():
    repo_root = Path(__file__).resolve().parents[2]
    feature_path = repo_root / "lib" / "ml" / "model-features.json"
    with feature_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)
