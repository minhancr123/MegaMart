#!/usr/bin/env bash
# Chạy lại mirror ảnh sang R2 sau khi máy tắt giữa chừng.
#
# Script mirror_to_r2.py tự kiểm tra head_object trước mỗi ảnh nên ảnh đã
# có trên R2 sẽ bị bỏ qua (đếm là skip). Chạy lại nhiều lần an toàn, chỉ
# tải phần còn thiếu.
set -euo pipefail

cd "$(dirname "$0")"

# Credential R2. Không ghi vào file trong repo — chỉ tồn tại trong shell.
# Bạn cần export 4 biến dưới đây trước khi chạy:
#   export R2_ACCESS_KEY_ID=...
#   export R2_SECRET_ACCESS_KEY=...
#   export R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
#   export R2_BUCKET=megamart-images
#   export R2_PUBLIC_URL=https://megamart24.tech
: "${R2_ACCESS_KEY_ID:?chua export R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?chua export R2_SECRET_ACCESS_KEY}"
: "${R2_ENDPOINT:?chua export R2_ENDPOINT}"
: "${R2_BUCKET:?chua export R2_BUCKET}"
: "${R2_PUBLIC_URL:?chua export R2_PUBLIC_URL}"

PY="${PY:-/tmp/opencode/.venv-r2/bin/python}"
if [ ! -x "$PY" ]; then
  echo "Khong tim thay python tai $PY"
  echo "Tao moi: python3 -m venv /tmp/opencode/.venv-r2 \\"
  echo "  && /tmp/opencode/.venv-r2/bin/pip install boto3 pillow requests"
  exit 1
fi

# Log riêng de doc lai du khong cat terminal.
LOG="${LOG:-/tmp/opencode/mirror.log}"
nohup "$PY" mirror_to_r2.py --workers 4 >>"$LOG" 2>&1 &
echo "Mirror dang chay, PID $!"
echo "Theo doi bang:  tail -f $LOG"
