#!/usr/bin/env python3
"""Đổi ảnh đại diện của sản phẩm Điện Máy Chợ Lớn sang ảnh sạch trong gallery.

Ảnh trên thẻ sản phẩm ở trang danh mục DMCL là ảnh "<slug>-main--<n>_450.png.webp"
- một tấm chụp sản phẩm nhưng bị dán banner khuyến mãi của họ lên
("GIẢI PHÓNG HÀNG TỒN - GIẢM ĐẾN 50%++"), và chỉ rộng 450px. Vòng cào đầu
lấy đúng tấm đó làm ảnh đại diện, nên storefront này đang treo quảng cáo của
sàn khác trên gần như mọi sản phẩm DMCL.

Ảnh "<slug>-multi-N.png" trong gallery trang chi tiết là ảnh gốc của hãng:
sạch, không banner, và full-res (~1024px). Script đổi tấm đầu tiên trong gallery
thành ảnh đại diện, đẩy tấm dính banner xuống cuối.

KHÔNG xoá gì - chỉ đổi isPrimary/displayOrder, nên đảo ngược được. URL của ảnh
bị đẩy xuống được ghi ra --backup để cần thì xoá hàng loạt sau.

    python fix_primary_images.py --dry-run
    python fix_primary_images.py
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
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--backup", default=str(ROOT / "out" / "demoted-primaries.json"))
    args = ap.parse_args()

    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        # Sản phẩm DMCL: nhận ra bằng ảnh gallery còn trỏ về cdn11.dienmaycholon.vn
        # (ảnh đại diện có thể đã được mirror lên Cloudinary nên không dò theo nó được).
        cur.execute("""
            SELECT p.id, p.name,
                   (SELECT i.id  FROM "ProductImage" i
                     WHERE i."productId" = p.id ORDER BY i."displayOrder" LIMIT 1),
                   (SELECT i.url FROM "ProductImage" i
                     WHERE i."productId" = p.id ORDER BY i."displayOrder" LIMIT 1)
            FROM "Product" p
            WHERE p."deletedAt" IS NULL
              AND EXISTS (SELECT 1 FROM "ProductImage" g
                          WHERE g."productId" = p.id AND g."displayOrder" >= 1
                            AND g.url LIKE '%dienmaycholon%')
            ORDER BY p.name
        """)
        targets = cur.fetchall()
        print(f"Sản phẩm DMCL có ảnh gallery thay thế được: {len(targets)}")
        for _pid, name, _iid, url in targets[:4]:
            print(f"   {name[:46]:<46} thay {url.rsplit('/', 1)[-1][:40]}")

        if args.dry_run:
            print("\n(dry-run: không ghi gì)")
            return 0
        if not targets:
            return 0

        Path(args.backup).parent.mkdir(parents=True, exist_ok=True)
        Path(args.backup).write_text(
            json.dumps([{"productId": p, "name": n, "imageId": i, "url": u}
                        for p, n, i, u in targets], ensure_ascii=False, indent=2),
            encoding="utf-8")
        print(f"\nĐã ghi danh sách ảnh bị đẩy xuống: {args.backup}")

        ids = [t[2] for t in targets]
        # displayOrder tạm âm để tránh đụng nhau giữa hai bước.
        cur.execute("""
            UPDATE "ProductImage" SET "displayOrder" = -1, "isPrimary" = false
            WHERE id = ANY(%s)
        """, (ids,))
        moved = cur.rowcount
        # Ảnh gallery dồn lên: 1..N trở thành 0..N-1, tấm đầu thành ảnh đại diện.
        cur.execute("""
            UPDATE "ProductImage" i SET
                "displayOrder" = i."displayOrder" - 1,
                "isPrimary" = (i."displayOrder" = 1)
            WHERE i."productId" = ANY(%s) AND i."displayOrder" >= 1
        """, ([t[0] for t in targets],))
        promoted = cur.rowcount
        # Tấm dính banner xuống cuối gallery của chính sản phẩm đó.
        cur.execute("""
            UPDATE "ProductImage" i SET "displayOrder" = sub.last_order + 1
            FROM (SELECT "productId", max("displayOrder") AS last_order
                  FROM "ProductImage" GROUP BY "productId") sub
            WHERE i.id = ANY(%s) AND sub."productId" = i."productId"
        """, (ids,))
        conn.commit()
        print(f"[1] đẩy xuống cuối {moved} ảnh dính banner")
        print(f"[2] dồn lại {promoted} ảnh gallery, tấm đầu thành ảnh đại diện")
        print("\n✅ Đã commit.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
