import json
import math
from pathlib import Path


def sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-value))


def score(features: dict[str, float], artifact_path: str = "python/artifacts/current-model.json") -> float | None:
    path = Path(artifact_path)
    if not path.exists():
        return None

    with path.open("r", encoding="utf-8") as handle:
        artifact = json.load(handle)

    if not artifact.get("enabled"):
        return None

    linear_term = artifact["intercept"]
    for index, feature in enumerate(artifact["features"]):
        linear_term += float(features.get(feature, 0.0)) * float(artifact["coefficients"][index])

    return sigmoid(linear_term)
