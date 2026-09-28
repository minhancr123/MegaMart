# DEPLOY MegaMart lên AWS (EC2 + ECR + RDS + GitHub Actions)

Mục tiêu học DevOps sau khi xong bài này: Docker multi-stage, ECR,
GitHub Actions CI/CD, SSH deploy, Prisma migration an toàn, reverse proxy,
HTTPS Let's Encrypt, healthcheck + rollback.

**Kiến trúc:**

```
Browser ──HTTPS──> EC2 x86_64 (nginx:80/443) ──┬──> client:3000 (Next.js)
                                               └──> /api ──> server:3001 (NestJS) ──> RDS Postgres
GitHub push main ──> CI ──> CD: build image (amd64) ──> ECR ──SSH──> EC2 (pull + migrate + up)
```

> Vì sao x86_64 (t3) mà không phải ARM (t4g rẻ hơn)? GitHub runner build
> image amd64. Muốn chạy t4g ARM phải build multi-arch qua QEMU (chậm 3–5x,
> hay lỗi lạ). Học thì t3 cho lành; rành rồi hãy đổi sang ARM + `platforms`.

**Chi phí ước tính (ap-southeast-1):** free-tier ~$4–8/tháng (chủ yếu phí IPv4),
sau free-tier ~$25–40/tháng (EC2 t3.small + RDS db.t3.micro). Xem chi tiết ở bước 0.

---

## Bước 0 — Chuẩn bị tài khoản & quyết định (5 phút)

1. Tạo tài khoản AWS (cần thẻ Visa, trừ ~$1 verify, hoàn lại).
2. Quyết định 3 thứ:
   - **Size máy:** `t4g.micro` (1GB RAM, rẻ) hay `t4g.small` (2GB, mượt hơn). Học thì micro + swap 2GB là đủ.
   - **Database:** **RDS** (khuyên dùng, free-tier 12 tháng, có backup tự động) hay **Postgres container** trên EC2 (`--profile localdb`, $0 nhưng tự lo backup).
   - **Domain:** có domain riêng (khuyên dùng, HTTPS đẹp + SePay/VNPay webhook ổn định) hay chạy tạm bằng IP public (http, vẫn học đủ CI/CD).

## Bước 1 — IAM cho GitHub Actions (Console)

1. IAM → Users → Create user `github-megamart-deploy` (không cần console access).
2. Attach policy: tạo policy riêng tối thiểu gồm `ecr:*` trên 3 repo + `ec2:Describe*` (hoặc lúc học nhanh: `AmazonEC2ContainerRegistryPowerUser`).
3. Security credentials → Create access key → lưu `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (dùng ở bước 6).
4. *Nâng cao sau này:* thay access key bằng OIDC (`aws-actions/configure-aws-credentials` hỗ trợ `role-to-assume`) — khỏi lưu secret dài hạn.

## Bước 2 — EC2 (Console, region **ap-southeast-1** Singapore)

1. EC2 → Launch instance:
   - Name: `megamart-prod`, AMI: **Ubuntu 24.04 LTS (x86_64)**.
   - Type: `t3.micro` (free-tier) hoặc `t3.small`.
   - Key pair: tạo mới `megamart-key` (.pem), giữ kỹ — cần cho `EC2_SSH_KEY`.
   - Security group: mở **22** (nên giới hạn IP nhà bạn), **80**, **443** (0.0.0.0/0).
   - Storage: gp3 25GB (free-tier 30GB).
   - **Advanced → User data:** paste nguyên file `infra/ec2-user-data.sh` (cài Docker, swap 2GB, firewall).
2. Elastic IP → Allocate + Associate vào instance (IP tĩnh, khỏi đổi APP_URL mỗi lần reboot).
3. SSH test: `ssh -i megamart-key.pem ubuntu@<IP>` rồi kiểm tra:
   `docker --version && docker compose version && free -h` (phải thấy Swap 2GB).
4. Trên EC2, tạo file secret (KHÔNG qua GitHub):
   ```bash
   mkdir -p ~/megamart/server
   nano ~/megamart/server/.env.prod   # copy từ infra/server.env.proFd.example rồi điền
   chmod 600 ~/megamart/server/.env.prod
   ```

## Bước 3 — Database

**Option A — RDS (khuyên dùng):**
1. RDS → Create database → PostgreSQL 16 → `db.t3.micro`, 20GB gp3, bật backup 7 ngày.
2. Đặt cùng VPC với EC2; Security group RDS **chỉ mở 5432 từ Security group của EC2** (không mở public).
3. Lấy endpoint, điền vào `DATABASE_URL`/`DIRECT_URL` trong `server/.env.prod` trên EC2.
4. Migration bảng sẽ do CD chạy (`migrate deploy`) ở lần deploy đầu.

**Option B — Postgres container (profile localdb):**
1. Trên EC2: `export POSTGRES_PASSWORD='<mat-khau-manh>'`.
2. Deploy kèm profile (sửa lệnh `up` ở workflow hoặc chạy tay lần đầu):
   `docker compose -f docker-compose.prod.yml --profile localdb up -d`
3. `DATABASE_URL=postgresql://megamart:<pass>@postgres:5432/megamart?schema=public`.
4. Tự backup: `docker exec megamart_postgres pg_dump -U megamart megamart | gzip > backup-$(date +%F).sql.gz` (cho vào cron + copy ra S3).

