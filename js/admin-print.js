/* ============================================================
   admin-print.js — Impressão de cupons (KOT cozinha + cliente)
   Arquivo novo, não mexe em nenhuma lógica já existente.
   ============================================================ */
(function () {
  const A = window.__brasaAdmin;
  const { formatBRL, escapeHtml } = A;

  function two(n) { return String(n).padStart(2, '0'); }
  function formatDateTime(ts) {
    const d = new Date(ts);
    return `${two(d.getHours())}:${two(d.getMinutes())} — ${two(d.getDate())}/${two(d.getMonth() + 1)}`;
  }
  function firstName(fullName) {
    return (fullName || '').trim().split(/\s+/)[0] || '';
  }
  function modalityLabel(o) {
    return o.modality === 'entrega' ? 'ENTREGA' : 'A RETIRAR';
  }
  // Hoje todo pedido nasce do checkout do site — não existe lançamento manual
  // de pedido de balcão no admin ainda. Se um dia isso for criado, é só
  // trocar essa constante pela origem real do pedido.
  function channelLabel(o) { return 'WEBSITE'; }

  function paymentLine(o) {
    const method = (o.payment || '').split(' (')[0];
    if (o.paymentMethod === 'dinheiro') return `${method.toUpperCase()} (COBRAR NA ${o.modality === 'entrega' ? 'ENTREGA' : 'RETIRADA'})`;
    if (o.paymentStatus === 'pago') return `${method.toUpperCase()} (PAGO ONLINE)`;
    return `${method.toUpperCase()} (AGUARDANDO CONFIRMAÇÃO)`;
  }

  const TICKET_CSS = `
    @page { margin: 0; }
    * { box-sizing: border-box; }
    body { width: 78mm; margin: 0 auto; padding: 3mm; font-family: 'Courier New', monospace; font-size: 12px; color:#000; }
    .center { text-align: center; }
    .b { font-weight: 700; }
    .sep { border-top: 1px dashed #000; margin: 6px 0; }
    .sep-eq { border-top: 2px solid #000; margin: 6px 0; }
    .big { font-size: 26px; font-weight: 700; text-align:center; letter-spacing: 1px; }
    .badge { font-size: 13px; font-weight:700; text-align:center; padding: 3px 0; }
    .row { display:flex; justify-content:space-between; gap:6px; }
    .item-line { margin: 5px 0 2px; font-weight:700; }
    .mod-line { padding-left: 10px; font-size: 11px; }
    .removed { font-weight:700; }
    .removed::before { content: "❌ "; }
    .obs-line { font-weight:700; }
    .obs-line::before { content: "★ "; }
    table { width:100%; border-collapse:collapse; font-size:11px; table-layout: fixed; }
    th, td { text-align:left; padding: 1px 2px; white-space: nowrap; overflow: hidden; }
    th:nth-child(1), td:nth-child(1) { width: 12%; }
    th:nth-child(2), td:nth-child(2) { width: 46%; white-space: normal; }
    th:nth-child(3), td:nth-child(3) { width: 21%; text-align:right; }
    th:last-child, td:last-child { width: 21%; text-align: right; }
    .muted { color:#333; font-size:10.5px; }
    @media print { body { width: 78mm; } }
  `;

  function openPrintWindow(title, bodyHtml) {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) { A.showToast ? A.showToast('Seu navegador bloqueou a janela de impressão — permita pop-ups pra este site.', 'error') : alert('Permita pop-ups pra imprimir.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${TICKET_CSS}</style></head><body>${bodyHtml}<script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  }

  // ---------------- CUPOM DA COZINHA (KOT) ----------------
  function buildKOT(o) {
    const itemsHtml = o.items.map(i => `
      <div class="item-line">${i.qty}x ${escapeHtml(i.name.toUpperCase())}</div>
      ${(i.extras || []).map(e => `<div class="mod-line">+ ${escapeHtml(typeof e === 'string' ? e : e.name)}</div>`).join('')}
      ${(i.removals || []).map(r => `<div class="mod-line removed">${escapeHtml(String(r).toUpperCase())}</div>`).join('')}
      ${(i.observation ? `<div class="mod-line obs-line">${escapeHtml(i.observation.toUpperCase())}</div>` : '')}
    `).join('');
    const totalItens = o.items.reduce((s, i) => s + i.qty, 0);
    return `
      <div class="center b">${escapeHtml(A.settings.storeName || 'LOJA')}</div>
      <div class="sep-eq"></div>
      <div class="big">PEDIDO #${escapeHtml(o.id)}</div>
      <div class="sep-eq"></div>
      <div class="badge">[${channelLabel(o)}] — ** ${modalityLabel(o)} **</div>
      <div class="center muted">Hora: ${formatDateTime(o.createdAt)}</div>
      <div class="sep"></div>
      ${itemsHtml}
      <div class="sep"></div>
      <div class="row b"><span>TOTAL DE ITENS:</span><span>${totalItens}</span></div>
      <div class="row"><span>Cliente:</span><span>${escapeHtml(firstName(o.customer).toUpperCase())}</span></div>
      <div class="sep-eq"></div>
    `;
  }

  // ---------------- CUPOM DO CLIENTE (pagamento) ----------------
  function buildCustomerReceipt(o) {
    const rows = o.items.map(i => `
      <tr><td>${i.qty}x</td><td>${escapeHtml(i.name)}</td><td>${formatBRL(i.unitPrice)}</td><td>${formatBRL(i.lineTotal)}</td></tr>
      ${(i.extras || []).map(e => `<tr><td></td><td class="muted">+ ${escapeHtml(typeof e === 'string' ? e : e.name)}</td><td></td><td></td></tr>`).join('')}
      ${(i.removals || []).map(r => `<tr><td></td><td class="muted">(❌ ${escapeHtml(r)})</td><td></td><td></td></tr>`).join('')}
      ${i.observation ? `<tr><td></td><td class="muted">(${escapeHtml(i.observation)})</td><td></td><td></td></tr>` : ''}
    `).join('');
    const totalItens = o.items.reduce((s, i) => s + i.qty, 0);
    return `
      <div class="center b">${escapeHtml(A.settings.storeName || 'LOJA')}</div>
      <div class="center muted">${escapeHtml(A.settings.address || '')}</div>
      <div class="sep-eq"></div>
      <div class="big">PEDIDO #${escapeHtml(o.id)}</div>
      <div class="sep-eq"></div>
      <div class="badge">[${channelLabel(o)}] — ** ${modalityLabel(o)} **</div>
      <div class="center muted">Hora: ${formatDateTime(o.createdAt)}</div>
      <div class="center">Cliente: ${escapeHtml(o.customer)}</div>
      <div class="sep-eq"></div>
      <table>
        <thead><tr><th>QTD</th><th>ITEM</th><th>UN.</th><th>TOTAL</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="sep"></div>
      <div class="row"><span>TOTAL DE ITENS:</span><span>${totalItens}</span></div>
      <div class="sep"></div>
      <div class="row"><span>SUBTOTAL:</span><span>${formatBRL(o.subtotal)}</span></div>
      <div class="row"><span>TAXA DE ENTREGA:</span><span>${formatBRL(o.fee)}</span></div>
      ${o.discount > 0 ? `<div class="row"><span>DESCONTO${o.couponCode ? ' (' + escapeHtml(o.couponCode) + ')' : ''}:</span><span>− ${formatBRL(o.discount)}</span></div>` : ''}
      <div class="sep-eq"></div>
      <div class="row big" style="font-size:16px;"><span>TOTAL A PAGAR:</span><span>${formatBRL(o.total)}</span></div>
      <div class="sep-eq"></div>
      <div class="b">FORMA DE PAGAMENTO:</div>
      <div>&gt;&gt; ${paymentLine(o)}</div>
      <div class="sep"></div>
      <div class="center">Seu pedido já está sendo feito!</div>
      <div class="center">Obrigado pela preferência e boa refeição!</div>
      <div class="sep-eq"></div>
      <div class="center muted">Este cupom não é documento fiscal.</div>
    `;
  }

  function findOrder(orderId) {
    return A.orders.find(x => x.id === orderId);
  }

  window.__brasaPrintKOT = function (orderId) {
    const o = findOrder(orderId);
    if (!o) return;
    openPrintWindow(`Cozinha — Pedido #${o.id}`, buildKOT(o));
  };
  window.__brasaPrintCustomerReceipt = function (orderId) {
    const o = findOrder(orderId);
    if (!o) return;
    openPrintWindow(`Cliente — Pedido #${o.id}`, buildCustomerReceipt(o));
  };
})();
