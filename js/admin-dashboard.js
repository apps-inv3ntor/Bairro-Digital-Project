/* ============================================================
   admin-dashboard.js — Dashboard Gráfico e Textual
   Abas: Vendas, Insumos e Produtos.
   Insumos/Produtos cruzam os pedidos do período com a ficha técnica
   (consumo teórico) e com o custo por unidade de cada insumo.
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

  // Cor do mapa de calor: amarelo → laranja → vermelho (quanto mais pedidos, mais quente)
  function heatColor(t) {
    const stops = [[255, 214, 10], [255, 122, 26], [229, 56, 59]];
    const x = Math.min(1, Math.max(0, t)) * 2;
    const i = Math.min(1, Math.floor(x)), f = x - i;
    const from = stops[i], to = stops[i + 1];
    return from.map((v, k) => Math.round(v + (to[k] - v) * f));
  }

  function heatmapHtml(heatmap) {
    const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diasLongos = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const max = Math.max(0, ...heatmap.flat());
    if (!max) return '<p class="muted" style="margin:0;">Ainda não há pedidos no período para mostrar os horários de pico.</p>';
    const plural = (n) => `${n} pedido${n === 1 ? '' : 's'}`;

    // Maiores movimentos (até 3), pra dar a resposta pronta sem precisar caçar no gráfico
    const slots = [];
    heatmap.forEach((row, d) => row.forEach((v, h) => { if (v > 0) slots.push({ d, h, v }); }));
    slots.sort((x, y) => y.v - x.v || x.d - y.d || x.h - y.h);
    const peak = slots.slice(0, 3).map(s => `${dias[s.d]} ${s.h}h (${plural(s.v)})`).join(' · ');

    let html = `<p class="hm-peak"><strong>Maior movimento:</strong> ${peak}</p>`;
    html += '<div class="hm-wrap"><div class="hm-grid"><div></div>';
    for (let h = 0; h < 24; h++) html += `<div class="hm-hour">${h}h</div>`;
    dias.forEach((label, dayIdx) => {
      html += `<div class="hm-day">${label}</div>`;
      for (let h = 0; h < 24; h++) {
        const v = heatmap[dayIdx][h];
        const title = `${diasLongos[dayIdx]} às ${h}h — ${plural(v)}`;
        if (!v) { html += `<div class="hm-cell is-empty" title="${title}"></div>`; continue; }
        const t = v / max;
        const [r, g, b] = heatColor(t);
        html += `<div class="hm-cell" style="background:rgb(${r},${g},${b});color:${t < 0.5 ? '#2b1a0f' : '#ffffff'};" title="${title}">${v}</div>`;
      }
    });
    html += '</div></div>';
    html += `<div class="hm-legend"><span>menos pedidos</span><div class="hm-legend__bar"></div><span>mais pedidos (máx. ${max})</span></div>`;
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
        <p class="muted" style="margin:0 0 10px;">Quanto mais quente a cor (do amarelo ao vermelho), mais pedidos chegaram naquele dia e horário.</p>
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

  /* ====================== Abas Insumos e Produtos ====================== */
  const DAY_MS = 24 * 3600000;
  const PERIOD_LABELS = { semana: 'última semana', quinzena: 'última quinzena', mes: 'último mês', trimestre: 'último trimestre', semestre: 'último semestre', ano: 'último ano', total: 'desde o início' };
  const normName = (s) => String(s || '').trim().toLowerCase();
  const fmtNum = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const fmtPct = (v) => (v === null || v === undefined ? '—' : v.toFixed(1).replace('.', ',') + '%');
  const median = (arr) => { const s = arr.slice().sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const BCG = {
    estrela:  { icon: '⭐', nome: 'Estrela', cor: '#2e7d32', dica: 'Vende muito e dá boa margem — mantenha e destaque.' },
    vaca:     { icon: '🐄', nome: 'Vaca leiteira', cor: '#1565c0', dica: 'Vende muito, mas a margem é baixa — revise preço ou custo.' },
    duvida:   { icon: '❓', nome: 'Interrogação', cor: '#e8a23d', dica: 'Boa margem, mas vende pouco — divulgue, destaque, teste promoção.' },
    abacaxi:  { icon: '🍍', nome: 'Abacaxi', cor: '#c0392b', dica: 'Vende pouco e margem baixa — reformule ou considere tirar do cardápio.' },
  };

  /* Ficha técnica de todos os produtos de uma vez (cache curto; só leitura). */
  let fichaCache = null, fichaLoadedAt = 0, fichaError = null;
  async function loadFicha(force) {
    if (fichaCache && !force && Date.now() - fichaLoadedAt < 60000) return fichaCache;
    fichaError = null;
    const map = {};
    if (window.SUPABASE_READY) {
      const { data, error } = await window.sb.from('ficha_tecnica').select('product_id, insumo_id, quantidade_gasta');
      if (error) { fichaError = error.message || 'erro desconhecido'; console.error('Dashboard: erro ao buscar ficha técnica:', error); }
      else (data || []).forEach(f => { (map[f.product_id] = map[f.product_id] || []).push({ insumoId: f.insumo_id, qtd: Number(f.quantidade_gasta) || 0 }); });
    }
    fichaCache = map;
    fichaLoadedAt = fichaError ? 0 : Date.now();
    return map;
  }

  function periodBase() {
    const all = A.orders || [];
    const days = PERIOD_DAYS[dashPeriod];
    const now = Date.now();
    const earliest = all.length ? Math.min(...all.map(o => o.createdAt)) : now;
    const cutoff = days ? now - days * DAY_MS : earliest;
    const valid = all.filter(o => o.createdAt >= cutoff && o.status !== 'cancelado');
    // Média diária usa só o tempo em que a loja realmente teve pedidos (evita diluir num "último ano" com 10 dias de dados)
    const spanDays = Math.max(1, (now - Math.max(cutoff, earliest)) / DAY_MS);
    return { valid, spanDays };
  }

  /* Vendas por produto. O item do pedido guarda o NOME do produto na hora da compra, então o cruzamento é por nome. */
  function computeProductSales(valid) {
    const products = A.products || [];
    const byId = new Map(products.map(p => [p.id, p]));
    const byName = new Map(products.map(p => [normName(p.name), p]));
    const sold = new Map();
    valid.forEach(o => (o.items || []).forEach(it => {
      // Liga pelo id do produto gravado no pedido (acompanha renomeações e separa produtos de mesmo nome).
      // Pedido antigo sem id, ou produto que não existe mais: volta a ligar pelo nome, como antes.
      const p = (it.productId && byId.get(it.productId)) || byName.get(normName(it.name));
      const key = p ? p.id : 'x:' + normName(it.name);
      const qty = Number(it.qty) || 0;
      const rev = it.lineTotal > 0 ? it.lineTotal : (it.unitPrice > 0 ? it.unitPrice * qty : (p ? (p.promoPrice || p.price) * qty : 0));
      const cur = sold.get(key) || { key, productId: p ? p.id : null, name: p ? p.name : it.name, category: p ? p.category : null, qty: 0, revenue: 0 };
      cur.qty += qty; cur.revenue += rev; sold.set(key, cur);
    }));
    return sold;
  }

  function pctOf(i) {
    const inv = window.__brasaInventory;
    if (inv && inv.pctInsumo) return inv.pctInsumo(i);
    return Math.max(0, Math.min(100, Math.round((i.quantidadeAtual / i.capacidadeMaxima) * 100)));
  }
  function bucketOf(pct) { return pct <= 0 ? 0 : pct <= 20 ? 1 : pct < 50 ? 2 : pct < 75 ? 3 : 4; }
  const BUCKETS = [
    { nome: 'Esgotado', cor: '#7f1d1d' }, { nome: 'Crítico (≤ 20%)', cor: '#c0392b' }, { nome: 'Atenção (< 50%)', cor: '#e8a23d' },
    { nome: 'Regular (< 75%)', cor: '#1565c0' }, { nome: 'Normal', cor: '#2e7d32' },
  ];

  function computeInsumosData(ficha) {
    const { valid, spanDays } = periodBase();
    const sold = computeProductSales(valid);
    const consumo = {};
    let qtyTotal = 0, qtyComFicha = 0;
    const semFicha = [];
    sold.forEach(s => {
      qtyTotal += s.qty;
      const f = s.productId && ficha[s.productId];
      if (!f || !f.length) { semFicha.push(s.name); return; }
      qtyComFicha += s.qty;
      f.forEach(x => { consumo[x.insumoId] = (consumo[x.insumoId] || 0) + s.qty * x.qtd; });
    });
    const rows = (A.insumos || []).map(i => {
      const pct = pctOf(i);
      const cons = consumo[i.id] || 0;
      const media = cons / spanDays;
      const autonomia = media > 0 ? i.quantidadeAtual / media : null;
      const custoConsumo = (i.custoUnitario !== null && i.custoUnitario !== undefined) ? cons * i.custoUnitario : null;
      return { i, pct, cons, media, autonomia, custoConsumo, bucket: bucketOf(pct) };
    });
    const buckets = [0, 0, 0, 0, 0];
    rows.forEach(r => buckets[r.bucket]++);
    const alertas = rows.filter(r => r.pct <= 20 || (r.autonomia !== null && r.autonomia < 3)).sort((a, b) => a.pct - b.pct);
    const comCusto = rows.filter(r => r.i.custoUnitario !== null && r.i.custoUnitario !== undefined).length;
    const custoTotal = rows.reduce((s, r) => s + (r.custoConsumo || 0), 0);
    const cobertura = qtyTotal ? (qtyComFicha / qtyTotal) * 100 : null;
    return { rows, buckets, alertas, comCusto, custoTotal, cobertura, semFicha, qtyTotal, spanDays };
  }

  function computeProdutosData(ficha) {
    const { valid } = periodBase();
    const sold = computeProductSales(valid);
    const insumoById = new Map((A.insumos || []).map(i => [i.id, i]));
    const catalog = (A.products || []).filter(p => p.active);
    const rows = [];
    const seen = new Set();
    const build = (p, s) => {
      const price = p ? (p.promoPrice || p.price) : null;
      let cmv = null, cmvStatus = 'semficha';
      const f = p && ficha[p.id];
      if (f && f.length) {
        let ok = true, c = 0;
        f.forEach(x => { const ins = insumoById.get(x.insumoId); if (!ins || ins.custoUnitario === null || ins.custoUnitario === undefined) ok = false; else c += x.qtd * ins.custoUnitario; });
        cmv = ok ? c : null; cmvStatus = ok ? 'ok' : 'incompleto';
      }
      const margemR = (cmv !== null && price > 0) ? price - cmv : null;
      const margemPct = margemR !== null ? (margemR / price) * 100 : null;
      const qty = s ? s.qty : 0;
      return { p, key: s ? s.key : p.id, name: p ? p.name : s.name, category: p ? p.category : null, inCatalog: !!p, qty, revenue: s ? s.revenue : 0, price, cmv, cmvStatus, margemR, margemPct, lucro: margemR !== null ? qty * margemR : null, abc: '', bcg: null };
    };
    sold.forEach(s => {
      const p = s.productId ? (A.products || []).find(x => x.id === s.productId) : null;
      rows.push(build(p, s)); if (s.productId) seen.add(s.productId);
    });
    catalog.forEach(p => { if (!seen.has(p.id)) rows.push(build(p, null)); });

    // Curva ABC pela receita
    const totalRev = rows.reduce((s, r) => s + r.revenue, 0);
    let acc = 0;
    rows.filter(r => r.revenue > 0).sort((a, b) => b.revenue - a.revenue).forEach(r => {
      r.abc = acc < totalRev * 0.8 ? 'A' : acc < totalRev * 0.95 ? 'B' : 'C';
      acc += r.revenue;
    });

    // Matriz BCG (popularidade × margem): só produtos com venda e custo completo
    const eligible = rows.filter(r => r.qty > 0 && r.margemPct !== null);
    let medX = null, medY = null;
    if (eligible.length >= 4) {
      medX = median(eligible.map(r => r.qty)); medY = median(eligible.map(r => r.margemPct));
      eligible.forEach(r => { const hx = r.qty >= medX, hy = r.margemPct >= medY; r.bcg = hx && hy ? 'estrela' : hx ? 'vaca' : hy ? 'duvida' : 'abacaxi'; });
    }
    const vendidos = rows.filter(r => r.qty > 0);
    const totalQty = vendidos.reduce((s, r) => s + r.qty, 0);
    const baseMargem = eligible.reduce((s, r) => s + r.qty * r.price, 0);
    const margemMedia = baseMargem > 0 ? (eligible.reduce((s, r) => s + r.lucro, 0) / baseMargem) * 100 : null;
    const semVenda = catalog.filter(p => !seen.has(p.id)).map(p => p.name);
    const cont = { semficha: 0, incompleto: 0 };
    vendidos.forEach(r => { if (r.cmvStatus === 'semficha') cont.semficha++; else if (r.cmvStatus === 'incompleto') cont.incompleto++; });
    return { rows, vendidos, eligible, medX, medY, totalQty, totalRev, margemMedia, semVenda, catalogCount: catalog.length, cont };
  }

  function kpi(label, value, sub) {
    return `<div class="dash-kpi"><span class="dash-kpi__label">${label}</span><span class="dash-kpi__value">${value}</span>${sub ? `<span class="muted" style="display:block;font-size:0.75rem;margin-top:4px;">${sub}</span>` : ''}</div>`;
  }
  function notCard(html) { return `<div class="card dash-card dash-note" style="margin-top:16px;">${html}</div>`; }

  function fichaWarning() {
    return fichaError ? `<div class="card dash-card" style="margin-bottom:16px;border-color:#e1533f;"><p style="margin:0;color:#c0392b;"><strong>Não foi possível carregar a ficha técnica</strong> (${escapeHtml(fichaError)}). Os números de consumo e margem abaixo ficam incompletos até a próxima atualização.</p></div>` : '';
  }

  /* ---------------- Aba Insumos ---------------- */
  function renderInsumosTab(container, ficha) {
    const d = computeInsumosData(ficha);
    const criticos = d.buckets[0] + d.buckets[1];
    const autoRows = d.rows.filter(r => r.autonomia !== null).sort((a, b) => a.autonomia - b.autonomia).slice(0, 8);
    const consRows = d.rows.slice().sort((a, b) => b.cons - a.cons || a.i.nome.localeCompare(b.i.nome));
    const un = (r) => escapeHtml(r.i.unidadeMedida || '');
    const autoTxt = (r) => r.autonomia === null ? '<span class="muted">sem consumo</span>' : `${fmtNum(r.autonomia)} dia(s)`;

    container.innerHTML = `
      ${fichaWarning()}
      <div class="dash-kpi-row">
        ${kpi('Insumos cadastrados', String(d.rows.length))}
        ${kpi('Em nível crítico', String(criticos), `${d.buckets[0]} esgotado(s) · ${d.buckets[1]} com ≤ 20%`)}
        ${kpi('Custo dos insumos consumidos', d.comCusto ? formatBRL(d.custoTotal) : '—', d.comCusto ? `${d.comCusto} de ${d.rows.length} insumos com custo cadastrado` : 'cadastre o custo em Estoque → editar insumo')}
        ${kpi('Cobertura da ficha técnica', d.cobertura === null ? '—' : d.cobertura.toFixed(0) + '%', 'das unidades vendidas no período')}
      </div>

      <div class="dash-grid-2">
        <div class="card dash-card"><h3>Situação do estoque</h3><div style="max-width:300px;margin:0 auto;"><canvas id="chartInsumosStatus" height="220"></canvas></div></div>
        <div class="card dash-card"><h3>Menor autonomia estimada (dias)</h3>
          ${autoRows.length ? '<canvas id="chartInsumosAutonomia" height="220"></canvas>' : '<p class="muted">Sem consumo registrado no período — não dá pra estimar autonomia.</p>'}
        </div>
      </div>

      <div class="card dash-card" style="margin-top:16px;">
        <h3>🚨 Alertas de reposição</h3>
        ${d.alertas.length ? `<table class="dash-table"><thead><tr><th>Insumo</th><th>Estoque</th><th>% do máximo</th><th>Autonomia</th></tr></thead><tbody>
          ${d.alertas.map(r => `<tr><td><strong>${escapeHtml(r.i.nome)}</strong></td><td>${fmtNum(r.i.quantidadeAtual)} ${un(r)}</td><td>${r.pct}%</td><td>${autoTxt(r)}</td></tr>`).join('')}
        </tbody></table><p class="muted" style="margin:8px 0 0;font-size:0.78rem;">Entram aqui insumos com 20% ou menos do estoque máximo, ou com menos de 3 dias de autonomia no ritmo do período.</p>`
        : '<p class="muted">Nenhum insumo em alerta agora. ✅</p>'}
      </div>

      <div class="card dash-card" style="margin-top:16px;">
        <h3>Consumo por insumo — ${PERIOD_LABELS[dashPeriod]}</h3>
        ${d.rows.length ? `<div style="overflow-x:auto;"><table class="dash-table"><thead><tr><th>Insumo</th><th>Categoria</th><th>Consumo</th><th>Média/dia</th><th>Estoque atual</th><th>Autonomia</th><th>Custo consumido</th></tr></thead><tbody>
          ${consRows.map(r => `<tr><td><strong>${escapeHtml(r.i.nome)}</strong></td><td class="muted">${escapeHtml(r.i.categoria || '—')}</td><td>${fmtNum(r.cons)} ${un(r)}</td><td>${fmtNum(r.media)} ${un(r)}</td><td>${fmtNum(r.i.quantidadeAtual)} ${un(r)}</td><td>${autoTxt(r)}</td><td>${r.custoConsumo === null ? '<span class="muted">sem custo</span>' : formatBRL(r.custoConsumo)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">Nenhum insumo cadastrado.</p>'}
      </div>

      ${notCard(`<p class="muted" style="margin:0;font-size:0.8rem;"><strong>Como ler:</strong> o consumo é <em>teórico</em> — quantidade vendida × ficha técnica de cada produto (pedidos não cancelados). Adicionais e remoções escolhidos pelo cliente não entram, pois não têm ficha técnica.
        ${d.semFicha.length ? `<br><strong>Produtos vendidos sem ficha técnica</strong> (não contam no consumo): ${escapeHtml(d.semFicha.slice(0, 6).join(', '))}${d.semFicha.length > 6 ? ` e mais ${d.semFicha.length - 6}` : ''}.` : ''}
        <br>Ainda não existe histórico de preço de compra nem registro de desperdício/quebra, então esses dois indicadores não aparecem aqui.</p>`)}
    `;

    destroyCharts();
    if (window.Chart) {
      const c1 = document.getElementById('chartInsumosStatus');
      if (c1) chartRefs.push(new window.Chart(c1, {
        type: 'doughnut',
        data: { labels: BUCKETS.map((b, k) => `${b.nome}: ${d.buckets[k]}`), datasets: [{ data: d.buckets, backgroundColor: BUCKETS.map(b => b.cor) }] },
        options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } },
      }));
      const c2 = document.getElementById('chartInsumosAutonomia');
      if (c2) chartRefs.push(new window.Chart(c2, {
        type: 'bar',
        data: { labels: autoRows.map(r => r.i.nome), datasets: [{ data: autoRows.map(r => Number(r.autonomia.toFixed(1))), backgroundColor: autoRows.map(r => r.autonomia < 3 ? '#c0392b' : r.autonomia < 7 ? '#e8a23d' : '#2e7d32') }] },
        options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'dias de estoque' } } } },
      }));
    }
    return { kind: 'insumos', d };
  }

  /* ---------------- Aba Produtos ---------------- */
  const bcgPlugin = {
    id: 'bcgMedianLines',
    afterDraw(chart, _args, opts) {
      if (!opts || opts.x === undefined) return;
      const { ctx, chartArea, scales } = chart;
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
      const px = scales.x.getPixelForValue(opts.x), py = scales.y.getPixelForValue(opts.y);
      if (px >= chartArea.left && px <= chartArea.right) { ctx.beginPath(); ctx.moveTo(px, chartArea.top); ctx.lineTo(px, chartArea.bottom); ctx.stroke(); }
      if (py >= chartArea.top && py <= chartArea.bottom) { ctx.beginPath(); ctx.moveTo(chartArea.left, py); ctx.lineTo(chartArea.right, py); ctx.stroke(); }
      ctx.restore();
    },
  };

  function renderProdutosTab(container, ficha) {
    const d = computeProdutosData(ficha);
    const catName = (id) => (id && A.CATEGORY_NAME) ? A.CATEGORY_NAME(id) : '—';
    const top = d.rows.filter(r => r.revenue > 0).sort((a, b) => b.revenue - a.revenue);
    const table = d.rows.slice().sort((a, b) => b.revenue - a.revenue || b.qty - a.qty || a.name.localeCompare(b.name));
    const okCount = d.eligible.length;
    const bcgReady = d.medX !== null;

    const quadHtml = bcgReady ? Object.entries(BCG).map(([k, q]) => {
      const names = d.eligible.filter(r => r.bcg === k).map(r => escapeHtml(r.name));
      return `<div class="dash-quad" style="border-left:4px solid ${q.cor};"><strong>${q.icon} ${q.nome} (${names.length})</strong><span class="muted" style="display:block;font-size:0.78rem;margin:2px 0 4px;">${q.dica}</span><span style="font-size:0.82rem;">${names.join(', ') || '—'}</span></div>`;
    }).join('') : '';

    const bcgMsg = `<p class="muted" style="margin:0;">Para montar a matriz é preciso ter <strong>pelo menos 4 produtos</strong> com venda no período, ficha técnica e <strong>custo cadastrado em todos os insumos</strong> da ficha. Hoje: ${okCount} de ${d.vendidos.length} produto(s) vendido(s) estão completos${d.cont.semficha ? ` · ${d.cont.semficha} sem ficha técnica` : ''}${d.cont.incompleto ? ` · ${d.cont.incompleto} com insumo sem custo` : ''}.<br>Cadastre o custo em <strong>Estoque → editar insumo</strong> (campo “Custo por unidade de medida”).</p>`;

    container.innerHTML = `
      ${fichaWarning()}
      <div class="dash-kpi-row">
        ${kpi('Unidades vendidas', fmtNum(d.totalQty))}
        ${kpi('Receita dos itens', formatBRL(d.totalRev), 'inclui adicionais')}
        ${kpi('Produtos com venda', `${d.vendidos.filter(r => r.inCatalog && r.p && r.p.active).length} de ${d.catalogCount}`, 'ativos no cardápio')}
        ${kpi('Margem média', fmtPct(d.margemMedia), okCount ? `sobre ${okCount} produto(s) com custo completo` : 'precisa do custo dos insumos')}
      </div>

      <div class="card dash-card" style="margin-top:16px;">
        <h3>Matriz BCG — popularidade × margem</h3>
        ${bcgReady ? `<canvas id="chartBcg" height="300"></canvas>
          <p class="muted" style="margin:8px 0 12px;font-size:0.78rem;">Linhas tracejadas = mediana dos produtos (${fmtNum(d.medX)} un. e ${fmtPct(d.medY)} de margem). Passe o mouse/toque nos pontos pra ver o produto.</p>
          <div class="dash-quad-grid">${quadHtml}</div>` : bcgMsg}
      </div>

      <div class="dash-grid-2">
        <div class="card dash-card"><h3>Top 8 por receita</h3>${top.length ? '<canvas id="chartTopProdutos" height="260"></canvas>' : '<p class="muted">Sem vendas no período.</p>'}</div>
        <div class="card dash-card"><h3>Sem nenhuma venda no período</h3>
          ${d.semVenda.length ? `<p class="muted" style="margin:0 0 8px;font-size:0.8rem;">Produtos ativos no cardápio que não venderam — candidatos a destaque, promoção ou revisão.</p><ul style="margin:0;padding-left:18px;font-size:0.88rem;">${d.semVenda.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : '<p class="muted">Todos os produtos ativos tiveram pelo menos uma venda. ✅</p>'}
        </div>
      </div>

      <div class="card dash-card" style="margin-top:16px;">
        <h3>Desempenho por produto — ${PERIOD_LABELS[dashPeriod]}</h3>
        <div style="overflow-x:auto;"><table class="dash-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Qtd.</th><th>Receita</th><th>ABC</th><th>Preço</th><th>Custo (CMV)</th><th>Margem</th><th>Lucro bruto est.</th><th>BCG</th></tr></thead><tbody>
          ${table.map(r => {
            const cmvTxt = r.cmv !== null ? formatBRL(r.cmv) : `<span class="muted">${r.cmvStatus === 'semficha' ? 'sem ficha' : 'insumo sem custo'}</span>`;
            const q = r.bcg ? BCG[r.bcg] : null;
            return `<tr><td><strong>${escapeHtml(r.name)}</strong>${r.inCatalog ? '' : ' <span class="muted" style="font-size:0.72rem;">(fora do cardápio)</span>'}</td><td class="muted">${escapeHtml(catName(r.category))}</td><td>${fmtNum(r.qty)}</td><td>${formatBRL(r.revenue)}</td><td>${r.abc || '—'}</td><td>${r.price !== null ? formatBRL(r.price) : '—'}</td><td>${cmvTxt}</td><td>${fmtPct(r.margemPct)}</td><td>${r.lucro !== null ? formatBRL(r.lucro) : '—'}</td><td>${q ? q.icon + ' ' + q.nome : '—'}</td></tr>`;
          }).join('') || '<tr><td colspan="10" class="muted">Sem produtos.</td></tr>'}
        </tbody></table></div>
      </div>

      ${notCard(`<p class="muted" style="margin:0;font-size:0.8rem;"><strong>Como ler:</strong> <em>CMV</em> = soma de (quantidade da ficha técnica × custo por unidade) de cada insumo do produto. <em>Margem</em> = (preço atual − CMV) ÷ preço atual, sem considerar adicionais. <em>ABC</em>: A = produtos que somam até 80% da receita, B = até 95%, C = o restante. A matriz é uma adaptação da BCG (popularidade × margem, em vez de participação × crescimento). Cada item vendido é ligado ao produto pelo código interno gravado no pedido, então renomear um produto não perde o histórico. Pedidos antigos sem esse código são ligados pelo nome; se o produto também não existir mais, aparece como “fora do cardápio”.</p>`)}
    `;

    destroyCharts();
    if (window.Chart) {
      const c1 = document.getElementById('chartBcg');
      if (c1 && bcgReady) chartRefs.push(new window.Chart(c1, {
        type: 'scatter',
        data: { datasets: Object.entries(BCG).map(([k, q]) => ({ label: `${q.icon} ${q.nome}`, backgroundColor: q.cor, pointRadius: 6, pointHoverRadius: 8, data: d.eligible.filter(r => r.bcg === k).map(r => ({ x: r.qty, y: Number(r.margemPct.toFixed(1)), name: r.name })) })) },
        options: {
          plugins: {
            legend: { position: 'bottom' },
            bcgMedianLines: { x: d.medX, y: d.medY },
            tooltip: { callbacks: { label: (ctx) => `${ctx.raw.name}: ${fmtNum(ctx.raw.x)} un. · margem ${fmtPct(ctx.raw.y)}` } },
          },
          scales: { x: { title: { display: true, text: 'Unidades vendidas' }, beginAtZero: true }, y: { title: { display: true, text: 'Margem (%)' } } },
        },
        plugins: [bcgPlugin],
      }));
      const c2 = document.getElementById('chartTopProdutos');
      if (c2) {
        const t8 = top.slice(0, 8);
        chartRefs.push(new window.Chart(c2, {
          type: 'bar',
          data: { labels: t8.map(r => r.name), datasets: [{ data: t8.map(r => Number(r.revenue.toFixed(2))), backgroundColor: '#ff7a1a' }] },
          options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { callback: v => formatBRL(v) } } } },
        }));
      }
    }
    return { kind: 'produtos', d };
  }

  /* ---------------- PDFs das novas abas (mesmo padrão dos outros relatórios) ---------------- */
  function openReport(title, bodyHtml) {
    const win = window.open('', '_blank', 'width=1000,height=750');
    if (!win) { A.showToast('Permita pop-ups pra exportar o relatório.', 'error'); return; }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#222;padding:24px;}
        h1{color:#b8410a;border-bottom:2px solid #ff7a1a;padding-bottom:8px;font-size:20px;}
        h3{margin:18px 0 4px;}
        table{width:100%;border-collapse:collapse;margin:10px 0;font-size:11px;}
        th{background:#2b1a0f;color:#fff;text-align:left;padding:6px 7px;}
        td{padding:6px 7px;border-bottom:1px solid #eee;vertical-align:top;}
        tr:nth-child(even) td{background:#faf8f6;}
        .kpis{display:flex;gap:14px;margin:14px 0;flex-wrap:wrap;}
        .kpi{border:1px solid #eee;border-radius:8px;padding:8px 14px;font-size:12px;}
        .kpi b{display:block;font-size:18px;color:#b8410a;}
        .note{font-size:10px;color:#777;margin-top:14px;}
        @media print { thead { display: table-header-group; } }
      </style></head><body>
      <h1>${escapeHtml(title)} — ${escapeHtml(A.settings.storeName || '')}</h1>
      <p>Período: ${PERIOD_LABELS[dashPeriod]}. Gerado em ${new Date().toLocaleString('pt-BR')}.</p>
      ${bodyHtml}
      <script>window.onload=function(){window.print();}<\/script></body></html>`);
    win.document.close();
  }

  function exportInsumosPdf(r) {
    const d = r.d;
    const body = `
      <div class="kpis">
        <div class="kpi">Insumos<b>${d.rows.length}</b></div>
        <div class="kpi">Em nível crítico<b>${d.buckets[0] + d.buckets[1]}</b></div>
        <div class="kpi">Custo consumido<b>${d.comCusto ? formatBRL(d.custoTotal) : '—'}</b></div>
        <div class="kpi">Cobertura da ficha<b>${d.cobertura === null ? '—' : d.cobertura.toFixed(0) + '%'}</b></div>
      </div>
      <h3>Alertas de reposição</h3>
      <table><thead><tr><th>Insumo</th><th>Estoque</th><th>% do máximo</th><th>Autonomia</th></tr></thead><tbody>
        ${d.alertas.map(x => `<tr><td>${escapeHtml(x.i.nome)}</td><td>${fmtNum(x.i.quantidadeAtual)} ${escapeHtml(x.i.unidadeMedida || '')}</td><td>${x.pct}%</td><td>${x.autonomia === null ? 'sem consumo' : fmtNum(x.autonomia) + ' dia(s)'}</td></tr>`).join('') || '<tr><td colspan="4">Nenhum insumo em alerta.</td></tr>'}
      </tbody></table>
      <h3>Consumo por insumo</h3>
      <table><thead><tr><th>Insumo</th><th>Categoria</th><th>Consumo</th><th>Média/dia</th><th>Estoque atual</th><th>Autonomia</th><th>Custo consumido</th></tr></thead><tbody>
        ${d.rows.slice().sort((a, b) => b.cons - a.cons).map(x => { const u = escapeHtml(x.i.unidadeMedida || ''); return `<tr><td>${escapeHtml(x.i.nome)}</td><td>${escapeHtml(x.i.categoria || '—')}</td><td>${fmtNum(x.cons)} ${u}</td><td>${fmtNum(x.media)} ${u}</td><td>${fmtNum(x.i.quantidadeAtual)} ${u}</td><td>${x.autonomia === null ? '—' : fmtNum(x.autonomia) + ' dia(s)'}</td><td>${x.custoConsumo === null ? 'sem custo' : formatBRL(x.custoConsumo)}</td></tr>`; }).join('')}
      </tbody></table>
      <p class="note">Consumo teórico: quantidade vendida × ficha técnica (pedidos não cancelados). Adicionais e remoções não entram. Sem histórico de preço de compra nem registro de desperdício.</p>`;
    openReport('Relatório de Insumos', body);
  }

  function exportProdutosPdf(r) {
    const d = r.d;
    const catName = (id) => (id && A.CATEGORY_NAME) ? A.CATEGORY_NAME(id) : '—';
    const quad = d.medX !== null ? `<h3>Matriz BCG</h3><table><thead><tr><th>Quadrante</th><th>Produtos</th></tr></thead><tbody>${Object.entries(BCG).map(([k, q]) => `<tr><td><b>${q.nome}</b><br>${q.dica}</td><td>${d.eligible.filter(x => x.bcg === k).map(x => escapeHtml(x.name)).join(', ') || '—'}</td></tr>`).join('')}</tbody></table>` : '';
    const body = `
      <div class="kpis">
        <div class="kpi">Unidades vendidas<b>${fmtNum(d.totalQty)}</b></div>
        <div class="kpi">Receita dos itens<b>${formatBRL(d.totalRev)}</b></div>
        <div class="kpi">Margem média<b>${fmtPct(d.margemMedia)}</b></div>
      </div>
      ${quad}
      <h3>Desempenho por produto</h3>
      <table><thead><tr><th>Produto</th><th>Categoria</th><th>Qtd.</th><th>Receita</th><th>ABC</th><th>Preço</th><th>CMV</th><th>Margem</th><th>Lucro bruto est.</th><th>BCG</th></tr></thead><tbody>
        ${d.rows.slice().sort((a, b) => b.revenue - a.revenue || b.qty - a.qty).map(x => `<tr><td>${escapeHtml(x.name)}</td><td>${escapeHtml(catName(x.category))}</td><td>${fmtNum(x.qty)}</td><td>${formatBRL(x.revenue)}</td><td>${x.abc || '—'}</td><td>${x.price !== null ? formatBRL(x.price) : '—'}</td><td>${x.cmv !== null ? formatBRL(x.cmv) : (x.cmvStatus === 'semficha' ? 'sem ficha' : 'insumo sem custo')}</td><td>${fmtPct(x.margemPct)}</td><td>${x.lucro !== null ? formatBRL(x.lucro) : '—'}</td><td>${x.bcg ? BCG[x.bcg].nome : '—'}</td></tr>`).join('')}
      </tbody></table>
      <p class="note">CMV = soma (quantidade da ficha técnica × custo por unidade). Margem sem adicionais. ABC: A até 80% da receita, B até 95%, C o restante.</p>`;
    openReport('Relatório de Produtos', body);
  }

  /* ---------------- View do Dashboard ---------------- */
  let activeTabKey = 'vendas';   // lembra a aba aberta (a atualização automática não pode voltar pra Vendas)
  let renderTabFn = null;        // preenchido pela view; usado pela atualização automática
  let lastSignature = '';

  function dataSignature() {
    const os = A.orders || [];
    const st = os.map(o => o.status + (o.paymentStatus || '')).join('|');
    const ins = (A.insumos || []).map(i => `${i.id}:${i.quantidadeAtual}:${i.custoUnitario}`).join('|');
    const pr = (A.products || []).map(p => `${p.id}:${p.name}:${p.price}:${p.promoPrice}:${p.active}`).join('|');
    return `${os.length}#${st}#${ins}#${pr}#${dashPeriod}#${activeTabKey}`;
  }

  A.VIEW_RENDERERS['dashboard'] = function renderDashboardView() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="tabs-row" id="dashTabs">
        <button class="tab-btn" data-dtab="vendas">📈 Vendas</button>
        <button class="tab-btn" data-dtab="insumos">📦 Insumos</button>
        <button class="tab-btn" data-dtab="produtos">🍔 Produtos</button>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; margin:14px 0; gap:8px; flex-wrap:wrap;">
        <select id="dashPeriodSelect" class="input" style="max-width:220px;">
          <option value="semana">Última semana</option>
          <option value="quinzena">Última quinzena</option>
          <option value="mes">Último mês</option>
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
    document.getElementById('dashPeriodSelect').value = dashPeriod;
    document.querySelectorAll('#dashTabs .tab-btn').forEach(b => b.classList.toggle('is-active', b.dataset.dtab === activeTabKey));

    let lastResult = null;   // resultado da última aba renderizada (alimenta o export)
    let renderToken = 0;     // evita que uma renderização lenta sobrescreva uma mais nova

    async function renderActiveTab(silent) {
      const active = activeTabKey;
      const content = document.getElementById('dashTabContent');
      if (!content) return;
      const exportBtn = document.getElementById('dashExportBtn');
      const exportFullBtn = document.getElementById('dashExportFullBtn');
      const token = ++renderToken;
      exportFullBtn.style.display = active === 'vendas' ? '' : 'none';
      exportBtn.style.display = '';
      lastSignature = dataSignature();

      if (active === 'vendas') { lastResult = renderVendasTab(content); return; }

      if (!silent) { destroyCharts(); content.innerHTML = '<div class="card dash-card"><p class="muted">Carregando dados…</p></div>'; }
      const ficha = await loadFicha(false);
      if (token !== renderToken || !document.getElementById('dashTabContent')) return; // usuário trocou de aba/tela enquanto carregava
      lastResult = active === 'insumos' ? renderInsumosTab(content, ficha) : renderProdutosTab(content, ficha);
    }
    renderTabFn = renderActiveTab;

    document.getElementById('dashPeriodSelect').addEventListener('change', (e) => { dashPeriod = e.target.value; renderActiveTab(false); });
    document.querySelectorAll('#dashTabs .tab-btn').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('#dashTabs .tab-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      activeTabKey = btn.dataset.dtab;
      renderActiveTab(false);
    }));
    document.getElementById('dashExportBtn').addEventListener('click', () => {
      if (!lastResult) return;
      if (activeTabKey === 'vendas') exportVendasPdf(lastResult);
      else if (lastResult.kind === 'insumos') exportInsumosPdf(lastResult);
      else if (lastResult.kind === 'produtos') exportProdutosPdf(lastResult);
    });
    document.getElementById('dashExportFullBtn').addEventListener('click', () => { if (lastResult && activeTabKey === 'vendas') exportRelatorioCompletoPdf(lastResult); });

    renderActiveTab(false);
  };

  /* Chamado pelo polling de 15s (admin-sync.js): só redesenha se algo mudou de fato,
     sem animação e sem voltar ao topo da página. */
  window.__brasaDashboardRefresh = function () {
    if (A.currentView !== 'dashboard' || !renderTabFn || !document.getElementById('dashTabContent')) return;
    if (dataSignature() === lastSignature) return;
    const prevAnim = window.Chart ? window.Chart.defaults.animation : null;
    if (window.Chart) window.Chart.defaults.animation = false;
    Promise.resolve(renderTabFn(true)).finally(() => { if (window.Chart) window.Chart.defaults.animation = prevAnim; });
  };
})();
