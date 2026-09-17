"""Cào sản phẩm từ Điện Máy Chợ Lớn bằng Crawl4AI.

Trang danh mục không có ?page=N: 15 sản phẩm đầu được render sẵn, phần còn lại
nạp thêm mỗi lần bấm nút "Xem thêm N sản phẩm" (.see_more_cat), và ảnh thì
lazy-load theo scroll. Vì vậy bắt buộc phải render bằng trình duyệt. `/api/*` bị
chặn trong robots.txt của họ nên crawler này chỉ thao tác trên DOM.

Trang chi tiết thì ngược lại: server render sẵn toàn bộ, không cần trình duyệt.
`parse_detail()` đọc bài mô tả (.info_pro-tab) và bảng thông số kỹ thuật
(nav.list_specifications) - hai thứ trang danh mục hoàn toàn không có - để
enrich_details.py bù vào sau.
"""

from __future__ import annotations

import re

from bs4 import BeautifulSoup
from crawl4ai import CacheMode, CrawlerRunConfig

from normalize import (
    build_product,
    extract_description_images,
    html_to_text,
    make_sku,
    normalize_brand,
    parse_price,
    slugify,
)

SOURCE = "DIEN_MAY_CHO_LON"
BASE_URL = "https://dienmaycholon.vn"

# Bấm "Xem thêm" cho tới khi đủ số sản phẩm, rồi cuộn để lazy-load ảnh.
# Lưu ý: Crawl4AI bọc js_code trong `await (async () => { ... })()` nên ở đây
# viết dạng câu lệnh có top-level await, KHÔNG bọc IIFE (IIFE sẽ không được await).
_LOAD_MORE_JS = """
  const target = %TARGET%;
  let last = 0, stagnant = 0;
  for (let i = 0; i < 40; i++) {
    const n = document.querySelectorAll('.products .product').length;
    if (n >= target) break;
    if (n === last) { if (++stagnant >= 3) break; } else { stagnant = 0; last = n; }
    const box = document.querySelector('.see_more_cat');
    if (!box) break;
    (box.querySelector('a,button') || box).click();
    await new Promise(r => setTimeout(r, 2000));
  }
  const step = Math.max(400, window.innerHeight - 100);
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise(r => setTimeout(r, 220));
  }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
  return document.querySelectorAll('.products .product').length;
"""

_RATING_RE = re.compile(r"([\d.,]+)\s*/\s*5\s*\((\d+)\)")


def run_config(limit: int) -> CrawlerRunConfig:
    return CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        wait_for="css:.products .product",
        js_code=_LOAD_MORE_JS.replace("%TARGET%", str(limit)),
        page_timeout=180_000,
        delay_before_return_html=1.0,
        verbose=False,
    )


def category_url(path: str) -> str:
    return f"{BASE_URL}/{path.lstrip('/')}"


def _text(node) -> str:
    return " ".join(node.get_text(" ", strip=True).split()) if node else ""


def parse_listing(html: str, category_slug: str, limit: int, stock: int) -> list[dict]:
    """Trích sản phẩm từ HTML trang danh mục đã render."""
    soup = BeautifulSoup(html, "html.parser")
    products: list[dict] = []

    for card in soup.select(".products .product"):
        link = card.select_one("a.img_pro") or card.select_one("a.name_pro")
        if not link or not link.get("href"):
            continue
        href = link["href"]
        url = href if href.startswith("http") else f"{BASE_URL}{href}"
        product_slug = slugify(href.rstrip("/").rsplit("/", 1)[-1])
        if not product_slug:
            continue

        heading = card.select_one("h3.name_pro") or card.select_one(".name_pro")
        name = _text(heading)
        if not name:
            continue
        strong = heading.select_one("strong") if heading else None
        brand = _text(strong) or None

        img = card.select_one("a.img_pro img")
        image = None
        if img:
            image = img.get("data-src") or img.get("data-original") or img.get("src")
            if image and image.startswith("data:"):
                image = None
            if image and image.startswith("//"):
                image = "https:" + image

        specs = [_text(s) for s in card.select(".item_attr span") if _text(s)]

        sale_price = parse_price(_text(card.select_one(".price_sale")))
        price = parse_price(_text(card.select_one(".discount .price_market")))
        percent_text = _text(card.select_one(".discount_percent"))
        percent = None
        if percent_text:
            m = re.search(r"(\d+)", percent_text)
            percent = int(m.group(1)) if m else None

        rating = review_count = None
        m = _RATING_RE.search(_text(card.select_one(".evaluate")))
        if m:
            rating = float(m.group(1).replace(",", "."))
            review_count = int(m.group(2))

        gift = _text(card.select_one(".gift_detail"))

        description = ", ".join(specs) if specs else None
        if description:
            description = f"{name} - {description}."

        product = build_product(
            source=SOURCE,
            source_url=url,
            name=name,
            slug=product_slug,
            category_slug=category_slug,
            brand=brand,
            description=description,
            price=price,
            sale_price=sale_price,
            percent=percent,
            images=[image] if image else [],
            stock=stock,
            sku=make_sku("DMCL", product_slug),
            rating=rating,
            review_count=review_count,
            specs=specs,
            extra={"gift": gift} if gift else None,
        )
        if product:
            products.append(product)
        if len(products) >= limit:
            break

    return products


