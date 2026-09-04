/* ============================================================
   BRASA BURGER CO. — ADMIN — Pedidos (Kanban + Drawer)
   ============================================================ */
(function () {
  'use strict';
  const A = window.__brasaAdmin;
  const { formatBRL, escapeHtml, timeAgo, showToast, persist, openBackdrop } = A;

  const KANBAN_COLS = ['novo', 'confirmado', 'preparo', 'entrega'];
  let activeFilter = 'todos';
  let searchTerm = '';
  let historyPeriod = 'semana';
  const PERIOD_DAYS = { dia: 1, semana: 7, quinzena: 15, mes: 30, trimestre: 90, semestre: 180, ano: 365, total: null };
  const PERIOD_LABELS = { dia: 'Ontem', semana: 'Última semana', quinzena: 'Última quinzena', mes: 'Último mês', trimestre: 'Último trimestre', semestre: 'Último semestre', ano: 'Último ano', total: 'Tudo' };

  A.VIEW_RENDERERS['pedidos'] = function renderOrders() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar">
        <div class="toolbar__search">
          <span>🔍</span>
          <input type="text" id="orderSearch" placeholder="Buscar por cliente ou nº do pedido">
        </div>
        <div class="filter-chip-row" id="orderModalityFilter">
          <button class="filter-chip is-active" data-mod="todos">Todos</button>
          <button class="filter-chip" data-mod="entrega">Entrega</button>
          <button class="filter-chip" data-mod="retirada">Retirada</button>
        </div>
      </div>
      <h4 style="margin:4px 0 8px;">Hoje</h4>
      <div class="kanban-wrap" id="kanbanWrap"></div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin:28px 0 8px;">
        <h4 style="margin:0;">Dias anteriores</h4>
        <select id="historyPeriodSelect" style="max-width:200px; background:var(--card); border:1px solid var(--border); color:var(--text); border-radius:var(--radius-sm); padding:9px 12px; font-size:0.83rem;">
          ${Object.keys(PERIOD_LABELS).map(k => `<option value="${k}" ${k === historyPeriod ? 'selected' : ''}>${PERIOD_LABELS[k]}</option>`).join('')}
        </select>
      </div>
      <div id="historyAccordion"></div>`;

    document.getElementById('orderSearch').addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      renderKanban();
      renderHistory();
    });
    document.getElementById('orderModalityFilter').addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      document.querySelectorAll('#orderModalityFilter .filter-chip').forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');
      activeFilter = chip.dataset.mod;
      renderKanban();
      renderHistory();
    });
    document.getElementById('historyPeriodSelect').addEventListener('change', (e) => {
      historyPeriod = e.target.value;
      renderHistory();
    });

    renderKanban();
    renderHistory();
  };

  function isToday(ts) {
    const d = new Date(ts), now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }

  function renderHistory() {
    const el = document.getElementById('historyAccordion');
    if (!el) return;
    const days = PERIOD_DAYS[historyPeriod];
    const cutoff = days ? Date.now() - days * 24 * 3600000 : 0;
    const past = A.orders.filter(o => !isToday(o.createdAt) && o.createdAt >= cutoff && matchesFilters(o));

    const byDay = {};
    past.forEach(o => {
      const key = new Date(o.createdAt).toLocaleDateString('pt-BR');
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(o);
    });
    const dayKeys = Object.keys(byDay).sort((a, b) => {
      const [da, ma, ya] = a.split('/'); const [db, mb, yb] = b.split('/');
      return new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da);
    });

    if (!dayKeys.length) {
      el.innerHTML = `<div class="empty-state" style="padding:24px;"><p>Nenhum pedido nesse período.</p></div>`;
      return;
    }

    el.innerHTML = dayKeys.map(dayKey => {
      const dayOrders = byDay[dayKey].sort((a, b) => b.createdAt - a.createdAt);
      const dayTotal = dayOrders.reduce((s, o) => s + o.total, 0);
      return `
        <div class="card" style="margin-bottom:10px; overflow:hidden;">
          <button class="history-day-head" data-day="${dayKey}" style="width:100%; display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:none; border:none; cursor:pointer; color:inherit; font:inherit; text-align:left;">
            <span><strong>${dayKey}</strong> <span class="muted">— ${dayOrders.length} pedido${dayOrders.length > 1 ? 's' : ''}</span></span>
            <span style="display:flex; align-items:center; gap:12px;"><strong>${formatBRL(dayTotal)}</strong> <span class="accordion-arrow">▾</span></span>
          </button>
          <div class="history-day-body" data-day-body="${dayKey}" style="display:none; padding:0 18px 14px;">
            ${dayOrders.map(o => `
              <div class="card order-card" data-order="${o.id}" style="cursor:pointer; margin-bottom:8px;">
                <div class="order-card__top"><strong>#${o.id}</strong> <span class="muted">${new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div class="muted" style="font-size:0.85rem;">${escapeHtml(o.customer)} · ${o.modality === 'entrega' ? 'Entrega' : 'Retirada'}</div>
                <div class="order-card__bottom">
                  <span class="pill ${o.payment.includes('Pix') ? 'pill-blue' : 'pill-gray'}">${o.payment.split(' (')[0]}</span>
                  ${o.paymentStatus ? `<span class="pill ${o.paymentStatus === 'pago' ? 'pill-green' : o.paymentStatus === 'falhou' ? 'pill-red' : 'pill-amber'}" style="margin-left:4px;">${o.paymentStatus === 'pago' ? '✅ Pago' : o.paymentStatus === 'falhou' ? '❌ Falhou' : '⏳ Pendente'}</span>` : ''}
                  <span class="ototal">${formatBRL(o.total)}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');

    el.querySelectorAll('.history-day-head').forEach(btn => btn.addEventListener('click', () => {
      const body = el.querySelector(`[data-day-body="${btn.dataset.day}"]`);
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      btn.querySelector('.accordion-arrow').textContent = isOpen ? '▾' : '▴';
    }));
    el.querySelectorAll('.history-day-body .order-card').forEach(card => {
      card.addEventListener('click', () => openOrderDrawer(card.dataset.order));
    });
  }

  function matchesFilters(o) {
    if (activeFilter !== 'todos' && o.modality !== activeFilter) return false;
    if (searchTerm && !(`${o.customer} ${o.id}`.toLowerCase().includes(searchTerm))) return false;
    return true;
  }

  function renderKanban() {
    const wrap = document.getElementById('kanbanWrap');
    if (!wrap) return;
    wrap.innerHTML = KANBAN_COLS.map(status => {
      const list = A.orders.filter(o => o.status === status && isToday(o.createdAt) && matchesFilters(o)).sort((a, b) => b.createdAt - a.createdAt);
      return `
        <div class="kanban-col" data-col="${status}">
          <div class="kanban-col__head">
            <h4>${ORDER_STATUS_LABELS[status]}</h4>
            <span class="kanban-count">${list.length}</span>
          </div>
          <div class="kanban-cards">
            ${list.map(orderCardHtml).join('') || `<div class="empty-state" style="padding:24px 10px;"><p style="font-size:0.78rem;">Nenhum pedido aqui</p></div>`}
          </div>
        </div>`;
    }).join('');

    wrap.querySelectorAll('.order-card').forEach(card => {
      card.addEventListener('click', () => openOrderDrawer(card.dataset.order));
    });
  }

  function orderCardHtml(o) {
    const mins = Math.floor((Date.now() - o.createdAt) / 60000);
    const urgent = mins > 25;
    return `
      <div class="card order-card" data-order="${o.id}">
        <div class="order-card__top">
          <span class="onum">#${o.id}</span>
          <span class="elapsed" ${urgent ? 'style="color:var(--red); background:rgba(225,83,63,0.12);"' : ''}>${timeAgo(o.createdAt)}</span>
        </div>
        <div class="cname">${escapeHtml(o.customer)}</div>
        <div class="cmeta">${o.modality === 'entrega' ? '🛵 ' + o.area : '🏠 Retirada'} · ${o.items.reduce((s, i) => s + i.qty, 0)} itens</div>
        <div class="order-card__bottom">
          <span class="pill ${o.payment.includes('Pix') ? 'pill-blue' : 'pill-gray'}">${o.payment.split(' (')[0]}</span>
          ${o.paymentStatus ? `<span class="pill ${o.paymentStatus === 'pago' ? 'pill-green' : o.paymentStatus === 'falhou' ? 'pill-red' : 'pill-amber'}" style="margin-left:4px;">${o.paymentStatus === 'pago' ? '✅ Pago' : o.paymentStatus === 'falhou' ? '❌ Falhou' : '⏳ Pendente'}</span>` : ''}
          <span class="ototal">${formatBRL(o.total)}</span>
        </div>
      </div>`;
  }

  /* ---------------- Drawer de detalhes ---------------- */
  function openOrderDrawer(orderId) {
    A.currentDrawerOrder = orderId;
    renderOrderDrawer();
    openBackdrop();
    document.getElementById('orderDrawer').classList.add('is-open');
  }
  window.__brasaOpenOrderDrawer = openOrderDrawer;

  function renderOrderDrawer() {
    const o = A.orders.find(x => x.id === A.currentDrawerOrder);
    const el = document.getElementById('orderDrawerContent');
    if (!o) { el.innerHTML = ''; return; }

    const stages = ['novo', 'confirmado', 'preparo', 'entrega', 'concluido'];
    const currentIdx = stages.indexOf(o.status);
    const nextStage = stages[currentIdx + 1];

    el.innerHTML = `
      <div class="drawer__head">
        <h2>Pedido #${o.id}</h2>
        <button class="icon-only-btn" id="closeDrawerBtn">✕</button>
      </div>
      <div class="drawer__body">
        ${o.paymentStatus ? `
        <div style="margin:-4px -4px 16px; padding:12px 16px; border-radius:10px; font-weight:700; text-align:center;
          background:${o.paymentStatus === 'pago' ? 'rgba(46,168,90,.18)' : o.paymentStatus === 'falhou' ? 'rgba(220,60,60,.18)' : 'rgba(240,170,30,.18)'};
          color:${o.paymentStatus === 'pago' ? '#2ea85a' : o.paymentStatus === 'falhou' ? '#dc3c3c' : '#f0aa1e'};">
          ${o.paymentStatus === 'pago' ? '✅ Pagamento confirmado' : o.paymentStatus === 'falhou' ? '❌ Pagamento não aprovado' : '⏳ Aguardando confirmação do pagamento'}
        </div>` : ''}
        <div class="detail-block">
          <h4>Cliente</h4>
          <p style="font-weight:700;">${escapeHtml(o.customer)}</p>
          <p class="muted">${o.phone}</p>
        </div>
        <div class="detail-block">
          <h4>${o.modality === 'entrega' ? 'Entrega' : 'Retirada'}</h4>
          <p>${o.modality === 'entrega' ? `${escapeHtml(o.address)} — ${o.area}` : 'Retirada no balcão — Rua das Brasas, 147'}</p>
        </div>
        <div class="detail-block">
          <h4>Pagamento</h4>
          <p>${o.payment}</p>
        </div>
        <div class="detail-block">
          <h4>Itens</h4>
          ${o.items.map(i => `<div class="detail-line"><span>${i.qty}× ${escapeHtml(i.name)}</span></div>`).join('')}
          <div class="detail-line"><span>Subtotal</span><span>${formatBRL(o.subtotal)}</span></div>
          ${o.discount > 0 ? `<div class="detail-line" style="color:var(--green);"><span>Desconto</span><span>− ${formatBRL(o.discount)}</span></div>` : ''}
          <div class="detail-line"><span>Taxa de entrega</span><span>${formatBRL(o.fee)}</span></div>
          <div class="detail-line total"><span>Total</span><span>${formatBRL(o.total)}</span></div>
        </div>
        <div class="detail-block">
          <h4>Status do pedido</h4>
          <div class="timeline">
            ${stages.map((s, i) => `
              <div class="timeline-item ${i < currentIdx ? 'is-done' : ''} ${i === currentIdx ? 'is-current' : ''}">
                <div class="dot-col"><div class="dot">${i < currentIdx ? '✓' : ''}</div>${i < stages.length - 1 ? '<div class="tline"></div>' : ''}</div>
                <div class="tlabel">${ORDER_TIMELINE_LABELS[s]}</div>
              </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="drawer__foot">
        ${nextStage ? `<button class="btn btn-primary" id="advanceStatusBtn" style="flex:1; justify-content:center;">Avançar para "${ORDER_TIMELINE_LABELS[nextStage]}"</button>` : `<span class="pill pill-green" style="padding:10px 16px;">Pedido concluído</span>`}
        <button class="btn btn-secondary" id="cancelOrderBtn">Cancelar pedido</button>
      </div>`;

    document.getElementById('closeDrawerBtn').addEventListener('click', A.closeAllOverlays);
    const advanceBtn = document.getElementById('advanceStatusBtn');
    if (advanceBtn) advanceBtn.addEventListener('click', async () => {
      o.status = nextStage;
      persist('admin_orders', A.orders);
      A.updateOrdersBadge();
      renderOrderDrawer();
      renderKanban();
      const sync = window.__brasaCatalogSync;
      if (sync && o._dbId) {
        const res = await sync.updateOrderStatusRemote(o._dbId, nextStage, o);
        if (!res.ok) { showToast('Atualizado localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast(`Pedido #${o.id} avançou para "${ORDER_TIMELINE_LABELS[nextStage]}"`);
    });
    document.getElementById('cancelOrderBtn').addEventListener('click', () => {
      showConfirm({
        icon: '⚠️', title: 'Cancelar este pedido?',
        text: `O pedido #${o.id} de ${o.customer} será marcado como cancelado. Essa ação não pode ser desfeita.`,
        confirmLabel: 'Cancelar pedido', confirmClass: 'btn-danger',
        onConfirm: async () => {
          A.orders = A.orders.filter(x => x.id !== o.id);
          persist('admin_orders', A.orders);
          A.updateOrdersBadge();
          A.closeAllOverlays();
          renderKanban();
          const sync = window.__brasaCatalogSync;
          if (sync && o._dbId) {
            const res = await sync.updateOrderStatusRemote(o._dbId, 'cancelado');
            if (!res.ok) { showToast('Cancelado localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
          }
          showToast('Pedido cancelado');
        },
      });
    });
  }

  /* ---------------- Diálogo de confirmação genérico (usado em várias views) ---------------- */
  function showConfirm({ icon, title, text, confirmLabel, confirmClass, onConfirm }) {
    const el = document.getElementById('confirmModalContent');
    el.innerHTML = `
      <div class="confirm-box">
        <div class="ic">${icon || '⚠️'}</div>
        <h3>${title}</h3>
        <p>${text}</p>
        <div class="actions">
          <button class="btn btn-secondary" id="confirmCancelBtn">Voltar</button>
          <button class="btn ${confirmClass || 'btn-danger'}" id="confirmOkBtn">${confirmLabel || 'Confirmar'}</button>
        </div>
      </div>`;
    openBackdrop();
    document.getElementById('confirmModal').classList.add('is-open');
    document.getElementById('confirmCancelBtn').addEventListener('click', A.closeAllOverlays);
    document.getElementById('confirmOkBtn').addEventListener('click', () => { onConfirm(); A.closeAllOverlays(); });
  }
  window.__brasaShowConfirm = showConfirm;
})();
