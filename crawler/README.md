# MegaMart Crawler (Crawl4AI)

Cào sản phẩm từ **Điện Máy Chợ Lớn** và **Nguyễn Kim**, chuẩn hoá về đúng schema
Prisma của MegaMart (`Category` / `Product` / `ProductImage` / `Variant`) rồi nạp
vào PostgreSQL.

```
crawler/
├── config.py                 # cây danh mục MegaMart + map danh mục 2 site nguồn
├── normalize.py              # slug, parse giá VND, đoán brand, build product
├── crawl.py                  # CLI chạy crawl (trang danh mục)
├── enrich_details.py         # mở trang chi tiết lấy mô tả + thông số kỹ thuật
├── mirror_images.py          # mirror ảnh lên Cloudinary, thay URL trong JSON
├── import_to_db.py           # nạp thẳng vào Postgres (không cần Node/Prisma)
├── sites/
│   ├── dienmaycholon.py      # render + bấm "Xem thêm" + parse DOM
│   └── nguyenkim.py          # đọc __NEXT_DATA__ (Next.js), phân trang ?page=N
└── out/megamart-products.json
```

## Cài đặt

```bash
python3 -m venv ~/.venvs/megamart-crawler
~/.venvs/megamart-crawler/bin/pip install -r requirements.txt
~/.venvs/megamart-crawler/bin/python -m playwright install chromium
```

> Đặt venv ngoài thư mục dự án nếu dự án nằm trên ổ FAT32/exFAT (venv cần symlink).

## Chạy

```bash
# cả 2 site, tối đa 40 sản phẩm mỗi danh mục
~/.venvs/megamart-crawler/bin/python crawl.py --site all --limit 40

# chỉ Nguyễn Kim, vài danh mục
~/.venvs/megamart-crawler/bin/python crawl.py --site nk --categories tu-lanh.c,tivi.c --limit 100

# chỉ Điện Máy Chợ Lớn, xem trình duyệt chạy
~/.venvs/megamart-crawler/bin/python crawl.py --site dmcl --limit 30 --show-browser
```

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `--site` | `all` | `dmcl`, `nk` hoặc `all` |
| `--limit` | `40` | số sản phẩm tối đa mỗi danh mục |
| `--categories` | – | lọc danh mục theo path nguồn hoặc slug đích, cách nhau bởi dấu phẩy |
| `--max-categories` | – | chỉ cào N danh mục đầu mỗi site |
| `--delay` | `1.5` | giây nghỉ giữa các request |
| `--stock` | `50` | tồn kho mặc định gán cho variant |
| `--out` | `out/megamart-products.json` | file kết quả |
| `--show-browser` | tắt | chạy Chromium có giao diện để quan sát |
| `--append` | tắt | gộp thêm vào file `--out` sẵn có thay vì ghi đè (cào bù danh mục lỗi); trùng slug thì bản vừa cào thắng |

> `--limit` là giới hạn **cứng** mỗi danh mục. Nguyễn Kim có ~5.200 sản phẩm
> trong 42 danh mục đang map (riêng `phu-kien.c` đã 742, `tivi.c` 389), nên chạy
> với mặc định `40` sẽ chỉ lấy về khoảng một phần tư. Muốn lấy hết thì đặt
> `--limit 1000` (25 sp/trang × trần 40 trang trong `crawl_nk`).

## Bù mô tả + thông số kỹ thuật

`crawl.py` chỉ đọc trang **danh mục**, mà trang danh mục không có bảng thông số
kỹ thuật và (với Điện Máy Chợ Lớn) cũng không có bài mô tả. Chạy bước này để mở
trang chi tiết từng sản phẩm lấy phần còn thiếu:

```bash
~/.venvs/megamart-crawler/bin/python enrich_details.py --dry-run --limit 20
~/.venvs/megamart-crawler/bin/python enrich_details.py --source NGUYEN_KIM
~/.venvs/megamart-crawler/bin/python enrich_details.py
```

Lấy về `description` (bài mô tả đầy đủ, đã rút HTML thành text),
`brand`, `specs` (đặc điểm nổi bật) và `specsTable` (bảng thông số dạng
`{label, value, group?}` → tab "Thông số kỹ thuật" trên storefront), kèm ảnh
gallery mà trang danh mục không trả về.

Cả hai sàn đều server-render trang chi tiết nên bước này chỉ dùng `requests`,
không phải bật Chromium. Tiến độ ghi lại vào file JSON sau mỗi 200 sản phẩm và
sản phẩm đã có `specsTable` sẽ bị bỏ qua ở lần chạy sau, nên đứt giữa chừng thì
chạy lại là tiếp tục được (dùng `--force` nếu muốn cào lại từ đầu).

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `--file` | `out/megamart-products.json` | file JSON cần bù dữ liệu |
| `--source` | cả hai | `NGUYEN_KIM` hoặc `DIEN_MAY_CHO_LON` |
| `--workers` | `6` | số request song song |
| `--delay` | `0.3` | giây nghỉ giữa 2 request của mỗi luồng |
| `--max-images` | `12` | trần số ảnh mỗi sản phẩm |
| `--force` | tắt | cào lại cả sản phẩm đã enrich |
| `--dry-run` | tắt | không ghi file |

