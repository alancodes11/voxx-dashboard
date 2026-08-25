// ==========================================================================
// VOYX ANALYTICS DASHBOARD - JAVASCRIPT & SUPABASE INTEGRATION
// Pure Vanilla JavaScript + Chart.js + Supabase JS Client + Bootstrap 5
// ==========================================================================

// ===============================
// SUPABASE CONFIGURATION
// Replace these values with your project credentials
// ===============================
const SUPABASE_URL = "https://rqulvpciliclkduuvkhq.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lBmeedzUE4YFeI_Bi04cmA_23F61CB"
// Application State
let supabaseClient = null;
let isConnected = false;

// In-memory data store for joined queries, filtering & analytics
let appData = {
  orders: [],
  users: [],
  products: [],
  destinations: [],
  joinedOrders: [],
  todayStats: { orders: 0, revenue: 0 },
  monthStats: { orders: 0, revenue: 0 },
  prevMonthStats: { orders: 0, revenue: 0 },
  overallStats: { users: 0, products: 0, orders: 0, revenue: 0 }
};

// UI & Filter States
let currentTab = "dashboard";
let ordersFilter = {
  search: "",
  startDate: "",
  endDate: "",
  sortBy: "date_desc",
  page: 1,
  pageSize: 10
};

let destinationsFilter = {
  search: "",
  status: "all"
};

// Chart instances
let dailyChartInstance = null;
let monthlyChartInstance = null;

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initDateDisplay();
  initSupabaseClient();
  setupEventListeners();
  renderInitialUI();
});

function initDateDisplay() {
  const dateEl = document.getElementById("currentDateDisplay");
  if (dateEl) {
    const now = new Date();
    const options = { day: "numeric", month: "short", year: "numeric" };
    dateEl.textContent = now.toLocaleDateString("en-GB", options);
  }
}

/**
 * Initialize Supabase Client if credentials are provided
 */
function initSupabaseClient() {
  // Check if credentials exist in script constants or local storage override
  const savedUrl = localStorage.getItem("VOYX_SUPABASE_URL") || SUPABASE_URL;
  const savedKey = localStorage.getItem("VOYX_SUPABASE_KEY") || SUPABASE_ANON_KEY;

  const isConfigured = 
    savedUrl && 
    savedKey && 
    savedUrl !== "YOUR_SUPABASE_PROJECT_URL" && 
    savedKey !== "YOUR_SUPABASE_ANON_KEY" &&
    savedUrl.startsWith("http");

  if (isConfigured && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
      isConnected = true;
      updateConnectionBanner(true, savedUrl);
      loadAllDashboardData();
    } catch (err) {
      console.error("Error initializing Supabase client:", err);
      isConnected = false;
      updateConnectionBanner(false);
    }
  } else {
    isConnected = false;
    updateConnectionBanner(false);
    renderPlaceholderMetrics();
  }
}

/**
 * Update the UI Connection Banner
 */
