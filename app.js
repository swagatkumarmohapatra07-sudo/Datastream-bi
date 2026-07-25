/* =====================================================
   DataStream BI — Complete Application Logic
   ===================================================== */

/* ===== TOAST SYSTEM ===== */
const Toast = {
  container: document.getElementById('toastContainer'),

  show(title, message, type, duration) {
    type = type || 'info';
    duration = (duration !== undefined ? duration : 4000);
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<div class="toast-icon"><i class="fas ' + (icons[type] || icons.info) + '"></i></div><div class="toast-body"><div class="toast-title">' + this._esc(title) + '</div><div class="toast-message">' + this._esc(message) + '</div></div><button class="toast-close" aria-label="Close"><i class="fas fa-times"></i></button>';
    toast.querySelector('.toast-close').addEventListener('click', function () { Toast._remove(toast); });
    this.container.appendChild(toast);
    if (duration > 0) {
      setTimeout(function () { Toast._remove(toast); }, duration);
    }
    return toast;
  },

  success: function (t, m, d) { return Toast.show(t, m, 'success', d); },
  error: function (t, m, d) { return Toast.show(t, m, 'error', d); },
  warning: function (t, m, d) { return Toast.show(t, m, 'warning', d); },
  info: function (t, m, d) { return Toast.show(t, m, 'info', d); },

  _remove: function (toast) {
    if (toast.classList.contains('removing')) return;
    toast.classList.add('removing');
    setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 260);
  },

  _esc: function (str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
};

/* =====================================================
   AUTH SYSTEM
   ===================================================== */

var ROLES = {
  viewer:  { label: 'Viewer',             level: 0, desc: 'Read-only access' },
  creator: { label: 'Creator',            level: 1, desc: 'Create & edit dashboards' },
  editor:  { label: 'Data Stream Editor', level: 2, desc: 'Manage data sources & queries' },
  admin:   { label: 'Admin',              level: 3, desc: 'Full system control' }
};

var Auth = {
  STORAGE_KEY: 'datastream_bi_users',
  SESSION_KEY: 'datastream_bi_session',

  getUsers: function () {
    try {
      var data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
  },

  saveUsers: function (users) {
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users)); } catch (e) {}
  },

  getSession: function () {
    try {
      var data = sessionStorage.getItem(this.SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  },

  saveSession: function (user) {
    try {
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
        name: user.name,
        email: user.email,
        initials: user.initials,
        role: user.role || 'viewer'
      }));
    } catch (e) {}
  },

  clearSession: function () {
    try { sessionStorage.removeItem(this.SESSION_KEY); } catch (e) {}
  },

  initDefaultUsers: function () {
    var users = this.getUsers();
    if (users.length === 0) {
      users.push({ name: 'Admin User',      email: 'admin@datastream.com',   password: 'password123', initials: 'AU', role: 'admin' });
      users.push({ name: 'Creator User',    email: 'creator@datastream.com', password: 'creator123', initials: 'CU', role: 'creator' });
      users.push({ name: 'Editor User',     email: 'editor@datastream.com',  password: 'editor123',  initials: 'EU', role: 'editor' });
      users.push({ name: 'Viewer User',     email: 'demo@datastream.com',    password: 'demo1234',   initials: 'VU', role: 'viewer' });
      this.saveUsers(users);
    }
  },

  login: function (email, password) {
    var users = this.getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email && users[i].password === password) {
        this.saveSession(users[i]);
        return { success: true, user: users[i] };
      }
    }
    return { success: false, error: 'Invalid email or password.' };
  },

  signup: function (name, email, password) {
    var users = this.getUsers();
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) {
        return { success: false, error: 'An account with this email already exists.' };
      }
    }
    var initials = (function (n) {
      var parts = n.trim().split(/\s+/);
      var result = '';
      for (var j = 0; j < Math.min(parts.length, 2); j++) {
        if (parts[j].length > 0) result += parts[j][0].toUpperCase();
      }
      return result || 'U';
    })(name);

    users.push({ name: name, email: email, password: password, initials: initials, role: 'creator' });
    this.saveUsers(users);
    this.saveSession({ name: name, email: email, initials: initials, role: 'creator' });
    return { success: true, user: { name: name, email: email, initials: initials, role: 'creator' } };
  },

  logout: function () {
    this.clearSession();
    window.location.reload();
  },

  setRole: function (role) {
    if (!ROLES[role]) return false;
    try {
      var session = this.getSession();
      if (session) {
        session.role = role;
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        applyPermissions();
        InsightEngine._generate();
        return true;
      }
    } catch (e) {}
    return false;
  },

  getRole: function () {
    var session = this.getSession();
    return session ? (session.role || 'viewer') : 'viewer';
  },

  can: function (action) {
    var level = ROLES[this.getRole()] ? ROLES[this.getRole()].level : 0;
    switch (action) {
      case 'export':    return level >= 1;
      case 'save':      return level >= 1;
      case 'edit_data': return level >= 2;
      case 'admin':     return level >= 3;
      default:          return false;
    }
  }
};

/* =====================================================
   MOCK DATA
   ===================================================== */

var DATA = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  revenue: [9450, 10200, 11800, 10950, 12400, 13100, 11900, 12850, 14200, 13800, 15200, 15600],
  profit: [3120, 3860, 4520, 4080, 4780, 5120, 4610, 4980, 5520, 5340, 5920, 6100],
  categories: { Electronics: 42500, Apparel: 31200, 'Home & Living': 25600, Beauty: 18200, Fitness: 10950 },
  funnel: { 'Store Visits': 25000, 'Product Views': 14300, 'Cart Additions': 6850, 'Checkout': 4100, 'Purchases': 3420 },
  products: [
    { name: 'Wireless ANC Headphones', revenue: 28450, units: 520, stock: 'In Stock' },
    { name: 'Ergonomic Office Chair', revenue: 22100, units: 185, stock: 'In Stock' },
    { name: 'Smart Fitness Tracker Pro', revenue: 18900, units: 630, stock: 'Low Stock' },
    { name: '4K Ultra HD Webcam', revenue: 15750, units: 410, stock: 'In Stock' },
    { name: 'Minimalist Desk Lamp', revenue: 12200, units: 780, stock: 'In Stock' }
  ]
};

/* =====================================================
   KPI ENGINE
   ===================================================== */

