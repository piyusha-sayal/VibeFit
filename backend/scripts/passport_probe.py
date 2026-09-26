"""Bounded reliability probe for GET /api/v1/passport.

The intermittent `GET /passport` failure this script chases is mitigated by
`pool_recycle` (see core/database.py) but NOT root-caused — this script does
not prove or disprove a fix, it only gathers evidence: a cold-start latency
sample, a DB-reachability check, and a small burst of concurrent passport
requests with per-request timing and error classes.

Usage:
    python scripts/passport_probe.py --base-url https://staging.example.com \\
        --token "$PROBE_TOKEN" --requests 50 --concurrency 5

    # or, with the token in the environment (never on the command line/history):
    PROBE_TOKEN=eyJ... python scripts/passport_probe.py \\
        --base-url https://staging.example.com --cold-wait 30

Arguments:
    --base-url     Required. No default — this must never silently default to
                   production.
    --token        Firebase ID token for GET /api/v1/passport. Falls back to
                   the PROBE_TOKEN environment variable. Never printed or logged.
    --cold-wait    Seconds to poll /health before starting (cold-start
                   latency measurement). Default 0 (single /health check only).
    --concurrency  Concurrent in-flight passport requests. Default 5, hard
                   capped at 20.
    --requests     Total passport requests to send. Default 50, hard capped
                   at 500.
    --timeout      Per-request timeout in seconds. Default 10.

Output: one CSV line per passport request to stdout
(request_id,status,duration_ms,error_class), then a summary of status counts
and p50/p95/max duration to stderr. Response bodies are never printed —
Passport contents can include personal styling data.

WARNING: this is a load-generating script. Do not point it at production
above low volume (a handful of requests, concurrency 1-2). The hard caps on
--concurrency and --requests are a backstop, not a license to run it hot
against a real user's data or Render's free-tier instance.
"""
from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time
import uuid
from dataclasses import dataclass

import httpx

MAX_CONCURRENCY = 20
MAX_REQUESTS = 500
PASSPORT_PATH = "/api/v1/passport"


@dataclass
class ProbeResult:
    request_id: str
    status: int | None
    duration_ms: float
    error: str | None


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bounded reliability probe for GET /api/v1/passport. "
                    "See module docstring for the production-safety warning.",
    )
    parser.add_argument("--base-url", required=True,
                        help="e.g. https://vibefit-api-awx9.onrender.com "
                             "(no default — never guessed)")
    parser.add_argument("--token", default=None,
                        help="Firebase ID token; falls back to PROBE_TOKEN env var")
    parser.add_argument("--cold-wait", type=float, default=0.0,
                        help="Seconds to poll /health before probing")
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--requests", type=int, default=50)
    parser.add_argument("--timeout", type=float, default=10.0)
    args = parser.parse_args(argv)

    args.concurrency = max(1, min(args.concurrency, MAX_CONCURRENCY))
    args.requests = max(1, min(args.requests, MAX_REQUESTS))
    return args


def _resolve_token(cli_token: str | None) -> str | None:
    return cli_token or os.environ.get("PROBE_TOKEN")


async def _probe_health(client: httpx.AsyncClient, cold_wait: float) -> None:
    """Poll /health until it answers 200 or cold_wait elapses.

    Always makes at least one attempt. Prints progress to stderr only —
    nothing here is a passport request, so there is no body to protect.
    """
    started = time.perf_counter()
    deadline = started + cold_wait
    attempt = 0
    while True:
        attempt += 1
        attempt_started = time.perf_counter()
        status: int | None = None
        error: str | None = None
        try:
            res = await client.get("/health")
            status = res.status_code
        except httpx.HTTPError as exc:
            error = type(exc).__name__
        elapsed_ms = (time.perf_counter() - attempt_started) * 1000
        print(f"# health attempt={attempt} status={status} error={error} ms={elapsed_ms:.0f}",
              file=sys.stderr)

        if status == 200:
            total_ms = (time.perf_counter() - started) * 1000
            print(f"# health up after {attempt} attempt(s); cold_start_ms={total_ms:.0f}",
                  file=sys.stderr)
            return
        if time.perf_counter() >= deadline:
            print(f"# health did not return 200 within cold-wait={cold_wait:.0f}s",
                  file=sys.stderr)
            return
        await asyncio.sleep(1.0)