## Bước 4 — (Tùy chọn) Domain + HTTPS

1. Route 53 (hoặc nhà cung cấp khác) tạo bản ghi A: `shop.cuaban.com → <Elastic IP>`.
2. Deploy lần đầu ở chế độ **HTTP** (nginx mặc định chỉ có server 80) — kiểm tra web chạy.
3. Xin cert trên EC2:
   ```bash
   sudo apt install -y certbot
   sudo certbot certonly --webroot -w /var/www/certbot -d shop.cuaban.com
   ```
4. Sửa `nginx/default.conf`: thay `YOUR_DOMAIN` bằng domain thật, bỏ comment block 443, build lại image nginx (push main để CD build, hoặc `docker compose build nginx` tay trên EC2).
5. Deploy lại → mở `https://shop.cuaban.com`. Gia hạn tự động: `sudo certbot renew --dry-run` + cron.
6. Đổi `VNPAY_RETURN_URL`, `SEPAY_WEBHOOK_URL`, `FRONTEND_URL` sang `https://...` trong `.env.prod`.

## Bước 5 — GitHub Secrets & Vars

Repo → Settings → Secrets and variables → Actions:
- **Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `EC2_HOST` (IP/EIP), `EC2_USER=ubuntu`, `EC2_SSH_KEY` (nội dung .pem).
- **Variables:** `AWS_REGION=ap-southeast-1`, `AWS_ACCOUNT_ID=123456789012`, `APP_URL=https://shop.cuaban.com` (hoặc `http://<IP>` nếu chưa có domain — nhớ client bake URL này vào bundle lúc build!), `COMPOSE_PROFILES` (để trống nếu dùng RDS; điền `localdb` nếu dùng Postgres container theo bước 3 option B).

## Bước 6 — Chạy pipeline & verify

1. `git add -A && git commit -m "chore(devops): aws ec2 + ecr ci/cd" && git push origin main`.
2. Tab Actions: **CI** phải xanh (typecheck + docker build dry-run), sau đó **Deploy to AWS** tự chạy (buildx → ECR → SSH: pull, `migrate deploy`, up, healthcheck).
3. Verify trên browser: `http(s)://<domain-hoặc-IP>/` (web) và `/api` (API hello). Đăng nhập user seed, đặt thử 1 đơn.
4. Rollback khi lỗi: Actions → chọn bản deploy cũ còn tốt → **Re-run jobs** (deploy lại tag SHA cũ).

## Bước 7 — Vận hành hàng ngày (cheat sheet)

```bash
# SSH vào máy
ssh -i megamart-key.pem ubuntu@<IP>
cd ~/megamart
export AWS_ACCOUNT_ID=... AWS_REGION=ap-southeast-1 IMAGE_TAG=latest

# Xem log / trạng thái
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f server
docker stats --no-stream

# Deploy tay (khi cần, không qua GitHub)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml run --rm server npx prisma migrate deploy --schema ./prisma/schema.prisma
docker compose -f docker-compose.prod.yml up -d --remove-orphans
docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload

# Backup DB container (nếu dùng localdb)
docker exec megamart_postgres pg_dump -U megamart megamart | gzip > ~/backup-$(date +%F).sql.gz
```

## Cạm bẫy đã bẫy sẵn trong repo này (đọc trước khi trách AWS)

| # | Bẫy | Cách repo này xử lý |
|---|-----|---------------------|
| 1 | `NEXT_PUBLIC_*` bake vào JS lúc build | CD truyền `APP_URL` qua `--build-arg`; đổi domain = build lại image |
| 2 | `migrate dev/reset` xóa sạch prod | CD chỉ chạy `migrate deploy`; image server giữ thư mục `prisma/` |
| 3 | SSR Next.js gọi `localhost:3001` trong container | Client gọi API qua origin public (`APP_URL`) cả SSR lẫn browser |
| 4 | EC2 1GB RAM bị OOM kill | user-data tạo swap 2GB + `mem_limit` từng service + healthcheck |
| 5 | Test/lint cũ đỏ, chặn pipeline | CI: `tsc` blocking, jest report-only (`continue-on-error`) + TODO fix |
| 6 | Secret lộ qua git/log | `.env.prod` chỉ nằm trên EC2 (`chmod 600`); deploy script `set -e`, không `echo` secret |

## Lộ trình học tiếp (sau khi deploy xanh)

1. OIDC thay access key dài hạn.
2. Tách `staging` (push nhánh `develop` → EC2 staging) — học environments.
3. CloudWatch alarms (CPU/RAM/disk) + SNS báo Telegram.
4. RDS automated snapshot restore diễn tập 1 lần.
5. Nâng cấp ECS Fargate + ALB khi traffic thật (tốn ~$50+/tháng, cân nhắc).