var KpiEngine = {
  totalRevenue: 0, totalOrders: 0, aov: 0, conversionRate: 0,
  revenueGrowth: 0, orderGrowth: 0, aovGrowth: 0, convGrowth: 0,

  init: function () {
    this.totalRevenue = DATA.revenue.reduce(function (a, b) { return a + b; }, 0);
    this.totalOrders = DATA.funnel['Purchases'];
    this.aov = this.totalRevenue / this.totalOrders;
    this.conversionRate = (DATA.funnel['Purchases'] / DATA.funnel['Store Visits']) * 100;

    var prevRev = DATA.revenue.slice(0, 6).reduce(function (a, b) { return a + b; }, 0);
    var currRev = DATA.revenue.slice(6).reduce(function (a, b) { return a + b; }, 0);
    this.revenueGrowth = ((currRev - prevRev) / prevRev) * 100;
    this.orderGrowth = ((this.totalOrders - 3160) / 3160) * 100;
    this.aovGrowth = ((this.aov - 38.09) / 38.09) * 100;
    this.convGrowth = this.conversionRate - 3.39;
  },

  render: function () {
    var cards = [
      { id: 'kpiRevenueValue', bid: 'kpiRevenueBadge', raw: this.totalRevenue, fmt: function (v) { return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }, badge: '\u2191 ' + this.revenueGrowth.toFixed(1) + '% vs last month', cls: 'up' },
      { id: 'kpiOrdersValue', bid: 'kpiOrdersBadge', raw: this.totalOrders, fmt: function (v) { return Math.round(v).toLocaleString(); }, badge: '\u2191 ' + this.orderGrowth.toFixed(1) + '% vs last month', cls: 'up' },
      { id: 'kpiAovValue', bid: 'kpiAovBadge', raw: this.aov, fmt: function (v) { return '$' + Number(v).toFixed(2); }, badge: '\u2193 ' + Math.abs(this.aovGrowth).toFixed(1) + '% vs last month', cls: 'down' },
      { id: 'kpiConversionValue', bid: 'kpiConversionBadge', raw: this.conversionRate, fmt: function (v) { return Number(v).toFixed(2) + '%'; }, badge: '\u2191 ' + this.convGrowth.toFixed(1) + '% vs last month', cls: 'up' }
    ];

    for (var c = 0; c < cards.length; c++) {
      var card = cards[c];
      var valueEl = document.getElementById(card.id);
      var badgeEl = document.getElementById(card.bid);
      if (valueEl) { KpiEngine._animate(valueEl, card.raw, card.fmt); }
      if (badgeEl) { badgeEl.textContent = card.badge; badgeEl.className = 'kpi-badge ' + card.cls; }
    }
  },

  _animate: function (el, target, fmt) {
    var start = performance.now();
    var duration = 1200;
    function step(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) { requestAnimationFrame(step); } else { el.textContent = fmt(target); }
    }
    requestAnimationFrame(step);
  }
};

/* =====================================================
   FOCUS METRICS ENGINE
   ===================================================== */

var FocusMetrics = {
  ingestion: 0, queryPerf: 0, sessions: 0, exports: 0,
  ingGrowth: 0, queryGrowth: 0, sessGrowth: 0, expGrowth: 0,

  init: function () {
    this.ingestion = 124538;
    this.queryPerf = 284;
    this.sessions = 1247;
    this.exports = 856;

    this.ingGrowth = 8.3;
    this.queryGrowth = -4.1;
    this.sessGrowth = 22.5;
    this.expGrowth = 14.7;
  },

  render: function () {
    var cards = [
      { id: 'kpiIngestionValue', bid: 'kpiIngestionBadge', raw: this.ingestion, fmt: function (v) { return Number(v).toLocaleString() + ' rec'; }, cls: 'up', badge: '\u2191 ' + this.ingGrowth.toFixed(1) + '% vs last month' },
      { id: 'kpiQueryPerfValue', bid: 'kpiQueryPerfBadge', raw: this.queryPerf, fmt: function (v) { return v.toFixed(0) + 'ms'; }, cls: 'up', badge: '\u2193 ' + Math.abs(this.queryGrowth).toFixed(1) + 'ms faster' },
      { id: 'kpiSessionsValue', bid: 'kpiSessionsBadge', raw: this.sessions, fmt: function (v) { return Number(v).toLocaleString(); }, cls: 'up', badge: '\u2191 ' + this.sessGrowth.toFixed(1) + '% vs last month' },
      { id: 'kpiExportsValue', bid: 'kpiExportsBadge', raw: this.exports, fmt: function (v) { return Number(v).toLocaleString(); }, cls: 'up', badge: '\u2191 ' + this.expGrowth.toFixed(1) + '% vs last month' }
    ];

    for (var c = 0; c < cards.length; c++) {
      var card = cards[c];
      var valueEl = document.getElementById(card.id);
      var badgeEl = document.getElementById(card.bid);
      if (valueEl) { KpiEngine._animate(valueEl, card.raw, card.fmt); }
      if (badgeEl) { badgeEl.textContent = card.badge; badgeEl.className = 'kpi-badge ' + card.cls; }
    }
  }
};

/* =====================================================
   PRODUCTS TABLE
   ===================================================== */

function renderProductsTable() {
  var tbody = document.querySelector('#productsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  for (var i = 0; i < DATA.products.length; i++) {
    var p = DATA.products[i];
    var tr = document.createElement('tr');
    tr.innerHTML = '<td><div class="product-cell"><span class="product-rank">' + (i + 1) + '</span><span class="product-name">' + escHtml(p.name) + '</span></div></td><td>$' + p.revenue.toLocaleString() + '</td><td>' + p.units.toLocaleString() + '</td><td><span class="stock-badge ' + (p.stock === 'In Stock' ? 'in-stock' : 'low-stock') + '">' + escHtml(p.stock) + '</span></td>';
    tbody.appendChild(tr);
  }
}

