#!/usr/bin/env python3
"""Mirror danh sách URL ảnh gallery lên Cloudflare R2.

Khác mirror_dmcl_desc_to_r2.py ở hai điểm:
  - key R2 do file input chỉ định sẵn (`products/<slug>/<ten-file>.webp`),
    đúng quy ước gallery sẵn có.
  - kiểm tra tồn tại bằng public HEAD (megamart24.tech) thay vì head_object,
    vì token R2 hiện trả 403 cho HeadObject trong khi PUT vẫn chạy.

Đầu vào: JSON {r2key: sourceUrl}. Đầu ra: JSON {sourceUrl: [r2url]}.

Cách chạy:
    export R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...
    export R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
    export R2_BUCKET=megamart-images
    export R2_PUBLIC_URL=https://megamart24.tech

    python crawler/mirror_gallery_list.py --input crawler/out/dead-gallery-mirror.json \\
        --map-out crawler/out/dead-gallery-r2-map.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import boto3
import requests
from botocore.config import Config

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mirror_to_r2 import make_s3, put_with_retry, to_webp  # noqa: E402

UA = "Mozilla/5.0 (X11; Linux x86_64) MegaMart/1.0"


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def download_with_retry(session: requests.Session, url: str, attempts: int = 4) -> bytes:
    last: Exception | None = None
    for attempt in range(attempts):
        try:
            resp = session.get(url, timeout=(10, 45))
            if resp.status_code in (404, 403, 410):
                resp.raise_for_status()
            resp.raise_for_status()
            return resp.content
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code in (404, 403, 410):
                raise
            last = exc
        except Exception as exc:  # noqa: BLE001
            last = exc
        time.sleep(1.2 * (attempt + 1))
    raise last if last else RuntimeError("download failed")


def public_exists(public_url: str, key: str) -> bool:
    try:
        r = requests.head(f"{public_url}/{key}", timeout=15,
                          headers={"User-Agent": UA}, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--map-out", required=True)
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()

    bucket = os.environ["R2_BUCKET"]
    public_url = os.environ["R2_PUBLIC_URL"].rstrip("/")

    targets: dict[str, str] = json.load(open(args.input, encoding="utf-8"))
    if args.limit:
        targets = dict(list(targets.items())[: args.limit])
    log(f"Key cần mirror: {len(targets)}")

    thread_local = threading.local()
    lock = threading.Lock()
    mapping: dict[str, list[str]] = {}
    stats = {"ok": 0, "skip": 0, "fail": 0, "bytes": 0}

    def task(item: tuple[str, str]) -> None:
        key, url = item
        if public_exists(public_url, key):
            with lock:
                mapping.setdefault(url, []).append(f"{public_url}/{key}")
                stats["skip"] += 1
            return
        client = getattr(thread_local, "s3", None)
        if client is None:
            client = make_s3()
            thread_local.s3 = client
        session = getattr(thread_local, "http", None)
        if session is None:
            session = requests.Session()
            session.headers["User-Agent"] = UA
            thread_local.http = session
        try:
            raw = download_with_retry(session, url)
            if len(raw) < 512:
                raise ValueError(f"file quá nhỏ ({len(raw)}B)")
            body = to_webp(raw)
            put_with_retry(client, bucket, key, body)
            status, size = "ok", len(body)
        except Exception as exc:  # noqa: BLE001
            with lock:
                stats["fail"] += 1
            print(f"  FAIL {key}: {exc}", flush=True)
            return
        with lock:
            mapping.setdefault(url, []).append(f"{public_url}/{key}")
            stats[status] += 1
            stats["bytes"] += size

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(task, targets.items()))

    with open(args.map_out, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=1)
    mb = stats["bytes"] / 1_048_576
    log(f"Tải mới {stats['ok']} | đã có {stats['skip']} | lỗi {stats['fail']} | +{mb:.1f} MB")
    log(f"Map ghi vào {args.map_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