async def _probe_health_db(client: httpx.AsyncClient) -> None:
    try:
        res = await client.get("/health/db")
    except httpx.HTTPError as exc:
        print(f"# health/db error={type(exc).__name__}", file=sys.stderr)
        return
    if res.status_code == 404:
        print("# health/db not present on this deployment; skipped", file=sys.stderr)
        return
    print(f"# health/db status={res.status_code}", file=sys.stderr)


async def _probe_passport(
    client: httpx.AsyncClient, count: int, concurrency: int, timeout: float,
) -> list[ProbeResult]:
    semaphore = asyncio.Semaphore(concurrency)
    results: list[ProbeResult | None] = [None] * count

    async def _one(index: int) -> None:
        request_id = uuid.uuid4().hex
        async with semaphore:
            started = time.perf_counter()
            try:
                res = await client.get(
                    PASSPORT_PATH,
                    headers={"X-Request-ID": request_id},
                    timeout=timeout,
                )
                duration_ms = (time.perf_counter() - started) * 1000
                results[index] = ProbeResult(request_id, res.status_code, duration_ms, None)
            except httpx.HTTPError as exc:
                duration_ms = (time.perf_counter() - started) * 1000
                results[index] = ProbeResult(request_id, None, duration_ms, type(exc).__name__)

    await asyncio.gather(*(_one(i) for i in range(count)))
    return [r for r in results if r is not None]


def _percentile(sorted_values: list[float], pct: float) -> float:
    if not sorted_values:
        return 0.0
    index = min(len(sorted_values) - 1, int(round(pct * (len(sorted_values) - 1))))
    return sorted_values[index]


def _print_summary(results: list[ProbeResult]) -> bool:
    """Prints the summary to stderr. Returns True if every request was 2xx."""
    durations = sorted(r.duration_ms for r in results)
    by_status: dict[str, int] = {}
    for r in results:
        key = str(r.status) if r.status is not None else f"error:{r.error}"
        by_status[key] = by_status.get(key, 0) + 1

    print("# --- summary ---", file=sys.stderr)
    print(f"# total={len(results)}", file=sys.stderr)
    for key, n in sorted(by_status.items()):
        print(f"# status[{key}]={n}", file=sys.stderr)
    print(f"# duration_ms p50={_percentile(durations, 0.50):.0f} "
          f"p95={_percentile(durations, 0.95):.0f} "
          f"max={max(durations, default=0.0):.0f}", file=sys.stderr)

    return all(r.status is not None and 200 <= r.status < 300 for r in results)


async def _run(args: argparse.Namespace) -> bool:
    token = _resolve_token(args.token)
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    if not token:
        print("# no token supplied (--token or PROBE_TOKEN); "
              "passport requests will likely 401", file=sys.stderr)

    async with httpx.AsyncClient(base_url=args.base_url, headers=headers,
                                  timeout=args.timeout) as client:
        await _probe_health(client, args.cold_wait)
        await _probe_health_db(client)

        print(f"# probing {PASSPORT_PATH} requests={args.requests} "
              f"concurrency={args.concurrency}", file=sys.stderr)
        results = await _probe_passport(client, args.requests, args.concurrency, args.timeout)

    print("request_id,status,duration_ms,error_class")
    for r in results:
        print(f"{r.request_id},{r.status if r.status is not None else ''},"
              f"{r.duration_ms:.1f},{r.error or ''}")

    return _print_summary(results)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    all_ok = asyncio.run(_run(args))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
