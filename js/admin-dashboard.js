/* ============================================================
   admin-dashboard.js — Dashboard Gráfico e Textual
   Arquivo novo — não mexe em nenhuma lógica já existente.
   Por enquanto só a aba "Vendas" está completa; Insumos e Produtos
   vêm nas próximas entregas (avisado na própria tela, sem prometer
   nada que ainda não existe).
   ============================================================ */
(function () {
  const A = window.__brasaAdmin;
  const { formatBRL, escapeHtml, orders } = A;

  const PERIOD_DAYS = { semana: 7, quinzena: 15, mes: 30, trimestre: 90, semestre: 180, ano: 365, total: null };
  const PAYMENT_COLORS = { pix: '#2e7d32', cartao: '#1565c0', credito: '#1565c0', debito: '#1565c0', dinheiro: '#b8410a' };
  let dashPeriod = 'mes';
  let chartRefs = [];

  function destroyCharts() { chartRefs.forEach(c => c.destroy()); chartRefs = []; }

  function paymentGroup(o) {
    const m = (o.paymentMethod || '').toLowerCase();
    if (m.includes('pix')) return 'Pix';
    if (m.includes('cred')) return 'Cartão de crédito';
    if (m.includes('deb')) return 'Cartão de débito';
    if (m.includes('dinheiro')) return 'Dinheiro';
    return o.payment ? o.payment.split(' (')[0] : 'Outro';
  }

  function computeVendasData() {
    const A_ORDERS = window.__brasaAdmin.orders || [];
    const days = PERIOD_DAYS[dashPeriod];
    const cutoff = days ? Date.now() - days * 24 * 3600000 : (A_ORDERS.length ? Math.min(...A_ORDERS.map(o => o.createdAt)) : Date.now());
    const inPeriod = A_ORDERS.filter(o => o.createdAt >= cutoff);
    const validOrders = inPeriod.filter(o => o.status !== 'cancelado');
    const cancelledOrders = inPeriod.filter(o => o.status === 'cancelado');

    const faturamento = validOrders.reduce((s, o) => s + o.total, 0);
    const ticketMedio = validOrders.length ? faturamento / validOrders.length : 0;
    const taxaCancelamento = inPeriod.length ? (cancelledOrders.length / inPeriod.length) * 100 : 0;

    // Faturamento e ticket médio por forma de pagamento
    const byPayment = {};
    validOrders.forEach(o => {
      const k = paymentGroup(o);
      if (!byPayment[k]) byPayment[k] = { total: 0, count: 0 };
      byPayment[k].total += o.total; byPayment[k].count += 1;
    });

    // Mapa de calor: dia da semana (0=Dom..6=Sáb) x hora (0-23), contagem de pedidos
    const heatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
    validOrders.forEach(o => {
      const d = new Date(o.createdAt);
      heatmap[d.getDay()][d.getHours()]++;
    });

    // Motivos de cancelamento (só existem a partir de quando começamos a perguntar)
    const motivos = {};
    cancelledOrders.forEach(o => {
      const m = (o.cancelReason || '').trim();
      if (!m) return;
      motivos[m] = (motivos[m] || 0) + 1;
    });

    return { faturamento, ticketMedio, taxaCancelamento, totalPedidos: inPeriod.length, cancelCount: cancelledOrders.length, byPayment, heatmap, motivos, orders: validOrders };
  }

  function fmtDateTime(ts) {
    return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function exportRelatorioCompletoPdf(vendasData) {
    const rows = vendasData.orders.slice().sort((a, b) => a.createdAt - b.createdAt).map(o => {
      const produtos = o.items.map(i => `${i.qty}x ${escapeHtml(i.name)}`).join('<br>');
      const enderecoCompleto = [o.address, o.area].filter(Boolean).join(' — ');
      return `<tr>
        <td>${fmtDateTime(o.createdAt)}</td>
        <td>${escapeHtml(o.customer || '')}</td>
        <td>${escapeHtml(o.phone || '')}</td>
        <td>${produtos}</td>
        <td>${escapeHtml(o.payment || '')}</td>
        <td>${escapeHtml(o.area || '—')}</td>
        <td>${escapeHtml(enderecoCompleto || '—')}</td>
        <td style="text-align:right; white-space:nowrap;">${formatBRL(o.total)}</td>
      </tr>`;
    }).join('');

    const win = window.open('', '_blank', 'width=1100,height=750');
    if (!win) { A.showToast('Permita pop-ups pra exportar o relatório.', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Completo de Vendas</title>
      <style>
        body{font-family:Arial,sans-serif;color:#222;padding:24px;}
        h1{color:#b8410a;border-bottom:2px solid #ff7a1a;padding-bottom:8px;font-size:20px;}
        table{width:100%;border-collapse:collapse;margin:14px 0;font-size:11px;}
        th{background:#2b1a0f;color:#fff;text-align:left;padding:6px 7px;}
        td{padding:6px 7px;border-bottom:1px solid #eee;vertical-align:top;}
        tr:nth-child(even) td{background:#faf8f6;}
        @media print { thead { display: table-header-group; } }
      </style></head><body>
      <h1>Relatório Completo de Vendas — ${escapeHtml(A.settings.storeName || '')}</h1>
      <p>Período: últimos ${dashPeriod === 'total' ? 'todos os registros' : dashPeriod} — ${vendasData.orders.length} pedido(s). Gerado em ${new Date().toLocaleString('pt-BR')}.</p>
      <table>
        <thead><tr><th>Data/Hora do pedido</th><th>Cliente</th><th>Telefone</th><th>Produtos</th><th>Forma de pagamento</th><th>Bairro</th><th>Endereço</th><th>Total</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8">Nenhum pedido no período</td></tr>'}</tbody>
      </table>
      <p style="font-size:10px; color:#777;">Data/Hora se refere ao momento em que o pedido foi criado (o sistema ainda não guarda o horário exato da confirmação do pagamento separadamente).</p>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    win.document.close();
  }

  function heatmapHtml(heatmap) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const max = Math.max(1, ...heatmap.flat());
    let html = '<div class="heatmap-wrap"><table class="heatmap-table"><thead><tr><th></th>';
    for (let h = 0; h < 24; h += 2) html += `<th colspan="2">${h}h</th>`;
    html += '</tr></thead><tbody>';
    dias.forEach((label, dayIdx) => {
      html += `<tr><td class="heatmap-daylabel">${label}</td>`;
      for (let h = 0; h < 24; h++) {
        const v = heatmap[dayIdx][h];
        const alpha = v ? 0.15 + 0.85 * (v / max) : 0.04;
        html += `<td class="heatmap-cell" style="background:rgba(255,122,26,${alpha.toFixed(2)});" title="${label} ${h}h — ${v} pedido(s)"></td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    return html;
  }

  function renderVendasTab(container) {
    const d = computeVendasData();
    const paymentLabels = Object.keys(d.byPayment);
    const paymentTotals = paymentLabels.map(k => d.byPayment[k].total);

    container.innerHTML = `
      <div class="dash-kpi-row">
        <div class="dash-kpi"><span class="dash-kpi__label">Faturamento no período</span><span class="dash-kpi__value">${formatBRL(d.faturamento)}</span></div>
        <div class="dash-kpi"><span class="dash-kpi__label">Ticket médio</span><span class="dash-kpi__value">${formatBRL(d.ticketMedio)}</span></div>
        <div class="dash-kpi"><span class="dash-kpi__label">Pedidos no período</span><span class="dash-kpi__value">${d.totalPedidos}</span></div>
        <div class="dash-kpi"><span class="dash-kpi__label">Taxa de cancelamento</span><span class="dash-kpi__value">${d.taxaCancelamento.toFixed(1)}% <span class="muted" style="font-size:0.6em;">(${d.cancelCount})</span></span></div>
      </div>

      <div class="dash-grid-2">
        <div class="card dash-card">
          <h3>Faturamento por forma de pagamento</h3>
          <canvas id="chartPaymentRevenue" height="220"></canvas>
        </div>
        <div class="card dash-card">
          <h3>Ticket médio por forma de pagamento</h3>
          <table class="dash-table">
            <thead><tr><th>Forma</th><th>Pedidos</th><th>Ticket médio</th></tr></thead>
            <tbody>${paymentLabels.map(k => `<tr><td>${escapeHtml(k)}</td><td>${d.byPayment[k].count}</td><td>${formatBRL(d.byPayment[k].total / d.byPayment[k].count)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Sem pedidos no período</td></tr>'}</tbody>
          </table>
        </div>
      </div>

      <div class="card dash-card" style="margin-top:16px;">
        <h3>Dias e horários de pico</h3>
        <p class="muted" style="margin:0 0 10px;">Quanto mais forte a cor laranja, mais pedidos chegaram naquele dia/horário.</p>
        ${heatmapHtml(d.heatmap)}
      </div>

      <div class="card dash-card" style="margin-top:16px;">
        <h3>Motivos de cancelamento</h3>
        ${Object.keys(d.motivos).length
          ? `<table class="dash-table"><thead><tr><th>Motivo</th><th>Quantidade</th></tr></thead><tbody>${Object.entries(d.motivos).sort((a, b) => b[1] - a[1]).map(([m, c]) => `<tr><td>${escapeHtml(m)}</td><td>${c}</td></tr>`).join('')}</tbody></table>`
          : `<p class="muted">Nenhum motivo registrado ainda no período — a partir de agora, todo cancelamento pede um motivo, então esse relatório vai se preenchendo com o tempo.</p>`}
      </div>
    `;

    destroyCharts();
    const ctx = document.getElementById('chartPaymentRevenue');
    if (ctx && window.Chart) {
      chartRefs.push(new window.Chart(ctx, {
        type: 'bar',
        data: { labels: paymentLabels, datasets: [{ data: paymentTotals, backgroundColor: paymentLabels.map(l => PAYMENT_COLORS[l.toLowerCase().split(' ')[0]] || '#ff7a1a') }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: v => formatBRL(v) } } } },
      }));
    }
    return d;
  }

  function exportVendasPdf(d) {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { A.showToast('Permita pop-ups pra exportar o relatório.', 'error'); return; }
    const paymentRows = Object.entries(d.byPayment).map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${v.count}</td><td>${formatBRL(v.total)}</td><td>${formatBRL(v.total / v.count)}</td></tr>`).join('');
    const motivoRows = Object.entries(d.motivos).sort((a, b) => b[1] - a[1]).map(([m, c]) => `<tr><td>${escapeHtml(m)}</td><td>${c}</td></tr>`).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório de Vendas</title>
      <style>
        body{font-family:Arial,sans-serif;color:#222;padding:24px;}
        h1{color:#b8410a;border-bottom:2px solid #ff7a1a;padding-bottom:8px;}
        table{width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;}
        th{background:#2b1a0f;color:#fff;text-align:left;padding:6px 8px;}
        td{padding:6px 8px;border-bottom:1px solid #eee;}
        .kpis{display:flex;gap:16px;margin:16px 0;}
        .kpi{border:1px solid #eee;border-radius:8px;padding:10px 16px;}
        .kpi b{display:block;font-size:20px;color:#b8410a;}
      </style></head><body>
      <h1>Relatório de Vendas — ${escapeHtml(A.settings.storeName || '')}</h1>
      <p>Período: últimos ${dashPeriod === 'total' ? 'todos os registros' : dashPeriod}. Gerado em ${new Date().toLocaleString('pt-BR')}.</p>
      <div class="kpis">
        <div class="kpi">Faturamento<b>${formatBRL(d.faturamento)}</b></div>
        <div class="kpi">Ticket médio<b>${formatBRL(d.ticketMedio)}</b></div>
        <div class="kpi">Pedidos<b>${d.totalPedidos}</b></div>
        <div class="kpi">Cancelamento<b>${d.taxaCancelamento.toFixed(1)}%</b></div>
      </div>
      <h3>Por forma de pagamento</h3>
      <table><thead><tr><th>Forma</th><th>Pedidos</th><th>Faturamento</th><th>Ticket médio</th></tr></thead><tbody>${paymentRows}</tbody></table>
      <h3>Motivos de cancelamento</h3>
      <table><thead><tr><th>Motivo</th><th>Quantidade</th></tr></thead><tbody>${motivoRows || '<tr><td colspan=2>Nenhum registrado no período</td></tr>'}</tbody></table>
      <script>window.onload=function(){window.print();}<\/script>
      </body></html>`);
    win.document.close();
  }

  A.VIEW_RENDERERS['dashboard'] = function renderDashboardView() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="tabs-row" id="dashTabs">
        <button class="tab-btn is-active" data-dtab="vendas">📈 Vendas</button>
        <button class="tab-btn" data-dtab="insumos">📦 Insumos</button>
        <button class="tab-btn" data-dtab="produtos">🍔 Produtos</button>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin:14px 0;">
        <select id="dashPeriodSelect" class="input" style="max-width:220px;">
          <option value="semana">Última semana</option>
          <option value="quinzena">Última quinzena</option>
          <option value="mes" selected>Último mês</option>
          <option value="trimestre">Último trimestre</option>
          <option value="semestre">Último semestre</option>
          <option value="ano">Último ano</option>
          <option value="total">Desde o início</option>
        </select>
        <button class="btn btn-secondary" id="dashExportBtn">📄 Exportar PDF</button>
        <button class="btn btn-secondary" id="dashExportFullBtn">📋 Relatório completo</button>
      </div>
      <div id="dashTabContent"></div>
    `;

    let lastVendasData = null;
    function renderActiveTab() {
      const active = document.querySelector('#dashTabs .tab-btn.is-active').dataset.dtab;
      const content = document.getElementById('dashTabContent');
      const exportBtn = document.getElementById('dashExportBtn');
      const exportFullBtn = document.getElementById('dashExportFullBtn');
      if (active === 'vendas') {
        lastVendasData = renderVendasTab(content);
        exportBtn.style.display = '';
        exportFullBtn.style.display = '';
      } else {
        destroyCharts();
        const nome = active === 'insumos' ? 'Insumos' : 'Produtos';
        content.innerHTML = `<div class="card dash-card"><h3>Relatório de ${nome}</h3><p class="muted">Essa aba está na próxima entrega — ainda não coletamos todo o histórico necessário pra montar esse relatório com precisão. Assim que estiver pronta, ela aparece aqui automaticamente.</p></div>`;
        exportBtn.style.display = 'none';
        exportFullBtn.style.display = 'none';
      }
    }

    document.getElementById('dashPeriodSelect').addEventListener('change', (e) => { dashPeriod = e.target.value; renderActiveTab(); });
    document.querySelectorAll('#dashTabs .tab-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('#dashTabs .tab-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      renderActiveTab();
    }));
    document.getElementById('dashExportBtn').addEventListener('click', () => { if (lastVendasData) exportVendasPdf(lastVendasData); });
    document.getElementById('dashExportFullBtn').addEventListener('click', () => { if (lastVendasData) exportRelatorioCompletoPdf(lastVendasData); });

    renderActiveTab();
  };
})();