function escHtml(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* =====================================================
   CHARTS
   ===================================================== */

var chartInstances = [];

function chartPalette() {
  var dark = document.body.getAttribute('data-theme') === 'dark';
  return {
    grid: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    gridStrong: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    tick: dark ? '#64748b' : '#94a3b8',
    legend: dark ? '#94a3b8' : '#64748b',
    tooltipBg: dark ? '#1e293b' : '#fff',
    tooltipTitle: dark ? '#f1f5f9' : '#1e293b',
    tooltipBody: dark ? '#94a3b8' : '#64748b',
    tooltipBorder: dark ? '#475569' : '#e2e8f0',
    pointBg: dark ? '#1e293b' : '#fff',
    donutBorder: dark ? '#1e293b' : '#fff'
  };
}

function createGradient(ctx, top, bottom, c1, c2) {
  var g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.color = '#64748b';

function safeChart(ctx, config) {
  if (typeof Chart === 'undefined') { console.warn('[DataStream] Chart.js not loaded'); return null; }
  try { return new Chart(ctx, config); }
  catch (e) { console.warn('[DataStream] Chart render error:', e); return null; }
}

function initCharts() {
  var chartEls = [
    { id: 'revenueChart', fn: function (ctx) { return initRevenueChart(ctx); } },
    { id: 'categoryChart', fn: function (ctx) { return initCategoryChart(ctx); } },
    { id: 'funnelChart', fn: function (ctx) { return initFunnelChart(ctx); } }
  ];
  for (var i = 0; i < chartEls.length; i++) {
    var canvas = document.getElementById(chartEls[i].id);
    if (canvas) {
      var chart = chartEls[i].fn(canvas.getContext('2d'));
      if (chart) chartInstances.push(chart);
    }
  }
}

function initRevenueChart(ctx) {
  var p = chartPalette();
  var h = 350;
  var revGrad = createGradient(ctx, 0, h, 'rgba(99, 102, 241, 0.25)', 'rgba(99, 102, 241, 0.01)');
  var profitGrad = createGradient(ctx, 0, h, 'rgba(16, 185, 129, 0.2)', 'rgba(16, 185, 129, 0.01)');

  return safeChart(ctx, {
    type: 'line',
    data: {
      labels: DATA.months,
      datasets: [
        { label: 'Gross Revenue', data: DATA.revenue, borderColor: '#6366F1', backgroundColor: revGrad, fill: true, tension: 0.4, pointBackgroundColor: p.pointBg, pointBorderColor: '#6366F1', pointBorderWidth: 2.5, pointRadius: 3.5, pointHoverRadius: 6, borderWidth: 2.5 },
        { label: 'Net Profit', data: DATA.profit, borderColor: '#10b981', backgroundColor: profitGrad, fill: true, tension: 0.4, pointBackgroundColor: p.pointBg, pointBorderColor: '#10b981', pointBorderWidth: 2.5, pointRadius: 3.5, pointHoverRadius: 6, borderWidth: 2.5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
      scales: {
        x: { grid: { color: p.grid }, ticks: { color: p.tick, font: { size: 11 } } },
        y: { grid: { color: p.gridStrong }, ticks: { color: p.tick, font: { size: 11 }, callback: function (v) { return '$' + v.toLocaleString(); } } }
      },
      plugins: {
        legend: { labels: { color: p.legend, font: { size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { backgroundColor: p.tooltipBg, titleColor: p.tooltipTitle, bodyColor: p.tooltipBody, borderColor: p.tooltipBorder, borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: function (ctx) { return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString(); } } }
      }
    }
  });
}

function initCategoryChart(ctx) {
  var p = chartPalette();
  var labels = Object.keys(DATA.categories);
  var values = Object.values(DATA.categories);
  var colors = ['#6366F1', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];
  var hover = ['#818cf8', '#fbbf24', '#34d399', '#f472b6', '#22d3ee'];

  return safeChart(ctx, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, hoverBackgroundColor: hover, borderColor: p.donutBorder, borderWidth: 3, hoverOffset: 10 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { color: p.legend, font: { size: 11, weight: '500' }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { backgroundColor: p.tooltipBg, titleColor: p.tooltipTitle, bodyColor: p.tooltipBody, borderColor: p.tooltipBorder, borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: function (ctx) { var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0); return ctx.label + ': $' + ctx.parsed.toLocaleString() + ' (' + ((ctx.parsed / total) * 100).toFixed(1) + '%)'; } } }
      }
    }
  });
}

function initFunnelChart(ctx) {
  var p = chartPalette();
  var labels = Object.keys(DATA.funnel);
  var values = Object.values(DATA.funnel);

  return safeChart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Users', data: values, backgroundColor: ['rgba(99, 102, 241, 0.7)', 'rgba(245, 158, 11, 0.65)', 'rgba(16, 185, 129, 0.6)', 'rgba(236, 72, 153, 0.55)', 'rgba(6, 182, 212, 0.55)'], borderColor: ['#6366F1', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'], borderWidth: 1.5, borderRadius: 4, barPercentage: 0.55 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      scales: {
        x: { grid: { color: p.grid }, ticks: { color: p.tick, font: { size: 11 } } },
        y: { grid: { display: false }, ticks: { color: p.legend, font: { size: 12, weight: '500' } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: p.tooltipBg, titleColor: p.tooltipTitle, bodyColor: p.tooltipBody, borderColor: p.tooltipBorder, borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: function (ctx) { return ctx.parsed.x.toLocaleString() + ' users'; } } }
      }
    }
  });
}

/* =====================================================
   EXPORT CSV
   ===================================================== */

function initExport() {
  var btn = document.getElementById('exportBtn');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var sep = ',';
    var csv = '\uFEFF';
    csv += 'Metric' + sep + 'Value\n';
    csv += 'Total Revenue' + sep + '$' + KpiEngine.totalRevenue.toFixed(2) + '\n';
    csv += 'Total Orders' + sep + KpiEngine.totalOrders + '\n';
    csv += 'Avg Order Value' + sep + '$' + KpiEngine.aov.toFixed(2) + '\n';
    csv += 'Conversion Rate' + sep + KpiEngine.conversionRate.toFixed(2) + '%\n';
    csv += 'Ingestion Volume' + sep + FocusMetrics.ingestion.toLocaleString() + ' records\n';
    csv += 'Query Performance' + sep + FocusMetrics.queryPerf + 'ms\n';
    csv += 'Dashboard Sessions' + sep + FocusMetrics.sessions.toLocaleString() + '\n';
    csv += 'Report Exports' + sep + FocusMetrics.exports.toLocaleString() + '\n\n';
    csv += 'Month' + sep + 'Gross Revenue' + sep + 'Net Profit\n';
    for (var i = 0; i < DATA.months.length; i++) { csv += DATA.months[i] + sep + '$' + DATA.revenue[i] + sep + '$' + DATA.profit[i] + '\n'; }
    csv += '\nCategory' + sep + 'Revenue\n';
    var catKeys = Object.keys(DATA.categories);
    for (var ci = 0; ci < catKeys.length; ci++) { csv += catKeys[ci] + sep + '$' + DATA.categories[catKeys[ci]] + '\n'; }
    csv += '\nFunnel Stage' + sep + 'Users\n';
    var funKeys = Object.keys(DATA.funnel);
    for (var fi = 0; fi < funKeys.length; fi++) { csv += funKeys[fi] + sep + DATA.funnel[funKeys[fi]] + '\n'; }
    csv += '\nProduct' + sep + 'Revenue' + sep + 'Units Sold' + sep + 'Stock\n';
    for (var pi = 0; pi < DATA.products.length; pi++) { csv += DATA.products[pi].name + sep + '$' + DATA.products[pi].revenue + sep + DATA.products[pi].units + sep + DATA.products[pi].stock + '\n'; }

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'datastream_bi_export.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    Toast.success('Exported', 'Dashboard data downloaded as CSV.');
  });
}