function updateConnectionBanner(connected, url = "") {
  const banner = document.getElementById("supabaseBanner");
  const bannerText = document.getElementById("supabaseBannerText");
  const bannerBadge = document.getElementById("supabaseBannerBadge");

  if (!banner || !bannerText || !bannerBadge) return;

  if (connected) {
    banner.className = "supabase-banner connected";
    bannerBadge.className = "banner-badge success";
    bannerBadge.innerHTML = `<i class="bi bi-check-circle-fill"></i> Live Database`;
    bannerText.innerHTML = `<strong>Connected to Supabase:</strong> Live data synchronized from your backend tables.`;
  } else {
    banner.className = "supabase-banner";
    bannerBadge.className = "banner-badge warning";
    bannerBadge.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> Setup Required`;
    bannerText.innerHTML = `<strong>Connect your Supabase project to load live data.</strong> Edit <code>SUPABASE_URL</code> & <code>SUPABASE_ANON_KEY</code> in <code>script.js</code> or use the Config button.`;
  }
}

/**
 * Render standard placeholders (--) when not yet connected
 */
function renderPlaceholderMetrics() {
  document.getElementById("kpiTodayOrders").textContent = "--";
  document.getElementById("kpiTodayRevenue").textContent = "₹--";
  document.getElementById("kpiMonthOrders").textContent = "--";
  document.getElementById("kpiMonthRevenue").textContent = "₹--";
  document.getElementById("kpiPrevMonthOrders").textContent = "--";
  document.getElementById("kpiPrevMonthRevenue").textContent = "₹--";
  document.getElementById("kpiOverallTotal").textContent = "--";
  document.getElementById("kpiOverallSubtext").textContent = "Connect database to view";

  renderLeaderboard([]);
  renderTopDestinations([]);
  renderDailyChart([], []);
  renderMonthlyChart([], []);
  renderOrdersTable([]);
  renderProductsTable([]);
  renderUsersTable([]);
  renderDestinationsTable([]);
}

// ==========================================================================
// DATA LOADING & FETCHING (ASYNC / AWAIT)
// ==========================================================================

/**
 * Master loader that orchestrates all data fetching
 */
async function loadAllDashboardData() {
  if (!supabaseClient) return;

  setLoadingState(true);

  try {
    // Parallel fetch from all Supabase tables
    await Promise.all([
      loadOrders(),
      loadUsers(),
      loadProducts(),
      loadDestinations()
    ]);

    // Perform relations and calculations
    processJoinedData();
    calculateKPIs();

    // Render components
    loadDashboardStats();
    loadDailySummary();
    loadMonthlySummary();
    loadLeaderboard();
    loadTopDestinations();
    renderOrdersTable();
    renderProductsTable();
    renderUsersTable();
    renderDestinationsTable();

    showToast("Dashboard synchronized successfully", "success");
  } catch (error) {
    console.error("Dashboard synchronization error:", error);
    showToast("Error loading data from Supabase", "danger");
  } finally {
    setLoadingState(false);
  }
}

/**
 * Load Orders Table
 */
async function loadOrders() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .order("order_date_time", { ascending: false });

    if (error) {
      console.error("Orders query error:", error);
      return;
    }
    appData.orders = data || [];
  } catch (err) {
    console.error("loadOrders exception:", err);
  }
}

/**
 * Load Users Table
 */
async function loadUsers() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("*");

    if (error) {
      console.error("Users query error:", error);
      return;
    }
    appData.users = data || [];
  } catch (err) {
    console.error("loadUsers exception:", err);
  }
}

/**
 * Load Products Table
 */
async function loadProducts() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*");

    if (error) {
      console.error("Products query error:", error);
      return;
    }
    appData.products = data || [];
  } catch (err) {
    console.error("loadProducts exception:", err);
  }
}

/**
 * Load Destinations Table
 */
async function loadDestinations() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await supabaseClient
      .from("destinations")
      .select("*");

    if (error) {
      console.error("Destinations query error:", error);
      return;
    }
    appData.destinations = data || [];
  } catch (err) {
    console.error("loadDestinations exception:", err);
  }
}

// ==========================================================================
// DATA PROCESSING & CALCULATIONS
// ==========================================================================

/**
 * Join orders with users and products for rich display & fast lookups
 */
function processJoinedData() {
  const usersMap = new Map();
  appData.users.forEach(u => usersMap.set(String(u.user_id), u));

  const productsMap = new Map();
  appData.products.forEach(p => productsMap.set(String(p.prod_id), p));

  appData.joinedOrders = appData.orders.map(order => {
    const user = usersMap.get(String(order.user_id)) || null;
    const product = productsMap.get(String(order.product_id)) || null;

    return {
      ...order,
      userName: user ? user.name : `User #${order.user_id || "N/A"}`,
      userRole: user ? user.user_role : "N/A",
      productName: product ? product.productName : `Product #${order.product_id || "N/A"}`,
      productValidity: product ? product.validity : "N/A",
      productDataLimit: product ? product.data_limit : "N/A",
      coverageDestinations: product ? product.coverageDestinations : null,
      allocatedDestinations: product ? product.allocatedDestinations : null
    };
  });
}

/**
 * Calculate KPI Metrics (Today, Month MTD, Previous Month, Overall)
 */
