import json

from python.inference.score_model import score


def test_score_returns_probability(tmp_path):
    artifact = tmp_path / "model.json"
    artifact.write_text(
        json.dumps(
            {
                "enabled": True,
                "intercept": 0.0,
                "features": ["change1d", "change7d"],
                "coefficients": [1.0, 1.0],
            }
        ),
        encoding="utf-8",
    )

    probability = score({"change1d": 0.2, "change7d": 0.3}, str(artifact))

    assert probability is not None
    assert 0.5 < probability < 1.0
