# 🌙 Dark Mode Implementation Guide

## ✅ Completed Components

### 1. Core Infrastructure
- ✅ **ThemeProvider** (`client/src/components/theme-provider.tsx`)
  - Wraps entire app in `layout.tsx`
  - Configured with `attribute="class"`, `defaultTheme="system"`, `enableSystem={true}`
  
- ✅ **ThemeToggle** (`client/src/components/theme-toggle.tsx`)
  - Dropdown with Light/Dark/System options
  - Sun/Moon icons with smooth transitions
  - Vietnamese labels (Sáng/Tối/Hệ thống)

### 2. Layout Components
- ✅ **Root Layout** (`client/src/app/layout.tsx`)
  - Added `suppressHydrationWarning` to `<html>` tag
  - Wrapped children with ThemeProvider

- ✅ **Header Component** (`client/src/components/Header.tsx`)
  - Added ThemeToggle button (mobile & desktop)
  - Dark mode classes: `dark:bg-gray-900`, `dark:text-white`, `dark:border-gray-800`
  - Top promo bar: `dark:bg-gray-950`

- ✅ **Admin Layout** (`client/src/app/admin/layout.tsx`)
  - ThemeToggle in sidebar (desktop) and top bar (mobile)
  - Sidebar dark mode: `dark:bg-gray-900`, `dark:border-gray-800`
  - Active links: `dark:bg-blue-950 dark:text-blue-400`
  - Hover states: `dark:hover:bg-gray-800`

### 3. Pages
- ✅ **Homepage** (`client/src/app/page.tsx`)
  - Main container: `dark:bg-gray-950`

- ✅ **Products Page** (`client/src/app/products/page.tsx`)
  - Background: `dark:bg-gray-950`
  - Title: `dark:text-white`
  - Description: `dark:text-gray-400`
  - Filter sidebar: `dark:bg-gray-900 dark:border-gray-800`

### 4. CSS Configuration
- ✅ **globals.css** (`client/src/app/globals.css`)
  - Line 3: `@custom-variant dark (&:is(.dark *));`
  - Lines 324-363: `:root` CSS variables (light mode)
  - Lines 434-464: `.dark` CSS variables (dark mode)
  - OKLCH color system for smooth transitions

---

## 🎨 Dark Mode Color Palette

### Background Colors
```css
Light Mode              Dark Mode
bg-white           →    dark:bg-gray-900
bg-gray-50         →    dark:bg-gray-800
bg-gray-100        →    dark:bg-gray-950
```

### Text Colors
```css
Light Mode              Dark Mode
text-gray-900      →    dark:text-white
text-gray-700      →    dark:text-gray-200
text-gray-600      →    dark:text-gray-400
text-gray-500      →    dark:text-gray-500
text-black         →    dark:text-white
```

### Border Colors
```css
Light Mode              Dark Mode
border-gray-200    →    dark:border-gray-800
border-gray-300    →    dark:border-gray-700
```

### Hover States
```css
Light Mode                    Dark Mode
hover:bg-gray-50         →    dark:hover:bg-gray-800
hover:bg-blue-50         →    dark:hover:bg-blue-950
hover:text-gray-900      →    dark:hover:text-gray-100
```

---

## 📝 TODO: Components Needing Dark Mode

### High Priority (User-Facing Pages)

#### 1. **MainContent Component** (`client/src/components/MainContent.tsx`)
- [ ] Hero section backgrounds
- [ ] Category cards: `bg-white` → `dark:bg-gray-900`
- [ ] Feature sections: `bg-white` → `dark:bg-gray-900`
- [ ] Text colors: `text-gray-900` → `dark:text-white`
- [ ] Borders: `border-gray-100` → `dark:border-gray-800`

**Search patterns:**
```bash
bg-white → dark:bg-gray-900
text-gray-900 → dark:text-white
text-gray-600 → dark:text-gray-400
border-gray-100 → dark:border-gray-800
```

