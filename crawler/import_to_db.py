#!/usr/bin/env python3
"""Nạp file JSON đã cào thẳng vào Postgres (không cần Node/Prisma).

Dùng khi không chạy được `prisma/import-crawled.ts` (ổ FAT32 không tạo được
symlink cho node_modules/.bin, hoặc máy thiếu RAM để npm install). Logic upsert
giống hệt bản TypeScript: theo Category.slug / Product.slug / Variant.sku.

    python import_to_db.py --dry-run
    python import_to_db.py
    python import_to_db.py --replace-images

Connection string đọc từ DATABASE_URL (biến môi trường hoặc ../server/.env).
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
import time
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.types.json import Jsonb

ROOT = Path(__file__).resolve().parent

# --------------------------------------------------------------------------
# CUID: cột id không có default trong DB, Prisma sinh ở phía client nên
# importer phải tự sinh id cùng định dạng (cuid v1: 'c' + 24 ký tự base36).
# --------------------------------------------------------------------------
_counter = random.randint(0, 36**4 - 1)
_fingerprint = "".join(random.choices("0123456789abcdefghijklmnopqrstuvwxyz", k=4))


def _b36(number: int, width: int) -> str:
    digits = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while number:
        number, rem = divmod(number, 36)
        out = digits[rem] + out
    return (out or "0")[-width:].rjust(width, "0")


def cuid() -> str:
    global _counter
    _counter = (_counter + 1) % (36**4)
    timestamp = _b36(int(time.time() * 1000), 8)
    counter = _b36(_counter, 4)
    entropy = _b36(random.getrandbits(40), 8)
    return f"c{timestamp}{counter}{_fingerprint}{entropy}"


def database_url() -> str:
    for env_file in (ROOT / ".env", ROOT.parent / "server" / ".env"):
        if env_file.exists():
            load_dotenv(env_file, override=False)
    # psycopg chỉ nói được Postgres thuần. Nếu DATABASE_URL là chuỗi Accelerate
    # (prisma+postgres://) thì dùng DIRECT_URL - kết nối Postgres thật.
    for name in ("DIRECT_URL", "DATABASE_URL"):
        url = os.getenv(name)
        if url and url.startswith(("postgres://", "postgresql://")):
            return url
    sys.exit(
        "❌ Không tìm thấy connection string Postgres thuần.\n"
        "   Đặt DIRECT_URL (hoặc DATABASE_URL) dạng postgres://... trong server/.env"
    )


def main() -> int:
    ap = argparse.ArgumentParser(description="Nạp sản phẩm đã cào vào Postgres")
    ap.add_argument("--file", default=str(ROOT / "out" / "megamart-products.json"))
    ap.add_argument("--dry-run", action="store_true", help="không ghi, chỉ báo cáo")
    ap.add_argument("--replace-images", action="store_true", help="xoá ảnh cũ rồi ghi lại")
    ap.add_argument(
        "--skip-images-if-present",
        action="store_true",
        help="sản phẩm đã có ảnh trong DB thì bỏ qua ảnh trong file "
             "(dùng khi ảnh trong DB đã mirror lên Cloudinary: URL khác URL gốc "
             "trong file nên nếu chèn tiếp sẽ ra hai bộ ảnh trùng nội dung)",
    )
    args = ap.parse_args()

    path = Path(args.file)
    payload = json.loads(path.read_text(encoding="utf-8"))
    products = payload["products"]
    print(f"📦 {path.name}: {len(products)} sản phẩm • {len(payload['categories'])} danh mục")
    print(f"   nguồn: {', '.join(payload['meta'].get('sources', []))}")
    if args.dry_run:
        print("   (chế độ --dry-run: không ghi vào database)")

    with psycopg.connect(database_url()) as conn:
        conn.autocommit = False
        cur = conn.cursor()

        # ---------------- 1. Danh mục ----------------
        category_ids: dict[str, str] = {}
        reparented: list[str] = []

        for cat in payload["categories"]:
            parent_id = category_ids.get(cat["parentSlug"]) if cat["parentSlug"] else None

            cur.execute(
                'SELECT c.id, p.slug FROM "Category" c '
                'LEFT JOIN "Category" p ON p.id = c."parentId" WHERE c.slug = %s',
                (cat["slug"],),
            )
            row = cur.fetchone()
            if row and (row[1] or None) != (cat["parentSlug"] or None):
                reparented.append(
                    f"{cat['slug']}: {row[1] or '(gốc)'} -> {cat['parentSlug'] or '(gốc)'}"
                )

            if args.dry_run:
                category_ids[cat["slug"]] = row[0] if row else f"dry-{cat['slug']}"
                continue

            cur.execute(
                'INSERT INTO "Category" (id, slug, name, "parentId", active, "updatedAt") '
                "VALUES (%s, %s, %s, %s, true, NOW()) "
                'ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, '
                '"parentId" = EXCLUDED."parentId", active = true, "updatedAt" = NOW() '
                "RETURNING id",
                (cuid(), cat["slug"], cat["name"], parent_id),
            )
            category_ids[cat["slug"]] = cur.fetchone()[0]

        print(f"📁 Danh mục: {len(category_ids)}")
        if reparented:
            print(f"↪️  {len(reparented)} danh mục sẵn có được chuyển sang cây mới:")
            for line in reparented:
                print(f"   - {line}")

        # ---------------- 2. Sản phẩm ----------------
        # Kết nối tới pooler có độ trễ ~100ms nên gom thành lệnh hàng loạt:
        # ~18.000 round-trip rút xuống còn vài chục.
        CHUNK = 500
        created = updated = variant_count = image_count = 0
        skipped: list[str] = []

        valid: list[dict] = []
        for p in products:
            if p["categorySlug"] not in category_ids:
                skipped.append(f"{p['slug']} (không có danh mục {p['categorySlug']})")
            elif not p["variants"] or not p["variants"][0].get("price"):
                skipped.append(f"{p['slug']} (thiếu giá)")
            else:
                valid.append(p)

        slugs = [p["slug"] for p in valid]
        cur.execute('SELECT slug FROM "Product" WHERE slug = ANY(%s)', (slugs,))
        existing_slugs = {r[0] for r in cur.fetchall()}
        created = len(valid) - len(existing_slugs & set(slugs))
        updated = len(existing_slugs & set(slugs))

        if args.dry_run:
            variant_count = sum(len(p["variants"]) for p in valid)
            # Đếm đúng số ảnh SẼ được thêm: bỏ qua ảnh đã có trong DB
            cur.execute(
                'SELECT p.slug, i.url FROM "ProductImage" i '
                'JOIN "Product" p ON p.id = i."productId" WHERE p.slug = ANY(%s)',
                (slugs,),
            )
            have_by_slug: dict[str, set[str]] = {}
            for slug, url in cur.fetchall():
                have_by_slug.setdefault(slug, set()).add(url)
            image_count = sum(
                1
                for p in valid
                if not (args.skip_images_if_present and have_by_slug.get(p["slug"]))
                for img in p["images"]
                if img["url"] not in have_by_slug.get(p["slug"], ())
            )
            conn.rollback()
        else:
            # 2a. Upsert sản phẩm theo lô, lấy về map slug -> id
            product_ids: dict[str, str] = {}
            for i in range(0, len(valid), CHUNK):
                chunk = valid[i : i + CHUNK]
                values = ", ".join(["(%s, %s, %s, %s, %s, %s, %s, NOW())"] * len(chunk))
                params: list = []
                for p in chunk:
                    params += [
                        cuid(), p["slug"], p["name"], p.get("description"),
                        p.get("brand"), category_ids[p["categorySlug"]], p.get("soldCount", 0),
                    ]
                cur.execute(
                    'INSERT INTO "Product" (id, slug, name, description, brand, '
                    '"categoryId", "soldCount", "updatedAt") VALUES ' + values +
                    " ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, "
                    "description = EXCLUDED.description, brand = EXCLUDED.brand, "
                    '"categoryId" = EXCLUDED."categoryId", '
                    '"soldCount" = EXCLUDED."soldCount", "deletedAt" = NULL, '
                    '"updatedAt" = NOW() RETURNING id, slug',
                    params,
                )
                for pid, slug in cur.fetchall():
                    product_ids[slug] = pid
                conn.commit()
                print(f"   sản phẩm {min(i + CHUNK, len(valid))}/{len(valid)}", flush=True)

            ids = list(product_ids.values())

            # 2b. Ảnh: đọc hết ảnh sẵn có trong 1 query rồi chèn phần còn thiếu
            if args.replace_images:
                cur.execute('DELETE FROM "ProductImage" WHERE "productId" = ANY(%s)', (ids,))
                existing_images: dict[str, set[str]] = {}
            else:
                cur.execute(
                    'SELECT "productId", url FROM "ProductImage" WHERE "productId" = ANY(%s)',
                    (ids,),
                )
                existing_images = {}
                for pid, url in cur.fetchall():
                    existing_images.setdefault(pid, set()).add(url)

            image_rows: list[tuple] = []
            for p in valid:
                pid = product_ids[p["slug"]]
                have = existing_images.get(pid, set())
                if args.skip_images_if_present and have:
                    continue
                base = len(have)
                for idx, img in enumerate(i for i in p["images"] if i["url"] not in have):
                    image_rows.append(
                        (
                            cuid(), pid, img["url"], img.get("alt") or p["name"],
                            base == 0 and idx == 0, base + idx,
                        )
                    )
            for i in range(0, len(image_rows), CHUNK):
                chunk = image_rows[i : i + CHUNK]
                values = ", ".join(["(%s, %s, %s, %s, %s, %s)"] * len(chunk))
                cur.execute(
                    'INSERT INTO "ProductImage" (id, "productId", url, alt, "isPrimary", '
                    '"displayOrder") VALUES ' + values,
                    [x for row in chunk for x in row],
                )
                conn.commit()
            image_count = len(image_rows)
            print(f"   ảnh {image_count}", flush=True)

            # 2c. Variant
            variant_rows: list[tuple] = []
            for p in valid:
                pid = product_ids[p["slug"]]
                for v in p["variants"]:
                    variant_rows.append(
                        (
                            cuid(), pid, v["sku"], v["price"], v.get("salePrice"),
                            v.get("discountPercent"), v.get("stock", 0),
                            Jsonb(v.get("attributes") or {}),
                        )
                    )
            for i in range(0, len(variant_rows), CHUNK):
                chunk = variant_rows[i : i + CHUNK]
                values = ", ".join(["(%s, %s, %s, %s, %s, %s, %s, %s, NOW())"] * len(chunk))
                cur.execute(
                    'INSERT INTO "Variant" (id, "productId", sku, price, "salePrice", '
                    '"discountPercent", stock, attributes, "updatedAt") VALUES ' + values +
                    ' ON CONFLICT (sku) DO UPDATE SET "productId" = EXCLUDED."productId", '
                    'price = EXCLUDED.price, "salePrice" = EXCLUDED."salePrice", '
                    '"discountPercent" = EXCLUDED."discountPercent", stock = EXCLUDED.stock, '
                    'attributes = EXCLUDED.attributes, "updatedAt" = NOW()',
                    [x for row in chunk for x in row],
                )
                conn.commit()
            variant_count = len(variant_rows)
            print(f"   variant {variant_count}", flush=True)

        if args.dry_run:
            conn.rollback()
        else:
            conn.commit()

    print(f"🆕 Sản phẩm mới:      {created}")
    print(f"♻️  Sản phẩm cập nhật: {updated}")
    print(f"🎯 Variant:           {variant_count}")
    print(f"🖼️  Ảnh thêm mới:      {image_count}")
    if skipped:
        print(f"⚠️  Bỏ qua {len(skipped)}:")
        for s in skipped[:10]:
            print(f"   - {s}")
        if len(skipped) > 10:
            print(f"   ... và {len(skipped) - 10} sản phẩm khác")
    print("\n✅ Dry-run xong (chưa ghi DB)." if args.dry_run else "\n✅ Nạp dữ liệu xong.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
