#!/usr/bin/env python3
"""
Đặc trưng mỗi ảnh để tách ảnh sản phẩm khỏi ảnh minh họa (bảng thông số,
infographic). Mỗi ảnh cho ra hai số, xuất JSON ra stdout:
- `edge`: % pixel gần trắng trong viền ảnh (12% mỗi cạnh).
- `ink`: % pixel tối trong toàn ảnh — đại lượng "mật độ chữ".

Cần cả hai vì bảng thông số CŨNG có nền trắng. Đo thật trên mẫu:
- Ảnh sản phẩm nền trắng : edge 90–93%, ink 0,5–3,3%
- Bảng thông số nền trắng: edge 68–80%, ink 16–45%
- Ảnh minh họa nền màu   : edge 0–6%,   ink cao hoặc trung bình
Chỉ nhìn viền thì bảng thông số lọt vào gallery; thêm mật độ chữ thì tách sạch.

Đọc danh sách URL từ stdin. Không tự ghi DB — việc đó do
server/src/scripts/split-illustration-images.ts lo, để chỉ có một chỗ chạm vào
dữ liệu.
"""

from __future__ import annotations

import io
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote

from PIL import Image

WHITE_PIXEL = 238     # ngưỡng coi là "trắng" (0-255)
INK_PIXEL = 128       # pixel tối hơn mức này được coi là chữ
EDGE_BAND = 0.12      # bề rộng viền đo, tính theo cạnh
SAMPLE_STEP_DIV = 40  # lấy mẫu ~40 điểm mỗi cạnh
TIMEOUT = 30


def measure(url: str) -> dict | None:
    try:
        # Tên file ảnh trong R2 giữ dấu tiếng Việt ("Máy_sấy_tóc...") nên phải
        # percent-encode trước, nếu không urllib ném UnicodeEncodeError và ảnh bị
        # tính nhầm là "không đo được".
        safe = quote(url, safe=":/?&=%#@!$'()*+,;~")
        req = urllib.request.Request(safe, headers={"User-Agent": "MegaMart-audit/1.0"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            im = Image.open(io.BytesIO(resp.read())).convert("RGB")
    except Exception:
        return None
    w, h = im.size
    if w < 8 or h < 8:
        return None
    px = im.load()
    bw = max(1, int(w * EDGE_BAND))
    bh = max(1, int(h * EDGE_BAND))
    step = max(1, min(w, h) // SAMPLE_STEP_DIV)
    vals: list[float] = []
    for x in range(0, w, step):
        for y in list(range(0, bh)) + list(range(h - bh, h)):
            r, g, b = px[x, y]
            vals.append((r + g + b) / 3)
    for y in range(0, h, step):
        for x in list(range(0, bw)) + list(range(w - bw, w)):
            r, g, b = px[x, y]
            vals.append((r + g + b) / 3)
    if not vals:
        return None
    edge = sum(1 for v in vals if v > WHITE_PIXEL) / len(vals) * 100

    # Mật độ chữ: co ảnh về 200x200 rồi đếm pixel tối.
    gray = im.convert("L").resize((200, 200))
    px_g = list(gray.getdata())
    ink = sum(1 for v in px_g if v < INK_PIXEL) / len(px_g) * 100
    return {"edge": round(edge, 1), "ink": round(ink, 1)}


def main() -> None:
    urls = [line.strip() for line in sys.stdin if line.strip()]
    if not urls:
        print("[]")
        return
    with ThreadPoolExecutor(max_workers=12) as ex:
        scores = list(ex.map(measure, urls))
    json.dump(scores, sys.stdout)


if __name__ == "__main__":
    main()
