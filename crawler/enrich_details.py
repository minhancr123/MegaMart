#!/usr/bin/env python3
"""Bù mô tả + thông số kỹ thuật cho sản phẩm đã cào từ trang danh mục.

Vòng cào chính chỉ đọc trang *danh mục*, mà trang danh mục không có bảng thông
số kỹ thuật và (với Điện Máy Chợ Lớn) cũng không có bài mô tả. Kết quả: trang
chi tiết trên storefront gần như trống - 1.532/2.936 sản phẩm `description`
NULL, 1.537 variant không có `specs`.

Script này mở trang chi tiết của từng sản phẩm để lấy phần còn thiếu:

  - Nguyễn Kim      : __NEXT_DATA__ -> pageDetail.data.{description, properties,
                      brandName, warranty, origin, model, images}
  - Điện Máy Chợ Lớn: .info_pro-tab (bài mô tả) + nav.list_specifications
                      (bảng thông số, có chia nhóm) + .feature_pro

Cả hai sàn đều server-render trang chi tiết nên chỉ cần requests, không phải
bật Chromium như lúc cào danh mục.

    python enrich_details.py --dry-run --limit 20
    python enrich_details.py --source NGUYEN_KIM
    python enrich_details.py

Ghi trực tiếp vào file JSON (mặc định out/megamart-products.json) và lưu tiến độ
sau mỗi lô, nên đứt giữa chừng thì chạy lại - sản phẩm đã enrich sẽ bị bỏ qua
(trừ khi truyền --force). Chạy xong nhớ import_to_db.py để đẩy vào database.
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

import config  # noqa: E402
from sites import dienmaycholon as dmcl  # noqa: E402
from sites import nguyenkim as nk  # noqa: E402

PARSERS = {
    "NGUYEN_KIM": nk.parse_detail,
    "DIEN_MAY_CHO_LON": dmcl.parse_detail,
}

# Ảnh trong JSON có thể đã được mirror_images.py đổi sang res.cloudinary.com;
# đừng để ảnh gốc trên CDN nguồn chèn lại thành bản trùng.
MIRROR_HOST = "res.cloudinary.com"


def is_enriched(product: dict) -> bool:
    attrs = (product.get("variants") or [{}])[0].get("attributes") or {}
    return "specsTable" in attrs


def merge(product: dict, detail: dict, max_images: int) -> bool:
    """Ghi phần cào được vào product. Trả về True nếu có gì đó thay đổi."""
    changed = False
    attrs = product["variants"][0].setdefault("attributes", {})

    # Mô tả trang chi tiết luôn dài và đầy đủ hơn thứ ghép từ trang danh mục.
    description = detail.get("description")
    if description and description != product.get("description"):
        product["description"] = description
        changed = True

    # Ảnh minh họa xen trong bài mô tả (đánh dấu vị trí bằng [DESCIMG:n]).
    desc_images = [u for u in (detail.get("descriptionImages") or []) if u][:10]
    if desc_images != (product.get("descriptionImages") or []):
        product["descriptionImages"] = desc_images
        changed = True

    brand = detail.get("brand")
    if brand and brand != product.get("brand"):
        product["brand"] = brand
        changed = True

    specs = detail.get("specs")
    if specs and specs != attrs.get("specs"):
        attrs["specs"] = specs
        changed = True

    specs_table = detail.get("specsTable")
    if specs_table and specs_table != attrs.get("specsTable"):
        attrs["specsTable"] = specs_table
        changed = True

    images = product.setdefault("images", [])
    # So khớp theo URL gốc: ảnh đã mirror giữ link cũ ở sourceUrl.
    have = {img.get("sourceUrl") or img["url"] for img in images}
    room = max_images - len(images)
    for url in detail.get("images") or []:
        if room <= 0:
            break
        if url in have or MIRROR_HOST in url:
            continue
        have.add(url)
        room -= 1
        images.append(
            {
                "url": url,
                "alt": product["name"],
                "isPrimary": not images,
                "displayOrder": len(images),
            }
        )
        changed = True

    return changed


def main() -> int:
    ap = argparse.ArgumentParser(description="Bù mô tả + thông số từ trang chi tiết")
    ap.add_argument("--file", default=str(ROOT / "out" / "megamart-products.json"))
    ap.add_argument("--source", choices=sorted(PARSERS), help="chỉ xử lý một sàn")
    ap.add_argument("--limit", type=int, help="chỉ xử lý N sản phẩm đầu")
    ap.add_argument("--workers", type=int, default=6, help="số request song song")
    ap.add_argument("--delay", type=float, default=0.3, help="nghỉ giữa 2 request/worker (giây)")
    ap.add_argument("--timeout", type=int, default=30)
    ap.add_argument("--max-images", type=int, default=12, help="tối đa N ảnh mỗi sản phẩm")
    ap.add_argument("--force", action="store_true", help="cào lại cả sản phẩm đã enrich")
    ap.add_argument("--dry-run", action="store_true", help="không ghi file")
    args = ap.parse_args()

    path = Path(args.file)
    payload = json.loads(path.read_text(encoding="utf-8"))
    products = payload["products"]

    jobs = [
        p
        for p in products
        if p.get("sourceUrl")
        and p.get("source") in PARSERS
        and (args.source is None or p["source"] == args.source)
        and (args.force or not is_enriched(p))
    ]
    if args.limit:
        jobs = jobs[: args.limit]

    done = sum(1 for p in products if is_enriched(p))
    print(f"📄 {path.name}: {len(products)} sản phẩm, {done} đã có thông số")
    print(f"🔎 cần cào trang chi tiết: {len(jobs)}"
          f"  ({args.workers} luồng, nghỉ {args.delay}s/request)")
    if not jobs:
        return 0

    session_local = threading.local()
    lock = threading.Lock()
    updated = unchanged = failed = 0
    since_save = 0

    def work(product: dict):
        s = getattr(session_local, "s", None)
        if s is None:
            s = session_local.s = requests.Session()
            s.headers["User-Agent"] = config.USER_AGENT
            s.headers["Accept-Language"] = "vi,en;q=0.8"
        time.sleep(args.delay)  # cào chậm lại cho lịch sự
        r = s.get(product["sourceUrl"], timeout=args.timeout, allow_redirects=True)
        r.raise_for_status()
        return product, PARSERS[product["source"]](r.text)

    def save() -> None:
        payload["meta"]["enrichedAt"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
        payload["meta"]["enrichedCount"] = sum(1 for p in products if is_enriched(p))
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(work, p): p for p in jobs}
        for i, fut in enumerate(as_completed(futures), 1):
            try:
                product, detail = fut.result()
            except Exception as exc:  # noqa: BLE001
                with lock:
                    failed += 1
                    if failed <= 8:
                        print(f"  ✗ {futures[fut]['slug']}: {exc}")
            else:
                with lock:
                    if detail and merge(product, detail, args.max_images):
                        updated += 1
                        since_save += 1
                    else:
                        unchanged += 1
                        # Đánh dấu đã ghé qua để lần chạy sau không cào lại.
                        product["variants"][0].setdefault("attributes", {}).setdefault(
                            "specsTable", []
                        )
                    if not args.dry_run and since_save >= 200:
                        save()
                        since_save = 0
            if i % 200 == 0:
                print(f"  ... {i}/{len(jobs)}  ({updated} cập nhật, {failed} lỗi)", flush=True)

    if not args.dry_run:
        save()

    with_desc = sum(1 for p in products if p.get("description"))
    with_specs = sum(
        1
        for p in products
        if (p.get("variants") or [{}])[0].get("attributes", {}).get("specsTable")
    )
    print(
        f"\n✅ {updated} sản phẩm được bù dữ liệu, {unchanged} không có gì thêm, "
        f"{failed} lỗi."
    )
    print(f"   Toàn file: {with_desc}/{len(products)} có mô tả • "
          f"{with_specs}/{len(products)} có bảng thông số")
    if args.dry_run:
        print("   (dry-run: không ghi file)")
    else:
        print(f"   Đã ghi {path}. Bước tiếp theo: python import_to_db.py --file {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
