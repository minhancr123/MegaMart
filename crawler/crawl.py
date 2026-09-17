#!/usr/bin/env python3
"""Cào sản phẩm Điện Máy Chợ Lớn + Nguyễn Kim về đúng schema MegaMart.

    python crawl.py --site all --limit 40
    python crawl.py --site nk  --categories tu-lanh.c,tivi.c --limit 100
    python crawl.py --site dmcl --limit 30 --out out/dmcl.json

Kết quả: out/megamart-products.json -> nạp vào DB bằng
    cd ../server && npx tsx prisma/import-crawled.ts
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from crawl4ai import AsyncWebCrawler, BrowserConfig  # noqa: E402

import config  # noqa: E402
from normalize import dedupe  # noqa: E402
from sites import dienmaycholon as dmcl  # noqa: E402
from sites import nguyenkim as nk  # noqa: E402


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def build_categories(used_slugs: set[str]) -> list[dict]:
    """Chỉ xuất những danh mục thực sự có sản phẩm, kèm danh mục cha của chúng."""
    by_slug = {slug: (name, parent) for slug, name, parent in config.CATEGORY_TREE}
    needed: set[str] = set()
    for slug in used_slugs:
        while slug and slug in by_slug and slug not in needed:
            needed.add(slug)
            slug = by_slug[slug][1]

    out = []
    for slug, name, parent in config.CATEGORY_TREE:  # giữ thứ tự cha trước con
        if slug in needed:
            out.append({"slug": slug, "name": name, "parentSlug": parent})
    return out


async def crawl_dmcl(crawler, categories, limit, delay, stock) -> list[dict]:
    products: list[dict] = []
    cfg = dmcl.run_config(limit)

    for path, category_slug in categories:
        url = dmcl.category_url(path)
        try:
            result = await crawler.arun(url=url, config=cfg)
        except Exception as exc:  # noqa: BLE001
            log(f"  ✗ DMCL {path}: {exc}")
            continue
        if not result.success:
            log(f"  ✗ DMCL {path}: {result.error_message or result.status_code}")
            continue

        found = dmcl.parse_listing(result.html, category_slug, limit, stock)
        products.extend(found)
        log(f"  ✓ DMCL {path:34s} -> {len(found):3d} sản phẩm ({category_slug})")
        await asyncio.sleep(delay)

    return products


async def crawl_nk(crawler, categories, limit, delay, stock) -> list[dict]:
    products: list[dict] = []
    cfg = nk.run_config()

    for path, category_slug in categories:
        found: list[dict] = []
        page = 1
        total_pages = 1

        while len(found) < limit and page <= total_pages:
            url = nk.category_url(path, page)
            try:
                result = await crawler.arun(url=url, config=cfg)
            except Exception as exc:  # noqa: BLE001
                log(f"  ✗ NK {path} p{page}: {exc}")
                break
            if not result.success:
                log(f"  ✗ NK {path} p{page}: {result.error_message or result.status_code}")
                break

            page_detail = nk.extract_page_detail(result.html)
            if not page_detail:
                log(f"  ✗ NK {path} p{page}: không tìm thấy __NEXT_DATA__")
                break

            total_pages = min(int(page_detail.get("pages") or 1), 40)
            found.extend(nk.parse_products(page_detail, category_slug, stock))
            page += 1
            if page <= total_pages and len(found) < limit:
                await asyncio.sleep(delay)

        found = found[:limit]
        products.extend(found)
        log(f"  ✓ NK   {path:34s} -> {len(found):3d} sản phẩm ({category_slug})")
        await asyncio.sleep(delay)

    return products


def filter_categories(categories, wanted: str | None, max_categories: int | None):
    if wanted:
        keep = {w.strip() for w in wanted.split(",") if w.strip()}
        categories = [c for c in categories if c[0] in keep or c[1] in keep]
    if max_categories:
        categories = categories[:max_categories]
    return categories


async def main() -> int:
    ap = argparse.ArgumentParser(description="Crawl4AI -> MegaMart product importer")
    ap.add_argument("--site", choices=["dmcl", "nk", "all"], default="all")
    ap.add_argument("--limit", type=int, default=40, help="số sản phẩm tối đa mỗi danh mục")
    ap.add_argument("--categories", help="lọc danh mục (path nguồn hoặc slug đích), phân tách bằng dấu phẩy")
    ap.add_argument("--max-categories", type=int, help="chỉ cào N danh mục đầu tiên mỗi site")
    ap.add_argument("--delay", type=float, default=1.5, help="giây nghỉ giữa các request")
    ap.add_argument("--stock", type=int, default=50, help="tồn kho mặc định cho variant")
    ap.add_argument("--out", default=str(ROOT / "out" / "megamart-products.json"))
    ap.add_argument("--show-browser", action="store_true", help="chạy trình duyệt có giao diện")
    ap.add_argument(
        "--append",
        action="store_true",
        help="gộp thêm vào file --out sẵn có thay vì ghi đè (cào bù danh mục lỗi); "
             "trùng slug thì bản vừa cào thắng",
    )
    args = ap.parse_args()

    browser = BrowserConfig(
        headless=not args.show_browser,
        user_agent=config.USER_AGENT,
        viewport_width=1440,
        viewport_height=900,
        verbose=False,
    )

    started = time.time()
    products: list[dict] = []

    async with AsyncWebCrawler(config=browser) as crawler:
        if args.site in ("dmcl", "all"):
            cats = filter_categories(config.DMCL_CATEGORIES, args.categories, args.max_categories)
            log(f"Điện Máy Chợ Lớn: {len(cats)} danh mục, tối đa {args.limit} sp/danh mục")
            products += await crawl_dmcl(crawler, cats, args.limit, args.delay, args.stock)

        if args.site in ("nk", "all"):
            cats = filter_categories(config.NK_CATEGORIES, args.categories, args.max_categories)
            log(f"Nguyễn Kim: {len(cats)} danh mục, tối đa {args.limit} sp/danh mục")
            products += await crawl_nk(crawler, cats, args.limit, args.delay, args.stock)

    out_path = Path(args.out)
    if args.append and out_path.exists():
        previous = json.loads(out_path.read_text(encoding="utf-8")).get("products", [])
        log(f"Gộp thêm vào {len(previous)} sản phẩm đã có trong {out_path}")
        # dedupe() giữ bản xuất hiện trước -> đặt kết quả vừa cào lên đầu để giá
        # và ảnh mới ghi đè bản cũ, thay vì bị bản cũ giữ chỗ.
        products = products + previous

    before = len(products)
    products = dedupe(products)
    used_slugs = {p["categorySlug"] for p in products}

    payload = {
        "meta": {
            "generator": "crawl4ai",
            "crawledAt": datetime.now(timezone.utc).isoformat(),
            "sources": sorted({p["source"] for p in products}),
            "productCount": len(products),
            "duplicatesDropped": before - len(products),
            "durationSeconds": round(time.time() - started, 1),
        },
        "categories": build_categories(used_slugs),
        "products": products,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    log(
        f"Xong: {len(products)} sản phẩm / {len(payload['categories'])} danh mục "
        f"-> {out_path} ({payload['meta']['durationSeconds']}s)"
    )
    return 0 if products else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
