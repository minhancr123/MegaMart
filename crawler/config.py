"""Cấu hình danh mục cho crawler MegaMart.

CATEGORY_TREE  : cây danh mục đích (khớp model Category của Prisma, 2 cấp).
DMCL_CATEGORIES: các danh mục nguồn của Điện Máy Chợ Lớn -> slug danh mục đích.
NK_CATEGORIES  : các danh mục nguồn của Nguyễn Kim      -> slug danh mục đích.
"""

from __future__ import annotations

# --------------------------------------------------------------------------
# Cây danh mục đích của MegaMart
# (slug, tên hiển thị, slug cha hoặc None nếu là danh mục gốc)
# --------------------------------------------------------------------------
CATEGORY_TREE: list[tuple[str, str, str | None]] = [
    # Cấp 1
    ("dien-tu-dien-lanh", "Điện tử - Điện lạnh", None),
    ("dien-gia-dung", "Điện gia dụng", None),
    ("dien-thoai-laptop", "Điện thoại - Laptop", None),
    ("noi-that", "Nội thất", None),
    ("suc-khoe-lam-dep", "Sức khỏe - Làm đẹp", None),
    # Cấp 2 - Điện tử, điện lạnh
    ("tivi", "Tivi", "dien-tu-dien-lanh"),
    ("may-lanh", "Máy lạnh", "dien-tu-dien-lanh"),
    ("tu-lanh", "Tủ lạnh", "dien-tu-dien-lanh"),
    ("may-giat", "Máy giặt", "dien-tu-dien-lanh"),
    ("may-say-quan-ao", "Máy sấy quần áo", "dien-tu-dien-lanh"),
    ("tu-dong-tu-mat", "Tủ đông - Tủ mát", "dien-tu-dien-lanh"),
    ("may-chieu", "Máy chiếu", "dien-tu-dien-lanh"),
    ("am-thanh", "Âm thanh - Loa", "dien-tu-dien-lanh"),
    ("may-nuoc-nong", "Máy nước nóng", "dien-tu-dien-lanh"),
    # Cấp 2 - Điện gia dụng
    ("may-loc-nuoc", "Máy lọc nước", "dien-gia-dung"),
    ("noi-com-dien", "Nồi cơm điện", "dien-gia-dung"),
    ("noi-chien-noi-nuong", "Nồi chiên - Nồi nướng", "dien-gia-dung"),
    ("may-hut-bui", "Máy hút bụi - Robot hút bụi", "dien-gia-dung"),
    ("may-rua-chen", "Máy rửa chén", "dien-gia-dung"),
    ("may-xay-ep", "Máy xay - Máy ép", "dien-gia-dung"),
    ("may-pha-ca-phe", "Máy pha cà phê", "dien-gia-dung"),
    ("lo-vi-song", "Lò vi sóng - Lò nướng", "dien-gia-dung"),
    ("may-loc-khong-khi", "Máy lọc không khí", "dien-gia-dung"),
    ("quat", "Quạt", "dien-gia-dung"),
    ("bep-dien", "Bếp điện - Bếp từ", "dien-gia-dung"),
    ("may-hut-mui", "Máy hút mùi", "dien-gia-dung"),
    ("noi-ap-suat", "Nồi áp suất", "dien-gia-dung"),
    ("binh-dun-sieu-toc", "Bình đun - Bình thủy điện", "dien-gia-dung"),
    ("ban-ui", "Bàn ủi", "dien-gia-dung"),
    ("do-dung-nha-bep", "Đồ dùng nhà bếp", "dien-gia-dung"),
    # Cấp 2 - Điện thoại, laptop
    ("dien-thoai", "Điện thoại", "dien-thoai-laptop"),
    ("may-tinh-bang", "Máy tính bảng", "dien-thoai-laptop"),
    ("laptop", "Laptop", "dien-thoai-laptop"),
    ("dong-ho-thong-minh", "Đồng hồ thông minh", "dien-thoai-laptop"),
    ("camera", "Camera", "dien-thoai-laptop"),
    ("tai-nghe", "Tai nghe", "dien-thoai-laptop"),
    ("phu-kien", "Phụ kiện", "dien-thoai-laptop"),
    # Cấp 2 - Nội thất
    ("ghe", "Ghế", "noi-that"),
    ("sofa", "Sofa", "noi-that"),
    ("giuong", "Giường", "noi-that"),
    ("ban", "Bàn", "noi-that"),
    ("tu-ke", "Tủ - Kệ", "noi-that"),
    # Cấp 2 - Sức khỏe, làm đẹp
    ("may-cao-rau", "Máy cạo râu", "suc-khoe-lam-dep"),
    ("may-say-toc", "Máy sấy tóc", "suc-khoe-lam-dep"),
    ("can-suc-khoe", "Cân sức khỏe", "suc-khoe-lam-dep"),
    ("ghe-massage", "Ghế massage", "suc-khoe-lam-dep"),
    ("may-do-huyet-ap", "Máy đo huyết áp", "suc-khoe-lam-dep"),
]

