"""The things VibeFit must never infer from a photograph.

These are product constraints, not implementation details, so they are tested
at the level a reviewer can check: the source itself, and the API payloads.
"""
from pathlib import Path

import pytest
from httpx import AsyncClient

from rules import accessories_rules, hair_rules, makeup_rules
from rules.hair_library import HAIRSTYLES
from services import face_service

BACKEND = Path(__file__).resolve().parent.parent


def test_no_module_infers_body_shape_from_an_image():
    # The selfie-derived body analyzer was retired; nothing may reintroduce it.
    assert not (BACKEND / "ml" / "body_analysis.py").exists()
    sources = list((BACKEND / "ml").glob("*.py")) + list((BACKEND / "services").glob("*.py"))
    for path in sources:
        text = path.read_text(encoding="utf-8").lower()
        assert "analyze_body" not in text, path


def test_presentation_is_only_ever_applied_when_stated():
    """Unfiltered results span every presentation, so none is being assumed."""
    results = hair_rules.recommend_hairstyles("oval")
    presentations = {r["presentation"] for r in results}
    assert {"feminine", "masculine", "any"} <= presentations


def test_the_hair_library_is_not_split_by_assumed_gender():
    # The majority of the library is untagged, so a filter is a user choice.
    any_presentation = [h for h in HAIRSTYLES if h.presentation == "any"]
    assert len(any_presentation) >= len(HAIRSTYLES) // 3


@pytest.mark.parametrize("word", ["ethnic", "race", "nationality", "caste"])
def test_no_rule_keys_on_ethnicity_or_nationality(word):
    for path in (BACKEND / "rules").glob("*.py"):
        text = path.read_text(encoding="utf-8").lower()
        # `origin` tags a garment or jewellery tradition, never a person.
        assert f'"{word}"' not in text and f"'{word}'" not in text, path


def test_no_recommendation_text_rates_a_face():
    banned = ("attractive", "beautiful score", "rating", "ideal proportion", "symmetry score")
    blocks = [
        " ".join(r["notes"] + " ".join(r["reasons"]) for r in hair_rules.recommend_hairstyles("oval")),
        " ".join(a["summary"] for a in makeup_rules.recommend_aesthetics()),
        " ".join(i["description"] + i["note"] for i in accessories_rules.recommend("glasses", "oval")),
    ]
    for block in blocks:
        for word in banned:
            assert word not in block.lower(), word


@pytest.mark.asyncio
async def test_the_face_profile_never_returns_a_gender_or_ethnicity_field(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "NI", "email": "no-inference@test.com",
                                  "password": "password123"})
    auth = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    body = (await client.get("/api/v1/face/profile", headers=auth)).json()

    keys = set(body) | set(body["context"])
    for banned in ("gender", "ethnicity", "race", "bodyShape", "bodyType"):
        assert banned not in keys, banned
    # genderPresentation is present, and is whatever the user said in onboarding.
    assert body["context"]["genderPresentation"] is None


def test_the_shared_context_reads_presentation_from_onboarding_not_from_a_scan():
    source = (BACKEND / "services" / "face_service.py").read_text(encoding="utf-8")
    assert "onboarding.gender_presentation" in source
    assert "face.get(\"gender" not in source