function calculateKPIs() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const todayDateStr = now.toISOString().slice(0, 10);

  // Prev month date calculation
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
  const prevYear = prevMonthDate.getFullYear();
  const prevMonth = prevMonthDate.getMonth();

  let todayOrders = 0;
  let todayRev = 0;
  let monthOrders = 0;
  let monthRev = 0;
  let prevMonthOrders = 0;
  let prevMonthRev = 0;
  let totalRev = 0;

  appData.orders.forEach(order => {
    const amount = Number(order.amount) || 0;
    totalRev += amount;

    if (!order.order_date_time) return;
    const oDate = new Date(order.order_date_time);
    const oDateStr = oDate.toISOString().slice(0, 10);
    const oYear = oDate.getFullYear();
    const oMonth = oDate.getMonth();

    // Today
    if (oDateStr === todayDateStr) {
      todayOrders += 1;
      todayRev += amount;
    }

    // Current Month MTD
    if (oYear === currentYear && oMonth === currentMonth) {
      monthOrders += 1;
      monthRev += amount;
    }

    // Prev Month
    if (oYear === prevYear && oMonth === prevMonth) {
      prevMonthOrders += 1;
      prevMonthRev += amount;
    }
  });

  appData.todayStats = { orders: todayOrders, revenue: todayRev };
  appData.monthStats = { orders: monthOrders, revenue: monthRev };
  appData.prevMonthStats = { orders: prevMonthOrders, revenue: prevMonthRev };
  appData.overallStats = {
    users: appData.users.length,
    products: appData.products.length,
    destinations: appData.destinations.length,
    orders: appData.orders.length,
    revenue: totalRev
  };
}

// ==========================================================================
// RENDERERS (UI COMPONENTS)
// ==========================================================================

/**
 * Render Dashboard Top KPI Cards
 */
function loadDashboardStats() {
  const formatCurrency = (val) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toLocaleString("en-IN")}`;
  };

  document.getElementById("kpiTodayOrders").innerHTML = `${appData.todayStats.orders} <span>Orders</span>`;
  document.getElementById("kpiTodayRevenue").textContent = `${formatCurrency(appData.todayStats.revenue)} Revenue`;

  document.getElementById("kpiMonthOrders").textContent = appData.monthStats.orders.toLocaleString();
  document.getElementById("kpiMonthRevenue").textContent = `${formatCurrency(appData.monthStats.revenue)} Revenue`;

  document.getElementById("kpiPrevMonthOrders").textContent = appData.prevMonthStats.orders.toLocaleString();
  document.getElementById("kpiPrevMonthRevenue").textContent = `${formatCurrency(appData.prevMonthStats.revenue)} Revenue`;

  document.getElementById("kpiOverallTotal").textContent = appData.overallStats.orders.toLocaleString();
  document.getElementById("kpiOverallSubtext").textContent = `${appData.overallStats.users} Users • ${formatCurrency(appData.overallStats.revenue)}`;
}

/**
 * Calculate and render Daily Leaderboard
 */
function loadLeaderboard() {
  if (!appData.joinedOrders.length) {
    renderLeaderboard([]);
    return;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayDateStr = now.toISOString().slice(0, 10);

  // Group by user_id
  const userStats = new Map();

  appData.joinedOrders.forEach(o => {
    const uId = String(o.user_id || "Unknown");
    if (!userStats.has(uId)) {
      userStats.set(uId, {
        userId: uId,
        userName: o.userName,
        todayOrders: 0,
        todayRev: 0,
        mtdOrders: 0,
        mtdRev: 0,
        prevMonthOrders: 0
      });
    }

    const stat = userStats.get(uId);
    const amount = Number(o.amount) || 0;

    if (o.order_date_time) {
      const oDate = new Date(o.order_date_time);
      const oDateStr = oDate.toISOString().slice(0, 10);
      const oYear = oDate.getFullYear();
      const oMonth = oDate.getMonth();

      if (oDateStr === todayDateStr) {
        stat.todayOrders += 1;
        stat.todayRev += amount;
      }
      if (oYear === currentYear && oMonth === currentMonth) {
        stat.mtdOrders += 1;
        stat.mtdRev += amount;
      }
      const prevDate = new Date(currentYear, currentMonth - 1, 1);
      if (oYear === prevDate.getFullYear() && oMonth === prevDate.getMonth()) {
        stat.prevMonthOrders += 1;
      }
    }
  });

  const leaderboardArray = Array.from(userStats.values())
    .sort((a, b) => b.mtdOrders - a.mtdOrders || b.mtdRev - a.mtdRev);

  renderLeaderboard(leaderboardArray);
}

function renderLeaderboard(list) {
  const tbody = document.getElementById("leaderboardTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-inbox d-block fs-3 mb-1"></i>
          ${isConnected ? "No leaderboard records found" : "Connect your Supabase project to load live data."}
        </td>
      </tr>
    `;
    return;
  }

  const formatRev = (val) => {
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val}`;
  };

  tbody.innerHTML = list.map((item, index) => {
    const rank = index + 1;
    const rankClass = rank === 1 ? "top-1" : rank === 2 ? "top-2" : rank === 3 ? "top-3" : "";
    const arpu = item.mtdOrders > 0 ? Math.round(item.mtdRev / item.mtdOrders) : 0;
    
    // Performance target metric calculation
    const targetOrders = 150; // benchmark
    const pct = Math.min(100, Math.round((item.mtdOrders / targetOrders) * 100));

    return `
      <tr>
        <td>
          <span class="rank-badge ${rankClass}">${rank}</span>
        </td>
        <td>
          <strong>${escapeHtml(item.userName)}</strong>
        </td>
        <td>
          <span class="cell-green-highlight">${item.todayOrders}</span>
          <span class="d-block text-muted" style="font-size: 0.72rem;">${formatRev(item.todayRev)}</span>
        </td>
        <td>
          <span class="cell-orange-highlight">${item.mtdOrders}</span>
        </td>
        <td>
          <strong>${formatRev(item.mtdRev)}</strong>
        </td>
        <td>
          ₹${arpu.toLocaleString()}
        </td>
        <td>
          <div class="target-progress-wrapper">
            <span class="target-pct">${pct}%</span>
            <div class="target-progress-bar">
              <div class="target-progress-fill" style="width: ${pct}%"></div>
            </div>
            <span class="text-muted" style="font-size: 0.75rem;">${item.prevMonthOrders}</span>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * Calculate and render Top Destinations (Dark Card)
 */