#### 2. **ProductCard Component** (`client/src/components/product/ProductCard.tsx`)
- [ ] Card background: `bg-white` → `dark:bg-gray-900`
- [ ] Card border: `border-gray-200` → `dark:border-gray-800`
- [ ] Product title: `text-gray-900` → `dark:text-white`
- [ ] Price: `text-gray-700` → `dark:text-gray-300`
- [ ] Hover states

**Example:**
```tsx
<div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
  <h3 className="text-gray-900 dark:text-white">{product.name}</h3>
  <p className="text-gray-600 dark:text-gray-400">{product.description}</p>
</div>
```

#### 3. **Footer Component** (`client/src/components/Footer.tsx`)
- [ ] Footer background: `bg-gray-900` → `dark:bg-black`
- [ ] Text colors (already light, may need adjustments)
- [ ] Link hover states

#### 4. **Home Page** (`client/src/app/home/page.tsx`)
- [ ] Main container dark mode
- [ ] Section backgrounds
- [ ] Text colors

#### 5. **Product Detail Page** (`client/src/app/product/[id]/page.tsx`)
- [ ] Product info card: `bg-white` → `dark:bg-gray-900`
- [ ] Variant selector: `bg-gray-50` → `dark:bg-gray-800`
- [ ] Description section
- [ ] Related products section

#### 6. **Cart Page** (`client/src/app/cart/page.tsx`)
- [ ] Cart items: `bg-white` → `dark:bg-gray-900`
- [ ] Summary card: `bg-gray-50` → `dark:bg-gray-900`
- [ ] Empty cart state

#### 7. **Checkout Page** (`client/src/app/checkout/page.tsx`)
- [ ] Form backgrounds
- [ ] Input fields (handled by Shadcn UI components)
- [ ] Order summary

#### 8. **Auth Pages** (`client/src/app/auth/page.tsx`)
- [ ] Login/Register forms
- [ ] Card backgrounds
- [ ] Input fields

#### 9. **Profile Pages**
- [ ] `client/src/app/profile/page.tsx` - User profile
- [ ] `client/src/app/profile/orders/page.tsx` - Order history
- [ ] `client/src/app/profile/addresses/page.tsx` - Addresses

#### 10. **News/Blog Pages**
- [ ] `client/src/app/news/page.tsx` - News listing
- [ ] `client/src/app/news/[id]/page.tsx` - News detail

### Medium Priority (Admin Pages)

#### 11. **Admin Dashboard** (`client/src/app/admin/page.tsx`)
- [ ] Stat cards: `bg-white` → `dark:bg-gray-900`
- [ ] Charts backgrounds
- [ ] Table rows hover

#### 12. **Admin Products** (`client/src/app/admin/products/page.tsx`)
- [ ] Product table
- [ ] Quick Add dialog
- [ ] Clone dialog
- [ ] Bulk Import dialog
- [ ] Templates dialog

#### 13. **Admin Orders** (`client/src/app/admin/orders/page.tsx` & `[id]/page.tsx`)
- [ ] Order list table
- [ ] Order detail cards
- [ ] Status update dialog

#### 14. **Admin Categories** (`client/src/app/admin/categories/page.tsx`)
- [ ] Category table
- [ ] Create/Edit forms

#### 15. **Admin Users** (`client/src/app/admin/users/page.tsx`)
- [ ] User list table
- [ ] User detail cards

#### 16. **Admin Analytics** (`client/src/app/admin/analytics/page.tsx`)
- [ ] Chart backgrounds
- [ ] Metric cards

#### 17. **Admin Flash Sales** (`client/src/app/admin/flash-sales/[id]/page.tsx`)
- [ ] Flash sale details
- [ ] Product selection table

#### 18. **Admin Audit Logs** (`client/src/app/admin/audit-logs/page.tsx`)
- [ ] Log table
- [ ] Filter cards

### Low Priority (Utility Components)

#### 19. **Shadcn UI Components** (Auto-styled by CSS variables)
Most Shadcn components auto-adapt through CSS variables in `globals.css`, but check:
- [ ] Dialog backgrounds
- [ ] Dropdown menus
- [ ] Select components
- [ ] Input fields
- [ ] Buttons (check custom button styles)

