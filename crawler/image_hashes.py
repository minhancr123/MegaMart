#!/usr/bin/env python3
"""
Băm nội dung ảnh để nhận ra ảnh trùng nhau dù tên file khác.

Crawler tải cùng một ảnh nhiều lần với tên file khác nhau (chỉ khác một dấu gạch
hoặc hậu tố -1, -2), nên so tên file không nhận ra được. Hash ảnh đã resize về
kích thước nhỏ thì ảnh cùng nội dung sẽ cho cùng hash, bất kể tên.

Đọc danh sách URL từ stdin, in JSON ra stdout. Không tự ghi DB — việc đó do
server/src/scripts/dedupe-images.ts lo, để chỉ có một chỗ chạm vào dữ liệu.
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote

from PIL import Image

HASH_SIZE = 64    # resize về 64x64 trước khi băm
TIMEOUT = 30


def content_hash(url: str) -> str | None:
    try:
        # Tên ảnh trong R2 giữ dấu tiếng Việt nên phải percent-encode.
        safe = quote(url, safe=":/?&=%#@!$'()*+,;~")
        req = urllib.request.Request(safe, headers={"User-Agent": "MegaMart-audit/1.0"})
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            im = Image.open(io.BytesIO(resp.read())).convert("L")
    except Exception:
        return None
    im = im.resize((HASH_SIZE, HASH_SIZE))
    return hashlib.md5(im.tobytes()).hexdigest()[:16]


def main() -> None:
    urls = [line.strip() for line in sys.stdin if line.strip()]
    if not urls:
        print("[]")
        return
    with ThreadPoolExecutor(max_workers=12) as ex:
        hashes = list(ex.map(content_hash, urls))
    json.dump(hashes, sys.stdout)


if __name__ == "__main__":
    main()