## Mirror ảnh lên Cloudinary

Ảnh cào về là **URL trỏ thẳng vào CDN của site nguồn** (hotlink). Chạy bước này
để đưa ảnh về Cloudinary của bạn trước khi import:

```bash
# cần CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
# (đọc từ biến môi trường hoặc server/.env)
~/.venvs/megamart-crawler/bin/python mirror_images.py --dry-run   # xem trước
~/.venvs/megamart-crawler/bin/python mirror_images.py --limit 50  # thử 50 ảnh
~/.venvs/megamart-crawler/bin/python mirror_images.py             # chạy thật
```

Cloudinary **tự đi tải ảnh** từ CDN nguồn (URL được truyền vào tham số `file`),
nên máy bạn không tải/upload lại byte ảnh nào. Script ghi đè `url` trong JSON
bằng link `res.cloudinary.com` và giữ link cũ ở `sourceUrl`.

`public_id` cố định theo `megamart/products/<danh-mục>/<slug>-<index>` và upload
với `overwrite=false`, nên chạy lại nhiều lần không tạo bản sao và không tốn thêm
dung lượng. Tiến độ được lưu vào file JSON sau mỗi 100 ảnh — đứt giữa chừng thì
chạy lại, script tự bỏ qua ảnh đã xong.

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `--folder` | `megamart/products` | thư mục trên Cloudinary |
| `--workers` | `8` | số upload song song |
| `--limit` | – | chỉ xử lý N ảnh đầu |
| `--timeout` | `90` | timeout mỗi ảnh (giây) |
| `--dry-run` | tắt | chỉ liệt kê, không gọi API |

## Nạp vào database

### Cách 1 — Python, không cần Node (khuyên dùng khi Node gặp trục trặc)

```bash
~/.venvs/megamart-crawler/bin/python import_to_db.py --dry-run   # xem trước
~/.venvs/megamart-crawler/bin/python import_to_db.py             # nạp thật
~/.venvs/megamart-crawler/bin/python import_to_db.py --replace-images
~/.venvs/megamart-crawler/bin/python import_to_db.py --skip-images-if-present
```

`--skip-images-if-present` bỏ qua phần ảnh của những sản phẩm **đã có ảnh trong
DB**. Cần đến nó khi ảnh trong DB đã được `mirror_db_images.py` đổi sang
`res.cloudinary.com`: URL trong file vẫn là link CDN gốc nên importer không nhận
ra là cùng một tấm và sẽ chèn thành bộ ảnh thứ hai trùng nội dung.

Đọc `DATABASE_URL` từ `server/.env`. Gom lệnh theo lô 500 dòng nên chỉ mất ~20
giây cho 3.000 sản phẩm, kể cả khi kết nối tới pooler có độ trễ ~100ms (chạy
từng dòng một sẽ mất khoảng 30 phút).

Lưu ý: cột `id` và `updatedAt` **không có default trong database** — Prisma sinh
cuid ở phía client — nên script tự sinh cuid cùng định dạng.

### Cách 2 — TypeScript qua Prisma Client

```bash
cd ../server
# cần DATABASE_URL trong server/.env
npm run db:import-crawled              # hoặc: npx tsx prisma/import-crawled.ts
npx tsx prisma/import-crawled.ts --dry-run          # chỉ kiểm tra
npx tsx prisma/import-crawled.ts --replace-images   # ghi đè toàn bộ ảnh
```

Cả hai script đều chỉ **upsert** theo `Category.slug`, `Product.slug`,
`Variant.sku` nên chạy lại nhiều lần vẫn an toàn và không xoá dữ liệu seed.

> ⚠️ Trên ổ FAT32/exFAT, `npm install` sẽ lỗi `EPERM: symlink` khi tạo
> `node_modules/.bin/`. Dùng `npm install --no-bin-links` rồi gọi trực tiếp
> `node node_modules/tsx/dist/cli.mjs prisma/import-crawled.ts` — hoặc đơn giản
> là dùng Cách 1.

> ⚠️ Repo không có thư mục `prisma/migrations/` nhưng database đã được apply
> migration từ nơi khác. **Đừng chạy** `prisma migrate dev` hay `npm run db:reset`
> — Prisma sẽ thấy drift và đòi xoá sạch database.

## Định dạng file kết quả