#### 20. **CategoryMenu** (`client/src/components/CategoryMenu.tsx`)
- [ ] Menu background
- [ ] Menu items hover

#### 21. **ScrollToTop** (`client/src/components/ScrollToTop.tsx`)
- [ ] Button background: `bg-blue-600` → may need dark mode variant

---

## 🛠️ Implementation Steps

### Step 1: Batch Replace Pattern (Recommended)
Use VS Code's Find & Replace with Regex:

1. **Find:** `className="([^"]*)\bbg-white\b([^"]*)"`
2. **Replace:** `className="$1bg-white dark:bg-gray-900$2"`

3. **Find:** `className="([^"]*)\btext-gray-900\b([^"]*)"`
4. **Replace:** `className="$1text-gray-900 dark:text-white$2"`

5. **Find:** `className="([^"]*)\bborder-gray-200\b([^"]*)"`
6. **Replace:** `className="$1border-gray-200 dark:border-gray-800$2"`

### Step 2: Manual Review
After batch replacement, manually check:
- Hover states
- Active states
- Focus states
- Gradient backgrounds
- Shadow colors

### Step 3: Test Each Page
1. Toggle dark mode using ThemeToggle button
2. Check text readability
3. Verify hover/active states
4. Test responsive design (mobile/tablet/desktop)
5. Check accessibility (contrast ratios)

---

## 📋 Quick Reference Commands

### Check for bg-white occurrences:
```bash
grep -r "bg-white" client/src/app --include="*.tsx"
```

### Check for text-gray-900:
```bash
grep -r "text-gray-900" client/src/app --include="*.tsx"
```

### Find all className with bg- prefix:
```bash
grep -rE 'className="[^"]*\bbg-[^"]*"' client/src/app --include="*.tsx"
```

---

## 🎯 Testing Checklist

After implementing dark mode:

- [ ] Homepage loads correctly in both themes
- [ ] Product listing shows cards with proper contrast
- [ ] Product detail page readable
- [ ] Cart page functional
- [ ] Checkout form visible
- [ ] Admin dashboard accessible
- [ ] Theme persists on page refresh
- [ ] System theme detection works
- [ ] No flash on page load (suppressHydrationWarning working)
- [ ] Mobile responsive in both themes
- [ ] All interactive elements visible (buttons, links, inputs)

---

## 🐛 Common Issues & Solutions

### Issue 1: White flash on page load
**Solution:** Ensure `suppressHydrationWarning` on `<html>` tag in `layout.tsx`

### Issue 2: Theme doesn't persist
**Solution:** Check localStorage is working, ThemeProvider has correct props

### Issue 3: Some components don't update
**Solution:** Ensure component is client-side (`"use client"`) or wrapped in ThemeProvider

### Issue 4: Text not readable in dark mode
**Solution:** Use lighter text colors:
- `text-gray-900` → `dark:text-white`
- `text-gray-700` → `dark:text-gray-200`
- `text-gray-600` → `dark:text-gray-400`

### Issue 5: Images too bright in dark mode
**Solution:** Add opacity or filter:
```tsx
<img className="dark:opacity-90 dark:brightness-90" />
```

---

## 📚 Resources

- **next-themes documentation:** https://github.com/pacocoursey/next-themes
- **Tailwind CSS Dark Mode:** https://tailwindcss.com/docs/dark-mode
- **Shadcn UI Theming:** https://ui.shadcn.com/docs/theming
- **OKLCH Color Picker:** https://oklch.com/

---

## 🚀 Next Steps

1. **Immediate:** Add dark mode to MainContent, ProductCard, Footer (highest user impact)
2. **Short-term:** Complete all user-facing pages (Home, Products, Cart, Checkout, Profile)
3. **Medium-term:** Finish admin pages
4. **Long-term:** Polish hover states, add custom theme colors, consider theme presets

---

**Last Updated:** February 1, 2026
**Status:** Core infrastructure complete, pages in progress
**Priority:** Focus on user-facing pages first
