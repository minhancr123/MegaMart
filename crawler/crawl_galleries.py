#!/usr/bin/env python3
"""Bổ sung ảnh gallery cho các sản phẩm chỉ có 1 ảnh.

Vòng cào đầu tiên chỉ đọc trang danh mục, mà trang danh mục chỉ có ảnh thumbnail
-> 2.478/3.007 sản phẩm vào DB với đúng 1 ảnh. Ảnh còn lại nằm ở trang chi tiết
của từng sản phẩm.

May mắn là cả hai sàn đều render sẵn ở server, không cần bật trình duyệt:
  - Điện Máy Chợ Lớn: <div class="dmcl-gallery" data-gallery="images-gallery">,
    ảnh thật ở thuộc tính data-src (src chỉ là placeholder base64).
  - Nguyễn Kim: __NEXT_DATA__ -> props.pageProps.pageDetail.data.images.
    (Trang danh mục trả images: [] nên trước đây mới thiếu.)

sourceUrl đã bị gỡ khỏi Variant.attributes (xem fix_db_data.py) nên lấy lại từ
crawler/out/megamart-products.json, khớp theo slug.

    python crawl_galleries.py --dry-run --limit 5
    python crawl_galleries.py --limit 50
    python crawl_galleries.py

Chạy lại được: sản phẩm nào đã đủ ảnh sẽ bị bỏ qua, URL trùng cũng không thêm lại.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import psycopg
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_db_data import database_url  # noqa: E402

ROOT = Path(__file__).resolve().parent
JSON_PATH = ROOT / "out" / "megamart-products.json"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

_NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S)

# Ảnh sản phẩm DMCL luôn nằm dưới .../Picture/Apro/Apro_product_<id>/...
# Bản _450.png.webp là thumbnail thu nhỏ của cùng file -> bỏ, giữ bản gốc.
_DMCL_THUMB_RE = re.compile(r"_\d{2,4}\.(png|jpe?g)\.webp$", re.I)

# Ảnh chính của gallery là "<slug>-main--<n>.png"; DB đã có đúng tấm đó ở dạng
# thu nhỏ "<...>-main--<n>_450.png.webp" (trang danh mục chỉ đưa bản 450px).
# Thêm bản gốc vào sẽ ra hai tấm giống nhau, nên chỉ lấy các tấm "-multi-N".
_DMCL_MAIN_RE = re.compile(r"-main--?\d*\.(png|jpe?g|webp)$", re.I)


def parse_dmcl(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    urls: list[str] = []
    for img in soup.select('div.dmcl-gallery[data-gallery="images-gallery"] img'):
        src = img.get("data-src") or img.get("data-original") or img.get("src") or ""
        if not src or src.startswith("data:"):
            continue
        if _DMCL_THUMB_RE.search(src) or _DMCL_MAIN_RE.search(src):
            continue
        if src.startswith("//"):
            src = "https:" + src
        urls.append(src)
    return urls


def parse_nguyenkim(html: str) -> list[str]:
    m = _NEXT_DATA_RE.search(html or "")
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []
    detail = (data.get("props", {}).get("pageProps", {})
                  .get("pageDetail", {}).get("data") or {})
    if not isinstance(detail, dict):
        return []
    # Đã kiểm chứng trên 8 sản phẩm: images[0] luôn là bản trùng của thumbnail
    # (cùng content-length), và thumbnail chính là ảnh đã có trong DB. Bỏ cả hai,
    # nếu không gallery sẽ mở đầu bằng hai tấm giống hệt nhau.
    out = list(detail.get("images") or [])[1:]
    return [u for u in out if isinstance(u, str) and u.startswith("http")]


PARSERS = {"dienmaycholon.vn": parse_dmcl, "nguyenkim.com": parse_nguyenkim}


def parser_for(url: str):
    for host, fn in PARSERS.items():
        if host in url:
            return fn
    return None


def dedupe(urls: list[str]) -> list[str]:
    """Giữ nguyên thứ tự; bỏ trùng kể cả khi chỉ khác dấu / lặp trong đường dẫn."""
    seen, out = set(), []
    for u in urls:
        key = re.sub(r"(?<!:)//+", "/", u)
        if key not in seen:
            seen.add(key)
            out.append(u)
    return out


def load_source_urls() -> dict[str, str]:
    products = json.loads(JSON_PATH.read_text(encoding="utf-8"))["products"]
    return {p["slug"]: p["sourceUrl"] for p in products if p.get("sourceUrl")}


def fetch_targets(conn, min_images: int, limit: int | None):
    """Sản phẩm có ít hơn `min_images` ảnh, kèm các URL ảnh đang có."""
    sql = """
        SELECT p.id, p.slug, coalesce(array_agg(i.url) FILTER (WHERE i.url IS NOT NULL), '{}'),
               coalesce(max(i."displayOrder"), -1), count(i.id)
        FROM "Product" p
        LEFT JOIN "ProductImage" i ON i."productId" = p.id
        WHERE p."deletedAt" IS NULL
        GROUP BY p.id, p.slug
        HAVING count(i.id) < %s
        ORDER BY count(i.id), p.slug
    """
    params: list = [min_images]
    if limit:
        sql += " LIMIT %s"
        params.append(limit)
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--min-images", type=int, default=2,
                    help="chỉ xử lý sản phẩm có ít hơn N ảnh (mặc định 2)")
    ap.add_argument("--max-add", type=int, default=8, help="thêm tối đa N ảnh/sản phẩm")
    ap.add_argument("--workers", type=int, default=4, help="số request song song")
    ap.add_argument("--delay", type=float, default=0.4, help="nghỉ giữa 2 request/worker (giây)")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--timeout", type=int, default=30)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    source_urls = load_source_urls()
    url = database_url()
    with psycopg.connect(url) as conn:
        targets = fetch_targets(conn, args.min_images, args.limit)

    jobs = [(pid, slug, have, order, source_urls[slug])
            for pid, slug, have, order, _n in targets if slug in source_urls]
    missing = len(targets) - len(jobs)
    print(f"Sản phẩm < {args.min_images} ảnh : {len(targets)}")
    print(f"  có sourceUrl để cào lại: {len(jobs)}"
          + (f"  (bỏ qua {missing} sản phẩm seed, không có nguồn)" if missing else ""))
    if not jobs:
        return 0

    session_local = threading.local()
    lock = threading.Lock()
    added = ok = empty = failed = 0
    pending: list[tuple[str, str, int]] = []

    def work(job):
        pid, slug, have, max_order, src = job
        s = getattr(session_local, "s", None)
        if s is None:
            s = session_local.s = requests.Session()
            s.headers["User-Agent"] = UA
        parse = parser_for(src)
        if parse is None:
            return pid, slug, []
        time.sleep(args.delay)          # cào chậm lại cho lịch sự
        r = s.get(src, timeout=args.timeout, allow_redirects=True)
        r.raise_for_status()
        found = dedupe(parse(r.text))
        existing = {re.sub(r"(?<!:)//+", "/", u) for u in have}
        new = [u for u in found if re.sub(r"(?<!:)//+", "/", u) not in existing]
        return pid, slug, [(u, max_order + 1 + i) for i, u in enumerate(new[:args.max_add])]

    def flush(conn):
        nonlocal pending
        if not pending:
            return
        with conn.cursor() as cur:
            cur.executemany(
                'INSERT INTO "ProductImage" (id, "productId", url, "displayOrder", "isPrimary")'
                " VALUES (gen_random_uuid()::text, %s, %s, %s, false)", pending)
        conn.commit()
        pending = []

    with psycopg.connect(url) as conn, ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(work, j): j for j in jobs}
        for i, fut in enumerate(as_completed(futures), 1):
            try:
                pid, slug, new = fut.result()
            except Exception as exc:
                with lock:
                    failed += 1
                if failed <= 8:
                    print(f"  ✗ {futures[fut][1]}: {exc}")
            else:
                with lock:
                    if new:
                        ok += 1
                        added += len(new)
                        if not args.dry_run:
                            pending += [(pid, u, o) for u, o in new]
                            if len(pending) >= 200:
                                flush(conn)
                    else:
                        empty += 1
                    if args.dry_run and ok <= 5 and new:
                        print(f"   {slug}: +{len(new)} ảnh  vd {new[0][0][:80]}")
            if i % 100 == 0:
                print(f"  ... {i}/{len(jobs)}  (+{added} ảnh, {empty} không có thêm, {failed} lỗi)")
        if not args.dry_run:
            with lock:
                flush(conn)

    verb = "sẽ thêm" if args.dry_run else "đã thêm"
    print(f"\n✅ {verb} {added} ảnh cho {ok} sản phẩm; "
          f"{empty} sản phẩm không có ảnh nào thêm; {failed} lỗi.")
    if args.dry_run:
        print("(dry-run: không ghi DB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
