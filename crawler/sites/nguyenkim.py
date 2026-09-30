"""Cào sản phẩm từ Nguyễn Kim bằng Crawl4AI.

Nguyễn Kim chạy Next.js: toàn bộ dữ liệu sản phẩm của trang danh mục đã nằm sẵn
trong `__NEXT_DATA__` (props.pageProps.pageDetail) nên không phải parse DOM.
Phân trang bằng `?page=N`, mỗi trang 25 sản phẩm.

Trang danh mục và trang chi tiết dùng chung `__NEXT_DATA__` nhưng khác shape:
listing để `pageDetail.data` là *mảng* sản phẩm, còn chi tiết để `pageDetail.data`
là *một* sản phẩm kèm `properties` (bảng thông số kỹ thuật), `brandName`,
`warranty`, `origin` - những thứ listing không có. `parse_detail()` đọc phần đó
để enrich_details.py bù vào sau vòng cào danh mục.
"""

from __future__ import annotations

import json
import re

from crawl4ai import CacheMode, CrawlerRunConfig

from normalize import (
    build_product,
    extract_description_images,
    guess_brand,
    html_to_text,
    img_basename,
    normalize_brand,
    slugify,
)

SOURCE = "NGUYEN_KIM"
BASE_URL = "https://www.nguyenkim.com"
PAGE_SIZE = 25

_NEXT_DATA_RE = re.compile(
    r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S
)


def run_config() -> CrawlerRunConfig:
    return CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        # __NEXT_DATA__ là thẻ <script> (không "visible") nên phải chờ bằng JS
        wait_for="js:() => !!document.getElementById('__NEXT_DATA__')",
        page_timeout=60_000,
        verbose=False,
    )


def category_url(path: str, page: int = 1) -> str:
    url = f"{BASE_URL}/{path.lstrip('/')}"
    return url if page <= 1 else f"{url}?page={page}"


def _vi(value) -> str | None:
    """Các trường đa ngôn ngữ của Nguyễn Kim có dạng {"vi": "..."}."""
    if isinstance(value, dict):
        return value.get("vi") or value.get("en")
    return value if isinstance(value, str) else None


def extract_page_detail(html: str) -> dict | None:
    m = _NEXT_DATA_RE.search(html or "")
    if not m:
        return None
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return None
    return data.get("props", {}).get("pageProps", {}).get("pageDetail")


def extract_detail_data(html: str) -> dict | None:
    """`pageDetail.data` của trang chi tiết - một object sản phẩm, không phải mảng."""
    detail = extract_page_detail(html)
    data = (detail or {}).get("data")
    return data if isinstance(data, dict) else None


# "Khoảng giá" là facet của bộ lọc bên trái ("Từ 10 - 20 triệu"), không phải
# thông số của máy - đưa vào bảng chỉ làm nhiễu.
_FACET_LABELS = {"khoảng giá", "mức giá", "giá"}


def _spec_rows(properties: list | None) -> list[dict]:
    """`properties[]` -> [{"label": "Dung tích", "value": "4 lít"}].

    Mỗi property có `values[]` (nhiều giá trị với type multipleSelect) và các
    trường trình bày (image, icon, link) không cần cho bảng thông số.
    """
    rows: list[dict] = []
    for prop in sorted(properties or [], key=lambda x: x.get("order") or 0):
        label = _vi(prop.get("name"))
        values = [_vi(v.get("value")) for v in (prop.get("values") or [])]
        value = ", ".join(v.strip() for v in values if v and v.strip())
        if label and value and label.strip().lower() not in _FACET_LABELS:
            rows.append({"label": label.strip(), "value": value})
    return rows


