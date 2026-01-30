# 🎯 User Behavior Tracking & Analytics Setup Guide

## Overview
Hệ thống tracking đầy đủ hành vi người dùng với:
- ✅ **Microsoft Clarity** - Session recording & heatmaps (FREE)
- ✅ **Google Analytics 4** - Traffic & conversion tracking
- ✅ **Custom Event Tracking** - Database tracking chi tiết
- ✅ **Sentry** - Error tracking với user context
- ✅ **Audit Logs** - Admin action tracking (đã có)

---

## 🚀 Step 1: Database Migration

### 1.1. Run Prisma Migration
```bash
cd server
npx prisma migrate dev --name add-user-events
npx prisma generate
```

### 1.2. Verify Migration
```bash
npx prisma studio
# Check if UserEvent table exists
```

---

## 🔑 Step 2: Get API Keys

### 2.1. Microsoft Clarity (FREE)
1. Truy cập: https://clarity.microsoft.com/
2. Đăng nhập với Microsoft account
3. Click "Add new project"
4. Nhập tên project: "MegaMart"
5. Click "Get tracking code"
6. Copy **Project ID** (dạng: `abc123xyz`)

### 2.2. Google Analytics 4 (FREE)
1. Truy cập: https://analytics.google.com/
2. Tạo account mới hoặc chọn account có sẵn
3. Click "Create Property" → Nhập tên "MegaMart"
4. Chọn múi giờ: Vietnam (GMT+7)
5. Tạo Data Stream → Chọn "Web"
6. Nhập URL: `http://localhost:3000` (hoặc domain thật)
7. Copy **Measurement ID** (dạng: `G-XXXXXXXXXX`)

### 2.3. Sentry (FREE for 5000 errors/month)
1. Truy cập: https://sentry.io/signup/
2. Đăng ký account mới
3. Create new project → Chọn "Next.js"
4. Copy **DSN** (dạng: `https://xxx@xxx.ingest.sentry.io/xxx`)

---

## ⚙️ Step 3: Configure Environment Variables