# --------------------------------------------------------------------------
# Trang chi tiết
# --------------------------------------------------------------------------
# nav.list_specifications > ul > li:
#   <li class="title-specification"><strong>Nhóm</strong></li>   -> tiêu đề nhóm
#   <li><p>Nhãn</p><p>Giá trị</p></li>                           -> một dòng thông số
_SPEC_LIST_SELECTOR = "nav.list_specifications li, .list_specifications li"

# Bài mô tả nằm trong .info_pro-tab, lẫn cả khối "Đánh giá"/"Kinh nghiệm" phía
# sau nên cắt tại các heading đó.
_DESC_STOP_RE = re.compile(
    r"^(Đánh giá sản phẩm|Kinh nghiệm khi mua|Sản phẩm liên quan|Hỏi đáp)\b", re.I
)


def _spec_rows(soup: BeautifulSoup) -> list[dict]:
    rows: list[dict] = []
    group: str | None = None
    for li in soup.select(_SPEC_LIST_SELECTOR):
        classes = li.get("class") or []
        if "title-specification" in classes:
            group = _text(li) or None
            continue
        cells = li.find_all("p", recursive=False) or li.find_all("p")
        if len(cells) < 2:
            continue
        label = _text(cells[0])
        # <br> trong ô giá trị ngăn các gạch đầu dòng -> giữ lại thành xuống dòng
        value = html_to_text(cells[1].decode_contents(), max_len=600)
        if label and value:
            rows.append({"label": label, "value": value, **({"group": group} if group else {})})
    return rows


def parse_detail(html: str) -> dict | None:
    """Mô tả + thông số kỹ thuật + gallery từ trang chi tiết đã render sẵn."""
    soup = BeautifulSoup(html, "html.parser")

    specs_table = _spec_rows(soup)

    desc_node = soup.select_one(".info_pro-tab")
    description = None
    description_images: list[str] = []
    if desc_node:
        desc_html = desc_node.decode_contents()
        all_images = extract_description_images(desc_html, BASE_URL)
        lines = []
        for line in (html_to_text(desc_html, max_len=0, mark_images=True, base_url=BASE_URL) or "").split("\n"):
            if _DESC_STOP_RE.match(line):
                break
            lines.append(line)
        # Chỉ giữ ảnh còn marker sau khi cắt (ảnh sau "Đánh giá sản phẩm"
        # bị loại) và đánh lại index cho khớp.
        used = sorted(
            {int(m) for line in lines for m in re.findall(r"\[DESCIMG:(\d+)\]", line)}
        )
        used = [o for o in used if o < len(all_images)]
        remap = {old: new for new, old in enumerate(used)}
        description_images = [all_images[o] for o in used]
        lines = [
            re.sub(r"\[DESCIMG:(\d+)\]", lambda m: f"[DESCIMG:{remap[int(m.group(1))]}]", line)
            for line in lines
        ]
        description = html_to_text("\n".join(lines))

    features = [_text(li) for li in soup.select(".feature_pro .feature_item li")]
    features = [f for f in features if f]

    brand_node = soup.select_one(".trademark_detail a") or soup.select_one(".trademark_detail")
    brand = _text(brand_node).split(":")[-1].strip() if brand_node else ""

    images: list[str] = []
    for img in soup.select('.dmcl-gallery img, [data-gallery="images-gallery"] img'):
        src = img.get("data-src") or img.get("data-original") or img.get("src") or ""
        if src.startswith("//"):
            src = "https:" + src
        if src.startswith("http") and src not in images:
            images.append(src)

    return {
        "description": description,
        "descriptionImages": description_images,
        "brand": normalize_brand(brand),
        "specs": features,
        "specsTable": specs_table,
        "images": images,
    }
