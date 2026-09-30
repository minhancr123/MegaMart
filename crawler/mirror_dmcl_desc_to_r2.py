#!/usr/bin/env python3
"""Đẩy ảnh minh họa trong bài mô tả (Điện máy Chợ Lớn) lên Cloudflare R2.

Tái dùng đúng cách làm của mirror_to_r2.py: resize về cạnh 1200px, nén WebP
q80, mỗi thread một client boto3 riêng (R2 từ chối PutObject khi nhiều request
đồng thời dùng chung client) và head_object trước để chạy lại được.

Key đặt `products/<slug>/desc-<n>.webp` — tách khỏi ảnh gallery (`main`,
`multi`) để không đè lên nhau.

Đầu ra: crawler/out/dmcl-desc-r2-map.json  {url_nguon: url_r2}

Cách chạy:
    export R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...
    export R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
    export R2_BUCKET=megamart-images
    export R2_PUBLIC_URL=https://megamart24.tech

    python crawler/mirror_dmcl_desc_to_r2.py --limit 20   # thử trước
    python crawler/mirror_dmcl_desc_to_r2.py
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

ROOT = Path(__file__).resolve().parent
DESC_JSON = ROOT / "out" / "dmcl-descriptions.json"
MAP_JSON = ROOT / "out" / "dmcl-desc-r2-map.json"
UA = "Mozilla/5.0 (X11; Linux x86_64) MegaMart/1.0"


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def download_with_retry(session: requests.Session, url: str, attempts: int = 4) -> bytes:
    """Tải ảnh nguồn, thử lại khi lỗi tạm thời.

    CDN Nguyễn Kim hay trả 500 ("Error downloading original image") khi bị
    tải dồn nhiều request cùng lúc — chờ rồi thử lại là hết, không phải ảnh
    hỏng. 404/403 thì không thử lại vì URL sai hoặc đã bị xoá.
    """
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
    raise last if last else RuntimeError("tải thất bại")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="giới hạn số sản phẩm")
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--input",
        default=str(DESC_JSON),
        help="JSON {slug: {'images': [...]}} hoặc {slug: [...]}",
    )
    ap.add_argument("--map-out", default=str(MAP_JSON))
    args = ap.parse_args()

    data = json.load(open(args.input, encoding="utf-8"))
    if args.limit:
        data = dict(list(data.items())[: args.limit])

    def images_of(entry) -> list[tuple[int, str]]:
        """Chuẩn hoá về [(index_goc, url)].

        Ba dạng input:
          {slug: {"images": [url, ...]}}                  — output fetch_dmcl_descriptions
          {slug: [[index, url], ...]}                    — output export-pending-desc-images
          {slug: [url, ...]}                             — suy luận index từ vị trí

        PHẢI giữ index gốc. Key R2 đặt theo `desc-<index>`; nếu đánh số lại từ 0
        ở đây thì key sẽ lệch với ảnh đã mirror sẵn, `head_object` thấy key cũ
        đã tồn tại nên bỏ qua, và map sẽ trỏ ảnh này sang URL của ảnh khác.
        """
        if isinstance(entry, dict):
            return list(enumerate(entry.get("images") or []))
        if entry and isinstance(entry[0], (list, tuple)):
            return [(int(i), u) for i, u in entry]
        return list(enumerate(entry))

    bucket = os.environ["R2_BUCKET"]
    public_url = os.environ["R2_PUBLIC_URL"].rstrip("/")

    # (key_r2, url_nguon). Một ảnh có thể dùng cho nhiều slug -> trùng key,
    # head_object sẽ bỏ qua nên không tốn băng thông tải lại.
    targets: dict[str, str] = {}
    for slug, entry in data.items():
        for idx, src in images_of(entry):
            targets[f"products/{slug}/desc-{idx}.webp"] = src

    log(f"Sản phẩm: {len(data)} | ảnh (key): {len(targets)}")
    if args.dry_run:
        for k, v in list(targets.items())[:5]:
            print(f"  {k} <- {v}")
        return 0

    thread_local = threading.local()
    lock = threading.Lock()
    mapping: dict[str, str] = {}
    # bytes nằm trong dict để thread nào cũng cộng chung được mà không cần
    # `nonlocal` (total_bytes kiểu int sẽ thành biến cục bộ của task).
    stats = {"ok": 0, "skip": 0, "fail": 0, "bytes": 0}

    def task(item: tuple[str, str]) -> None:
        key, url = item
        # Mỗi thread một client boto3 riêng (R2 từ chối PutObject khi nhiều
        # request đồng thời dùng chung client) và MỘT session requests dùng
        # lại connection pool — tạo session trong mỗi lần gọi sẽ mất keep-alive.
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
            head = client.head_object(Bucket=bucket, Key=key)
            status, size = "skip", head.get("ContentLength", 0)
        except Exception:
            try:
                raw = download_with_retry(session, url)
                if len(raw) < 512:
                    raise ValueError(f"ảnh quá nhỏ ({len(raw)}B)")
                body = to_webp(raw)
                put_with_retry(client, bucket, key, body)
                status, size = "ok", len(body)
            except Exception as exc:  # noqa: BLE001
                with lock:
                    stats["fail"] += 1
                print(f"  ✗ {key}: {exc}", flush=True)
                return
        with lock:
            # Cùng một ảnh nguồn có thể nằm ở nhiều sản phẩm, mỗi sản phẩm một
            # key R2 riêng. Ghi đè `mapping[url]` sẽ khiến sản phẩm chạy sau trỏ
            # sang key của sản phẩm khác — nội dung ảnh vẫn đúng nhưng rác R2 và
            # khó truy vết, nên lưu thành danh sách.
            mapping.setdefault(url, []).append(f"{public_url}/{key}")
            stats[status] += 1
            stats["bytes"] += size if status == "ok" else 0

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(task, targets.items()))

    with open(args.map_out, "w", encoding="utf-8") as f:
        json.dump(mapping, f, ensure_ascii=False, indent=1)

    mb = stats["bytes"] / 1_048_576
    log(f"Tải mới {stats['ok']} | đã có {stats['skip']} | lỗi {stats['fail']}")
    log(f"Dung lượng thêm: {mb:.1f} MB | map ghi vào {args.map_out}")
    if stats["fail"]:
        log("CÓ ẢNH LỖI — xem các dòng ✗ phía trên, chạy lại để nốt.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
