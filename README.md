
# 🛍️ MegaMart - Nền Tảng Thương Mại Điện Tử Đa Chức Năng

<div align="center">

![MegaMart Banner](https://img.shields.io/badge/MegaMart-v1.0-blueviolet?style=for-the-badge&logo=shopify)

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-red?style=flat-square&logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma-5-blue?style=flat-square&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql)
![Docker](https://img.shields.io/badge/Docker-Enabled-2496ED?style=flat-square&logo=docker)

<p align="center">
  <strong>Hệ sinh thái E-commerce toàn diện: Mua sắm, Quản lý kho, Flash Sale & Thanh toán.</strong><br>
  Tốc độ cao • Bảo mật • Kiến trúc Microservices
</p>

[Xem Demo](#) • [Báo Lỗi](https://github.com/minhancr123/MegaMart/issues) • [Tài Liệu API](#)

</div>

<div align="center">
  <img src="./client/public/megamart-demo.png" alt="Giao diện MegaMart" width="100%" style="border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.5);" />
</div>

---

## 🌟 Giới Thiệu

**MegaMart** là một dự án thương mại điện tử Fullstack quy mô lớn, được thiết kế để xử lý hàng nghìn giao dịch mỗi ngày.
Hệ thống bao gồm một **Client Storefront** hiện đại (Next.js) và một **Server Backend** mạnh mẽ (NestJS), kết hợp với cơ sở dữ liệu **PostgreSQL** và **Prisma ORM**.

## 🚀 Tính Năng Nổi Bật (Key Features)

| Phân Hệ | Tính Năng | Công Nghệ |
|---------|-----------|-----------|
| **Storefront (Khách Hàng)** | Tìm kiếm S.E.O, Giỏ hàng thời gian thực, Thanh toán Stripe/VNPAY | `Next.js App Router`, `Zustand` |
| **Admin Dashboard** | Quản lý sản phẩm, Theo dõi đơn hàng, Thống kê doanh thu | `Recharts`, `TanStack Table` |
| **Chiến Dịch Marketing** | Flash Sale đếm ngược, Coupon giảm giá | `Redis`, `Cron Jobs` |
| **Quản Lý Kho** | Theo dõi tồn kho biến thể (Màu/Size), Cảnh báo nhập hàng | `PostgreSQL Transactions` |
| **Bảo Mật** | Xác thực JWT 2 lớp (Access/Refresh Token), Phân quyền RBAC | `Passport.js`, `Guards` |

## 🛠️ Tech Stack (Công Nghệ Sử Dụng)

### Frontend (Client)
- **Framework**: [Next.js 14](https://nextjs.org/) (Server Components, Server Actions)
- **Language**: TypeScript
- **State Management**: Zustand (Giỏ hàng), React Query (Data Fetching)
- **Styling**: Tailwind CSS, Shadcn/ui
- **Form**: React Hook Form + Zod Validation

### Backend (Server)
- **Framework**: [NestJS](https://nestjs.com/) (Modular Architecture)
- **Database**: PostgreSQL
- **ORM**: Prisma (Type-safe Database Access)
- **Caching**: Redis (cho Flash Sale & Session)
- **Upload**: Cloudinary / AWS S3

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Web Server**: Nginx (Reverse Proxy)
- **CI/CD**: GitHub Actions (Tự động deploy)

## 📂 Cấu Trúc Dự Án (Project Structure)

Dự án được tổ chức theo mô hình **Monorepo** (Client + Server):

```bash
📦 MegaMart
 ┣ 📂 client                 # Frontend (Next.js)
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 app               # App Router Pages
 ┃ ┃ ┣ 📂 components        # UI Components
 ┃ ┃ ┣ 📂 hooks             # Custom Hooks
 ┃ ┃ ┣ 📂 lib               # Utilities
 ┃ ┃ ┗ 📂 store             # Global State (Zustand)
 ┃ ┗ 📜 Dockerfile          # Client Container
 ┃
 ┣ 📂 server                 # Backend (NestJS)
 ┃ ┣ 📂 src
 ┃ ┃ ┣ 📂 modules           # Feature Modules (Auth, Product, Order...)
 ┃ ┃ ┣ 📂 guards            # Auth Guards
 ┃ ┃ ┣ 📂 prismaClient      # DB Connection
 ┃ ┃ ┗ 📜 main.ts           # Entry Point
 ┃ ┣ 📂 prisma              # Schema & Migrations
 ┃ ┗ 📜 Dockerfile          # Server Container
 ┃
 ┣ 📂 nginx                  # Cấu hình Load Balancer
 ┗ 📜 docker-compose.yml     # Orchestration
```

## 🗺️ Roadmap Phát Triển

- [x] **Giai đoạn 1: Core E-commerce**
  - [x] Đăng ký/Đăng nhập (JWT)
  - [x] CRUD Sản phẩm, Danh mục
  - [x] Giỏ hàng & Đặt hàng cơ bản

- [x] **Giai đoạn 2: Advanced Features (Hiện tại)**
  - [x] Flash Sale System
  - [x] Admin Dashboard Analytics
  - [x] Tích hợp thanh toán Online
  - [x] Review & Rating sản phẩm

- [ ] **Giai đoạn 3: Scale & Mobile (Sắp tới)**
  - [ ] React Native Mobile App
  - [ ] Microservices tách module
  - [ ] AI Suggestion (Gợi ý sản phẩm)
  - [ ] Chat Support Real-time

## 🔧 Cài Đặt & Chạy Thử (Local Development)

### Cách 1: Chạy với Docker (Khuyên dùng)

1. **Clone dự án**
   ```bash
   git clone https://github.com/minhancr123/MegaMart.git
   cd MegaMart
   ```

2. **Dựng môi trường**
   ```bash
   docker-compose up --build
   ```
   Hệ thống sẽ tự động chạy Client (3000), Server (4000) và Database.

### Cách 2: Chạy Thủ Công

#### Backend (Server)
```bash
cd server
npm install
npx prisma generate
npm run start:dev
```

#### Frontend (Client)
```bash
cd client
npm install
npm run dev
```

Truy cập `http://localhost:3000` để trải nghiệm.

---

<p align="center">
  Made with ❤️ by <strong>Huỳnh Minh An</strong>
</p>
