#!/usr/bin/env python3
"""Mirror ảnh trong bảng ProductImage lên Cloudinary rồi thay URL tại chỗ.

Khác với mirror_images.py (chạy trên file JSON *trước* khi import), script này
chạy khi dữ liệu đã nằm trong database. Toàn bộ 5.366 ảnh hiện hotlink thẳng
sang cdn.nguyenkimmall.com / cdn11.dienmaycholon.vn / cdn.coreventure.vn - họ
bật chặn hotlink hoặc đổi URL là ảnh chết hàng loạt.

Cloudinary tự đi tải ảnh từ CDN nguồn (URL truyền qua tham số `file`), nên máy
mình không tải/upload lại byte ảnh nào.

    python mirror_db_images.py --dry-run      # xem sẽ làm gì
    python mirror_db_images.py --limit 20     # thử 20 ảnh
    python mirror_db_images.py                # chạy hết

Chạy lại được nhiều lần: ảnh đã ở res.cloudinary.com sẽ bị bỏ qua.
"""

from __future__ import annotations

import argparse
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import psycopg
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_db_data import database_url          # noqa: E402
from mirror_images import CLOUDINARY_HOST, load_credentials, upload  # noqa: E402

# Cloudinary public_id không nhận một số ký tự; slug sản phẩm vốn đã sạch.
FOLDER = "megamart/products"


def fetch_jobs(conn, limit: int | None, primary_only: bool = False
               ) -> list[tuple[str, str, str, str, int]]:
    """(imageId, url, categorySlug, productSlug, displayOrder) cho ảnh chưa mirror."""
    sql = f"""
        SELECT i.id, i.url, c.slug, p.slug, i."displayOrder"
        FROM "ProductImage" i
        JOIN "Product" p ON p.id = i."productId"
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE i.url NOT LIKE '%{CLOUDINARY_HOST}%'
        {'AND i."isPrimary"' if primary_only else ''}
        ORDER BY p.slug, i."displayOrder"
    """
    if limit:
        sql += f" LIMIT {limit}"
    with conn.cursor() as cur:
        cur.execute(sql)
        return cur.fetchall()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--limit", type=int)
    ap.add_argument("--timeout", type=int, default=90)
    ap.add_argument("--primary-only", action="store_true",
                    help="chỉ mirror ảnh đại diện (thứ hiện trên thẻ sản phẩm)")
    ap.add_argument("--overwrite", action="store_true",
                    help="ghi đè public_id đã tồn tại trên Cloudinary")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    cloud, key, secret = load_credentials()
    url = database_url()

    with psycopg.connect(url) as conn:
        jobs = fetch_jobs(conn, args.limit, args.primary_only)
        with conn.cursor() as cur:
            cur.execute(f"""SELECT count(*) FROM "ProductImage" WHERE url LIKE '%{CLOUDINARY_HOST}%'""")
            done_already = cur.fetchone()[0]

    print(f"Cloud: {cloud}")
    print(f"Ảnh đã mirror trước đó : {done_already}")
    print(f"Ảnh cần mirror lần này : {len(jobs)}")
    if args.dry_run:
        for img_id, src, cat, slug, order in jobs[:5]:
            print(f"   {FOLDER}/{cat}/{slug}-{order}\n      <- {src[:96]}")
        print("(dry-run: không gọi API, không ghi DB)")
        return 0
    if not jobs:
        print("Không còn gì để làm.")
        return 0

    session = requests.Session()
    lock = threading.Lock()
    done = failed = 0
    updates: list[tuple[str, str]] = []

    def work(job):
        img_id, src, cat, slug, order = job
        return img_id, upload(session, src, f"{FOLDER}/{cat}/{slug}-{order}",
                              cloud, key, secret, args.timeout, args.overwrite)

    def flush(conn):
        """Ghi URL mới theo lô để không giữ transaction quá lâu."""
        nonlocal updates
        if not updates:
            return
        with conn.cursor() as cur:
            cur.executemany('UPDATE "ProductImage" SET url = %s WHERE id = %s',
                            [(u, i) for i, u in updates])
        conn.commit()
        updates = []

    with psycopg.connect(url) as conn, ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(work, j): j for j in jobs}
        for fut in as_completed(futures):
            try:
                img_id, new_url = fut.result()
                with lock:
                    updates.append((img_id, new_url))
                    done += 1
                    if len(updates) >= 100:
                        flush(conn)
            except Exception as exc:
                with lock:
                    failed += 1
                if failed <= 8:
                    print(f"  ✗ {futures[fut][1][:70]}\n     {exc}")
            if (done + failed) % 200 == 0:
                print(f"  ... {done + failed}/{len(jobs)}  (ok {done}, lỗi {failed})")
        with lock:
            flush(conn)

    print(f"\n✅ Xong: {done} ảnh đã mirror, {failed} lỗi.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
