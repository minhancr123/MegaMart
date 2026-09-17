#!/usr/bin/env python3
"""Vá ảnh cho các sản phẩm Nguyễn Kim không có tấm nào.

92 sản phẩm vào DB với 0 ảnh vì chính Nguyễn Kim cũng không có ảnh cho chúng:
trang chi tiết trả về `images: []`, `media: []`, `thumbnail: null` (đã kiểm lại
tháng 9/2026, không phải lỗi lúc cào). Không cào lại được từ nguồn cũ.

Cách vá: nhiều model trong số đó Điện Máy Chợ Lớn cũng bán. DMCL công bố sitemap
sản phẩm ngay trong robots.txt, nên dựng được chỉ mục ~16.300 URL mà không phải
dò trang tìm kiếm (/search/* bị robots.txt chặn).

Khớp theo MÃ MODEL, không theo tên: tên hai sàn đặt khác nhau hoàn toàn
("MNN TT PANASONIC DH-3VS1VW (TPÐL)" vs "Máy nước nóng Panasonic DH3VS1VW"),
nhưng mã model thì trùng. Hai chốt an toàn để không gán nhầm ảnh sản phẩm khác:

  1. Mã phải có >= 2 chữ số và >= 3 chữ cái, và không phải đơn vị đo
     ("256gb", "9kg", "1000w"...). Thiếu bước này "256GB" trong tên iPad khớp
     trúng một chiếc Galaxy S20.
  2. Phải có một token thương hiệu trùng, và token đó không nằm trong STOPWORDS.
     Thiếu bước này "BỘ NỒI CHẢO INOX HAWONKOO GCS251" khớp với nồi Kora GCS251
     chỉ vì cùng chứa chữ "inox"/"chao".

    python fill_missing_images.py --refresh-sitemap   # dựng lại chỉ mục DMCL
    python fill_missing_images.py --dry-run
    python fill_missing_images.py

Chạy lại được: sản phẩm nào đã có ảnh sẽ bị bỏ qua.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import psycopg
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fix_db_data import database_url  # noqa: E402

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "out"
SITEMAP_CACHE = OUT / "dmcl-sitemap-urls.json"
MATCH_OUT = OUT / "no-image-dmcl-match.json"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

SITEMAP_INDEX = "https://dienmaycholon.com/sitemap.xml"
# KNMS = "kiến thức mua sắm" (bài viết), filter/category/manu = trang lọc.
_SKIP_SITEMAP = re.compile(r"KNMS|filter-|sitemap_category|sitemap_manu")

# Bản _450.png.webp chỉ là thumbnail thu nhỏ của cùng một file.
_DMCL_THUMB_RE = re.compile(r"_\d{2,4}\.(png|jpe?g)\.webp$", re.I)

# Đơn vị đo / dung lượng - trông giống mã model nhưng không định danh sản phẩm.
_UNIT_RE = re.compile(r"^\d+(gb|tb|kg|kw|w|l|ml|mm|cm|inch|mp|hz|v|ah|k|bo|lit|lits)$")

# Từ mô tả loại hàng và chất liệu, xuất hiện ở cả hai sàn nên không chứng minh
# được là cùng thương hiệu.
STOPWORDS = {
    "camera", "loa", "thanh", "tranh", "may", "noi", "chao", "inox", "bang",
    "dien", "nuoc", "nong", "lanh", "giat", "rua", "chen", "say", "toc", "hut",
    "bui", "quat", "tivi", "tulanh", "bep", "long", "cao", "cap", "mon", "bo",
    "gia", "dung", "nha", "cam", "tay", "wifi", "ngoai", "troi", "trong",
    "cua", "lit", "mini", "smart", "pro", "plus", "max", "new", "chinh", "hang",
    "nau", "cham", "sinh", "day", "kem", "mat", "dong", "tu",
    # Hậu tố kho hàng của Nguyễn Kim, hay đứng trong ngoặc: (TB), (KM), (TPĐT).
    "tb", "km", "tp", "dt", "xv", "gd", "dl", "tpgd", "tpdt", "tpdl",
}


def flat(s: str) -> str:
    """Bỏ dấu tiếng Việt và mọi ký tự không phải chữ/số: 'HW-Q990F/XV' -> 'hwq990fxv'."""
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", s)


def model_codes(name: str) -> list[str]:
    out = set()
    for tok in re.split(r"[\s,()/]+", name):
        f = flat(tok)
        if _UNIT_RE.match(f):
            continue
        if len(f) >= 6 and len(re.findall(r"\d", f)) >= 2 and len(re.findall(r"[a-z]", f)) >= 3:
            out.add(f)
    return sorted(out, key=len, reverse=True)


def brand_tokens(name: str) -> set[str]:
    # Ngưỡng 2 ký tự để không bỏ sót "LG", "TCL"; STOPWORDS gánh phần lọc rác.
    # Chỉ nới được vì mã model vẫn phải khớp trước - một mình token 2 chữ cái
    # không bao giờ đủ để ghép hai sản phẩm.
    return {f for tok in re.split(r"[\s,()/]+", name)
            if (f := flat(tok)) and len(f) >= 2 and not re.search(r"\d", f)
            and f not in STOPWORDS}


def build_sitemap_index(session: requests.Session) -> list[str]:
    index = session.get(SITEMAP_INDEX, timeout=60).text
    maps = [m for m in re.findall(r"<loc>(.*?)</loc>", index) if not _SKIP_SITEMAP.search(m)]

    def grab(u: str) -> list[str]:
        try:
            return re.findall(r"<loc>(.*?)</loc>", session.get(u, timeout=60).text)
        except requests.RequestException:
            return []

    urls: set[str] = set()
    with ThreadPoolExecutor(max_workers=8) as pool:
        for got in pool.map(grab, maps):
            urls.update(got)
    # URL sản phẩm có đúng dạng https://host/<danh-muc>/<slug> (4 dấu "/").
    return sorted(u for u in urls if u.count("/") == 4)


def parse_dmcl_all(html: str) -> list[str]:
    """Toàn bộ ảnh gallery, GIỮ cả tấm '-main--' vì các sản phẩm này chưa có ảnh nào."""
    soup = BeautifulSoup(html, "html.parser")
    seen, out = set(), []
    for img in soup.select('div.dmcl-gallery[data-gallery="images-gallery"] img'):
        src = img.get("data-src") or img.get("data-original") or img.get("src") or ""
        if not src or src.startswith("data:") or _DMCL_THUMB_RE.search(src):
            continue
        if src.startswith("//"):
            src = "https:" + src
        key = re.sub(r"(?<!:)//+", "/", src)
        if key not in seen:
            seen.add(key)
            out.append(src)
    return out or parse_dmcl_legacy(html)


# Template cũ của DMCL đặt tên bằng gạch dưới ("..._main_833.png",
# "..._multi_0_189_1020.png") và không nhét URL vào <img data-src>, nên
# parse_dmcl_all() trả về rỗng. Ảnh vẫn nằm trong HTML và og:image trỏ đúng
# thư mục Apro_product_<id> của sản phẩm.
_APRO_RE = re.compile(r"Apro_product_(\d+)/")
_CDN_IMG_RE = re.compile(
    r"https://cdn11\.dienmaycholon\.vn/[^\"'\\ )]+?\.(?:png|jpe?g|webp)", re.I)
# Tên file DMCL: "<slug>_main_<id>[_<width>].png" và
# "<slug>_multi_<n>_<id>[_<width>].png" (template mới dùng gạch ngang).
# Phải tách riêng main/multi: gộp chung thành một regex với nhóm tuỳ chọn thì
# "_main_833_1020" bị đọc thành n=833, id=1020, không gộp được với "_main_833".
_EXT = r"\.(?:png|jpe?g|webp)$"
_MAIN_RE = re.compile(
    rf"^(?P<stem>.*[-_]+main[-_]+\d+)(?:[-_](?P<width>\d{{2,4}}))?{_EXT}", re.I)
_MULTI_RE = re.compile(
    rf"^(?P<stem>.*[-_]+multi[-_]+(?P<n>\d+)(?:[-_]+\d+)?)"
    rf"(?:[-_](?P<width>\d{{2,4}}))?{_EXT}", re.I)


def parse_dmcl_legacy(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    og = soup.find("meta", property="og:image")
    main = (og.get("content") or "") if og else ""
    folder = _APRO_RE.search(main)
    if not folder:
        return [main] if main.startswith("http") else []
    key = f"Apro_product_{folder.group(1)}/"

    # Mỗi tấm có nhiều bản kích thước; gom theo "thân" rồi giữ bản lớn nhất.
    best: dict[str, tuple[int, int, int, str]] = {}
    for u in _CDN_IMG_RE.findall(html):
        if key not in u or _DMCL_THUMB_RE.search(u):
            continue
        name = u.rsplit("/", 1)[1]
        m = _MAIN_RE.match(name)
        rank = (0, 0)
        if not m:
            m = _MULTI_RE.match(name)
            if not m:
                continue
            rank = (1, int(m.group("n")))
        stem = m.group("stem")
        # Không có hậu tố width nghĩa là bản gốc -> luôn thắng bản đã resize.
        width = int(m.group("width")) if m.group("width") else 10_000
        if stem not in best or width > best[stem][2]:
            best[stem] = (*rank, width, u)

    return [v[3] for v in sorted(best.values())]


def fetch_no_image_products(conn) -> list[tuple[str, str, str]]:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.id, p.slug, p.name
            FROM "Product" p
            WHERE p."deletedAt" IS NULL
              AND NOT EXISTS (SELECT 1 FROM "ProductImage" i WHERE i."productId" = p.id)
            ORDER BY p.name
        """)
        return cur.fetchall()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--refresh-sitemap", action="store_true",
                    help="tải lại chỉ mục sitemap DMCL thay vì dùng bản đã lưu")
    ap.add_argument("--max-add", type=int, default=6, help="tối đa N ảnh/sản phẩm")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--delay", type=float, default=0.4, help="nghỉ giữa 2 request/worker")
    ap.add_argument("--timeout", type=int, default=40)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    session = requests.Session()
    session.headers["User-Agent"] = UA

    if args.refresh_sitemap or not SITEMAP_CACHE.exists():
        print("Đang dựng chỉ mục sitemap DMCL…")
        urls = build_sitemap_index(session)
        SITEMAP_CACHE.write_text(json.dumps(urls), encoding="utf-8")
    else:
        urls = json.loads(SITEMAP_CACHE.read_text(encoding="utf-8"))
    print(f"URL sản phẩm DMCL trong chỉ mục: {len(urls)}")

    slug_flat = [(flat(u.rsplit("/", 1)[1]), u) for u in urls]

    db = database_url()
    with psycopg.connect(db) as conn:
        targets = fetch_no_image_products(conn)
    print(f"Sản phẩm không có ảnh nào       : {len(targets)}")

    matches = []
    for pid, slug, name in targets:
        brands = brand_tokens(name)
        for code in model_codes(name):
            found = [u for sf, u in slug_flat if code in sf]
            if not found:
                continue
            ok = [u for u in found
                  if any(b in flat(u.rsplit("/", 1)[1]) for b in brands)]
            if ok:
                matches.append({"id": pid, "slug": slug, "name": name,
                                "code": code, "dmclUrl": ok[0]})
            break
    MATCH_OUT.write_text(json.dumps(matches, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Khớp được mã model trên DMCL    : {len(matches)}")

    if args.dry_run:
        for m in matches:
            print(f"   [{m['code']}] {m['name'][:44]:<44} -> {m['dmclUrl'].split('/', 3)[3]}")
        print("\n(dry-run: không gọi trang chi tiết, không ghi DB)")
        return 0
    if not matches:
        return 0

    def work(m):
        time.sleep(args.delay)
        try:
            r = session.get(m["dmclUrl"], timeout=args.timeout, allow_redirects=True)
            r.raise_for_status()
            return m, parse_dmcl_all(r.text)[:args.max_add], None
        except Exception as exc:                       # noqa: BLE001
            return m, [], exc

    rows: list[tuple[str, str, int, bool]] = []
    filled = empty = failed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for m, imgs, exc in pool.map(work, matches):
            if exc is not None:
                failed += 1
                print(f"  ✗ {m['slug']}: {exc}")
            elif not imgs:
                empty += 1
                print(f"  – {m['slug']}: trang không có ảnh gallery")
            else:
                filled += 1
                # Ảnh đầu làm ảnh đại diện, đúng quy ước displayOrder 0 + isPrimary.
                rows += [(m["id"], u, i, i == 0) for i, u in enumerate(imgs)]
                print(f"  ✓ {m['slug']}: +{len(imgs)} ảnh")

    if rows:
        with psycopg.connect(db) as conn, conn.cursor() as cur:
            cur.executemany(
                'INSERT INTO "ProductImage" (id, "productId", url, "displayOrder", "isPrimary")'
                " VALUES (gen_random_uuid()::text, %s, %s, %s, %s)", rows)
            conn.commit()

    print(f"\n✅ {filled} sản phẩm được vá ({len(rows)} ảnh), "
          f"{empty} trang không có ảnh, {failed} lỗi.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
