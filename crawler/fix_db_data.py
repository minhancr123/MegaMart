#!/usr/bin/env python3
"""Hai bản vá dữ liệu sau khi import, chạy trực tiếp trên Postgres.

1. Giá seed bị nhân 100: createProduct/updateProduct cũ ghi `price * 100` nhưng
   formatPrice() lúc đọc không chia lại, nên vài sản phẩm seed hiện sai 100 lần
   ("Dell XPS 13: 3.299.000.000đ"). Code đã sửa; đây là vá cho dữ liệu cũ.

2. Metadata crawler rò ra storefront: Variant.attributes chứa `source` và
   `sourceUrl`, mà UI render mọi key trong khối "Thông số" -> card sản phẩm in
   cả "Source: DIEN_MAY_CHO_LON" và link sang trang gốc. Provenance vẫn còn
   nguyên trong crawler/out/megamart-products.json nên xoá ở DB là an toàn.

    python fix_db_data.py --dry-run     # chỉ xem, không ghi
    python fix_db_data.py               # áp dụng
"""

from __future__ import annotations

import argparse
import os
import re
import sys
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parent

# Variant do crawler tạo đều có key 'source' trong attributes; phần còn lại là seed.
CRAWLED = """attributes ? 'source'"""
SEED = f"NOT ({CRAWLED})"

# KHÔNG phải mọi dòng seed đều bị nhân 100 - chỉ một số được tạo qua API cũ.
# MacBook Air 34.990.000 / Galaxy S24 25.990.000 / AirPods 6.990.000 đã đúng,
# chia 100 sẽ làm hỏng chúng. Sản phẩm đắt nhất trong catalog thật là 117.990.000
# (tivi 83 inch), nên mốc 1 tỷ tách được hai nhóm mà không chạm nhầm dòng nào.
INFLATED = 1_000_000_000


def database_url() -> str:
    """psycopg chỉ nói được Postgres thuần, không hiểu prisma+postgres:// ."""
    env = ROOT.parent / "server" / ".env"
    if env.exists():
        text = env.read_text(encoding="utf-8")
        for name in ("DIRECT_URL", "DATABASE_URL"):
            m = re.search(rf'^{name}\s*=\s*"?([^"\n]+)"?', text, re.M)
            if m and m.group(1).startswith(("postgres://", "postgresql://")):
                os.environ.setdefault(name, m.group(1))
    for name in ("DIRECT_URL", "DATABASE_URL"):
        url = os.getenv(name)
        if url and url.startswith(("postgres://", "postgresql://")):
            return url
    sys.exit("❌ Không tìm thấy DIRECT_URL (Postgres thuần) trong server/.env")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="chỉ báo cáo, không ghi")
    args = ap.parse_args()

    with psycopg.connect(database_url()) as conn, conn.cursor() as cur:
        # ---------- 1. Giá seed nhân 100 ----------
        cur.execute(f"""
            SELECT p.name, v.sku, v.price, v."salePrice"
            FROM "Variant" v JOIN "Product" p ON p.id = v."productId"
            WHERE {SEED}
            ORDER BY v.price DESC
        """)
        seed_rows = cur.fetchall()
        hit = [r for r in seed_rows if r[2] >= INFLATED]
        print(f"[1] Variant seed: {len(seed_rows)}, trong đó bị nhân 100: {len(hit)}")
        for name, sku, price, sale in seed_rows:
            if price >= INFLATED:
                print(f"    SỬA  {price:>15,} -> {price // 100:>13,}  {name[:34]:<34} [{sku}]")
            else:
                print(f"    giữ  {price:>15,}                    {name[:34]:<34} [{sku}]")

        # ---------- 2. Metadata crawler ----------
        cur.execute("""SELECT count(*) FROM "Variant" WHERE attributes ?| array['source','sourceUrl']""")
        leak = cur.fetchone()[0]
        print(f"\n[2] Variant có 'source'/'sourceUrl' trong attributes: {leak}")

        if args.dry_run:
            print("\n(dry-run: không ghi gì)")
            return

        # price và salePrice xét độc lập: chỉ chia cột nào thực sự vượt ngưỡng.
        cur.execute(f"""
            UPDATE "Variant" SET
                price = CASE WHEN price >= {INFLATED} THEN price / 100 ELSE price END,
                "salePrice" = CASE WHEN "salePrice" >= {INFLATED} THEN "salePrice" / 100 ELSE "salePrice" END
            WHERE {SEED} AND (price >= {INFLATED} OR "salePrice" >= {INFLATED})
        """)
        print(f"\n[1] đã chia 100 cho {cur.rowcount} variant seed bị thổi giá")

        cur.execute("""
            UPDATE "Variant"
            SET attributes = attributes - 'source' - 'sourceUrl'
            WHERE attributes ?| array['source','sourceUrl']
        """)
        print(f"[2] đã gỡ source/sourceUrl khỏi {cur.rowcount} variant")

        conn.commit()
        print("\n✅ Đã commit.")


if __name__ == "__main__":
    main()
