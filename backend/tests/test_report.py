"""Tests for PDF face-report generation + endpoint."""
import pytest
from types import SimpleNamespace
from unittest.mock import patch
from httpx import AsyncClient

from services.report_service import generate_face_report


def _fake_analysis():
    return SimpleNamespace(
        face_analysis={"shape": "oval", "harmony": 0.82,
                       "proportions": {"length_to_width": 1.5}},
        color_analysis={"skinUndertone": "warm", "contrastLevel": "medium",
                        "skinColor": "#c8956c", "seasonal": {"season": "autumn"}},
        skin_analysis={"texture": "normal", "evenness": 78, "redness": "low",
                       "underEye": "neutral", "oiliness": "matte",
                       "concerns": ["under-eye darkness"]},
        hair_analysis={"texture": "wavy", "thickness": "medium"},
        recommendations=[
            SimpleNamespace(title="Hairstyles for an oval face",
                            items=["Blunt lob", "Curtain bangs"]),
        ],
    )


def test_report_is_valid_pdf():
    pdf = generate_face_report(_fake_analysis(), user_name="Test User")
    assert pdf[:5] == b"%PDF-"
    assert len(pdf) > 1000  # non-trivial document


def test_report_handles_empty_analysis():
    empty = SimpleNamespace(face_analysis=None, color_analysis=None,
                            skin_analysis=None, hair_analysis=None,
                            recommendations=[])
    pdf = generate_face_report(empty)
    assert pdf[:5] == b"%PDF-"


@pytest.mark.asyncio
async def test_report_endpoint_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/analysis/some-id/report")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_report_endpoint_404_for_missing(client: AsyncClient):
    claims = {"uid": "u-report", "email": "r@test.com", "name": "R"}
    with patch("api.deps.verify_firebase_token", return_value=claims):
        resp = await client.get(
            "/api/v1/analysis/nonexistent/report",
            headers={"Authorization": "Bearer fake"},
        )
    assert resp.status_code == 404
