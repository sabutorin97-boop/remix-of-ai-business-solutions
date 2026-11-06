#!/usr/bin/env python3
"""kie.ai helper for the kie-studio skill: catalog, prices, balance, upload, run, log.

No dependencies beyond Python 3.9+. The API key comes from KIE_API_KEY (never from
arguments or files). In a Claude Code cloud session where the key is a network secret,
set KIE_API_KEY=proxy-injected: the proxy replaces the header.

    python kie.py balance
    python kie.py models [--type "Text to Video"] [--q kling] [--provider Kling] [--fresh]
    python kie.py price MODEL
    python kie.py rate MODEL                      # success rate over the last 24 h
    python kie.py schema MODEL                    # path + input fields (required, enums, defaults)
    python kie.py upload FILE                     # -> temporary URL (24 h) for image/video inputs
    python kie.py run MODEL --input '{"prompt": "..."}' --est CREDITS \
        --approved "что согласовал человек" --out DIR [--log FILE] [--timeout 1200]
    python kie.py status TASK_ID
    python kie.py fetch TASK_ID --out DIR         # download the result of a finished task
    python kie.py log [--log FILE]                # spend summary: estimate vs actual

`run` refuses to start without --approved and --est, and when the balance is below the
estimate. It writes one JSON line per task to the log (default ./kie-log.jsonl).
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

API = "https://api.kie.ai"
UPLOAD = "https://kieai.redpandaai.co"
CACHE = Path(os.environ.get("KIE_CACHE_DIR", Path.home() / ".cache" / "kie-studio"))
CATALOG_TTL = 600  # seconds
DISCOVERY_GAP = 1.1  # models/schema/price/success-rate share 1 request per second
USD_PER_CREDIT = 0.005  # from the catalog's own prose (e.g. 160 credits = 0.80 USD)

_last_discovery = 0.0


def die(msg: str, code: int = 1) -> None:
    print(f"kie: {msg}", file=sys.stderr)
    sys.exit(code)


def key() -> str:
    k = os.environ.get("KIE_API_KEY", "").strip()
    if not k:
        die("KIE_API_KEY is not set. Create a key at https://kie.ai/api-key and export it "
            "(in a cloud session with the key saved as a network secret: KIE_API_KEY=proxy-injected).")
    return k


def http(method: str, url: str, body: bytes | None = None, headers: dict | None = None,
         timeout: int = 60) -> dict:
    h = {"Authorization": f"Bearer {key()}", "Accept": "application/json"}
    h.update(headers or {})
    req = urllib.request.Request(url, data=body, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
    except urllib.error.HTTPError as e:
        raw = e.read()
        if not raw:
            die(f"HTTP {e.code} from {url}")
    except urllib.error.URLError as e:
        die(f"network error for {url}: {e.reason}")
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        die(f"not JSON from {url}: {raw[:200]!r}")
    return {}


def api(method: str, path: str, payload: dict | None = None, discovery: bool = False,
        host: str = API) -> object:
    """Call the API and return `data`; a non-200 `code` in the body is an error."""
    global _last_discovery
    if discovery:
        wait = DISCOVERY_GAP - (time.time() - _last_discovery)
        if wait > 0:
            time.sleep(wait)
    body = json.dumps(payload).encode() if payload is not None else None
    hdr = {"Content-Type": "application/json"} if body else {}
    for attempt in range(3):
        res = http(method, host + path, body, hdr)
        if discovery:
            _last_discovery = time.time()
        code = res.get("code")
        if code == 429 and attempt < 2:
            time.sleep(2 + attempt * 2)
            continue
        if code != 200:
            hint = {401: "key rejected", 402: "not enough credits", 422: "invalid input (check schema)",
                    429: "rate limited", 455: "service unavailable"}.get(code, "")
            die(f"{path}: code {code} {res.get('msg', '')} {('— ' + hint) if hint else ''}".strip())
        return res.get("data")
    return None


# ---------- discovery ----------

def catalog(fresh: bool = False) -> list[dict]:
    CACHE.mkdir(parents=True, exist_ok=True)
    f = CACHE / "catalog.json"
    if not fresh and f.exists() and time.time() - f.stat().st_mtime < CATALOG_TTL:
        return json.loads(f.read_text())
    data = api("GET", "/api/v1/models", discovery=True)
    models = (data or {}).get("models", [])
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(models, ensure_ascii=False))
    tmp.replace(f)
    return models


def cmd_models(a) -> None:
    ms = catalog(a.fresh)
    out = []
    for m in ms:
        types = m.get("taskType") or []
        if a.type and not any(a.type.lower() == t.lower() for t in types):
            continue
        if a.provider and (m.get("provider") or "").lower() != a.provider.lower():
            continue
        if a.q:
            hay = " ".join(str(m.get(k) or "") for k in ("model", "title", "provider", "description")).lower()
            if a.q.lower() not in hay:
                continue
        out.append(m)
    for m in sorted(out, key=lambda m: ((m.get("provider") or ""), m["model"])):
        price = " ".join((m.get("pricingDesc") or "—").split())
        print(f"{m['model']}  [{', '.join(m.get('taskType') or [])}]\n    {price[:a.width]}")
    print(f"\n{len(out)} of {len(ms)} models (catalog cached up to {CATALOG_TTL // 60} min; --fresh to refetch)")


def cmd_price(a) -> None:
    d = api("GET", f"/api/v1/models/{a.model}/price", discovery=True) or {}
    print(" ".join((d.get("pricingDesc") or "no price text").split()))


def cmd_rate(a) -> None:
    d = api("GET", f"/api/v1/models/{a.model}/success-rate", discovery=True) or {}
    pts = [p for p in d.get("points", []) if p.get("successRate") is not None]
    if not pts:
        print("no monitoring data for the last 24 h (not the same as 0 %)")
        return
    avg = sum(p["successRate"] for p in pts) / len(pts)
    last = pts[-1]
    bad = sum(1 for p in pts if not p.get("isNormal", True))
    print(f"24 h: {avg:.1f} % success over {len(pts)} active 10-min windows; "
          f"last window {last['successRate']:.0f} % ({last['end']}); abnormal windows: {bad}")


def _resolve(doc: dict, node):
    while isinstance(node, dict) and "$ref" in node:
        ref = node["$ref"]
        cur = doc
        for seg in ref.lstrip("#/").split("/"):
            cur = cur[urllib.parse.unquote(seg)]
        node = cur
    return node


def cmd_schema(a) -> None:
    d = api("GET", f"/api/v1/models/{a.model}/schema", discovery=True) or {}
    doc = d.get("openapi")
    if not doc:
        die(f"{a.model}: the schema is not published yet (openapi is null); do not guess the call")
    for path, ops in doc.get("paths", {}).items():
        for method, op in ops.items():
            print(f"{method.upper()} {path}")
            body = _resolve(doc, (op.get("requestBody") or {}).get("content", {})
                            .get("application/json", {}).get("schema", {}))
            inp = _resolve(doc, (body.get("properties") or {}).get("input", {}))
            branches = inp.get("oneOf") or inp.get("anyOf") or [inp]
            for i, br in enumerate(branches):
                br = _resolve(doc, br)
                if len(branches) > 1:
                    print(f"  input variant {i + 1} (use exactly one):")
                req = set(br.get("required") or [])
                for name, p in (br.get("properties") or {}).items():
                    p = _resolve(doc, p)
                    bits = [p.get("type", "")]
                    if "enum" in p:
                        bits.append("one of " + ", ".join(map(str, p["enum"])))
                    if "default" in p:
                        bits.append(f"default {p['default']}")
                    for lim in ("minimum", "maximum", "maxLength"):
                        if lim in p:
                            bits.append(f"{lim} {p[lim]}")
                    desc = " ".join((p.get("description") or "").split())[:140]
                    print(f"    {'*' if name in req else ' '} {name}: {'; '.join(b for b in bits if b)}"
                          f"{(' — ' + desc) if desc else ''}")
    print("(* = required)")


# ---------- running ----------

def cmd_balance(_a) -> None:
    c = api("GET", "/api/v1/chat/credit")
    print(f"{c} credits (≈ ${float(c) * USD_PER_CREDIT:.2f})")


def cmd_upload(a) -> None:
    p = Path(a.file)
    if not p.is_file():
        die(f"no such file: {p}")
    boundary = uuid.uuid4().hex
    ctype = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    parts = []
    for name, val in (("uploadPath", "kie-studio/uploads"), ("fileName", p.name)):
        parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{val}\r\n".encode())
    parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{p.name}\"\r\n"
                 f"Content-Type: {ctype}\r\n\r\n".encode() + p.read_bytes() + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    res = http("POST", UPLOAD + "/api/file-stream-upload", b"".join(parts),
               {"Content-Type": f"multipart/form-data; boundary={boundary}"}, timeout=300)
    if res.get("code") != 200:
        die(f"upload failed: code {res.get('code')} {res.get('msg')}")
    print(res["data"]["downloadUrl"])
    print("(temporary: deleted by kie.ai after 24 h — submit the task now)", file=sys.stderr)


def _record(task_id: str) -> dict:
    return api("GET", "/api/v1/jobs/recordInfo?taskId=" + urllib.parse.quote(task_id)) or {}


def _urls(rec: dict) -> list[str]:
    resp = rec.get("response") or {}
    if isinstance(resp, str):
        try:
            resp = json.loads(resp)
        except json.JSONDecodeError:
            resp = {}
    urls = list(resp.get("resultUrls") or [])
    for item in resp.get("data") or []:  # Suno audio tasks
        if isinstance(item, dict) and item.get("audio_url"):
            urls.append(item["audio_url"])
    return urls


def _download(urls: list[str], out: Path, stem: str) -> list[str]:
    out.mkdir(parents=True, exist_ok=True)
    saved = []
    for i, u in enumerate(urls, 1):
        ext = Path(urllib.parse.urlparse(u).path).suffix or ".bin"
        dest = out / f"{stem}{'' if len(urls) == 1 else f'-{i}'}{ext}"
        try:
            with urllib.request.urlopen(u, timeout=300) as r, open(dest, "wb") as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
        except urllib.error.URLError:
            # some result hosts need an authorised, short-lived direct link
            direct = api("POST", "/api/v1/common/download-url", {"url": u})
            with urllib.request.urlopen(str(direct), timeout=300) as r, open(dest, "wb") as f:
                while chunk := r.read(1 << 20):
                    f.write(chunk)
        saved.append(str(dest))
    return saved


def _log(path: Path, row: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def cmd_run(a) -> None:
    if not a.approved.strip():
        die("--approved is empty: show the options and get the person's explicit choice first")
    try:
        payload = json.loads(a.input)
    except json.JSONDecodeError as e:
        die(f"--input is not JSON: {e}")
    balance = float(api("GET", "/api/v1/chat/credit"))
    if balance < a.est:
        die(f"balance {balance:.1f} credits is below the agreed estimate {a.est:.1f}: top up or choose a cheaper option")
    body = {"model": a.model, "input": payload}
    data = api("POST", "/api/v1/jobs/createTask", body) or {}
    task = data.get("taskId")
    if not task:
        die(f"no taskId in the response: {data}")
    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"task {task} submitted ({a.model}); waiting up to {a.timeout}s", file=sys.stderr)
    deadline = time.time() + a.timeout
    rec: dict = {}
    while time.time() < deadline:
        rec = _record(task)
        if rec.get("state") in ("success", "fail"):
            break
        time.sleep(5)
    state = rec.get("state", "timeout")
    row = {"time": started, "model": a.model, "task": task, "state": state, "approved": a.approved,
           "est_credits": a.est, "credits": rec.get("creditsConsumed"), "balance_before": balance,
           "input": payload, "files": []}
    if state == "success":
        row["files"] = _download(_urls(rec), Path(a.out), a.name or task[:12])
    elif state == "fail":
        row["fail"] = f"{rec.get('failCode')} {rec.get('failMsg')}"
    _log(Path(a.log), row)
    print(json.dumps({k: row[k] for k in ("task", "state", "est_credits", "credits", "files")}
                     | ({"fail": row["fail"]} if "fail" in row else {}), ensure_ascii=False, indent=2))
    if state == "timeout":
        print(f"still running: check later with `kie.py status {task}` and `kie.py fetch {task} --out {a.out}`",
              file=sys.stderr)
    if state != "success":
        sys.exit(2)


def cmd_status(a) -> None:
    rec = _record(a.task)
    keep = ("taskId", "model", "state", "creditsConsumed", "costTime", "failCode", "failMsg")
    print(json.dumps({k: rec.get(k) for k in keep} | {"urls": _urls(rec)}, ensure_ascii=False, indent=2))


def cmd_fetch(a) -> None:
    rec = _record(a.task)
    if rec.get("state") != "success":
        die(f"task state is {rec.get('state')}, nothing to download")
    for p in _download(_urls(rec), Path(a.out), a.name or a.task[:12]):
        print(p)


def cmd_log(a) -> None:
    p = Path(a.log)
    if not p.exists():
        print(f"no log at {p}")
        return
    rows = [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
    est = sum(float(r.get("est_credits") or 0) for r in rows)
    real = sum(float(r.get("credits") or 0) for r in rows)
    by = {}
    for r in rows:
        by.setdefault(r["model"], [0, 0.0, 0])
        by[r["model"]][0] += 1
        by[r["model"]][1] += float(r.get("credits") or 0)
        by[r["model"]][2] += r.get("state") != "success"
    for m, (n, c, bad) in sorted(by.items(), key=lambda x: -x[1][1]):
        print(f"{m}: {n} task(s), {c:.1f} credits (≈ ${c * USD_PER_CREDIT:.2f}), not successful: {bad}")
    print(f"total: {len(rows)} task(s); agreed {est:.1f}, spent {real:.1f} credits "
          f"(≈ ${real * USD_PER_CREDIT:.2f})")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("balance").set_defaults(fn=cmd_balance)
    p = sub.add_parser("models")
    p.add_argument("--type", help='task type, e.g. "Text to Video", "Image to Video", "Text to Image"')
    p.add_argument("--q", help="keyword")
    p.add_argument("--provider")
    p.add_argument("--fresh", action="store_true")
    p.add_argument("--width", type=int, default=220, help="price text length")
    p.set_defaults(fn=cmd_models)
    for name, fn in (("price", cmd_price), ("rate", cmd_rate), ("schema", cmd_schema)):
        p = sub.add_parser(name)
        p.add_argument("model")
        p.set_defaults(fn=fn)
    p = sub.add_parser("upload")
    p.add_argument("file")
    p.set_defaults(fn=cmd_upload)
    p = sub.add_parser("run")
    p.add_argument("model")
    p.add_argument("--input", required=True, help="the model's input object as JSON")
    p.add_argument("--est", type=float, required=True, help="agreed cost estimate in credits")
    p.add_argument("--approved", required=True, help="what the person approved, in their words")
    p.add_argument("--out", required=True)
    p.add_argument("--name", help="file name stem for the result")
    p.add_argument("--log", default="kie-log.jsonl")
    p.add_argument("--timeout", type=int, default=1200)
    p.set_defaults(fn=cmd_run)
    p = sub.add_parser("status")
    p.add_argument("task")
    p.set_defaults(fn=cmd_status)
    p = sub.add_parser("fetch")
    p.add_argument("task")
    p.add_argument("--out", required=True)
    p.add_argument("--name")
    p.set_defaults(fn=cmd_fetch)
    p = sub.add_parser("log")
    p.add_argument("--log", default="kie-log.jsonl")
    p.set_defaults(fn=cmd_log)
    a = ap.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
