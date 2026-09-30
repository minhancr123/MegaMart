"""Chuẩn hoá dữ liệu cào được về đúng shape schema Prisma của MegaMart.

Một `Product` chuẩn hoá tương ứng:
    Product      -> slug / name / description / brand / categorySlug / soldCount
    ProductImage -> images[]
    Variant      -> variants[] (price, salePrice, discountPercent, stock, attributes)
"""

from __future__ import annotations

import hashlib
import re
import unicodedata

from bs4 import BeautifulSoup

# --------------------------------------------------------------------------
# Slug
# --------------------------------------------------------------------------
_VI_MAP = str.maketrans("đĐ", "dD")


def slugify(text: str, max_len: int = 90) -> str:
    """Chuyển tiếng Việt có dấu -> slug ascii (dùng cho Product.slug / Category.slug)."""
    text = (text or "").translate(_VI_MAP)
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:max_len].strip("-")


# --------------------------------------------------------------------------
# HTML -> text
# --------------------------------------------------------------------------
_BLOCK_TAGS = {
    "p", "div", "section", "article", "br", "hr", "tr", "table", "ul", "ol",
    "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "figure",
    "figcaption",
}


def _normalize_img_src(src: str | None, base_url: str = "") -> str | None:
    """Chuẩn hoá src ảnh mô tả: bỏ data-URI, nối // và relative URL."""
    src = (src or "").strip()
    if not src or src.startswith("data:"):
        return None
    if src.startswith("//"):
        src = "https:" + src
    elif base_url and src.startswith("/"):
        src = base_url.rstrip("/") + src
    if not src.startswith("http"):
        return None
    return src


def img_basename(url: str | None) -> str:
    """Khóa so khớp ảnh: bỏ query, đuôi file (kể cả đuôi kép `.png.webp`)
    và hậu tố kích thước (`_450`, `_182_1020`). Giữ số sau `-`/`--` vì đó là
    định danh ảnh (`-main--991` khác `-main--992`).
    """
    name = ((url or "").split("/")[-1].split("?")[0] or "").lower()
    name = re.sub(r"(\.\w+)+$", "", name)
    # Như basename() bên TS: chỉ gọt hậu tố kích thước 2-4 chữ số.
    return re.sub(r"_\d{2,4}(_\d{2,4})*$", "", name)


def _iter_kept_images(
    soup: "BeautifulSoup",
    base_url: str = "",
    exclude: set[str] | None = None,
) -> list[str]:
    """URL ảnh nội dung giữ lại, theo đúng thứ tự xuất hiện trong HTML.

    Bỏ icon/tracking pixel (có width/height < 100px), trùng URL, và ảnh đã
    có trong `exclude` (tên file rút gọn qua `img_basename`). `exclude`
    thường là gallery của chính sản phẩm — sàn hay nhúng lại ảnh sản phẩm
    đầu bài mô tả, giữ lại sẽ khiến cùng một ảnh hiện cả ở carousel lẫn
    trong bài viết.
    """
    urls: list[str] = []
    seen: set[str] = set()
    for img in soup.find_all("img"):
        src = _normalize_img_src(
            img.get("data-src") or img.get("data-original") or img.get("src"),
            base_url,
        )
        if not src or src in seen:
            continue
        if exclude and img_basename(src) in exclude:
            continue
        try:
            w = int(img.get("width") or 0)
            h = int(img.get("height") or 0)
        except (TypeError, ValueError):
            w = h = 0
        if w and h and max(w, h) < 100:
            continue
        seen.add(src)
        urls.append(src)
    return urls


def extract_description_images(
    html: str | None,
    base_url: str = "",
    exclude: set[str] | None = None,
) -> list[str]:
    """Tách URL ảnh minh họa trong HTML mô tả (tối đa 10 ảnh/sản phẩm)."""
    if not html or "<" not in html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    return _iter_kept_images(soup, base_url, exclude)[:10]