# --------------------------------------------------------------------------
# Điện Máy Chợ Lớn - https://dienmaycholon.vn/<path>
# (path trên site nguồn, slug danh mục đích của MegaMart)
# --------------------------------------------------------------------------
DMCL_CATEGORIES: list[tuple[str, str]] = [
    ("tivi", "tivi"),
    ("may-lanh", "may-lanh"),
    ("tu-lanh", "tu-lanh"),
    ("may-giat", "may-giat"),
    ("may-say", "may-say-quan-ao"),
    ("tu-dong", "tu-dong-tu-mat"),
    ("tu-mat", "tu-dong-tu-mat"),
    ("may-chieu", "may-chieu"),
    # /am-thanh là trang tổng hợp (không có danh sách sản phẩm) -> dùng danh mục con
    ("loa", "am-thanh"),
    ("loa-keo", "am-thanh"),
    ("loa-thanh-soundbar", "am-thanh"),
    ("loa-bluetooth", "am-thanh"),
    ("loa-karaoke-xach-tay", "am-thanh"),
    ("amply-dau-dia-than", "am-thanh"),
    ("micro", "am-thanh"),
    ("may-nuoc-nong", "may-nuoc-nong"),
    ("may-loc-nuoc", "may-loc-nuoc"),
    ("noi-com-dien", "noi-com-dien"),
    ("noi-chien-noi-nuong", "noi-chien-noi-nuong"),
    ("may-hut-bui-robot-hut-bui", "may-hut-bui"),
    ("may-rua-chen-say-chen", "may-rua-chen"),
    ("may-xay-sinh-to", "may-xay-ep"),
    ("may-ep-trai-cay", "may-xay-ep"),
    ("may-pha-ca-phe", "may-pha-ca-phe"),
    ("lo-vi-song", "lo-vi-song"),
    ("lo-nuong", "lo-vi-song"),
    ("may-loc-khong-khi", "may-loc-khong-khi"),
    ("quat", "quat"),
    ("may-lam-mat-quat-dieu-hoa", "quat"),
    ("bep-tu-hong-ngoai", "bep-dien"),
    ("may-hut-mui-hut-khoi", "may-hut-mui"),
    ("noi-ap-suat-hap", "noi-ap-suat"),
    ("binh-thuy-dien", "binh-dun-sieu-toc"),
    ("am-ca-binh-dun", "binh-dun-sieu-toc"),
    ("ban-ui", "ban-ui"),
    ("do-dung-nha-bep", "do-dung-nha-bep"),
    ("dien-thoai-di-dong", "dien-thoai"),
    ("may-tinh-bang", "may-tinh-bang"),
    ("laptop-macbook", "laptop"),
    ("dong-ho-thong-minh", "dong-ho-thong-minh"),
    ("camera", "camera"),
    ("tai-nghe", "tai-nghe"),
    ("phu-kien-di-dong", "phu-kien"),
    ("ghe", "ghe"),
    ("sofa", "sofa"),
    ("giuong", "giuong"),
    ("ban", "ban"),
    ("tu-quan-ao", "tu-ke"),
    ("ke-tu", "tu-ke"),
    ("may-cao-rau", "may-cao-rau"),
    ("say-toc", "may-say-toc"),
    ("can-suc-khoe", "can-suc-khoe"),
    ("ghe-massage", "ghe-massage"),
    ("may-do-huyet-ap", "may-do-huyet-ap"),
]

# --------------------------------------------------------------------------
# Nguyễn Kim - https://www.nguyenkim.com/<path>
# --------------------------------------------------------------------------
NK_CATEGORIES: list[tuple[str, str]] = [
    ("tivi.c", "tivi"),
    ("dieu-hoa.c", "may-lanh"),
    ("tu-lanh.c", "tu-lanh"),
    ("may-giat.c", "may-giat"),
    ("may-say-quan-ao.c", "may-say-quan-ao"),
    ("tu-dong-tu-mat.c", "tu-dong-tu-mat"),
    ("loa.c", "am-thanh"),
    ("loa-thanh-soundbar.c", "am-thanh"),
    ("loa-bluetooth.c", "am-thanh"),
    ("binh-tam-nong-lanh.c", "may-nuoc-nong"),
    ("may-loc-nuoc.c", "may-loc-nuoc"),
    ("noi-com.c", "noi-com-dien"),
    ("noi-chien.c", "noi-chien-noi-nuong"),
    ("hut-bui.c", "may-hut-bui"),
    ("may-rua-chen.c", "may-rua-chen"),
    ("may-xay-vat-ep.c", "may-xay-ep"),
    ("may-pha-ca-phe.c", "may-pha-ca-phe"),
    ("lo-nuong-lo-vi-song.c", "lo-vi-song"),
    ("may-loc-khong-khi.c", "may-loc-khong-khi"),
    ("quat.c", "quat"),
    ("bep.c", "bep-dien"),
    ("may-hut-mui.c", "may-hut-mui"),
    ("noi-ap-suat.c", "noi-ap-suat"),
    ("binh-dun-binh-thuy-dien.c", "binh-dun-sieu-toc"),
    ("ban-ui.c", "ban-ui"),
    ("bo-noi.c", "do-dung-nha-bep"),
    ("chao.c", "do-dung-nha-bep"),
    ("dien-thoai.c", "dien-thoai"),
    ("may-tinh-bang.c", "may-tinh-bang"),
    ("laptop.c", "laptop"),
    ("dong-ho.c", "dong-ho-thong-minh"),
    ("camera.c", "camera"),
    ("tai-nghe.c", "tai-nghe"),
    ("phu-kien.c", "phu-kien"),
    ("pin-du-phong.c", "phu-kien"),
    ("cap-ket-noi-cu-sac.c", "phu-kien"),
    ("dan-am-thanh.c", "am-thanh"),
    ("micro.c", "am-thanh"),
    ("may-cao-rau.c", "may-cao-rau"),
    ("may-say-toc.c", "may-say-toc"),
    ("can-suc-khoe.c", "can-suc-khoe"),
    ("may-massage.c", "ghe-massage"),
]

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)