### 3.1. Frontend (.env.local)
```env
# Google Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Microsoft Clarity
NEXT_PUBLIC_CLARITY_ID=abc123xyz

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# API URL
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3.2. Backend (.env)
```env
# Already have DATABASE_URL, etc.
```

---

## 🔧 Step 4: Update Code with Real IDs

### 4.1. Update Frontend Layout
File: `client/src/app/layout.tsx`

Replace:
- `YOUR_CLARITY_PROJECT_ID` → Your Clarity ID
- `G-YOUR_GA4_ID` → Your GA4 Measurement ID

```tsx
// Example:
"clarity", "script", "abc123xyz"  // Clarity
gtag('config', 'G-ABC123XYZ'      // GA4
```

---

## 📊 Step 5: Install & Configure Sentry

### 5.1. Install Sentry
```bash
cd client
npm install @sentry/nextjs --legacy-peer-deps
npx @sentry/wizard@latest -i nextjs
```

### 5.2. Configure Sentry
Wizard sẽ tự động tạo:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

Update `sentry.client.config.ts`:
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

---

## 🎨 Step 6: Create Analytics Utility (Frontend)

File: `client/src/lib/eventTracker.ts` (Tạo file mới)

```typescript
import * as analytics from './analytics';

let sessionId: string | null = null;

// Generate or get session ID
export const getSessionId = () => {
  if (typeof window === 'undefined') return null;
  
  if (!sessionId) {
    sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36)}`;
      localStorage.setItem('sessionId', sessionId);
    }
  }
  return sessionId;
};

// Track event to both GA4 and backend
export const trackEvent = async (
  eventType: string,
  eventName: string,
  metadata?: Record<string, any>
) => {
  const sessionId = getSessionId();
  
  // Track to Google Analytics
  analytics.event({
    action: eventName,
    category: eventType,
    label: metadata?.label,
    value: metadata?.value,
  });

  // Track to backend database
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/track-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        eventName,
        sessionId,
        metadata,
        pageUrl: window.location.href,
        referrer: document.referrer,
      }),
    });
  } catch (error) {
    console.error('Failed to track event:', error);
  }
};

// Convenient tracking functions
export const track = {
  pageView: (url: string) => {
    analytics.pageview(url);
    trackEvent('PAGE_VIEW', 'page_view', { url });
  },

  productView: (productId: string, productName: string, price: number) => {
    analytics.trackViewItem({ id: productId, name: productName, price });
    trackEvent('PRODUCT_VIEW', 'view_product', { productId, productName, price });
  },

  addToCart: (productId: string, productName: string, price: number, quantity: number) => {
    analytics.trackAddToCart({ id: productId, name: productName, price, quantity });
    trackEvent('ADD_TO_CART', 'add_to_cart', { productId, productName, price, quantity });
  },

  search: (searchTerm: string) => {
    analytics.trackSearch(searchTerm);
    trackEvent('SEARCH', 'search', { searchTerm });
  },

  purchase: (orderId: string, total: number, items: any[]) => {
    analytics.trackPurchase(orderId, total, items);
    trackEvent('PAYMENT_SUCCESS', 'purchase', { orderId, total, itemCount: items.length });
  },

  clickBanner: (bannerId: string, bannerName: string) => {
    trackEvent('CLICK_BANNER', 'click_banner', { bannerId, bannerName });
  },

  clickFlashSale: (flashSaleId: string, flashSaleName: string) => {
    trackEvent('CLICK_FLASH_SALE', 'click_flash_sale', { flashSaleId, flashSaleName });
  },
};
```

---

## 📱 Step 7: Usage Examples

### 7.1. Track Product View
File: `client/src/app/products/[id]/page.tsx`

```typescript
import { track } from '@/lib/eventTracker';
import { useEffect } from 'react';

export default function ProductDetail({ params }: { params: { id: string } }) {
  const product = // ... fetch product

  useEffect(() => {
    if (product) {
      track.productView(product.id, product.name, product.price);
    }
  }, [product]);

  // ...
}
```

### 7.2. Track Add to Cart
File: `client/src/app/products/[id]/page.tsx`

```typescript
const handleAddToCart = () => {
  // ... add to cart logic
  track.addToCart(product.id, product.name, product.price, quantity);
};
```

### 7.3. Track Search
File: `client/src/components/SearchBar.tsx`

```typescript
import { track } from '@/lib/eventTracker';

const handleSearch = () => {
  track.search(searchQuery);
  // ... search logic
};
```

### 7.4. Track Purchase
File: `client/src/app/checkout/success/page.tsx`

```typescript
useEffect(() => {
  if (order) {
    track.purchase(order.id, order.total, order.items);
  }
}, [order]);
```

---

## 📈 Step 8: View Analytics

### 8.1. Microsoft Clarity
- URL: https://clarity.microsoft.com/
- View: Session recordings, Heatmaps, Dashboard

### 8.2. Google Analytics
- URL: https://analytics.google.com/
- View: Realtime, Reports, Explorations

### 8.3. Custom Analytics (Admin Dashboard)
Create admin page: `client/src/app/admin/analytics/page.tsx`

```typescript
'use client';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch('/api/analytics/event-stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  return (
    <div>
      <h1>Analytics Dashboard</h1>
      {/* Display charts, tables, etc. */}
    </div>
  );
}
```

### 8.4. Sentry
- URL: https://sentry.io/
- View: Issues, Performance, Releases

---

## 🧪 Step 9: Test Tracking

### 9.1. Test in Development
```bash
cd client
npm run dev
```

1. Open browser console
2. Navigate pages → Check Network tab for tracking calls
3. Check Clarity dashboard (updates in ~2 minutes)
4. Check GA4 Realtime (updates immediately)

### 9.2. Test Database Events
```bash
cd server
npx prisma studio
# Check UserEvent table for new records
```

---

## 📊 Available Analytics Endpoints

### Public Endpoints
- `POST /analytics/track-event` - Track user event (no auth)

### Admin Endpoints (require JWT)
- `GET /analytics/event-stats` - Event statistics
- `GET /analytics/user-journey/:sessionId` - User journey
- `GET /analytics/conversion-funnel` - Conversion funnel
- `GET /analytics/search-analytics` - Top search terms
- `GET /analytics/revenue-stats` - Revenue statistics (existing)
- `GET /analytics/top-selling-products` - Top products (existing)

---

## 🎯 What Gets Tracked

### Automatic (Microsoft Clarity)
- ✅ All clicks
- ✅ Scrolls
- ✅ Mouse movements
- ✅ Rage clicks
- ✅ Dead clicks
- ✅ Session recordings

### Manual (GA4 + Custom)
- ✅ Page views
- ✅ Product views
- ✅ Add to cart
- ✅ Searches
- ✅ Purchases
- ✅ Banner clicks
- ✅ Flash sale clicks
- ✅ Voucher applications
- ✅ Review submissions

---

## 🔒 Privacy & GDPR

### Add Cookie Consent (Optional)
```bash
npm install react-cookie-consent --legacy-peer-deps
```

File: `client/src/app/layout.tsx`
```typescript
import CookieConsent from "react-cookie-consent";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CookieConsent
          location="bottom"
          buttonText="Đồng ý"
          declineButtonText="Từ chối"
          cookieName="megamart-cookie-consent"
          enableDeclineButton
        >
          Website sử dụng cookies để cải thiện trải nghiệm người dùng.
        </CookieConsent>
      </body>
    </html>
  );
}
```

---

## ✅ Checklist

- [ ] Run Prisma migration
- [ ] Get Microsoft Clarity ID
- [ ] Get Google Analytics ID
- [ ] Get Sentry DSN
- [ ] Update .env.local
- [ ] Update layout.tsx with real IDs
- [ ] Install Sentry
- [ ] Create eventTracker.ts
- [ ] Add tracking to product pages
- [ ] Add tracking to cart
- [ ] Add tracking to checkout
- [ ] Test in browser
- [ ] Verify Clarity dashboard
- [ ] Verify GA4 realtime
- [ ] Check database events
- [ ] Create admin analytics page

---

## 🆘 Troubleshooting

### Events not showing in database
- Check backend is running
- Check CORS settings
- Check Network tab for errors
- Verify API_URL in .env.local

### Clarity not working
- Wait 2-5 minutes for data
- Check Project ID is correct
- Verify script is in <head>

### GA4 not working
- Check Measurement ID format (G-XXXXXXX)
- Verify in GA4 Realtime (should show instantly)
- Check browser console for errors

### Sentry not working
- Verify DSN format
- Check Sentry dashboard for events
- Trigger an error to test

---

## 🚀 Next Steps

1. **Run migration**: `npx prisma migrate dev`
2. **Get API keys** from Clarity, GA4, Sentry
3. **Update .env.local** with real IDs
4. **Test tracking** in development
5. **Create analytics dashboard** for admin
6. **Deploy** and verify in production

Need help? Check the code or ask! 🎉