def html_to_text(
    html: str | None,
    max_len: int = 6000,
    mark_images: bool = False,
    base_url: str = "",
    exclude: set[str] | None = None,
) -> str | None:
    """Bài mô tả của cả hai sàn là HTML (heading, ảnh banner, link về site gốc).

    Product.description là cột text và được render như text ở nhiều nơi
    (ProductVariants, giỏ hàng, admin) nên nhét HTML thô vào sẽ vỡ hết. Rút
    thành text có xuống dòng: heading và <li> thành từng dòng riêng, <a> chỉ
    giữ chữ (bỏ link sang sàn nguồn), <img>/<script>/<style> bỏ hẳn.

    mark_images=True: thay mỗi ảnh giữ lại bằng marker dòng riêng
    "[DESCIMG:n]" (n là index trong extract_description_images của cùng HTML)
    để frontend biết vị trí chèn ảnh minh họa. `exclude` là tập tên rút gọn
    (qua `img_basename`) của ảnh gallery: ảnh đã có trong gallery thì không
    đưa vào bài viết nữa.
    """
    if not html:
        return None
    if "<" not in html:  # đã là text thuần
        text = html
    else:
        soup = BeautifulSoup(html, "html.parser")
        if mark_images:
            # Cắt [:10] giống extract_description_images: nếu không, bài trên
            # 10 ảnh sẽ sinh marker [DESCIMG:10+] mà descriptionImages không
            # có phần tử tương ứng -> frontend đọc ra undefined, vỡ khung.
            kept = _iter_kept_images(soup, base_url, exclude)[:10]
            kept_set = set(kept)
            emitted: set[str] = set()
            for img in soup.find_all("img"):
                src = _normalize_img_src(
                    img.get("data-src") or img.get("data-original") or img.get("src"),
                    base_url,
                )
                if src and src in kept_set and src not in emitted:
                    emitted.add(src)
                    marker = soup.new_string(f"\n[DESCIMG:{kept.index(src)}]\n")
                    img.replace_with(marker)
                else:
                    img.decompose()
            for tag in soup(["script", "style", "noscript", "iframe", "svg"]):
                tag.decompose()
        else:
            for tag in soup(["script", "style", "noscript", "iframe", "img", "svg"]):
                tag.decompose()
        for li in soup.find_all("li"):
            li.insert(0, "• ")
        for tag in soup.find_all(_BLOCK_TAGS):
            tag.insert_before("\n")
        text = soup.get_text(" ")

    lines = [" ".join(line.split()) for line in text.split("\n")]
    out: list[str] = []
    for line in lines:
        if not line:
            if out and out[-1]:
                out.append("")
            continue
        if out and out[-1] == line:  # heading lặp lại ngay dòng dưới
            continue
        out.append(line)
    text = "\n".join(out).strip()
    if max_len and len(text) > max_len:
        text = text[:max_len].rsplit("\n", 1)[0].rstrip() + "\n…"
    return text or None


def make_sku(prefix: str, *parts: str) -> str:
    """SKU duy nhất, chỉ gồm [A-Z0-9-].

    Tên sản phẩm dài bị cắt còn 60 ký tự, nên thêm hash ngắn của chuỗi gốc để
    hai sản phẩm khác nhau (vd bản Silver / Black) không đụng SKU.
    """
    raw = "-".join(p for p in parts if p)
    if not raw:
        return prefix
    short = re.sub(r"[^A-Za-z0-9]+", "-", slugify(raw, 60).upper()).strip("-")
    if len(slugify(raw, 500)) > 60:
        digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:6].upper()
        short = f"{short}-{digest}"
    return f"{prefix}-{short}" if short else prefix


# --------------------------------------------------------------------------
# Giá
# --------------------------------------------------------------------------
def parse_price(text: str | None) -> int | None:
    """'21.490.000đ' -> 21490000. Trả None nếu bị che ('XX.XXX.000') hoặc không có số."""
    if not text:
        return None
    if "X" in text or "x.xxx" in text.lower():
        return None
    digits = re.sub(r"[^\d]", "", text.split("đ")[0] if "đ" in text else text)
    if not digits:
        return None
    value = int(digits)
    # Giá VND hợp lệ: từ 1.000đ tới 2 tỷ
    return value if 1_000 <= value <= 2_000_000_000 else None


def discount_percent(price: int | None, sale_price: int | None) -> int | None:
    if not price or not sale_price or sale_price >= price:
        return None
    return round((price - sale_price) * 100 / price)


# --------------------------------------------------------------------------
# Thương hiệu
# --------------------------------------------------------------------------
BRANDS = [
    "Samsung", "LG", "Sony", "Panasonic", "Toshiba", "Sharp", "Hitachi", "Daikin",
    "Electrolux", "Casper", "TCL", "Hisense", "Philips", "Xiaomi", "Aqua", "AQUA",
    "Beko", "Whirlpool", "Candy", "Bosch", "Hafele", "Junger", "Galanz", "Comfee",
    "Midea", "Funiki", "Nagakawa", "Mitsubishi Electric", "Mitsubishi Heavy",
    "Mitsubishi", "Gree", "Lenson", "Sanaky", "Alaska", "Kangaroo", "Sunhouse",
    "Karofi", "Mutosi", "Coway", "Daewoo", "Rangdong", "Rạng Đông", "Kyoritsu",
    "Apple", "iPhone", "iPad", "MacBook", "Oppo", "OPPO", "Vivo", "Realme",
    "Honor", "Huawei", "Nokia", "Tecno", "Infinix", "Masstel", "Itel", "Asus",
    "Acer", "Dell", "HP", "Lenovo", "MSI", "Gigabyte", "Huntkey", "Logitech",
    "Anker", "Baseus", "Ugreen", "JBL", "Marshall", "Harman Kardon", "Bose",
    "Soundmax", "Paramax", "Arirang", "Dyson", "Tefal", "Lock&Lock", "Elmich",
    "Happy Cook", "Supor", "Bear", "Cuckoo", "Cuchen", "Zojirushi", "Kohler",
    "Ariston", "Ferroli", "Rinnai", "Roborock", "Ecovacs", "Deerma", "Delonghi",
    "De'Longhi", "Nespresso", "Breville", "Braun", "Panasonic", "Kenwood",
    "Omron", "Microlife", "Beurer", "Medisana", "Osaka", "Sanei",
]
# So khớp thương hiệu dài trước để "Mitsubishi Electric" không bị nuốt bởi "Mitsubishi"
_BRAND_PATTERNS = sorted({b for b in BRANDS}, key=len, reverse=True)