/* =====================================================
   USER DROPDOWN
   ===================================================== */

function initUserMenu() {
  var avatarBtn = document.getElementById('avatarBtn');
  var dropdown = document.getElementById('userDropdown');
  if (!avatarBtn || !dropdown) return;

  avatarBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var isOpen = dropdown.classList.contains('open');
    dropdown.classList.toggle('open');
    avatarBtn.classList.toggle('open');
    avatarBtn.setAttribute('aria-expanded', !isOpen);
  });

  document.addEventListener('click', function (e) {
    if (!avatarBtn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      avatarBtn.classList.remove('open');
      avatarBtn.setAttribute('aria-expanded', 'false');
    }
  });

  var logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () { Auth.logout(); });
  }

  var notificationBtn = document.getElementById('notificationBtn');
  if (notificationBtn) {
    notificationBtn.addEventListener('click', function () { Toast.info('No Notifications', 'You\'re all caught up!'); });
  }

  var adminNav = document.querySelectorAll('.admin-nav-item');
  for (var ni = 0; ni < adminNav.length; ni++) {
    adminNav[ni].addEventListener('click', function () {
      var view = this.getAttribute('data-view');
      if (view) { switchView(view); dropdown.classList.remove('open'); avatarBtn.classList.remove('open'); }
    });
  }

  var demoSwitcher = document.querySelector('.demo-switcher-btns');
  if (demoSwitcher) {
    demoSwitcher.addEventListener('click', function (e) {
      var btn = e.target.closest('.demo-switch-btn');
      if (!btn) return;
      var role = btn.getAttribute('data-role');
      if (Auth.setRole(role)) {
        applyPermissions();
        Toast.info('Demo Switch', 'Now viewing as <strong>' + ROLES[role].label + '</strong>');
        dropdown.classList.remove('open');
        avatarBtn.classList.remove('open');
      }
    });
  }

  function updateDemoSwitcher() {
    var role = Auth.getRole();
    var btns = document.querySelectorAll('.demo-switch-btn');
    for (var d = 0; d < btns.length; d++) {
      btns[d].classList.toggle('active-role', btns[d].getAttribute('data-role') === role);
    }
  }

  var viewRoute = {
    'Save View': function () { switchView('saved-views'); },
    'Reports': function () { switchView('reports'); },
    'Data Sources': function () { switchView('pipeline'); },
    'Query Console': function () { switchView('query'); },
    'Admin Panel': function () { switchView('admin'); }
  };
  var ddItems = dropdown.querySelectorAll('.dropdown-item');
  for (var i = 0; i < ddItems.length; i++) {
    var txt = ddItems[i].textContent.replace(/\s+/g, ' ').trim();
    if (viewRoute[txt]) {
      ddItems[i].addEventListener('click', function (fn) {
        return function () { dropdown.classList.remove('open'); avatarBtn.classList.remove('open'); fn(); };
      }(viewRoute[txt]));
    }
  }

  var saveViewBtn = document.getElementById('saveViewBtn');
  if (saveViewBtn) {
    saveViewBtn.addEventListener('click', function () { Toast.success('View Saved', 'Current layout and filters captured as a new view.'); switchView('saved-views'); });
  }

  var manageSourcesBtn = document.getElementById('manageSourcesBtn');
  if (manageSourcesBtn) {
    manageSourcesBtn.addEventListener('click', function () {
      Toast.info('Source Manager',
        '4 connections configured.<br><strong>PostgreSQL</strong> (live) &middot; <strong>BigQuery</strong> (scheduled) &middot; <strong>S3</strong> (retrying) &middot; <strong>REST API</strong> (live)'
      );
    });
  }

  var auditLogBtn = document.getElementById('auditLogBtn');
  if (auditLogBtn) {
    auditLogBtn.addEventListener('click', function () {
      Toast.info('Audit Log',
        'Last 24h: <strong>47 events</strong> &middot; 42 info &middot; 3 warnings &middot; 2 errors<br><small>Full audit trail available for download.</small>'
      );
    });
  }

  var adminInlineBtns = document.querySelectorAll('.admin-inline-btn');
  for (var ab = 0; ab < adminInlineBtns.length; ab++) {
    (function (btn) {
      btn.addEventListener('click', function () {
        var txt = btn.textContent.replace(/\s+/g, ' ').trim();
        if (txt.indexOf('Invite') === 0) {
          Toast.success('Invite Sent', 'Invitation emailed to new user. Pending acceptance.');
        } else if (txt.indexOf('Run') === 0) {
          Toast.info('Diagnostics Running', 'System health check initiated. This may take a few seconds.');
        }
      });
    })(adminInlineBtns[ab]);
  }

  /* — Reports View — */
  var createReportBtn = document.getElementById('createReportBtn');
  if (createReportBtn) {
    createReportBtn.addEventListener('click', function () { Toast.success('Report Created', 'New report builder opened. Add metrics and schedule.'); });
  }
  var rpUseBtns = document.querySelectorAll('.rp-use-btn');
  for (var ru = 0; ru < rpUseBtns.length; ru++) {
    rpUseBtns[ru].addEventListener('click', function () {
      var name = this.closest('.rp-template-card').querySelector('.rp-temp-name').textContent;
      Toast.info('Template Selected', '<strong>' + name + '</strong> — Configure metrics and save as a new report.');
    });
  }
  var rpActionBtns = document.querySelectorAll('.rp-action-btn');
  for (var ra = 0; ra < rpActionBtns.length; ra++) {
    if (!rpActionBtns[ra].disabled) {
      rpActionBtns[ra].addEventListener('click', function () { Toast.success('Downloaded', 'Report exported as CSV.'); });
    }
  }

  /* — Query Console View — */
  var runQueryBtn = document.getElementById('runQueryBtn');
  if (runQueryBtn) {
    runQueryBtn.addEventListener('click', function () {
      Toast.info('Query Executed', 'Ran in 142ms — 4 rows returned. <small>Ctrl+Enter to run from editor.</small>');
    });
  }
  var qcQuickBtns = document.querySelectorAll('.qc-quick-btn');
  for (var qb = 0; qb < qcQuickBtns.length; qb++) {
    qcQuickBtns[qb].addEventListener('click', function () {
      var label = this.textContent.trim();
      Toast.info('Quick Query', '<strong>' + label + '</strong> — Executed in 87ms. Results loaded below.');
    });
  }
  var qcExportBtn = document.querySelector('.qc-export-btn');
  if (qcExportBtn) {
    qcExportBtn.addEventListener('click', function () { Toast.success('Exported', 'Query results downloaded as CSV.'); });
  }
  var queryEditor = document.getElementById('queryEditor');
  if (queryEditor) {
    queryEditor.addEventListener('keydown', function (e) {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        Toast.info('Query Executed', 'Ran via Ctrl+Enter — 4 rows returned in 142ms.');
      }
    });
  }
}

