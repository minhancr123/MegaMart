#!/usr/bin/env python3
"""Xoá các dòng ProductImage trỏ tới URL đã chết.

Trang chi tiết của Điện Máy Chợ Lớn render sẵn data-src cho một số ảnh mà file
thật không còn trên CDN (~7% mẫu thử trả 404). Những dòng đó vào DB sẽ thành ảnh
vỡ trong gallery, và tệ hơn là có thể bị chọn làm ảnh đại diện.

Chỉ kiểm tra ảnh chưa mirror - ảnh trên res.cloudinary.com đã chắc chắn tải được.

    python prune_dead_images.py --dry-run
    python prune_dead_images.py
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
from fix_db_data import database_url  # noqa: E402

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=12)
    ap.add_argument("--timeout", type=int, default=20)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    url = database_url()
    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, url FROM "ProductImage"
            WHERE url NOT LIKE '%res.cloudinary.com%' AND url LIKE 'http%'
        """)
        rows = cur.fetchall()
    print(f"Ảnh cần kiểm tra: {len(rows)}")

    local = threading.local()
    lock = threading.Lock()
    dead: list[tuple[str, str]] = []
    checked = errors = 0

    def head(row):
        img_id, u = row
        s = getattr(local, "s", None)
        if s is None:
            s = local.s = requests.Session()
            s.headers["User-Agent"] = UA
        r = s.head(u, timeout=args.timeout, allow_redirects=True)
        # Vài CDN không cho HEAD; thử lại bằng GET 1 byte trước khi kết luận là chết.
        if r.status_code in (403, 405, 501):
            r = s.get(u, timeout=args.timeout, allow_redirects=True,
                      headers={"Range": "bytes=0-0"})
        return img_id, u, r.status_code

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(head, r) for r in rows]
        for fut in as_completed(futures):
            try:
                img_id, u, code = fut.result()
                if code >= 400:
                    with lock:
                        dead.append((img_id, u))
            except Exception:
                with lock:
                    errors += 1     # lỗi mạng: giữ lại, không xoá oan
            with lock:
                checked += 1
                if checked % 1000 == 0:
                    print(f"  ... {checked}/{len(rows)}  (chết {len(dead)}, lỗi mạng {errors})")

    print(f"\nURL chết: {len(dead)} / {len(rows)}   (bỏ qua {errors} lỗi mạng, giữ nguyên)")
    for _i, u in dead[:5]:
        print(f"   {u[-72:]}")
    if args.dry_run:
        print("(dry-run: không xoá)")
        return 0
    if not dead:
        return 0

    with psycopg.connect(url) as conn, conn.cursor() as cur:
        cur.execute('DELETE FROM "ProductImage" WHERE id = ANY(%s)', ([d[0] for d in dead],))
        deleted = cur.rowcount
        # displayOrder bị thủng lỗ sau khi xoá -> đánh số lại liên tục từ 0.
        cur.execute("""
            UPDATE "ProductImage" i SET "displayOrder" = r.rn - 1
            FROM (SELECT id, row_number() OVER (PARTITION BY "productId"
                                                ORDER BY "displayOrder", id) AS rn
                  FROM "ProductImage") r
            WHERE i.id = r.id AND i."displayOrder" <> r.rn - 1
        """)
        renumbered = cur.rowcount
        conn.commit()
    print(f"\n✅ Đã xoá {deleted} dòng, đánh số lại {renumbered} ảnh.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
