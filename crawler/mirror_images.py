#!/usr/bin/env python3
"""Mirror ảnh sản phẩm đã cào lên Cloudinary rồi thay URL trong file JSON.

Chạy TRƯỚC bước import vào database:

    crawl.py  ->  mirror_images.py  ->  server/prisma/import-crawled.ts

Cloudinary tự đi tải ảnh từ CDN nguồn (truyền URL vào tham số `file`), nên máy
bạn không phải tải/upload lại byte nào — chỉ gửi ~5.000 request nhỏ.

    python mirror_images.py                 # mirror toàn bộ
    python mirror_images.py --dry-run       # xem sẽ làm gì, không gọi API
    python mirror_images.py --limit 50      # thử 50 ảnh đầu

Credentials đọc từ biến môi trường hoặc ../server/.env:
    CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
CLOUDINARY_HOST = "res.cloudinary.com"
API = "https://api.cloudinary.com/v1_1/{cloud}/image/upload"


def load_credentials() -> tuple[str, str, str]:
    for env_file in (ROOT / ".env", ROOT.parent / "server" / ".env"):
        if env_file.exists():
            load_dotenv(env_file, override=False)
    cloud = os.getenv("CLOUDINARY_CLOUD_NAME")
    key = os.getenv("CLOUDINARY_API_KEY")
    secret = os.getenv("CLOUDINARY_API_SECRET")
    if not (cloud and key and secret):
        sys.exit(
            "❌ Thiếu credentials Cloudinary.\n"
            "   Đặt CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET\n"
            "   trong biến môi trường hoặc file server/.env"
        )
    return cloud, key, secret


def sign(params: dict[str, str], secret: str) -> str:
    """Chữ ký Cloudinary: sha1 của các tham số đã sắp xếp + api_secret."""
    payload = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hashlib.sha1(f"{payload}{secret}".encode()).hexdigest()


def public_id_for(product: dict, index: int, folder: str) -> str:
    return f"{folder}/{product['categorySlug']}/{product['slug']}-{index}"


def upload(
    session: requests.Session,
    source_url: str,
    public_id: str,
    cloud: str,
    key: str,
    secret: str,
    timeout: int,
    overwrite: bool = False,
) -> str:
    """Bảo Cloudinary tự tải ảnh từ `source_url` về lưu dưới `public_id`.

    overwrite=False (mặc định) để chạy lại nhiều lần mà không tốn credit vô ích.
    Bật lên khi cố ý thay ảnh của một public_id đã tồn tại - ví dụ "<slug>-0"
    đang giữ ảnh cũ mà ảnh đại diện vừa đổi sang tấm khác.
    """
    signed = {
        "overwrite": "true" if overwrite else "false",
        "public_id": public_id,
        **({"invalidate": "true"} if overwrite else {}),
        "timestamp": str(int(time.time())),
    }
    data = {**signed, "api_key": key, "signature": sign(signed, secret), "file": source_url}

    last_error = ""
    for attempt in range(3):
        try:
            resp = session.post(API.format(cloud=cloud), data=data, timeout=timeout)
            if resp.status_code == 200:
                return resp.json()["secure_url"]
            # 420/429 = rate limit -> lùi lại rồi thử tiếp
            if resp.status_code in (420, 429):
                time.sleep(5 * (attempt + 1))
                last_error = f"HTTP {resp.status_code} (rate limit)"
                continue
            body = resp.json().get("error", {}).get("message", resp.text[:120])
            raise RuntimeError(f"HTTP {resp.status_code}: {body}")
        except requests.RequestException as exc:
            last_error = str(exc)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(last_error or "upload thất bại")


def main() -> int:
    ap = argparse.ArgumentParser(description="Mirror ảnh sản phẩm lên Cloudinary")
    ap.add_argument("--file", default=str(ROOT / "out" / "megamart-products.json"))
    ap.add_argument("--folder", default="megamart/products", help="thư mục trên Cloudinary")
    ap.add_argument("--workers", type=int, default=8, help="số upload song song")
    ap.add_argument("--limit", type=int, help="chỉ xử lý N ảnh đầu (để thử)")
    ap.add_argument("--timeout", type=int, default=90, help="timeout mỗi ảnh (giây)")
    ap.add_argument("--dry-run", action="store_true", help="không gọi API, chỉ liệt kê")
    args = ap.parse_args()

    path = Path(args.file)
    payload = json.loads(path.read_text(encoding="utf-8"))
    products = payload["products"]

    # Gom việc: bỏ qua ảnh đã nằm trên Cloudinary (cho phép chạy lại nhiều lần)
    jobs: list[tuple[dict, str]] = []
    already = 0
    for product in products:
        for idx, image in enumerate(product.get("images", [])):
            if CLOUDINARY_HOST in image["url"]:
                already += 1
                continue
            jobs.append((image, public_id_for(product, idx, args.folder)))
        # Ảnh minh họa trong bài mô tả ([DESCIMG:n]) — public_id riêng đuôi -desc-
        desc_list = product.get("descriptionImages") or []
        for d_idx, durl in enumerate(desc_list):
            entry = durl if isinstance(durl, dict) else {"url": durl}
            if not isinstance(durl, dict):
                desc_list[d_idx] = entry
            if CLOUDINARY_HOST in (entry.get("url") or ""):
                already += 1
                continue
            jobs.append(
                (
                    entry,
                    f"{args.folder}/{product['categorySlug']}/{product['slug']}-desc-{d_idx}",
                )
            )
    if args.limit:
        jobs = jobs[: args.limit]

    print(f"📦 {path.name}: {len(products)} sản phẩm")
    print(f"🖼️  {len(jobs)} ảnh cần mirror, {already} ảnh đã có trên Cloudinary")
    if not jobs:
        print("✅ Không có gì để làm.")
        return 0

    if args.dry_run:
        for image, public_id in jobs[:10]:
            print(f"   {image['url'][:70]}...\n     -> {public_id}")
        print(f"   ... tổng {len(jobs)} ảnh (chế độ --dry-run, chưa gọi API)")
        return 0

    cloud, key, secret = load_credentials()
    session = requests.Session()
    lock = threading.Lock()
    done = failed = 0
    errors: list[str] = []
    started = time.time()

    def work(job: tuple[dict, str]) -> None:
        nonlocal done, failed
        image, public_id = job
        source = image["url"]
        try:
            secure_url = upload(session, source, public_id, cloud, key, secret, args.timeout)
        except Exception as exc:  # noqa: BLE001
            with lock:
                failed += 1
                if len(errors) < 10:
                    errors.append(f"{source[:60]}... : {exc}")
            return
        with lock:
            image["sourceUrl"] = source  # giữ lại URL gốc để đối chiếu
            image["url"] = secure_url
            done += 1

    def save() -> None:
        tmp = path.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(path)

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(work, job) for job in jobs]
        for n, _ in enumerate(as_completed(futures), 1):
            if n % 100 == 0 or n == len(futures):
                rate = n / max(time.time() - started, 1)
                with lock:
                    save()  # lưu tiến độ để chạy lại không mất công
                print(
                    f"   {n}/{len(futures)} • ok {done} • lỗi {failed} • "
                    f"{rate:.1f} ảnh/s",
                    flush=True,
                )

    payload["meta"]["imagesMirroredTo"] = "cloudinary"
    save()

    print(f"\n✅ Mirror xong {done} ảnh trong {time.time() - started:.0f}s")
    if failed:
        print(f"⚠️  {failed} ảnh lỗi (giữ nguyên URL gốc):")
        for e in errors:
            print(f"   - {e}")
        print("   Chạy lại script để thử tiếp những ảnh còn lại.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