/* =====================================================
   PERMISSION / ROLE UI
   ===================================================== */

function switchView(viewId) {
  var views = document.querySelectorAll('.role-view');
  for (var v = 0; v < views.length; v++) {
    views[v].classList.toggle('active', views[v].id === 'view-' + viewId);
  }

  var navs = document.querySelectorAll('.admin-nav-item');
  for (var n = 0; n < navs.length; n++) {
    navs[n].classList.toggle('active', navs[n].getAttribute('data-view') === viewId);
  }

  if (viewId === 'dashboard' || viewId === 'saved-views') {
    InsightEngine._generate();
  }
}

function applyPermissions() {
  var role = Auth.getRole();
  document.body.setAttribute('data-role', role);

  var badge = document.getElementById('roleBadge');
  if (badge && ROLES[role]) {
    badge.textContent = ROLES[role].label;
    badge.className = 'role-badge role-' + role;
  }

  var adminNav = document.getElementById('adminNav');
  if (adminNav) {
    adminNav.style.display = (role === 'admin') ? '' : 'none';
  }

  var roleLabels = { viewer: 'Dashboard · Read-Only', creator: 'Report Builder', editor: 'Data Pipeline', admin: 'Admin Dashboard' };
  var subtitleEl = document.querySelector('.subtitle');
  if (subtitleEl && roleLabels[role]) {
    subtitleEl.textContent = roleLabels[role];
  }

  if (role === 'viewer') {
    var heading = document.querySelector('.brand h1');
    if (heading) heading.textContent = 'Analytics Dashboard';
  }

  var defaultViews = { viewer: 'dashboard', creator: 'reports', editor: 'pipeline', admin: 'dashboard' };
  switchView(defaultViews[role] || 'dashboard');

  if (typeof updateDemoSwitcher === 'function') updateDemoSwitcher();
}

/* =====================================================
   DASHBOARD INIT (safe — charts won't break the UI)
   ===================================================== */

