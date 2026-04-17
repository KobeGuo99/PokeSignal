import json

from python.training import train_model
from python.training.train_model import chronological_split


def test_chronological_split_preserves_order():
    rows = [
        {"asOfDate": f"2026-04-{day:02d}", "features": {"change1d": float(day)}, "target": day % 2}
        for day in range(1, 21)
    ]
    split = chronological_split(rows)

    assert len(split.train_x) > len(split.valid_x)
    assert len(split.train_x) > 0
    assert len(split.test_x) > 0


def test_train_returns_disabled_payload_when_data_is_too_small(tmp_path, monkeypatch):
    artifact_dir = tmp_path / "python" / "artifacts"
    artifact_dir.mkdir(parents=True)
    (artifact_dir / "training-data.json").write_text("[]", encoding="utf-8")

    monkeypatch.setattr(train_model, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(train_model, "load_feature_spec", lambda: ["change1d"])

    payload = train_model.train()

    assert payload["enabled"] is False
    written_artifact = json.loads((artifact_dir / "current-model.json").read_text(encoding="utf-8"))
    assert written_artifact["enabled"] is False
