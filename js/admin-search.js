/* ============================================================
   BRASA BURGER CO. — ADMIN — Busca global do topo (pedidos e produtos)
   ============================================================
   Arquivo novo: o campo do topo existia no admin.html mas não tinha
   nenhum código ligado a ele. Não altera nenhum outro módulo — só
   usa o que eles já expõem (detalhe do pedido e busca de produtos).
   ============================================================ */
(function () {
  'use strict';
  const input = document.getElementById('globalSearch');
  const host = input && input.closest('.topbar__search');
  if (!input || !host) return;

  const STATUS = { novo: 'Novo', confirmado: 'Confirmado', preparo: 'Em preparo', entrega: 'Saiu p/ entrega', concluido: 'Concluído', cancelado: 'Cancelado' };
  const MAX_PER_GROUP = 6;

  const panel = document.createElement('div');
  panel.className = 'gs-panel';
  panel.id = 'globalSearchPanel';
  panel.setAttribute('role', 'listbox');
  panel.hidden = true;
  host.classList.add('gs-host');
  host.appendChild(panel);
  input.setAttribute('autocomplete', 'off');

  let results = [];   // itens na ordem em que aparecem na tela
  let active = -1;
  let timer = null;

  const A = () => window.__brasaAdmin;
  const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const needle = () => norm(input.value).trim().replace(/^#/, '');

  function findOrders(t) {
    const digits = t.replace(/\D/g, '');
    return (A().orders || []).filter(o => {
      if (norm(`${o.customer} ${o.id} ${o.area || ''}`).includes(t)) return true;
      return digits.length >= 3 && String(o.phone || '').replace(/\D/g, '').includes(digits);
    }).sort((a, b) => b.createdAt - a.createdAt);
  }
  function findProducts(t) {
    return (A().products || []).filter(p => norm(`${p.name} ${p.code || ''}`).includes(t));
  }

  function render() {
    const t = needle();
    if (t.length < 2) { close(); return; }
    const orders = findOrders(t), products = findProducts(t);
    const esc = A().escapeHtml, brl = A().formatBRL;
    results = [
      ...orders.slice(0, MAX_PER_GROUP).map(o => ({ type: 'order', o })),
      ...products.slice(0, MAX_PER_GROUP).map(p => ({ type: 'product', p })),
    ];
    active = results.length ? 0 : -1;

    let html = '', i = 0;
    const group = (title, total, shown) => `<div class="gs-group">${title} <span>(${total}${total > shown ? `, mostrando ${shown}` : ''})</span></div>`;
    if (orders.length) {
      html += group('Pedidos', orders.length, Math.min(orders.length, MAX_PER_GROUP));
      orders.slice(0, MAX_PER_GROUP).forEach(o => {
        const when = new Date(o.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        html += `<div class="gs-item" role="option" data-i="${i++}"><strong>#${esc(String(o.id))}</strong> ${esc(o.customer || '')}
          <span class="gs-sub">${o.modality === 'entrega' ? 'Entrega' : 'Retirada'} · ${brl(o.total)} · ${when} · ${esc(STATUS[o.status] || String(o.status))}</span></div>`;
      });
    }
    if (products.length) {
      html += group('Produtos', products.length, Math.min(products.length, MAX_PER_GROUP));
      products.slice(0, MAX_PER_GROUP).forEach(p => {
        const cat = A().CATEGORY_NAME ? A().CATEGORY_NAME(p.category) : '';
        html += `<div class="gs-item" role="option" data-i="${i++}"><strong>${esc(p.name || '')}</strong>
          <span class="gs-sub">${p.code ? esc(String(p.code)) + ' · ' : ''}${brl(p.price)}${cat ? ' · ' + esc(String(cat)) : ''}${p.active === false ? ' · inativo' : ''}</span></div>`;
      });
    }
    if (!html) html = `<div class="gs-empty">Nada encontrado para “${esc(input.value.trim())}”.</div>`;
    panel.innerHTML = html;
    panel.hidden = false;
    paintActive();
  }

  function paintActive() {
    panel.querySelectorAll('.gs-item').forEach(el => el.classList.toggle('is-active', Number(el.dataset.i) === active));
    const el = panel.querySelector('.gs-item.is-active');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }
  function close() { panel.hidden = true; panel.innerHTML = ''; results = []; active = -1; }

  function choose(i) {
    const r = results[i];
    if (!r) return;
    close();
    input.value = '';
    input.blur();
    if (r.type === 'order') {
      if (typeof window.__brasaOpenOrderDrawer === 'function') window.__brasaOpenOrderDrawer(r.o.id);
    } else {
      A().goToView('produtos');
      const f = document.getElementById('prodSearch');
      if (f) { f.value = r.p.name; f.dispatchEvent(new Event('input', { bubbles: true })); }
    }
  }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 120); });
  input.addEventListener('focus', () => { if (needle().length >= 2) render(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (panel.hidden || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % results.length; paintActive(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + results.length) % results.length; paintActive(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(active >= 0 ? active : 0); }
  });
  // mousedown (e não click) para o campo não perder o foco antes da escolha
  panel.addEventListener('mousedown', (e) => {
    const el = e.target.closest('.gs-item');
    if (!el) return;
    e.preventDefault();
    choose(Number(el.dataset.i));
  });
  document.addEventListener('mousedown', (e) => { if (!host.contains(e.target)) close(); });
})();