function initDashboard() {
  try {
    KpiEngine.init();
    KpiEngine.render();
    FocusMetrics.init();
    FocusMetrics.render();
    renderProductsTable();
    initCharts();
    initExport();
    initUserMenu();
    InsightEngine.init();
    renderSparklines();
    renderMarginRing();
    ActivityTicker.init();
  } catch (e) {
    console.warn('[DataStream] Dashboard init error:', e);
  }

  var yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  var timeEl = document.getElementById('updateTime');
  if (timeEl) {
    var now = new Date();
    timeEl.textContent = 'Updated ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  var dateRange = document.getElementById('dateRange');
  if (dateRange) {
    dateRange.setAttribute('data-prev', dateRange.value);
    dateRange.addEventListener('change', function () {
      if (!Auth.can('export')) {
        Toast.warning('Read-Only Mode', 'Viewers cannot change filters. Switch to Creator+ to modify.');
        this.value = this.getAttribute('data-prev');
        return;
      }
      this.setAttribute('data-prev', this.value);
      Toast.info('Date Range Changed', 'Showing data for: ' + this.options[this.selectedIndex].text);
    });
  }

  var catFilter = document.getElementById('categoryFilter');
  if (catFilter) {
    catFilter.setAttribute('data-prev', catFilter.value);
    catFilter.addEventListener('change', function () {
      if (!Auth.can('export')) {
        Toast.warning('Read-Only Mode', 'Viewers cannot change filters. Switch to Creator+ to modify.');
        this.value = this.getAttribute('data-prev');
        return;
      }
      this.setAttribute('data-prev', this.value);
      Toast.info('Category Filter Changed', 'Filtering by: ' + this.options[this.selectedIndex].text);
    });
  }
}

/* =====================================================
   SMART INSIGHTS ENGINE
   ===================================================== */

var InsightEngine = {
  insights: [],
  index: 0,
  el: null,
  timer: null,

  init: function () {
    this.el = document.getElementById('insightsRotator');
    if (!this.el) return;
    this._generate();
    this._rotate();
    this.timer = setInterval(this._rotate.bind(this), 5000);
  },

  _generate: function () {
    var rev = KpiEngine.totalRevenue;
    var orders = KpiEngine.totalOrders;
    var aov = KpiEngine.aov;
    var conv = KpiEngine.conversionRate;
    var revG = KpiEngine.revenueGrowth;

    var cats = Object.keys(DATA.categories);
    var topCat = cats.reduce(function (a, b) { return DATA.categories[a] > DATA.categories[b] ? a : b; });
    var topCatVal = DATA.categories[topCat];
    var prod = DATA.products[0];
    var funnelRate = Math.round((DATA.funnel['Purchases'] / DATA.funnel['Cart Additions']) * 100);

    var fm = FocusMetrics;
    var roleLabel = ROLES[Auth.getRole()] ? ROLES[Auth.getRole()].label : 'User';
    this.insights = [
      'Signed in as <strong>' + roleLabel + '</strong> — ' + ROLES[Auth.getRole()].desc + '.',
      'Revenue hit $' + rev.toLocaleString() + ' — up ' + revG.toFixed(1) + '% vs last period. ' + topCat + ' leads at $' + topCatVal.toLocaleString() + '.',
      'Conversion rate of ' + conv.toFixed(2) + '% is ' + (conv - 2.5).toFixed(2) + '% above industry benchmark.',
      'Top seller: ' + prod.name + ' — $' + prod.revenue.toLocaleString() + ' revenue, ' + prod.units + ' units sold.',
      fm.ingestion.toLocaleString() + ' records ingested — up ' + fm.ingGrowth.toFixed(1) + '% with ' + fm.queryPerf + 'ms avg query time.',
      fm.sessions.toLocaleString() + ' dashboard sessions and ' + fm.exports.toLocaleString() + ' report exports this period.'
    ];
  },

  _rotate: function () {
    if (!this.insights.length || !this.el) return;
    this.el.style.opacity = '0';
    var self = this;
    setTimeout(function () {
      self.el.textContent = self.insights[self.index];
      self.el.style.opacity = '1';
      self.index = (self.index + 1) % self.insights.length;
    }, 250);
  }
};

/* =====================================================
   KPI SPARKLINES
   ===================================================== */

function renderSparklines() {
  var sets = {
    kpiRevenue: DATA.revenue,
    kpiOrders: _monthlyOrders(),
    kpiAov: _monthlyAov(),
    kpiConversion: [3.1, 3.2, 3.4, 3.3, 3.5, 3.6, 3.4, 3.7, 3.8, 3.7, 3.9, 4.0]
  };

  for (var id in sets) {
    var card = document.getElementById(id);
    if (!card) continue;
    var body = card.querySelector('.kpi-body');
    if (!body) continue;
    body.appendChild(_buildSparklineSVG(sets[id]));
  }
}

function _monthlyOrders() {
  var base = DATA.funnel['Purchases'] / 12;
  return DATA.revenue.map(function (r, i) {
    var factor = r / DATA.revenue[6];
    return Math.round(base * factor * (0.85 + Math.random() * 0.3));
  });
}

function _monthlyAov() {
  var orders = _monthlyOrders();
  return DATA.revenue.map(function (r, i) { return +(r / orders[i]).toFixed(2); });
}

function _buildSparklineSVG(data) {
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'kpi-sparkline');
  svg.setAttribute('viewBox', '0 0 100 26');
  svg.setAttribute('preserveAspectRatio', 'none');

  var min = Math.min.apply(null, data);
  var max = Math.max.apply(null, data);
  var range = max - min || 1;
  var pad = 2;
  var points = data.map(function (v, i) {
    var x = (i / (data.length - 1)) * (100 - pad * 2) + pad;
    var y = 24 - ((v - min) / range) * 20;
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  var path = document.createElementNS(NS, 'path');
  path.setAttribute('d', points);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);

  var area = document.createElementNS(NS, 'path');
  area.setAttribute('d', points + ' L' + (100 - pad) + ',24 L' + pad + ',24 Z');
  svg.appendChild(area);

  return svg;
}

/* =====================================================
   PROFIT MARGIN RING
   ===================================================== */

function renderMarginRing() {
  var card = document.getElementById('kpiRevenue');
  if (!card) return;

  var totalRev = DATA.revenue.reduce(function (a, b) { return a + b; }, 0);
  var totalProfit = DATA.profit.reduce(function (a, b) { return a + b; }, 0);
  var margin = (totalProfit / totalRev) * 100;

  var wrap = document.createElement('div');
  wrap.className = 'kpi-ring';

  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');

  var r = 19, cx = 24, cy = 24;
  var circ = 2 * Math.PI * r;

  var bg = document.createElementNS(NS, 'circle');
  bg.setAttribute('cx', cx); bg.setAttribute('cy', cy);
  bg.setAttribute('r', r);
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke-width', '3.5');
  svg.appendChild(bg);

  var prog = document.createElementNS(NS, 'circle');
  prog.setAttribute('cx', cx); prog.setAttribute('cy', cy);
  prog.setAttribute('r', r);
  prog.setAttribute('fill', 'none');
  prog.setAttribute('stroke-width', '3.5');
  prog.setAttribute('stroke-linecap', 'round');
  prog.setAttribute('stroke-dasharray', circ);
  prog.setAttribute('stroke-dashoffset', circ - (margin / 100) * circ);
  prog.setAttribute('transform', 'rotate(-90 24 24)');
  svg.appendChild(prog);

  var text = document.createElementNS(NS, 'text');
  text.setAttribute('x', cx); text.setAttribute('y', cy);
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('font-size', '9');
  text.setAttribute('font-weight', '700');
  text.setAttribute('font-family', "'Inter', sans-serif");
  text.textContent = Math.round(margin) + '%';
  svg.appendChild(text);

  wrap.appendChild(svg);
  card.appendChild(wrap);
}

/* =====================================================
   ACTIVITY TICKER
   ===================================================== */

var ActivityTicker = {
  events: [
    { icon: 'shopping-cart', text: 'New order placed — Wireless ANC Headphones', color: '#10b981' },
    { icon: 'user-plus', text: 'New customer registered', color: '#38BDF8' },
    { icon: 'eye', text: '500+ product views in the last hour', color: '#8b5cf6' },
    { icon: 'star', text: '5★ review on Ergonomic Office Chair', color: '#FACC15' },
    { icon: 'trending-up', text: 'Conversion rate up 0.3% this hour', color: '#10b981' },
    { icon: 'dollar-sign', text: '$2,450 revenue in the last 30 min', color: '#FF5733' },
    { icon: 'exclamation-triangle', text: 'Low stock alert: Smart Fitness Tracker Pro', color: '#ef4444' },
    { icon: 'clock', text: 'Peak shopping hour — 8 PM EST', color: '#38BDF8' }
  ],
  index: 0,
  el: null,
  timer: null,

  init: function () {
    this.el = document.getElementById('tickerText');
    if (!this.el) return;
    this._tick();
    this.timer = setInterval(this._tick.bind(this), 4000);
  },

  _tick: function () {
    var evt = this.events[this.index];
    this.el.innerHTML = '<i class="fas fa-' + evt.icon + '" style="color:' + evt.color + '"></i>' + evt.text;
    this.index = (this.index + 1) % this.events.length;
  }
};

/* =====================================================
   AUTH UI
   ===================================================== */

function initAuthUI() {
  var authScreen = document.getElementById('authScreen');
  var dashboard = document.getElementById('dashboardApp');

  // 3D Tilt Effect
  var tiltWrap = document.querySelector('.auth-3d-wrap');
  var tiltCard = document.querySelector('.auth-card-inner');
  if (tiltWrap && tiltCard) {
    tiltWrap.addEventListener('mousemove', function (e) {
      var rect = tiltWrap.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var y = e.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;
      var rotateX = ((y - centerY) / centerY) * -6;
      var rotateY = ((x - centerX) / centerX) * 6;
      tiltCard.style.transform = 'rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg)';
    });
    tiltWrap.addEventListener('mouseleave', function () {
      tiltCard.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  }

  // Floating dot particles
  var dotGrid = document.getElementById('dotGrid');
  if (dotGrid) {
    var dotCount = 40;
    for (var d = 0; d < dotCount; d++) {
      var dot = document.createElement('div');
      dot.className = 'dot';
      dot.style.left = Math.random() * 100 + '%';
      dot.style.width = dot.style.height = (2 + Math.random() * 3) + 'px';
      dot.style.animationDuration = (10 + Math.random() * 20) + 's';
      dot.style.animationDelay = (Math.random() * 15) + 's';
      dot.style.opacity = 0.1 + Math.random() * 0.3;
      dotGrid.appendChild(dot);
    }
  }

  var tabLogin = document.getElementById('tabLogin');
  var tabSignup = document.getElementById('tabSignup');
  var loginForm = document.getElementById('loginForm');
  var signupForm = document.getElementById('signupForm');
  var switchToSignup = document.getElementById('switchToSignup');
  var switchToLogin = document.getElementById('switchToLogin');

  // Tab switching
  function setActiveTab(tab) {
    var isLogin = (tab === 'login');
    tabLogin.className = 'auth-tab' + (isLogin ? ' active' : '');
    tabSignup.className = 'auth-tab' + (isLogin ? '' : ' active');
    loginForm.className = 'auth-form' + (isLogin ? ' active' : '');
    signupForm.className = 'auth-form' + (isLogin ? '' : ' active');
    tabLogin.setAttribute('aria-selected', isLogin);
    tabSignup.setAttribute('aria-selected', !isLogin);

    moveTabIndicator();
  }

  function moveTabIndicator() {
    var indicator = document.getElementById('tabIndicator');
    var activeTab = document.querySelector('.auth-tab.active');
    if (indicator && activeTab) {
      indicator.style.width = activeTab.offsetWidth + 'px';
      indicator.style.left = activeTab.offsetLeft + 'px';
    }
  }

  if (tabLogin) tabLogin.addEventListener('click', function () { setActiveTab('login'); });
  if (tabSignup) tabSignup.addEventListener('click', function () { setActiveTab('signup'); });
  if (switchToSignup) switchToSignup.addEventListener('click', function (e) { e.preventDefault(); setActiveTab('signup'); });
  if (switchToLogin) switchToLogin.addEventListener('click', function (e) { e.preventDefault(); setActiveTab('login'); });

  // Initial tab indicator position
  setTimeout(moveTabIndicator, 100);

  function setError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
    // visible class for opacity animation
    if (msg) { el.classList.add('visible'); } else { el.classList.remove('visible'); }
  }

  function clearFormErrors(formId) {
    var form = document.getElementById(formId);
    if (!form) return;
    var errors = form.querySelectorAll('.form-error');
    for (var i = 0; i < errors.length; i++) { errors[i].textContent = ''; errors[i].style.display = 'none'; errors[i].classList.remove('visible'); }
    var inputs = form.querySelectorAll('input');
    for (var j = 0; j < inputs.length; j++) { inputs[j].classList.remove('error'); }
  }

  function markError(inputId) {
    var input = document.getElementById(inputId);
    if (input) input.classList.add('error');
  }

  function setLoading(btnId, loading) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) { btn.classList.add('loading'); btn.disabled = true; }
    else { btn.classList.remove('loading'); btn.disabled = false; }
  }

  // Login form submit
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearFormErrors('loginForm');

      var email = document.getElementById('loginEmail');
      var password = document.getElementById('loginPassword');
      if (!email || !password) return;

      var emailVal = email.value.trim();
      var passVal = password.value;
      var valid = true;

      if (!emailVal) { setError('loginEmailError', 'Email is required.'); markError('loginEmail'); valid = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { setError('loginEmailError', 'Invalid email address.'); markError('loginEmail'); valid = false; }

      if (!passVal) { setError('loginPasswordError', 'Password is required.'); markError('loginPassword'); valid = false; }

      if (!valid) return;

      setLoading('loginBtn', true);

      setTimeout(function () {
        try {
          var result = Auth.login(emailVal, passVal);
          setLoading('loginBtn', false);

          if (result.success) {
            Toast.success('Welcome Back!', 'Signed in as ' + result.user.name);
            setTimeout(function () { enterDashboard(result.user); }, 400);
          } else {
            Toast.error('Login Failed', result.error);
            setError('loginPasswordError', result.error);
            markError('loginPassword');
          }
        } catch (err) {
          setLoading('loginBtn', false);
          Toast.error('Error', 'Something went wrong. Please try again.');
          console.error('[DataStream] Login error:', err);
        }
      }, 600);
    });
  }

  // Signup form submit
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearFormErrors('signupForm');

      var name = document.getElementById('signupName');
      var email = document.getElementById('signupEmail');
      var password = document.getElementById('signupPassword');
      var confirm = document.getElementById('signupConfirm');
      if (!name || !email || !password || !confirm) return;

      var nameVal = name.value.trim();
      var emailVal = email.value.trim();
      var passVal = password.value;
      var confirmVal = confirm.value;
      var valid = true;

      if (!nameVal) { setError('signupNameError', 'Name is required.'); markError('signupName'); valid = false; }
      if (!emailVal) { setError('signupEmailError', 'Email is required.'); markError('signupEmail'); valid = false; }
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) { setError('signupEmailError', 'Invalid email address.'); markError('signupEmail'); valid = false; }

      if (!passVal) { setError('signupPasswordError', 'Password is required.'); markError('signupPassword'); valid = false; }
      else if (passVal.length < 8) { setError('signupPasswordError', 'Min. 8 characters.'); markError('signupPassword'); valid = false; }

      if (!confirmVal) { setError('signupConfirmError', 'Please confirm your password.'); markError('signupConfirm'); valid = false; }
      else if (passVal !== confirmVal) { setError('signupConfirmError', 'Passwords do not match.'); markError('signupConfirm'); valid = false; }

      if (!valid) return;

      setLoading('signupBtn', true);

      setTimeout(function () {
        try {
          var result = Auth.signup(nameVal, emailVal, passVal);
          setLoading('signupBtn', false);

          if (result.success) {
            Toast.success('Account Created!', 'Welcome to DataStream BI, ' + result.user.name + '!');
            setTimeout(function () { enterDashboard(result.user); }, 400);
          } else {
            Toast.error('Sign Up Failed', result.error);
            setError('signupEmailError', result.error);
            markError('signupEmail');
          }
        } catch (err) {
          setLoading('signupBtn', false);
          Toast.error('Error', 'Something went wrong. Please try again.');
          console.error('[DataStream] Signup error:', err);
        }
      }, 600);
    });
  }

  // Social login buttons — demo handlers
  var googleBtn = document.querySelector('.social-btn.google');
  var githubBtn = document.querySelector('.social-btn.github');

  if (googleBtn) {
    googleBtn.addEventListener('click', function () {
      Toast.info('Demo Feature', 'Google sign-in is not available in this demo. Use email login instead. Try admin@datastream.com / password123');
    });
  }

  if (githubBtn) {
    githubBtn.addEventListener('click', function () {
      Toast.info('Demo Feature', 'GitHub sign-in is not available in this demo. Use email login instead. Try admin@datastream.com / password123');
    });
  }

  // === ENTER DASHBOARD ===
  function enterDashboard(user) {
    // Show a brief loading overlay
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0f172a;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;transition:opacity 0.4s ease;';
    overlay.innerHTML = '<i class="fas fa-chart-line" style="font-size:2.5rem;background:linear-gradient(135deg,#dc2626,#f97316);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;"></i><div style="color:#94a3b8;font-size:0.85rem;">Loading your dashboard...</div>';
    document.body.appendChild(overlay);

    // Hide auth screen
    authScreen.style.display = 'none';

    // After a short delay, show dashboard
    setTimeout(function () {
      // Set dashboard visible
      dashboard.style.display = 'block';
      // Force reflow so the opacity transition works
      void dashboard.offsetHeight;
      dashboard.classList.remove('hidden');
      dashboard.classList.add('visible');
      dashboard.style.display = '';

      // Set user info
      var initialsEl = document.getElementById('userInitials');
      var nameEl = document.getElementById('dropdownUserName');
      var emailEl = document.getElementById('dropdownUserEmail');
      if (initialsEl) initialsEl.textContent = user.initials;
      if (nameEl) nameEl.textContent = user.name;
      if (emailEl) emailEl.textContent = user.email;

      // Remove overlay
      overlay.style.opacity = '0';
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 450);

      // Initialize everything
      initDashboard();
    }, 500);
  }

  // === CHECK EXISTING SESSION ===
  var session = Auth.getSession();
  if (session) {
    authScreen.style.display = 'none';
    dashboard.style.display = 'block';
    void dashboard.offsetHeight;
    dashboard.classList.remove('hidden');
    dashboard.classList.add('visible');
    dashboard.style.display = '';

    var initialsEl = document.getElementById('userInitials');
    var nameEl = document.getElementById('dropdownUserName');
    var emailEl = document.getElementById('dropdownUserEmail');
    if (initialsEl) initialsEl.textContent = session.initials;
    if (nameEl) nameEl.textContent = session.name;
    if (emailEl) emailEl.textContent = session.email;

    initDashboard();
    return;
  }

  // No session — ensure auth screen is visible
  authScreen.style.display = 'flex';
}

