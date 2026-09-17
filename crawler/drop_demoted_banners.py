#!/usr/bin/env python3
"""Xoá hẳn các ảnh dính banner khuyến mãi mà fix_primary_images.py đã đẩy xuống cuối.

Sau khi đổi ảnh đại diện, tấm cũ (ảnh sản phẩm bị dán banner "GIẢM ĐẾN 50%++"
của Điện Máy Chợ Lớn, chỉ 450px) vẫn nằm ở cuối gallery - khách lật tới vẫn thấy
quảng cáo của sàn khác. Nó cũng đang chiếm public_id "<slug>-0" trên Cloudinary,
chỗ mà ảnh đại diện mới cần dùng.

Đọc đúng danh sách trong out/demoted-primaries.json, và chỉ xoá dòng nào vẫn thoả:
không phải isPrimary, và đang ở vị trí cuối gallery của sản phẩm đó.

    python drop_demoted_banners.py --dry-run
    python drop_demoted_banners.py
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_db_data import database_url  # noqa: E402

ROOT = Path(__file__).resolve().parent


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--backup", default=str(ROOT / "out" / "demoted-primaries.json"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    ids = [b["imageId"] for b in json.loads(Path(args.backup).read_text(encoding="utf-8"))]
    print(f"Trong danh sách: {len(ids)} ảnh")

    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        # Chốt lại điều kiện an toàn ngay trong câu SQL, phòng khi DB đã đổi
        # kể từ lúc fix_primary_images.py chạy.
        cur.execute("""
            SELECT i.id FROM "ProductImage" i
            JOIN (SELECT "productId", max("displayOrder") hi
                  FROM "ProductImage" GROUP BY "productId") m
              ON m."productId" = i."productId"
            WHERE i.id = ANY(%s) AND NOT i."isPrimary" AND i."displayOrder" = m.hi
        """, (ids,))
        safe = [r[0] for r in cur.fetchall()]
        print(f"Đủ điều kiện xoá (không phải ảnh đại diện, ở cuối gallery): {len(safe)}")
        if len(safe) != len(ids):
            print(f"  ⚠ bỏ qua {len(ids) - len(safe)} dòng không còn thoả điều kiện")

        if args.dry_run:
            print("(dry-run: không xoá)")
            return 0
        if not safe:
            return 0

        cur.execute('DELETE FROM "ProductImage" WHERE id = ANY(%s)', (safe,))
        deleted = cur.rowcount
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
        print(f"   URL gốc vẫn còn trong {args.backup} nếu cần khôi phục.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