```jsonc
{
  "meta": { "crawledAt": "...", "sources": ["DIEN_MAY_CHO_LON", "NGUYEN_KIM"], "productCount": 1234 },
  "categories": [ { "slug": "tu-lanh", "name": "Tủ lạnh", "parentSlug": "dien-tu-dien-lanh" } ],
  "products": [
    {
      "slug": "tu-lanh-aqua-2-cua-189-lit-aqr-t225falb-aqrt225falb",
      "name": "Tủ lạnh AQUA 2 cửa 189 lít AQR-T225FA(LB)",
      "brand": "Aqua",
      "description": "...",
      "categorySlug": "tu-lanh",
      "soldCount": 1442,
      "source": "NGUYEN_KIM",
      "sourceUrl": "https://www.nguyenkim.com/...",
      "images": [ { "url": "...", "alt": "...", "isPrimary": true, "displayOrder": 0 } ],
      "variants": [
        {
          "sku": "AQRT225FALB",
          "price": 6250000,          // giá niêm yết  -> Variant.price
          "salePrice": 5690000,      // giá bán hiện tại -> Variant.salePrice
          "discountPercent": 9,
          "stock": 50,
          "attributes": {            // -> Variant.attributes (Json)
            "source": "NGUYEN_KIM",
            "sourceUrl": "...",
            "specs": ["Đặc điểm nổi bật 1", "..."],
            "specsTable": [            // -> tab "Thông số kỹ thuật"
              { "label": "Dung tích", "value": "189 lít" },
              { "label": "Kiểu máy", "value": "2 cửa", "group": "Tổng quan sản phẩm" }
            ],
            "rating": 4.9,
            "reviewCount": 219
          }
        }
      ]
    }
  ]
}
```

## Ghi chú kỹ thuật

**Điện Máy Chợ Lớn** — trang chi tiết server-render sẵn: bài mô tả ở
`.info_pro-tab`, bảng thông số ở `nav.list_specifications` (chia nhóm bằng
`li.title-specification`), đặc điểm nổi bật ở `.feature_pro`. Riêng trang danh
mục thì phải render bằng trình duyệt: nó render sẵn 15 sản phẩm, phần còn lại nạp
thêm mỗi lần bấm `.see_more_cat` ("Xem thêm N sản phẩm"), ảnh lazy-load theo
scroll. Crawler bấm nút tới khi đủ `--limit` rồi cuộn hết trang để ảnh có `src`
thật. `/api/*` bị `Disallow` trong robots.txt của họ nên crawler **không** gọi
API nội bộ, chỉ đọc DOM.

Một số sản phẩm bị che giá (`XX.XXX.000` – "gọi để biết giá"); khi đó chỉ lấy
được giá niêm yết và `salePrice` để trống.

Một vài đường dẫn như `/am-thanh` là **trang tổng hợp**, không có danh sách sản
phẩm — phải dùng danh mục con (`/loa`, `/loa-keo`, `/loa-thanh-soundbar`, ...).

**Nguyễn Kim** — chạy Next.js, toàn bộ dữ liệu danh mục nằm trong
`__NEXT_DATA__` (`props.pageProps.pageDetail`) nên không phải parse DOM: có sẵn
`code` (dùng làm SKU), `price`, `finalPrice`, `orderQuantity` (số đã bán),
`images[]`, `outstandingFeatures` và cả `description` (bài mô tả HTML đầy đủ).
Trang chi tiết dùng chung `__NEXT_DATA__` nhưng `pageDetail.data` là *một*
object thay vì mảng, và có thêm `properties` (bảng thông số), `brandName`,
`warranty`, `origin`, `model` — `enrich_details.py` đọc phần đó. Phân trang `?page=N`, 25 sản phẩm/trang.
Site không trả về brand riêng nên `normalize.guess_brand()` dò theo danh sách
thương hiệu trong tên sản phẩm. Khoảng 3% sản phẩm của Nguyễn Kim không có ảnh
nào trong dữ liệu nguồn (`thumbnail` và `images` đều `null`).

**Về ảnh** — crawler chỉ lưu URL trỏ tới CDN nguồn
(`cdn.nguyenkimmall.com`, `cdn11.dienmaycholon.vn`, `cdn.coreventure.vn`). Hai
CDN này hiện không chặn hotlink và `client/next.config.ts` đã cho phép mọi
hostname, nên ảnh hiển thị được ngay — nhưng link sẽ chết nếu site nguồn đổi/xoá
ảnh. Dùng `mirror_images.py` để tự chủ ảnh trước khi lên production.

**Lưu ý bản quyền** — dữ liệu cào chỉ dùng cho môi trường phát triển/demo của
MegaMart. `robots.txt` của Nguyễn Kim có content-signal `ai-train=no`; đừng dùng
dữ liệu này để huấn luyện mô hình. Giữ `--delay` ở mức hợp lý để không tạo tải
lên site nguồn.
