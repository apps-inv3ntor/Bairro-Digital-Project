/* ============================================================
   BRASA BURGER CO. — ADMIN — Lógica da aplicação
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Utilidades ---------------- */
  function loadJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(fallback)); }
    catch (e) { return JSON.parse(JSON.stringify(fallback)); }
  }
  function saveJSON(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
  function formatBRL(v) { return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
  function uid(prefix) { return (prefix || 'id') + Math.random().toString(36).slice(2, 9); }
  function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function timeAgo(ts) {
    const min = Math.floor((Date.now() - ts) / 60000);
    if (min < 1) return 'agora mesmo';
    if (min < 60) return `há ${min} min`;
    const h = Math.floor(min / 60);
    return `há ${h}h${min % 60 ? (min % 60) + 'min' : ''}`;
  }
  function showToast(message, type) {
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ---------------- Estado ---------------- */
  let products = loadJSON('admin_products', ADMIN_PRODUCTS);
  let categories = loadJSON('admin_categories', ADMIN_CATEGORIES);
  let addonGroups = loadJSON('admin_addons', ADMIN_ADDON_GROUPS);
  let coupons = loadJSON('admin_coupons', ADMIN_COUPONS);
  let areas = loadJSON('admin_areas', ADMIN_AREAS);
  let banners = loadJSON('admin_banners', ADMIN_BANNERS);
  let orders = loadJSON('admin_orders', ADMIN_ORDERS);
  let adminUsers = loadJSON('admin_admin_users', []);
  let settings = loadJSON('admin_settings', {
    storeName: 'Brasa Burger Co.', phone: '(11) 99999-2026', address: 'Rua das Brasas, 147 — Centro',
    instagram: '@brasaburgerco', minOrder: 20,
    hours: { seg: { open: false }, ter: { open: true, from: '18:00', to: '23:30' }, qua: { open: true, from: '18:00', to: '23:30' }, qui: { open: true, from: '18:00', to: '23:30' }, sex: { open: true, from: '18:00', to: '23:30' }, sab: { open: true, from: '18:00', to: '23:30' }, dom: { open: true, from: '18:00', to: '23:00' } },
    payments: { pix: true, debito: true, credito: true, dinheiro: true },
    pixKey: '', pixRecipient: '',
    notifyNewOrder: true, notifySound: true, notifyLowStock: true,
  });
  let currentView = 'visao-geral';
  let currentDrawerOrder = null;
  let editingProductId = null;
  let editingCategoryId = null;
  let editingAddonId = null;
  let editingCouponCode = null;
  let editingAreaId = null;
  let editingBannerId = null;

  function persist(key, val) { saveJSON(key, val); }
  function findProduct(id) { return products.find(p => p.id === id); }
  function findCategory(id) { return categories.find(c => c.id === id); }
  const CATEGORY_NAME = id => (findCategory(id) || {}).name || id;

  /* ============================================================
     LOGIN
     ============================================================ */
  const DEMO_CODE = '482913';
  document.getElementById('tabPassword').addEventListener('click', () => switchLoginTab('password'));
  document.getElementById('tabCode').addEventListener('click', () => switchLoginTab('code'));

  // Avisa claramente quando ainda está em modo de demonstração (sem Supabase configurado)
  if (!window.SUPABASE_READY) {
    const hint = document.querySelector('.login-hint');
    if (hint) hint.textContent = '🔑 Modo demonstração (Supabase não configurado ainda) — use qualquer senha com 3+ caracteres.';
  } else {
    const hint = document.querySelector('.login-hint');
    if (hint) hint.textContent = '🔒 Login real — use o e-mail e senha cadastrados como administrador no Supabase.';
  }

  function switchLoginTab(which) {
    document.getElementById('tabPassword').classList.toggle('is-active', which === 'password');
    document.getElementById('tabCode').classList.toggle('is-active', which === 'code');
    document.getElementById('loginFormPassword').style.display = which === 'password' ? 'block' : 'none';
    document.getElementById('loginFormCode').style.display = which === 'code' ? 'block' : 'none';
    document.getElementById('loginError').classList.remove('is-visible');
  }

  document.getElementById('loginFormPassword').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('loginError');
    err.classList.remove('is-visible');

    if (!window.SUPABASE_READY) {
      // ---------- Modo demonstração (sem backend configurado) ----------
      const pass = document.getElementById('loginPass').value;
      if (pass.trim().length < 3) {
        err.textContent = 'Digite uma senha com pelo menos 3 caracteres.';
        err.classList.add('is-visible');
        return;
      }
      enterAdmin({ name: ADMIN_USER.name, demo: true });
      return;
    }

    // ---------- Login real via Supabase Auth ----------
    const email = document.getElementById('loginEmail').value.trim();
    const pass = document.getElementById('loginPass').value;
    const submitBtn = e.target.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';

    const { data, error } = await window.sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
      console.error('Erro de login no Supabase:', error);
      err.textContent = `E-mail ou senha incorretos. (detalhe técnico: ${error.message || error.status || 'sem detalhe'})`;
      err.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      return;
    }

    // Autenticado com sucesso ≠ autorizado a administrar — confere na tabela admin_users
    // (a mesma verificação que o banco já faz via RLS; aqui é só pra dar um retorno melhor na tela)
    const { data: adminRow } = await window.sb
      .from('admin_users')
      .select('name, role, active')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (!adminRow || !adminRow.active) {
      await window.sb.auth.signOut();
      err.textContent = 'Este usuário não tem permissão de administrador.';
      err.classList.add('is-visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
      return;
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Entrar';
    enterAdmin({ name: adminRow.name, role: adminRow.role, demo: false });
  });

  let codeSent = false;
  document.getElementById('loginFormCode').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('loginError');

    if (!window.SUPABASE_READY) {
      // ---------- Modo demonstração ----------
      if (!codeSent) {
        codeSent = true;
        document.getElementById('codeFieldWrap').style.display = 'block';
        document.getElementById('codeSubmitBtn').textContent = 'Confirmar código';
        err.className = 'login-hint';
        err.style.display = 'block';
        err.textContent = `📩 Código de demonstração enviado: ${DEMO_CODE}`;
        return;
      }
      const code = document.getElementById('loginCode').value.trim();
      if (code !== DEMO_CODE) {
        err.className = 'login-error is-visible';
        err.textContent = 'Código incorreto. Tente novamente.';
        return;
      }
      enterAdmin({ name: ADMIN_USER.name, demo: true });
      return;
    }

    // ---------- Código real por e-mail via Supabase Auth (OTP) ----------
    const email = document.getElementById('loginEmail2').value.trim();
    if (!codeSent) {
      const { error } = await window.sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (error) {
        err.className = 'login-error is-visible';
        err.textContent = 'Não foi possível enviar o código. Confira o e-mail.';
        return;
      }
      codeSent = true;
      document.getElementById('codeFieldWrap').style.display = 'block';
      document.getElementById('codeSubmitBtn').textContent = 'Confirmar código';
      err.className = 'login-hint';
      err.style.display = 'block';
      err.textContent = '📩 Enviamos um código de 6 dígitos pro seu e-mail.';
      return;
    }

    const code = document.getElementById('loginCode').value.trim();
    const { data, error } = await window.sb.auth.verifyOtp({ email, token: code, type: 'email' });
    if (error || !data.user) {
      err.className = 'login-error is-visible';
      err.textContent = 'Código incorreto ou expirado.';
      return;
    }
    const { data: adminRow } = await window.sb
      .from('admin_users').select('name, role, active').eq('user_id', data.user.id).maybeSingle();
    if (!adminRow || !adminRow.active) {
      await window.sb.auth.signOut();
      err.className = 'login-error is-visible';
      err.textContent = 'Este usuário não tem permissão de administrador.';
      return;
    }
    enterAdmin({ name: adminRow.name, role: adminRow.role, demo: false });
  });

  let currentUser = ADMIN_USER;
  function enterAdmin(user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminShell').classList.add('is-active');
    currentUser = { name: user.name, role: user.role || 'Administradora' };
    const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileRole').textContent = currentUser.role;
    document.getElementById('profileInitials').textContent = initials;
    showToast(user.demo ? `Bem-vinda de volta, ${user.name.split(' ')[0]}! (modo demonstração)` : `Bem-vinda, ${user.name.split(' ')[0]}!`);
    if (!user.demo && typeof window.__brasaSyncCatalogFromSupabase === 'function') {
      window.__brasaSyncCatalogFromSupabase();
    }
  }

  /* ============================================================
     NAVEGAÇÃO (SPA simulada)
     ============================================================ */
  const VIEW_TITLES = {
    'visao-geral': 'Visão geral', 'pedidos': 'Pedidos', 'produtos': 'Produtos', 'categorias': 'Categorias',
    'adicionais': 'Adicionais', 'cupons': 'Cupons', 'areas': 'Áreas de entrega', 'banners': 'Banners e promoções',
    'configuracoes': 'Configurações',
  };
  const VIEW_RENDERERS = {}; // preenchido mais abaixo por cada módulo de view

  document.getElementById('sidebarNav').addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    goToView(btn.dataset.view);
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('backdrop').classList.remove('is-open');
  });

  function goToView(view) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === view));
    document.getElementById('topbarTitle').textContent = VIEW_TITLES[view] || view;
    const renderer = VIEW_RENDERERS[view];
    document.getElementById('viewContent').innerHTML = '';
    if (renderer) renderer();
    window.scrollTo(0, 0);
  }

  document.getElementById('openSidebarBtn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('is-open');
    document.getElementById('backdrop').classList.add('is-open');
  });
  document.getElementById('closeSidebarBtn').addEventListener('click', closeMobileSidebar);
  function closeMobileSidebar() {
    document.getElementById('sidebar').classList.remove('is-open');
    document.getElementById('backdrop').classList.remove('is-open');
  }

  document.getElementById('backdrop').addEventListener('click', () => {
    closeMobileSidebar();
    closeAllOverlays();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });

  function closeAllOverlays() {
    document.getElementById('backdrop').classList.remove('is-open');
    document.getElementById('orderDrawer').classList.remove('is-open');
    document.getElementById('adminModal').classList.remove('is-open');
    document.getElementById('confirmModal').classList.remove('is-open');
  }
  function openBackdrop() { document.getElementById('backdrop').classList.add('is-open'); }

  /* Data no topbar */
  const WEEKDAYS_PT = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const MONTHS_PT = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];
  (function setTopbarDate() {
    const now = new Date();
    document.getElementById('topbarDate').textContent = `${WEEKDAYS_PT[now.getDay()]}, ${now.getDate()} DE ${MONTHS_PT[now.getMonth()]}`;
  })();

  document.getElementById('notifBtn').addEventListener('click', () => {
    document.getElementById('notifBadge').style.display = 'none';
    showToast('3 novos pedidos e 1 alerta de estoque nas últimas horas');
  });
  document.getElementById('soundToggle').addEventListener('click', function () {
    settings.notifySound = !settings.notifySound;
    persist('admin_settings', settings);
    this.classList.toggle('is-muted', !settings.notifySound);
    showToast(settings.notifySound ? 'Som de notificações ativado' : 'Som de notificações desativado');
  });

  function updateOrdersBadge() {
    const count = orders.filter(o => o.status === 'novo').length;
    const badge = document.getElementById('navOrdersBadge');
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  /* ============================================================
     VIEW: VISÃO GERAL (Dashboard)
     ============================================================ */
  VIEW_RENDERERS['visao-geral'] = function renderDashboard() {
    const root = document.getElementById('viewContent');
    const today = orders.filter(o => o.createdAt > Date.now() - 24 * 3600000);
    const revenueToday = today.reduce((s, o) => s + o.total, 0);
    const avgTicket = today.length ? revenueToday / today.length : 0;
    const pendingCount = orders.filter(o => o.status !== 'concluido').length;

    root.innerHTML = `
      <div class="greeting-row">
        <div class="greeting">
          <span class="eyebrow">Painel de controle</span>
          <h1>Olá, ${currentUser.name.split(' ')[0]} 👋</h1>
          <p>Hoje você já faturou <strong>${formatBRL(revenueToday)}</strong> em ${today.length} pedidos.</p>
        </div>
        <div class="live-badge"><span class="live-dot"></span> Atualizando em tempo real</div>
      </div>

      <div class="metrics-grid">
        ${metricCard('💰', formatBRL(revenueToday), 'Faturamento hoje', '+12% vs ontem', true)}
        ${metricCard('🧾', today.length, 'Pedidos hoje', '+3 na última hora', true)}
        ${metricCard('🎯', formatBRL(avgTicket), 'Ticket médio', '+4,2%', true)}
        ${metricCard('⏳', pendingCount, 'Pedidos em andamento', pendingCount > 4 ? 'Volume alto' : 'Sob controle', pendingCount <= 4)}
      </div>

      <div class="dashboard-grid">
        <div class="dashboard-col">
          <div class="card panel">
            <div class="panel__head">
              <div><span class="tag">EM TEMPO REAL</span><h3 style="margin-top:4px;">Pedidos recentes</h3></div>
              <button class="link" id="goToPedidosLink">Ver todos →</button>
            </div>
            <div id="recentOrdersList"></div>
          </div>
          <div class="card panel">
            <div class="panel__head"><h3>Faturamento da semana</h3><span class="week-select">Últimos 7 dias</span></div>
            <div class="week-total"><span class="val">${formatBRL(ADMIN_WEEK_SALES.reduce((s, d) => s + d.value, 0))}</span><span class="delta">▲ 18% vs semana anterior</span></div>
            <div class="bar-chart" id="weekBarChart"></div>
          </div>
        </div>
        <div class="dashboard-col">
          <div class="card panel">
            <div class="panel__head"><h3>Mais vendidos</h3><span class="tag">30 DIAS</span></div>
            <div id="topSellersList"></div>
          </div>
          <div class="card panel">
            <div class="panel__head"><h3>Status da operação</h3></div>
            <div class="store-op-row"><span>Loja</span><span class="v" style="color:var(--green)">Aberta</span></div>
            <div class="store-op-row"><span>Tempo médio de preparo</span><span class="v">18 min</span></div>
            <div class="store-op-row"><span>Produtos em falta</span><span class="v" style="color:var(--red)">${products.filter(p => p.soldOut).length}</span></div>
            <div class="store-op-row"><span>Áreas de entrega ativas</span><span class="v">${areas.filter(a => a.active).length}/${areas.length}</span></div>
            <div class="store-op-row"><span>Cupons ativos</span><span class="v">${coupons.filter(c => c.active).length}</span></div>
          </div>
        </div>
      </div>`;

    document.getElementById('goToPedidosLink').addEventListener('click', () => goToView('pedidos'));

    // Pedidos recentes
    const recent = [...orders].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    document.getElementById('recentOrdersList').innerHTML = recent.map(o => `
      <div class="recent-order-row" data-order="${o.id}">
        <span class="ro-num">#${o.id}</span>
        <div class="ro-info"><div class="name">${escapeHtml(o.customer)}</div><div class="meta">${o.items.length} itens · ${timeAgo(o.createdAt)}</div></div>
        <span class="ro-total">${formatBRL(o.total)}</span>
      </div>`).join('') || `<div class="empty-state"><p>Nenhum pedido ainda hoje.</p></div>`;
    document.querySelectorAll('.recent-order-row').forEach(row => {
      row.addEventListener('click', () => openOrderDrawer(parseInt(row.dataset.order, 10)));
    });

    // Gráfico semanal
    const maxVal = Math.max(...ADMIN_WEEK_SALES.map(d => d.value));
    document.getElementById('weekBarChart').innerHTML = ADMIN_WEEK_SALES.map(d => `
      <div class="bar-col">
        <div class="bar ${d.value === maxVal ? 'is-peak' : ''}" style="height:${Math.max(6, (d.value / maxVal) * 100)}%;"></div>
        <span class="bar-label">${d.label}</span>
      </div>`).join('');

    // Mais vendidos
    document.getElementById('topSellersList').innerHTML = ADMIN_TOP_SELLERS.map((t, i) => {
      const p = findProduct(t.id);
      if (!p) return '';
      return `
        <div class="top-seller-row">
          <span class="rank">${i + 1}</span>
          <img src="${p.img}" alt="${p.name}">
          <div class="ts-info"><div class="name">${p.name}</div><div class="meta">${t.sold} vendidos</div></div>
          <span class="ts-price">${formatBRL(t.revenue)}</span>
        </div>`;
    }).join('');
  };

  function metricCard(icon, value, label, delta, positive) {
    return `
      <div class="card metric-card">
        <div class="top-row">
          <div class="m-icon" style="background: rgba(242,107,33,0.12); color: var(--orange);">${icon}</div>
        </div>
        <div class="m-value">${value}</div>
        <div class="m-label">${label}</div>
        <div class="m-delta" style="color:${positive ? 'var(--green)' : 'var(--amber)'};">${delta}</div>
      </div>`;
  }

  /* Expor no escopo do IIFE para as próximas partes (pedidos, produtos, etc.) */
  window.__brasaAdmin = {
    loadJSON, saveJSON, formatBRL, uid, escapeHtml, timeAgo, showToast, persist,
    get products() { return products; }, set products(v) { products = v; },
    get categories() { return categories; }, set categories(v) { categories = v; },
    get addonGroups() { return addonGroups; }, set addonGroups(v) { addonGroups = v; },
    get coupons() { return coupons; }, set coupons(v) { coupons = v; },
    get areas() { return areas; }, set areas(v) { areas = v; },
    get banners() { return banners; }, set banners(v) { banners = v; },
    get orders() { return orders; }, set orders(v) { orders = v; },
    get currentUser() { return currentUser; },
    get adminUsers() { return adminUsers; }, set adminUsers(v) { adminUsers = v; },
    get settings() { return settings; }, set settings(v) { settings = v; },
    findProduct, findCategory, CATEGORY_NAME,
    get currentView() { return currentView; },
    VIEW_RENDERERS, goToView, closeAllOverlays, openBackdrop, updateOrdersBadge,
    get editingProductId() { return editingProductId; }, set editingProductId(v) { editingProductId = v; },
    get editingCategoryId() { return editingCategoryId; }, set editingCategoryId(v) { editingCategoryId = v; },
    get editingAddonId() { return editingAddonId; }, set editingAddonId(v) { editingAddonId = v; },
    get editingCouponCode() { return editingCouponCode; }, set editingCouponCode(v) { editingCouponCode = v; },
    get editingAreaId() { return editingAreaId; }, set editingAreaId(v) { editingAreaId = v; },
    get editingBannerId() { return editingBannerId; }, set editingBannerId(v) { editingBannerId = v; },
    get currentDrawerOrder() { return currentDrawerOrder; }, set currentDrawerOrder(v) { currentDrawerOrder = v; },
  };

  /* Inicialização geral (chamada ao final do último arquivo carregado) */
  window.__brasaAdminInit = function () {
    updateOrdersBadge();
    goToView('visao-geral');
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
      if (!confirm('Sair da conta?')) return;
      if (window.SUPABASE_READY) { try { await window.sb.auth.signOut(); } catch (e) { /* ignora */ } }
      document.getElementById('adminShell').classList.remove('is-active');
      document.getElementById('loginScreen').style.display = '';
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPass').value = '';
    });
  };
})();
