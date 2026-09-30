#!/usr/bin/env python3
"""Crawl lại mô tả + ảnh minh họa cho sản phẩm Điện máy Chợ Lớn.

VÌ SAO CẦN SCRIPT NÀY
--------------------
Crawler cũ lấy mô tả từ `.info_pro-tab`, nhưng div đó bao trọn cả tab "Hình
sản phẩm" phía trên. Kết quả:
  - `descriptionImages` chứa ảnh SẢN PHẨM (tên file `...-main--991.png`,
    `...-multi-0.png`) -> hiện lặp với gallery trên trang chi tiết.
  - Marker `[DESCIMG:n]` bị dồn hết lên đầu bài viết.
Đã sửa selector trong sites/dienmaycholon.py sang `.des_pro`. Script này dùng
lại chính `parse_detail` của crawler nên bài mô tả và danh sách ảnh luôn khớp.

Đầu ra: JSON {slug: {"description": str, "images": [url, ...]}}.
Script KHÔNG ghi DB và KHÔNG tải ảnh — việc đó làm ở bước sau
(mirror_to_r2.py rồi script cập nhật DB).

Cách chạy:
    python crawler/fetch_dmcl_descriptions.py --out crawler/out/dmcl-descriptions.json
    python crawler/fetch_dmcl_descriptions.py --out ... --limit 20   # thử trước
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
import types
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

# sites/dienmaycholon.py import crawl4ai ở đầu file cho phần crawl, còn
# parse_detail thì không dùng. Stub ra để import được mà không cài crawl4ai.
if "crawl4ai" not in sys.modules:
    _stub = types.ModuleType("crawl4ai")
    for _attr in ("CacheMode", "CrawlerRunConfig", "AsyncWebCrawler", "BrowserConfig"):
        setattr(_stub, _attr, type(_attr, (), {}))
    sys.modules["crawl4ai"] = _stub

from sites.dienmaycholon import parse_detail  # noqa: E402

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
SOURCE = "DIEN_MAY_CHO_LON"


def log(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def fetch(url: str, timeout: int = 30) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8", "ignore")
    except Exception:
        return None


def load_targets(source_json: str) -> list[tuple[str, str]]:
    products = json.load(open(source_json, encoding="utf-8"))["products"]
    targets: list[tuple[str, str]] = []
    for p in products:
        if p.get("source") != SOURCE:
            continue
        url = None
        for v in p.get("variants") or []:
            u = (v.get("attributes") or {}).get("sourceUrl")
            if u:
                url = u
                break
        if url and p.get("slug"):
            targets.append((p["slug"], url))
    return targets


def main() -> None:
    ap = argparse.ArgumentParser(description="Crawl lại mô tả + ảnh Điện máy Chợ Lớn")
    ap.add_argument("--out", required=True)
    ap.add_argument(
        "--source-json",
        default=str(ROOT / "out" / "megamart-products.json"),
        help="file nguồn chứa slug + sourceUrl (mặc định là dataset crawler)",
    )
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--workers", type=int, default=10)
    args = ap.parse_args()

    targets = load_targets(args.source_json)
    if args.limit:
        targets = targets[: args.limit]
    log(f"Sản phẩm {SOURCE}: {len(targets)}")

    out: dict[str, dict] = {}
    lock = threading.Lock()
    stats = {"ok": 0, "no_desc": 0, "fetch_fail": 0, "img": 0}

    def work(item: tuple[str, str]) -> None:
        slug, url = item
        html = fetch(url)
        if not html:
            with lock:
                stats["fetch_fail"] += 1
            return
        parsed = parse_detail(html)
        if not parsed or not parsed.get("description"):
            with lock:
                stats["no_desc"] += 1
            return
        images = parsed.get("descriptionImages") or []
        with lock:
            out[slug] = {"description": parsed["description"], "images": images}
            stats["ok"] += 1
            stats["img"] += len(images)

    done = 0
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(work, targets))
        done = len(targets)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    log(f"Xong {done} trang: có mô tả {stats['ok']}, không mô tả {stats['no_desc']}, lỗi tải {stats['fetch_fail']}")
    log(f"Tổng ảnh minh họa: {stats['img']}")
    log(f"Ghi vào {args.out}")


if __name__ == "__main__":
    main()
