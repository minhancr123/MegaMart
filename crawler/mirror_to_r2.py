#!/usr/bin/env python3
"""Mirror ảnh sản phẩm từ CDN nguồn lên Cloudflare R2 rồi xuất map URL mới.

Tài khoản Cloudinary cũ đã bị disable nên ảnh trong DB trả 401. File
crawler/out/megamart-products.json vẫn giữ URL nguồn gốc (Nguyễn Kim,
Điện Máy Chợ Lớn), nên script này tải lại từ nguồn thay vì tải từ
Cloudinary đã chết.

Ảnh được resize về cạnh dài tối đa 1200px và lưu dạng WebP quality 80:
32k ảnh gốc khoảng 3-6GB, sau khi nén còn ~1GB, vừa sức R2 free 10GB và
trang tải nhanh hơn thấy rõ.

Cách chạy:
    export R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...
    export R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
    export R2_BUCKET=megamart-images
    export R2_PUBLIC_URL=https://<account>.r2.dev   # hoặc domain custom

    python mirror_to_r2.py --limit 50        # thử 50 ảnh
    python mirror_to_r2.py --dry-run         # chỉ xem sẽ làm gì
    python mirror_to_r2.py                   # toàn bộ
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
import requests
from botocore.config import Config
from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE_JSON = ROOT / "out" / "megamart-products.json"
MAP_JSON = ROOT / "out" / "r2-url-map.json"

MAX_EDGE = 1200
WEBP_QUALITY = 80
UA = "Mozilla/5.0 (X11; Linux x86_64) MegaMart/1.0"


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def make_s3():
    return boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def collect_targets() -> list[tuple[str, str]]:
    """Trả về [(key_r2, url_nguon)] cho mọi ảnh trong dataset.

    Ưu tiên sourceUrl vì ảnh Nguyễn Kim có sẵn link gốc; ảnh Điện Máy
    Chợ Lớn thì url đã là link gốc. Bỏ qua ảnh đã trỏ Cloudinary vì không
    tải được.

    Mirror cả ảnh gallery (images) lẫn ảnh minh họa trong mô tả
    (descriptionImages). Ảnh mô tả dùng key riêng `desc-{idx}` để không
    đè lên gallery và giữ đúng vị trí marker [DESCIMG:n].
    """
    data = json.loads(SOURCE_JSON.read_text(encoding="utf-8"))
    targets: dict[str, str] = {}

    for product in data.get("products", []):
        slug = product.get("slug") or "unknown"
        for image in product.get("images") or []:
            if not isinstance(image, dict):
                continue
            # Cloudinary đã chết -> ưu tiên sourceUrl nếu có, bỏ nếu không.
            source = image.get("sourceUrl") or image.get("url") or ""
            if not source.startswith("http"):
                continue
            if "res.cloudinary.com" in source:
                continue
            if "ytimg.com" in source:
                continue
            clean = source.split("?")[0]
            ext = Path(clean).suffix.lower()
            if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}:
                ext = ".jpg"
            key = f"products/{slug}/{Path(clean).stem}{ext}"
            targets.setdefault(key, source)

        # Ảnh minh họa trong mô tả: giữ index gốc để key không lệch với DB.
        for idx, entry in enumerate(product.get("descriptionImages") or []):
            if isinstance(entry, dict):
                candidates = [entry.get("sourceUrl") or "", entry.get("url") or ""]
            else:
                candidates = [str(entry or "")]
            source = ""
            for cand in candidates:
                if isinstance(cand, str) and cand.startswith("http") and "res.cloudinary.com" not in cand and "ytimg.com" not in cand:
                    source = cand
                    break
            if not source:
                continue
            key = f"products/{slug}/desc-{idx}.webp"
            targets.setdefault(key, source)

    return sorted(targets.items())


def to_webp(raw: bytes) -> bytes:
    """Resize + chuyển WebP. Bỏ ảnh quá nhỏ thì giữ nguyên để khỏi vỡ."""
    image = Image.open(io.BytesIO(raw))
    # Ảnh có alpha (PNG logo) thì phải giữ alpha, nền trong suốt.
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "transparency" in image.info else "RGB")

    if max(image.size) > MAX_EDGE:
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=4)
    return buffer.getvalue()


def put_with_retry(s3, bucket: str, key: str, body: bytes, attempts: int = 5):
    """R2 từ chối PutObject khi có nhiều request đồng thời (AccessDenied
    ngẫu nhiên, không phải lỗi quyền thật). Thử lại với backoff thay vì
    bỏ ảnh."""
    for attempt in range(attempts):
        try:
            s3.put_object(
                Bucket=bucket,
                Key=key,
                Body=body,
                ContentType="image/webp",
                CacheControl="public, max-age=31536000, immutable",
            )
            return
        except Exception as exc:  # noqa: BLE001
            if attempt == attempts - 1:
                raise
            time.sleep(0.6 * (attempt + 1))


def upload_one(s3, bucket: str, key: str, url: str, session: requests.Session):
    webp_key = key if key.endswith(".webp") else os.path.splitext(key)[0] + ".webp"
    try:
        head = s3.head_object(Bucket=bucket, Key=webp_key)
        return key, url, "skip", head.get("ContentLength", 0)
    except Exception:
        pass

    response = session.get(url, timeout=(10, 45))
    response.raise_for_status()
    raw = response.content
    if len(raw) < 512:
        return key, url, "tiny", len(raw)

    body = to_webp(raw)
    put_with_retry(s3, bucket, webp_key, body)
    return key, url, "ok", len(body)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--workers", type=int, default=12)
    args = parser.parse_args()

    bucket = os.environ["R2_BUCKET"]
    public_url = os.environ["R2_PUBLIC_URL"].rstrip("/")

    targets = collect_targets()
    if args.limit:
        targets = targets[: args.limit]

    total_bytes = 0
    log(f"Bucket: {bucket} | Public URL: {public_url}")
    log(f"Anh se mirror: {len(targets)}")

    if args.dry_run:
        for key, url in targets[:10]:
            print(f"  {key} <- {url}")
        log("dry-run xong, khong tai gi.")
        return 0

    mapping: dict[str, str] = {}
    stats = {"ok": 0, "skip": 0, "fail": 0}
    lock = threading.Lock()
    # R2 từ chối PutObject khi nhiều thread dùng chung một client boto3
    # (AccessDenied ngẫu nhiên, không đúng lý do). Mỗi thread một client riêng.
    thread_local = threading.local()

    def task(item):
        key, url = item
        client = getattr(thread_local, "s3", None)
        if client is None:
            client = make_s3()
            thread_local.s3 = client
        session = requests.Session()
        session.headers["User-Agent"] = UA
        try:
            return upload_one(client, bucket, key, url, session)
        except Exception as exc:  # noqa: BLE001 - ghi lại rồi bỏ qua
            return key, url, f"fail:{type(exc).__name__}", 0

    started = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(task, item): item for item in targets}
        for index, future in enumerate(as_completed(futures), start=1):
            key, url, status, size = future.result()
            with lock:
                if status.startswith("fail"):
                    if stats["fail"] < 8:
                        log(f"  FAIL {key}: {status} <- {url[:90]}")
                    stats["fail"] += 1
                    continue
                if status not in stats:
                    stats[status] = 0
                webp_key = os.path.splitext(key)[0] + ".webp"
                mapping[url] = f"{public_url}/{webp_key}"
                stats[status] += 1
                total_bytes += size

            if index % 250 == 0:
                rate = index / max(time.time() - started, 1)
                log(f"  {index}/{len(targets)} | ok={stats['ok']} skip={stats['skip']} "
                    f"fail={stats['fail']} | {rate:.1f}/s | {total_bytes/1024/1024:.0f} MB")

    MAP_JSON.parent.mkdir(parents=True, exist_ok=True)
    # Merge với map cũ để không mất entry đã mirror trước đó (mirror chạy lại chỉ bổ sung).
    existing: dict[str, str] = {}
    if MAP_JSON.exists():
        try:
            existing = json.loads(MAP_JSON.read_text(encoding="utf-8"))
        except Exception:
            existing = {}
    for k, v in existing.items():
        mapping.setdefault(k, v)
    MAP_JSON.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")

    log(f"Xong: ok={stats['ok']} skip={stats['skip']} fail={stats['fail']}")
    log(f"Tong dung luong upload: {total_bytes/1024/1024:.0f} MB")
    log(f"Map URL -> {MAP_JSON} ({len(mapping)} muc)")
    return 0 if stats["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