/* =====================================================
   THEME MANAGER
   ===================================================== */

var Theme = {
  key: 'datastream_bi_theme',
  toggle: null,

  init: function () {
    var saved = localStorage.getItem(this.key);
    if (saved === 'dark') { document.body.setAttribute('data-theme', 'dark'); }
    this.toggle = document.getElementById('themeToggle');
    if (!this.toggle) return;
    this._updateIcon();
    var self = this;
    this.toggle.addEventListener('click', function () { self._toggle(); });
  },

  _toggle: function () {
    var isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem(this.key, 'light');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem(this.key, 'dark');
    }
    this._updateIcon();
    this._recreateCharts();
  },

  _updateIcon: function () {
    if (!this.toggle) return;
    var isDark = document.body.getAttribute('data-theme') === 'dark';
    this.toggle.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  },

  _recreateCharts: function () {
    for (var i = 0; i < chartInstances.length; i++) {
      if (chartInstances[i]) { chartInstances[i].destroy(); }
    }
    chartInstances = [];
    initCharts();
  }
};

/* =====================================================
   BOOT
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {
  try {
    Auth.initDefaultUsers();
  } catch (e) {
    console.warn('[DataStream] Failed to init users:', e);
  }

  try { Theme.init(); } catch (e) { console.warn('[DataStream] Theme init error:', e); }

  var session = Auth.getSession();
  if (session) {
    var authScreen = document.getElementById('authScreen');
    var dashboard = document.getElementById('dashboardApp');
    if (authScreen) authScreen.style.display = 'none';
    if (dashboard) {
      dashboard.style.display = 'block';
      void dashboard.offsetHeight;
      dashboard.classList.remove('hidden');
      dashboard.classList.add('visible');
      dashboard.style.display = '';
    }

    var initialsEl = document.getElementById('userInitials');
    var nameEl = document.getElementById('dropdownUserName');
    var emailEl = document.getElementById('dropdownUserEmail');
    if (initialsEl) initialsEl.textContent = session.initials;
    if (nameEl) nameEl.textContent = session.name;
    if (emailEl) emailEl.textContent = session.email;

    applyPermissions();

    initDashboard();
  } else {
    window.location.replace('login-react.html');
  }
});