def guess_brand(name: str) -> str | None:
    """Đoán thương hiệu từ tên sản phẩm (Nguyễn Kim không trả brand riêng)."""
    if not name:
        return None
    lowered = name.lower()
    for brand in _BRAND_PATTERNS:
        if re.search(rf"(?<![a-z0-9]){re.escape(brand.lower())}(?![a-z0-9])", lowered):
            if brand in ("iPhone", "iPad", "MacBook"):
                return "Apple"
            if brand == "AQUA":
                return "Aqua"
            if brand == "Rạng Đông":
                return "Rangdong"
            return brand
    return None


_BRAND_BY_LOWER = {b.lower(): b for b in reversed(BRANDS)}


def normalize_brand(raw: str | None) -> str | None:
    """Trang chi tiết trả brand viết hoa toàn bộ ("SAMSUNG", "DE'LONGHI").

    Đưa về đúng cách viết trong BRANDS để không ra hai thương hiệu "Samsung" và
    "SAMSUNG" song song trong bộ lọc; tên lạ thì Title Case cho dễ nhìn.
    """
    raw = " ".join((raw or "").split())
    if not raw:
        return None
    known = _BRAND_BY_LOWER.get(raw.lower())
    if known:
        return guess_brand(known) or known
    return raw if not raw.isupper() else raw.title()


# --------------------------------------------------------------------------
# Sản phẩm chuẩn hoá
# --------------------------------------------------------------------------
def build_product(
    *,
    source: str,
    source_url: str,
    name: str,
    slug: str,
    category_slug: str,
    brand: str | None = None,
    description: str | None = None,
    price: int | None = None,
    sale_price: int | None = None,
    percent: int | None = None,
    images: list[str] | None = None,
    sold_count: int = 0,
    stock: int = 0,
    sku: str | None = None,
    rating: float | None = None,
    review_count: int | None = None,
    specs: list[str] | None = None,
    extra: dict | None = None,
) -> dict | None:
    """Trả về dict đúng shape import, hoặc None nếu thiếu dữ liệu bắt buộc."""
    name = " ".join((name or "").split())
    if not name or not slug:
        return None

    # Không có giá nào đọc được -> bỏ, vì Variant.price là bắt buộc
    if price is None and sale_price is None:
        return None
    if price is None:
        price, sale_price = sale_price, None
    if sale_price is not None and sale_price >= price:
        sale_price = None
    if percent is None:
        percent = discount_percent(price, sale_price)

    seen: set[str] = set()
    clean_images: list[dict] = []
    for idx, url in enumerate(images or []):
        if not url or url.startswith("data:") or url in seen:
            continue
        seen.add(url)
        clean_images.append(
            {
                "url": url,
                "alt": name,
                "isPrimary": len(clean_images) == 0,
                "displayOrder": len(clean_images),
            }
        )

    attributes = {
        "source": source,
        "sourceUrl": source_url,
    }
    if specs:
        attributes["specs"] = specs
    if rating is not None:
        attributes["rating"] = rating
    if review_count is not None:
        attributes["reviewCount"] = review_count
    if extra:
        attributes.update(extra)

    return {
        "slug": slug,
        "name": name,
        "brand": brand,
        "description": description or None,
        "categorySlug": category_slug,
        "soldCount": sold_count,
        "source": source,
        "sourceUrl": source_url,
        "images": clean_images,
        "variants": [
            {
                "sku": sku or make_sku(source[:4], slug),
                "price": price,
                "salePrice": sale_price,
                "discountPercent": percent,
                "stock": stock,
                "attributes": attributes,
            }
        ],
    }


def dedupe(products: list[dict]) -> list[dict]:
    """Loại trùng theo slug; nếu trùng slug khác nguồn thì thêm hậu tố nguồn.

    Đồng thời đảm bảo SKU là duy nhất trên toàn bộ kết quả, vì Variant.sku là
    unique trong schema Prisma.
    """
    by_slug: dict[str, dict] = {}
    out: list[dict] = []
    for p in products:
        slug = p["slug"]
        existing = by_slug.get(slug)
        if existing is None:
            by_slug[slug] = p
            out.append(p)
            continue
        if existing["source"] == p["source"]:
            continue  # trùng thật -> bỏ
        alt = f"{slug}-{slugify(p['source'])}"
        if alt in by_slug:
            continue
        p["slug"] = alt
        by_slug[alt] = p
        out.append(p)

    seen_skus: set[str] = set()
    for p in out:
        for v in p["variants"]:
            sku = v["sku"]
            if sku in seen_skus:
                for n in range(2, 100):
                    candidate = f"{sku}-{n}"
                    if candidate not in seen_skus:
                        sku = candidate
                        break
                v["sku"] = sku
            seen_skus.add(sku)
    return out