def parse_detail(html: str) -> dict | None:
    """Dữ liệu trang chi tiết để bù cho sản phẩm đã lấy từ trang danh mục."""
    data = extract_detail_data(html)
    if not data:
        return None

    features = [
        _vi(f.get("value"))
        for f in sorted(data.get("outstandingFeatures") or [], key=lambda f: f.get("order", 0))
    ]
    features = [f.strip() for f in features if f and f.strip()]

    specs_table = _spec_rows(data.get("properties"))
    # Ba trường này nằm ngoài `properties` nhưng khách vẫn muốn thấy trong bảng.
    # `properties` hay đã có sẵn cùng nội dung dưới tên khác ("Nơi sản xuất" =
    # "Xuất xứ", "Thời gian bảo hành" = "Bảo hành") nên so trùng theo giá trị.
    known_values = {row["value"].strip().lower() for row in specs_table}
    for label, value in (
        ("Model", (data.get("model") or "").strip()),
        ("Xuất xứ", (data.get("origin") or "").strip()),
        ("Bảo hành", f"{data['warranty']} tháng" if data.get("warranty") else ""),
    ):
        if value and value.lower() not in known_values:
            specs_table.append({"label": label, "value": value})
            known_values.add(value.lower())

    images = [data.get("thumbnail")] + list(data.get("images") or [])

    # Bài mô tả của NK hay nhúng lại đúng ảnh sản phẩm đầu trang. Loại ngay
    # từ khâu cào, kẻo cùng một ảnh hiện cả ở gallery lẫn trong bài viết.
    gallery_names = {img_basename(i) for i in images if i}
    raw_description = _vi(data.get("description"))
    return {
        "description": html_to_text(
            raw_description, max_len=0, mark_images=True, base_url=BASE_URL, exclude=gallery_names
        )
        or _vi(data.get("shortDescription"))
        or ("\n".join(features) if features else None),
        "descriptionImages": extract_description_images(
            raw_description, BASE_URL, exclude=gallery_names
        ),
        "brand": normalize_brand(_vi(data.get("brandName")) or _vi(data.get("brand"))),
        "specs": features,
        "specsTable": specs_table,
        "images": [i for i in images if i],
    }


def parse_products(page_detail: dict, category_slug: str, default_stock: int) -> list[dict]:
    products: list[dict] = []

    for item in page_detail.get("data") or []:
        name = _vi(item.get("name"))
        if not name:
            continue

        slugs = item.get("slugs") or {}
        slug_value = _vi((slugs.get("value") or {})) or slugify(name)
        product_slug = f"{slug_value}{slugs.get('postfix') or ''}"
        url = f"{BASE_URL}/{product_slug}"

        # price = giá niêm yết, finalPrice = giá bán hiện tại
        price = item.get("price") or None
        final_price = item.get("finalPrice") or item.get("mediaPrice") or None
        if price and final_price and final_price < price:
            sale_price = final_price
        else:
            price = price or final_price
            sale_price = None

        images = [item.get("thumbnail")] + list(item.get("images") or [])

        features = [
            _vi(f.get("value"))
            for f in sorted(
                item.get("outstandingFeatures") or [], key=lambda f: f.get("order", 0)
            )
        ]
        features = [f for f in features if f]
        # Trang danh mục đã kèm sẵn bài mô tả đầy đủ (HTML) chứ không chỉ
        # shortDescription - dùng luôn để sản phẩm có mô tả ngay cả khi bỏ qua
        # bước enrich_details.py.
        description = (
            html_to_text(_vi(item.get("description")))
            or _vi(item.get("shortDescription"))
            or ("\n".join(features) if features else None)
        )

        in_stock = item.get("stockStatus") != "outOfStock"

        product = build_product(
            source=SOURCE,
            source_url=url,
            name=name,
            slug=slugify(product_slug),
            category_slug=category_slug,
            brand=guess_brand(name),
            description=description,
            price=price,
            sale_price=sale_price,
            images=[i for i in images if i],
            sold_count=int(item.get("orderQuantity") or 0),
            stock=default_stock if in_stock else 0,
            sku=(item.get("code") or "").strip().upper() or None,
            specs=features,
            extra={
                "sourceCategory": _vi((item.get("cat") or {}).get("name")),
                "stockStatus": item.get("stockStatus"),
            },
        )
        if product:
            products.append(product)

    return products