function loadTopDestinations() {
  const destCountMap = new Map();

  // 1. Inspect destinations from products of joined orders
  appData.joinedOrders.forEach(o => {
    let dests = o.coverageDestinations || o.allocatedDestinations;
    if (dests) {
      if (typeof dests === "string") {
        // May be comma separated or JSON string
        try {
          const parsed = JSON.parse(dests);
          if (Array.isArray(parsed)) dests = parsed;
          else dests = [dests];
        } catch {
          dests = dests.split(",").map(d => d.trim()).filter(Boolean);
        }
      }
      if (Array.isArray(dests)) {
        dests.forEach(d => {
          const name = typeof d === "object" ? (d.destination_name || d.name || "Unknown") : String(d);
          destCountMap.set(name, (destCountMap.get(name) || 0) + 1);
        });
      }
    }
  });

  // 2. If no coverage destination on orders, check destination catalog
  if (destCountMap.size === 0 && appData.destinations.length > 0) {
    appData.destinations.slice(0, 7).forEach((dest, idx) => {
      destCountMap.set(dest.destination_name, 0);
    });
  }

  const topList = Array.from(destCountMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  renderTopDestinations(topList);
}

function renderTopDestinations(list) {
  const container = document.getElementById("topDestinationsList");
  if (!container) return;

  if (!list || list.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="bi bi-globe d-block fs-3 mb-1 text-secondary"></i>
        <small>${isConnected ? "No destinations data recorded" : "Connect your Supabase project to load live data."}</small>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="destination-item">
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-geo-alt-fill text-warning"></i>
        <span class="destination-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
      </div>
      <span class="destination-count-badge">${item.count}</span>
    </div>
  `).join("");
}

/**
 * Daily Summary Chart (Chart.js Line Chart in Orange)
 */
function loadDailySummary() {
  const dailyMap = new Map();

  // Extract last 30 days or all order dates
  appData.orders.forEach(o => {
    if (!o.order_date_time) return;
    const dateObj = new Date(o.order_date_time);
    const dayLabel = `${String(dateObj.getDate()).padStart(2, "0")}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    
    dailyMap.set(dayLabel, (dailyMap.get(dayLabel) || 0) + 1);
  });

  const labels = Array.from(dailyMap.keys());
  const data = Array.from(dailyMap.values());

  renderDailyChart(labels, data);
}

