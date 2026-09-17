#!/usr/bin/env python3
"""Ẩn khỏi storefront những sản phẩm không có ảnh nào.

Sau khi fill_missing_images.py vá xong, còn 76 sản phẩm không có lấy một tấm ảnh.
Không phải lỗi cào: chính Nguyễn Kim cũng không có ảnh cho chúng (trang chi tiết
trả images: [], media: [], thumbnail: null). Nhìn danh sách thì hiểu vì sao -
phần lớn là SKU nội bộ chứ không phải hàng bày bán:

  - "HÀNG KHUYẾN MẠI KHÔNG THU TIỀN_BALO ACER", "HÀNG KM-BÀN PHÍM ACER"  (quà tặng)
  - "TÚI XÁCH LAPTOP", "CÁP MÀN HÌNH VGA 1.5M", "HỘP MỰC CANON NPG-59 BK" (phụ kiện)
  - gối/đai massage Buheung, Choice Dr  (thương hiệu Điện Máy Chợ Lớn không bán)

Ẩn bằng `deletedAt` (soft delete) chứ không xoá: dữ liệu còn nguyên, hoàn tác
bằng --restore. Đã kiểm trước khi ẩn: 0 CartItem, 0 OrderItem, 0 Review trỏ tới
nhóm này, nên không làm hỏng giỏ hàng hay lịch sử đơn nào.

    python hide_imageless_products.py --dry-run
    python hide_imageless_products.py
    python hide_imageless_products.py --restore   # hiện lại
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_db_data import database_url  # noqa: E402

OUT = Path(__file__).resolve().parent / "out" / "hidden-imageless.json"

# Chỉ nhắm sản phẩm đang hiện và không có ảnh nào.
SELECT_TARGETS = """
    SELECT p.id, p.slug, p.name, c.slug
    FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
    WHERE p."deletedAt" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "ProductImage" i WHERE i."productId" = p.id)
    ORDER BY c.slug, p.name
"""

# Đếm tham chiếu để chắc chắn không ẩn nhầm hàng đang nằm trong giỏ/đơn.
REF_COUNTS = {
    "CartItem": 'SELECT count(*) FROM "CartItem" t JOIN "Variant" v ON v.id = t."variantId"'
                ' WHERE v."productId" = ANY(%s)',
    "OrderItem": 'SELECT count(*) FROM "OrderItem" t JOIN "Variant" v ON v.id = t."variantId"'
                 ' WHERE v."productId" = ANY(%s)',
    "Review": 'SELECT count(*) FROM "Review" t WHERE t."productId" = ANY(%s)',
}


def restore(conn) -> int:
    if not OUT.exists():
        sys.exit(f"❌ Không có {OUT.name} để hoàn tác.")
    ids = [r["id"] for r in json.loads(OUT.read_text(encoding="utf-8"))]
    with conn.cursor() as cur:
        cur.execute('UPDATE "Product" SET "deletedAt" = NULL'
                    ' WHERE id = ANY(%s) AND "deletedAt" IS NOT NULL', (ids,))
        n = cur.rowcount
    conn.commit()
    print(f"✅ Đã hiện lại {n}/{len(ids)} sản phẩm.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--restore", action="store_true", help="bỏ ẩn theo danh sách đã lưu")
    args = ap.parse_args()

    with psycopg.connect(database_url()) as conn:
        if args.restore:
            return restore(conn)

        with conn.cursor() as cur:
            cur.execute(SELECT_TARGETS)
            rows = cur.fetchall()
        ids = [r[0] for r in rows]
        print(f"Sản phẩm không có ảnh nào: {len(ids)}")
        if not ids:
            return 0

        with conn.cursor() as cur:
            for name, sql in REF_COUNTS.items():
                cur.execute(sql, (ids,))
                n = cur.fetchone()[0]
                print(f"   {name} trỏ tới: {n}")
                if n:
                    sys.exit(f"❌ Dừng lại: có {n} {name} đang dùng nhóm này.")

        for _pid, _slug, name, cat in rows[:10]:
            print(f"   [{cat}] {name[:64]}")
        if len(rows) > 10:
            print(f"   … và {len(rows) - 10} sản phẩm nữa")

        if args.dry_run:
            print("\n(dry-run: không ghi gì)")
            return 0

        # Gộp vào danh sách cũ thay vì ghi đè: mỗi lần import bù sản phẩm mới lại
        # phát sinh thêm vài sản phẩm không ảnh, mà ghi đè sẽ làm --restore không
        # còn hiện lại được những sản phẩm đã ẩn ở các lần chạy trước.
        previous = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else []
        merged = {r["id"]: r for r in previous}
        merged.update(
            {p: {"id": p, "slug": s, "name": n, "category": c} for p, s, n, c in rows}
        )
        OUT.write_text(
            json.dumps(list(merged.values()), ensure_ascii=False, indent=1),
            encoding="utf-8",
        )

        with conn.cursor() as cur:
            cur.execute('UPDATE "Product" SET "deletedAt" = %s WHERE id = ANY(%s)',
                        (datetime.now(timezone.utc), ids))
            n = cur.rowcount
        conn.commit()
        print(f"\n✅ Đã ẩn {n} sản phẩm. Danh sách lưu ở out/{OUT.name}"
              f" - hoàn tác: python {Path(__file__).name} --restore")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
