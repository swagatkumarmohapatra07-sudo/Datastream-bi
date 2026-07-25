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
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({ name: user.name, email: user.email, initials: user.initials }));
    } catch (e) {}
  },

  clearSession: function () {
    try { sessionStorage.removeItem(this.SESSION_KEY); } catch (e) {}
  },

  initDefaultUsers: function () {
    var users = this.getUsers();
    if (users.length === 0) {
      users.push({ name: 'Admin User', email: 'admin@datastream.com', password: 'password123', initials: 'AU' });
      users.push({ name: 'Demo User', email: 'demo@datastream.com', password: 'demo1234', initials: 'DU' });
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

    users.push({ name: name, email: email, password: password, initials: initials });
    this.saveUsers(users);
    this.saveSession({ name: name, email: email, initials: initials });
    return { success: true, user: { name: name, email: email, initials: initials } };
  },

  logout: function () {
    this.clearSession();
    window.location.reload();
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

function createGradient(ctx, top, bottom, c1, c2) {
  var g = ctx.createLinearGradient(0, top, 0, bottom);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  return g;
}

Chart.defaults.font.family = "'Segoe UI', system-ui, sans-serif";

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
    if (canvas) { chartEls[i].fn(canvas.getContext('2d')); }
  }
}

function initRevenueChart(ctx) {
  var h = 360;
  var revGrad = createGradient(ctx, 0, h, 'rgba(59, 130, 246, 0.35)', 'rgba(59, 130, 246, 0.01)');
  var profitGrad = createGradient(ctx, 0, h, 'rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.01)');

  safeChart(ctx, {
    type: 'line',
    data: {
      labels: DATA.months,
      datasets: [
        { label: 'Gross Revenue', data: DATA.revenue, borderColor: '#3b82f6', backgroundColor: revGrad, fill: true, tension: 0.4, pointBackgroundColor: '#3b82f6', pointBorderColor: '#0f172a', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7, borderWidth: 3 },
        { label: 'Net Profit', data: DATA.profit, borderColor: '#10b981', backgroundColor: profitGrad, fill: true, tension: 0.4, pointBackgroundColor: '#10b981', pointBorderColor: '#0f172a', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 7, borderWidth: 3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' },
      scales: {
        x: { grid: { color: 'rgba(148, 163, 184, 0.06)' }, ticks: { color: '#64748b', font: { size: 11 } } },
        y: { grid: { color: 'rgba(148, 163, 184, 0.08)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: function (v) { return '$' + v.toLocaleString(); } } }
      },
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#f1f5f9', bodyColor: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.15)', borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: function (ctx) { return ctx.dataset.label + ': $' + ctx.parsed.y.toLocaleString(); } } }
      }
    }
  });
}

function initCategoryChart(ctx) {
  var labels = Object.keys(DATA.categories);
  var values = Object.values(DATA.categories);
  var colors = ['#f97316', '#dc2626', '#f59e0b', '#10b981', '#8b5cf6'];
  var hover = ['#fb923c', '#ef4444', '#fbbf24', '#34d399', '#a78bfa'];

  safeChart(ctx, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: values, backgroundColor: colors, hoverBackgroundColor: hover, borderColor: '#0f172a', borderWidth: 3, hoverOffset: 12 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#f1f5f9', bodyColor: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.15)', borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: function (ctx) { var total = ctx.dataset.data.reduce(function (a, b) { return a + b; }, 0); return ctx.label + ': $' + ctx.parsed.toLocaleString() + ' (' + ((ctx.parsed / total) * 100).toFixed(1) + '%)'; } } }
      }
    }
  });
}

function initFunnelChart(ctx) {
  var labels = Object.keys(DATA.funnel);
  var values = Object.values(DATA.funnel);

  safeChart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{ label: 'Users', data: values, backgroundColor: ['rgba(249, 115, 22, 0.75)', 'rgba(220, 38, 38, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.65)', 'rgba(139, 92, 246, 0.7)'], borderColor: ['#f97316', '#dc2626', '#f59e0b', '#10b981', '#8b5cf6'], borderWidth: 1, borderRadius: 6, barPercentage: 0.65 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      scales: {
        x: { grid: { color: 'rgba(148, 163, 184, 0.06)' }, ticks: { color: '#64748b', font: { size: 11 } } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 12, weight: '500' } } }
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#f1f5f9', bodyColor: '#cbd5e1', borderColor: 'rgba(148, 163, 184, 0.15)', borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: function (ctx) { return ctx.parsed.x.toLocaleString() + ' users'; } } }
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
    csv += 'Conversion Rate' + sep + KpiEngine.conversionRate.toFixed(2) + '%\n\n';
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
}

/* =====================================================
   DASHBOARD INIT (safe — charts won't break the UI)
   ===================================================== */

function initDashboard() {
  try {
    KpiEngine.init();
    KpiEngine.render();
    renderProductsTable();
    initCharts();
    initExport();
    initUserMenu();
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
    dateRange.addEventListener('change', function () {
      Toast.info('Date Range Changed', 'Showing data for: ' + this.options[this.selectedIndex].text);
    });
  }

  var catFilter = document.getElementById('categoryFilter');
  if (catFilter) {
    catFilter.addEventListener('change', function () {
      Toast.info('Category Filter Changed', 'Filtering by: ' + this.options[this.selectedIndex].text);
    });
  }
}

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
   BOOT
   ===================================================== */

document.addEventListener('DOMContentLoaded', function () {
  try {
    Auth.initDefaultUsers();
  } catch (e) {
    console.warn('[DataStream] Failed to init users:', e);
  }
  initAuthUI();
});