function renderDailyChart(labels, data) {
  const canvas = document.getElementById("dailySummaryChart");
  if (!canvas) return;

  if (dailyChartInstance) {
    dailyChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  // Create orange gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, "rgba(255, 87, 34, 0.25)");
  gradient.addColorStop(1, "rgba(255, 87, 34, 0.0)");

  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["01-06", "05-06", "10-06", "15-06", "20-06", "25-06", "30-06"],
      datasets: [{
        label: "Daily Orders",
        data: data.length ? data : (isConnected ? [] : [0, 0, 0, 0, 0, 0, 0]),
        borderColor: "#ff5722",
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: "#ff5722",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0f172a",
          padding: 10,
          cornerRadius: 8,
          titleFont: { size: 12, weight: "bold" },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx) => ` Orders: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", font: { size: 10 }, maxRotation: 45 }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#f1f5f9" },
          ticks: { color: "#94a3b8", font: { size: 11 }, precision: 0 }
        }
      }
    }
  });
}

/**
 * Monthly Summary Chart (Chart.js Cumulative / Monthly Revenue & Orders)
 */
function loadMonthlySummary() {
  const monthMap = new Map();

  appData.orders.forEach(o => {
    if (!o.order_date_time) return;
    const dateObj = new Date(o.order_date_time);
    const monthLabel = dateObj.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    
    if (!monthMap.has(monthLabel)) {
      monthMap.set(monthLabel, { orders: 0, revenue: 0 });
    }
    const cur = monthMap.get(monthLabel);
    cur.orders += 1;
    cur.revenue += Number(o.amount) || 0;
  });

  const labels = Array.from(monthMap.keys());
  const ordersData = labels.map(l => monthMap.get(l).orders);

  renderMonthlyChart(labels, ordersData);
}

function renderMonthlyChart(labels, data) {
  const canvas = document.getElementById("monthlySummaryChart");
  if (!canvas) return;

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy();
  }

  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 250);
  gradient.addColorStop(0, "rgba(255, 107, 0, 0.2)");
  gradient.addColorStop(1, "rgba(255, 107, 0, 0.0)");

  monthlyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels.length ? labels : ["Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26"],
      datasets: [{
        label: "Monthly Orders",
        data: data.length ? data : (isConnected ? [] : [0, 0, 0, 0, 0, 0, 0, 0]),
        borderColor: "#ff6b00",
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: "#ff6b00",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0f172a",
          padding: 10,
          cornerRadius: 8,
          titleFont: { size: 12, weight: "bold" },
          bodyFont: { size: 12 },
          callbacks: {
            label: (ctx) => ` Monthly Orders: ${ctx.parsed.y}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", font: { size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "#f1f5f9" },
          ticks: { color: "#94a3b8", font: { size: 11 }, precision: 0 }
        }
      }
    }
  });
}

// ==========================================================================
// RECENT ORDERS TABLE (WITH FILTER, SEARCH, SORT, PAGINATION)
// ==========================================================================
function renderOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  let filtered = [...appData.joinedOrders];

  // Search filter (order_no, userName, productName, created_by)
  if (ordersFilter.search) {
    const q = ordersFilter.search.toLowerCase();
    filtered = filtered.filter(o => 
      String(o.order_no || "").toLowerCase().includes(q) ||
      String(o.userName || "").toLowerCase().includes(q) ||
      String(o.productName || "").toLowerCase().includes(q) ||
      String(o.created_by || "").toLowerCase().includes(q)
    );
  }

  // Date filter
  if (ordersFilter.startDate) {
    filtered = filtered.filter(o => o.order_date_time && o.order_date_time >= ordersFilter.startDate);
  }
  if (ordersFilter.endDate) {
    filtered = filtered.filter(o => o.order_date_time && o.order_date_time <= ordersFilter.endDate + "T23:59:59");
  }

  // Sorting
  filtered.sort((a, b) => {
    if (ordersFilter.sortBy === "date_asc") {
      return new Date(a.order_date_time || 0) - new Date(b.order_date_time || 0);
    }
    if (ordersFilter.sortBy === "amount_desc") {
      return (Number(b.amount) || 0) - (Number(a.amount) || 0);
    }
    if (ordersFilter.sortBy === "amount_asc") {
      return (Number(a.amount) || 0) - (Number(b.amount) || 0);
    }
    // default date_desc
    return new Date(b.order_date_time || 0) - new Date(a.order_date_time || 0);
  });

  // Pagination calculations
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ordersFilter.pageSize) || 1;
  if (ordersFilter.page > totalPages) ordersFilter.page = totalPages;

  const startIndex = (ordersFilter.page - 1) * ordersFilter.pageSize;
  const pageItems = filtered.slice(startIndex, startIndex + ordersFilter.pageSize);

  // Update record count text
  const countEl = document.getElementById("ordersCountText");
  if (countEl) {
    countEl.textContent = `Showing ${totalItems > 0 ? startIndex + 1 : 0}-${Math.min(startIndex + ordersFilter.pageSize, totalItems)} of ${totalItems} orders`;
  }

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-muted">
          <i class="bi bi-receipt-cutoff d-block fs-3 mb-1"></i>
          ${isConnected ? "No orders match the current filter" : "Connect your Supabase project to load live data."}
        </td>
      </tr>
    `;
    renderPagination(totalPages);
    return;
  }

  tbody.innerHTML = pageItems.map(o => {
    const formattedDate = o.order_date_time 
      ? new Date(o.order_date_time).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) 
      : "N/A";
    const amount = Number(o.amount) || 0;
    const discount = Number(o.discount_amount) || 0;

    return `
      <tr>
        <td>
          <span class="fw-bold text-dark">#${escapeHtml(String(o.order_no))}</span>
        </td>
        <td>
          <span class="text-secondary" style="font-size: 0.82rem;">${formattedDate}</span>
        </td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-person-circle text-secondary"></i>
            <div>
              <span class="fw-semibold text-dark">${escapeHtml(o.userName)}</span>
              <span class="d-block text-muted" style="font-size: 0.72rem;">ID: ${escapeHtml(String(o.user_id))}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${escapeHtml(o.productName)}</span>
        </td>
        <td>
          <strong class="cell-orange-highlight">₹${amount.toLocaleString("en-IN")}</strong>
        </td>
        <td>
          ${discount > 0 ? `<span class="text-success fw-semibold">-₹${discount}</span>` : `<span class="text-muted">₹0</span>`}
        </td>
        <td>
          <span class="badge bg-secondary-subtle text-secondary">${escapeHtml(String(o.created_by || "System"))}</span>
        </td>
      </tr>
    `;
  }).join("");

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const container = document.getElementById("ordersPagination");
  if (!container) return;

  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <li class="page-item ${ordersFilter.page === 1 ? "disabled" : ""}">
      <button class="page-link" onclick="changeOrdersPage(${ordersFilter.page - 1})">Previous</button>
    </li>
  `;

  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || (p >= ordersFilter.page - 1 && p <= ordersFilter.page + 1)) {
      html += `
        <li class="page-item ${p === ordersFilter.page ? "active" : ""}">
          <button class="page-link" onclick="changeOrdersPage(${p})">${p}</button>
        </li>
      `;
    } else if (p === ordersFilter.page - 2 || p === ordersFilter.page + 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  html += `
    <li class="page-item ${ordersFilter.page === totalPages ? "disabled" : ""}">
      <button class="page-link" onclick="changeOrdersPage(${ordersFilter.page + 1})">Next</button>
    </li>
  `;

  container.innerHTML = html;
}

