# VOYX Analytics Dashboard (Frontend)

A complete, responsive SaaS business analytics dashboard built with **HTML5, CSS3, Vanilla JavaScript, Bootstrap 5, Chart.js, and the Supabase JavaScript Client**.

---

## 🚀 Quick Start

1. **Directly Open:** Simply open `index.html` (or `dashboard/index.html`) in any web browser.
2. **No Build Step Required:** No `npm install`, Node.js, React, Vite, or bundlers needed. All dependencies are loaded via high-speed CDNs.

---

## ⚡ Supabase Connection Configuration

Open `script.js` (or `dashboard/script.js`) and locate the configuration section at the top:

```javascript
// ===============================
// SUPABASE CONFIGURATION
// Replace these values with your project credentials
// ===============================
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

### Steps:
1. Go to your **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Navigate to **Project Settings** > **API**.
3. Copy your **Project URL** and paste it as `SUPABASE_URL`.
4. Copy your public **anon / publishable key** and paste it as `SUPABASE_ANON_KEY`.
5. Save `script.js` and refresh your browser (or use the **Config** button in the dashboard UI).

> 🔒 **Security Notice:** Never use your `service_role` secret key on the frontend. The dashboard strictly uses the public anon key with your Supabase Row-Level Security (RLS) policies.

---

## 📊 Connected Supabase Tables & Schema

The dashboard automatically syncs with the following tables:

- `users` (`user_id`, `name`, `country_code`, `mobile`, `user_role`)
- `products` (`prod_id`, `productName`, `amount`, `validity`, `data_limit`, `fupLimit`, `PostFupSpeed`, `coverageDestinations`, `allocatedDestinations`)
- `orders` (`order_no`, `order_date_time`, `user_id`, `product_id`, `amount`, `discount_amount`, `created_by`)
- `destinations` (`destination_id`, `destination_type`, `destination_name`, `flag_path`, `included_destinations`, `is_active`)

---

## 🎯 Features Included

- **Dark Navy Today's Performance KPI Card** (Orders & Revenue highlights)
- **Current Month & Previous Month Performance Cards** (Calculated dynamically)
- **Daily Leaderboard Table** (Rank badges, User performance, #Day, #MTD, MTD Revenue, ARPU/AOV, and Target progress bars)
- **Top Destinations Section** (Dark navy card with dynamic frequency counts & popularity sorting)
- **Daily Summary Chart** (Chart.js responsive smooth orange line chart)
- **Monthly Summary Chart** (Chart.js dynamic monthly trend chart)
- **Recent Orders Table** with Live Search, Start/End Date range filters, Sorting, and Pagination
- **Client-Side CSV Export** (Zero dependencies, pure Vanilla JS Blob download)
- **Product Catalog View** with dynamically aggregated order counts and revenue per product
- **Users Directory & Destinations Management Views**
- **Graceful Fallbacks & Offline/Placeholder States** (Displays clean `--` and setup indicators when credentials are placeholders)
