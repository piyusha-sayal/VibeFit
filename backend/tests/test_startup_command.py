"""Guard the container's listening port.

Render discovers a web service by scanning for an open port, beginning at
`$PORT`. The service once deployed with `start.sh` falling back to 8000 while
nothing set `PORT`, and Render reported "Port scan timeout reached, no open
ports detected" against a container that was alive and had already finished its
migration. These tests pin the three files that have to agree on one number.
"""
from pathlib import Path

import yaml

BACKEND = Path(__file__).resolve().parent.parent
REPO = BACKEND.parent

EXPECTED_PORT = "10000"


def _start_script() -> str:
    return (BACKEND / "start.sh").read_text()


def test_uvicorn_binds_all_interfaces():
    """Binding localhost only would be invisible to Render's scan."""
    assert "--host 0.0.0.0" in _start_script()


def test_port_falls_back_to_the_port_render_scans():
    assert f'PORT="${{PORT:-{EXPECTED_PORT}}}"' in _start_script()


def test_uvicorn_binds_the_resolved_port():
    assert '--port "${PORT}"' in _start_script()


def test_uvicorn_is_actually_executed():
    """`exec` matters: uvicorn must be PID 1 so signals reach it."""
    assert "exec uvicorn main:app" in _start_script()


def test_startup_is_narrated():
    """Without these lines a failed boot is indistinguishable from a slow one."""
    script = _start_script()
    for line in ("startup: applying database migrations",
                 "startup: migrations complete",
                 "startup: launching uvicorn"):
        assert line in script


def test_blueprint_pins_the_same_port():
    blueprint = yaml.safe_load((REPO / "render.yaml").read_text())
    service = blueprint["services"][0]
    port = next(v for v in service["envVars"] if v["key"] == "PORT")
    assert str(port["value"]) == EXPECTED_PORT


def test_blueprint_does_not_override_the_entrypoint():
    """A dockerCommand here would silently bypass start.sh, migration included."""
    service = yaml.safe_load((REPO / "render.yaml").read_text())["services"][0]
    assert "dockerCommand" not in service


def test_dockerfile_exposes_the_same_port():
    dockerfile = (BACKEND / "Dockerfile").read_text()
    assert f"EXPOSE {EXPECTED_PORT}" in dockerfile