window.changeOrdersPage = function(page) {
  ordersFilter.page = page;
  renderOrdersTable();
};

// ==========================================================================
// PRODUCTS TABLE
// ==========================================================================
function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;

  // Calculate order stats per product
  const productOrderStats = new Map();
  appData.orders.forEach(o => {
    const pId = String(o.product_id);
    if (!productOrderStats.has(pId)) {
      productOrderStats.set(pId, { count: 0, revenue: 0 });
    }
    const cur = productOrderStats.get(pId);
    cur.count += 1;
    cur.revenue += Number(o.amount) || 0;
  });

  if (appData.products.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-4 text-muted">
          <i class="bi bi-box-seam d-block fs-3 mb-1"></i>
          ${isConnected ? "No products found in database" : "Connect your Supabase project to load live data."}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appData.products.map(p => {
    const stats = productOrderStats.get(String(p.prod_id)) || { count: 0, revenue: 0 };
    return `
      <tr>
        <td>
          <div class="fw-bold text-dark">${escapeHtml(p.productName || "Unnamed Product")}</div>
          <span class="text-muted" style="font-size: 0.72rem;">ID: ${escapeHtml(String(p.prod_id))}</span>
        </td>
        <td>
          <strong>₹${(Number(p.amount) || 0).toLocaleString("en-IN")}</strong>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${escapeHtml(String(p.validity || "N/A"))}</span>
        </td>
        <td>
          ${escapeHtml(String(p.data_limit || "N/A"))}
        </td>
        <td>
          ${escapeHtml(String(p.fupLimit || "N/A"))}
        </td>
        <td>
          ${escapeHtml(String(p.PostFupSpeed || "N/A"))}
        </td>
        <td>
          <span class="badge bg-primary-subtle text-primary fw-bold">${stats.count}</span>
        </td>
        <td>
          <strong class="cell-orange-highlight">₹${stats.revenue.toLocaleString("en-IN")}</strong>
        </td>
      </tr>
    `;
  }).join("");
}

// ==========================================================================
// USERS TABLE
// ==========================================================================
function renderUsersTable() {
  const tbody = document.getElementById("usersTableBody");
  const totalBadge = document.getElementById("totalUsersBadge");
  if (totalBadge) totalBadge.textContent = `${appData.users.length} Users`;

  if (!tbody) return;

  if (appData.users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center py-4 text-muted">
          <i class="bi bi-people d-block fs-3 mb-1"></i>
          ${isConnected ? "No users found in database" : "Connect your Supabase project to load live data."}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appData.users.map(u => {
    const roleClass = (u.user_role || "").toLowerCase() === "admin" ? "badge-role-admin" : "badge-role-user";
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            <i class="bi bi-person-fill fs-5 text-secondary"></i>
            <div>
              <div class="fw-bold text-dark">${escapeHtml(u.name || "Unknown")}</div>
              <span class="text-muted" style="font-size: 0.72rem;">User ID: ${escapeHtml(String(u.user_id))}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${escapeHtml(String(u.country_code || "+91"))}</span>
        </td>
        <td>
          <span class="${roleClass}">${escapeHtml(String(u.user_role || "User"))}</span>
        </td>
        <td>
          <span class="text-muted" style="font-size: 0.8rem;">Protected for Privacy</span>
        </td>
      </tr>
    `;
  }).join("");
}

// ==========================================================================
// DESTINATIONS TABLE
// ==========================================================================
function renderDestinationsTable() {
  const tbody = document.getElementById("destinationsTableBody");
  if (!tbody) return;

  let filtered = [...appData.destinations];

  if (destinationsFilter.search) {
    const q = destinationsFilter.search.toLowerCase();
    filtered = filtered.filter(d => 
      String(d.destination_name || "").toLowerCase().includes(q) ||
      String(d.destination_type || "").toLowerCase().includes(q)
    );
  }

  if (destinationsFilter.status === "active") {
    filtered = filtered.filter(d => d.is_active === true || d.is_active === "true" || d.is_active === 1);
  } else if (destinationsFilter.status === "inactive") {
    filtered = filtered.filter(d => d.is_active === false || d.is_active === "false" || d.is_active === 0);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-muted">
          <i class="bi bi-geo-alt d-block fs-3 mb-1"></i>
          ${isConnected ? "No destinations match the criteria" : "Connect your Supabase project to load live data."}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(d => {
    const isActive = d.is_active === true || d.is_active === "true" || d.is_active === 1;
    return `
      <tr>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${d.flag_path ? `<img src="${escapeHtml(d.flag_path)}" alt="Flag" class="flag-img" onerror="this.style.display='none'">` : `<i class="bi bi-flag text-secondary"></i>`}
            <span class="fw-bold text-dark">${escapeHtml(d.destination_name || "Unknown")}</span>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${escapeHtml(d.destination_type || "Standard")}</span>
        </td>
        <td>
          <span class="${isActive ? "badge-active" : "badge-inactive"}">
            <i class="bi bi-circle-fill" style="font-size: 0.5rem;"></i> ${isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td>
          <span class="text-muted" style="font-size: 0.8rem;">${escapeHtml(String(d.included_destinations || "--"))}</span>
        </td>
      </tr>
    `;
  }).join("");
}

// ==========================================================================
// CSV EXPORT (VANILLA JAVASCRIPT - NO 3RD PARTY LIBS)
// ==========================================================================
function downloadOrdersCSV() {
  const dataToExport = appData.joinedOrders.length > 0 ? appData.joinedOrders : appData.orders;

  if (dataToExport.length === 0) {
    showToast("No orders available to export", "warning");
    return;
  }

  const headers = [
    "Order No",
    "Order Date Time",
    "User ID",
    "User Name",
    "Product ID",
    "Product Name",
    "Amount",
    "Discount Amount",
    "Created By"
  ];

  const rows = dataToExport.map(o => [
    `"${String(o.order_no || "").replace(/"/g, '""')}"`,
    `"${String(o.order_date_time || "").replace(/"/g, '""')}"`,
    `"${String(o.user_id || "").replace(/"/g, '""')}"`,
    `"${String(o.userName || "").replace(/"/g, '""')}"`,
    `"${String(o.product_id || "").replace(/"/g, '""')}"`,
    `"${String(o.productName || "").replace(/"/g, '""')}"`,
    Number(o.amount) || 0,
    Number(o.discount_amount) || 0,
    `"${String(o.created_by || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.join(","))
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast("Orders CSV exported successfully", "success");
}

// ==========================================================================
// EVENT LISTENERS & UI NAVIGATION
// ==========================================================================
function setupEventListeners() {
  // Navigation Tabs
  document.querySelectorAll("[data-nav-tab]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.getAttribute("data-nav-tab");
      switchTab(target);
    });
  });

  // Refresh Button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      if (isConnected) {
        loadAllDashboardData();
      } else {
        showToast("Connect your Supabase project to load live data.", "info");
      }
    });
  }

  // Download CSV Button
  const downloadCsvBtn = document.getElementById("downloadCsvBtn");
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", downloadOrdersCSV);
  }

  // Orders Table Search & Filters
  const ordersSearch = document.getElementById("ordersSearchInput");
  if (ordersSearch) {
    ordersSearch.addEventListener("input", (e) => {
      ordersFilter.search = e.target.value;
      ordersFilter.page = 1;
      renderOrdersTable();
    });
  }

  const ordersSort = document.getElementById("ordersSortSelect");
  if (ordersSort) {
    ordersSort.addEventListener("change", (e) => {
      ordersFilter.sortBy = e.target.value;
      ordersFilter.page = 1;
      renderOrdersTable();
    });
  }

  const ordersStartDate = document.getElementById("ordersStartDate");
  if (ordersStartDate) {
    ordersStartDate.addEventListener("change", (e) => {
      ordersFilter.startDate = e.target.value;
      ordersFilter.page = 1;
      renderOrdersTable();
    });
  }

  const ordersEndDate = document.getElementById("ordersEndDate");
  if (ordersEndDate) {
    ordersEndDate.addEventListener("change", (e) => {
      ordersFilter.endDate = e.target.value;
      ordersFilter.page = 1;
      renderOrdersTable();
    });
  }

  // Destinations Filter
  const destSearch = document.getElementById("destSearchInput");
  if (destSearch) {
    destSearch.addEventListener("input", (e) => {
      destinationsFilter.search = e.target.value;
      renderDestinationsTable();
    });
  }

  const destStatus = document.getElementById("destStatusFilter");
  if (destStatus) {
    destStatus.addEventListener("change", (e) => {
      destinationsFilter.status = e.target.value;
      renderDestinationsTable();
    });
  }

  // Config Modal Form Submission
  const configForm = document.getElementById("supabaseConfigForm");
  if (configForm) {
    configForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const urlInput = document.getElementById("configSupabaseUrl").value.trim();
      const keyInput = document.getElementById("configSupabaseKey").value.trim();

      if (urlInput && keyInput) {
        localStorage.setItem("VOYX_SUPABASE_URL", urlInput);
        localStorage.setItem("VOYX_SUPABASE_KEY", keyInput);
        initSupabaseClient();
        
        const modalEl = document.getElementById("supabaseConfigModal");
        if (modalEl && window.bootstrap) {
          const modalInstance = bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) modalInstance.hide();
        }
      }
    });
  }
}

function switchTab(tabId) {
  currentTab = tabId;

  // Update nav buttons
  document.querySelectorAll("[data-nav-tab]").forEach(btn => {
    if (btn.getAttribute("data-nav-tab") === tabId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // Show/Hide sections
  const sections = ["dashboardSection", "ordersSection", "productsSection", "usersSection", "destinationsSection"];
  sections.forEach(secId => {
    const secEl = document.getElementById(secId);
    if (secEl) {
      if (secId === `${tabId}Section`) {
        secEl.classList.remove("d-none");
      } else {
        secEl.classList.add("d-none");
      }
    }
  });
}

function renderInitialUI() {
  renderPlaceholderMetrics();
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================
function setLoadingState(isLoading) {
  const refreshIcon = document.querySelector("#refreshBtn i");
  if (refreshIcon) {
    if (isLoading) {
      refreshIcon.classList.add("bi-arrow-repeat", "spin");
    } else {
      refreshIcon.classList.remove("spin");
    }
  }
}

function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const bgClass = type === "success" ? "bg-success text-white" : type === "danger" ? "bg-danger text-white" : type === "warning" ? "bg-warning text-dark" : "bg-dark text-white";

  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center ${bgClass} border-0 show mb-2 shadow`;
  toastEl.setAttribute("role", "alert");
  toastEl.setAttribute("aria-live", "assertive");
  toastEl.setAttribute("aria-atomic", "true");
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi ${type === "success" ? "bi-check-circle" : type === "danger" ? "bi-exclamation-octagon" : "bi-info-circle"} me-2"></i>
        ${escapeHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  toastContainer.appendChild(toastEl);

  setTimeout(() => {
    toastEl.classList.remove("show");
    setTimeout(() => toastEl.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(text);
  return div.innerHTML;
}
