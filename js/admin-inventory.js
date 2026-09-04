/* ============================================================
   BRASA BURGER CO. — ADMIN — Estoque Inteligente (por insumo)
   ============================================================ */
(function () {
  'use strict';
  const A = window.__brasaAdmin;
  const { escapeHtml, uid, showToast, persist, openBackdrop } = A;
  const showConfirm = window.__brasaShowConfirm;

  function pctInsumo(i) {
    return Math.max(0, Math.min(100, Math.round((i.quantidadeAtual / i.capacidadeMaxima) * 100)));
  }
  function statusInsumo(pct) {
    if (pct <= 0) return { cor: 'pill-red', texto: 'Esgotado — Comprar de Urgência!' };
    if (pct <= 20) return { cor: 'pill-red', texto: 'Mínimo 20% — Repor ASAP!' };
    if (pct < 50) return { cor: 'pill-amber', texto: 'Abaixo de 50% — Ficar Atento!' };
    if (pct < 75) return { cor: 'pill-blue', texto: 'Regular — Analisar!' };
    return { cor: 'pill-green', texto: 'Normal!' };
  }

  A.VIEW_RENDERERS['estoque'] = function renderEstoque() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar">
        <p class="muted">Controle de estoque por insumo — o produto sai da vitrine sozinho quando algum insumo dele zera.</p>
        <input type="file" id="csvImportInput" accept=".csv" style="display:none;">
        <button class="btn btn-secondary" id="importCsvBtn">📄 Importar CSV</button>
        <button class="btn btn-primary" id="newInsumoBtn">+ Novo insumo</button>
      </div>
      <div class="card table-wrap">
        <table class="data-table">
          <thead><tr><th>Insumo</th><th>Categoria</th><th>Quantidade</th><th>% Estoque</th><th>Status</th><th></th></tr></thead>
          <tbody id="insumosTbody"></tbody>
        </table>
      </div>`;
    document.getElementById('newInsumoBtn').addEventListener('click', () => openInsumoModal(null));
    document.getElementById('importCsvBtn').addEventListener('click', () => document.getElementById('csvImportInput').click());
    document.getElementById('csvImportInput').addEventListener('change', handleCsvImport);
    renderInsumosTable();
  };

  function renderInsumosTable() {
    const tbody = document.getElementById('insumosTbody');
    if (!tbody) return;
    const insumos = A.insumos || [];
    if (!insumos.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ic">📦</div><h3>Nenhum insumo cadastrado</h3><p>Cadastre manualmente ou importe uma planilha CSV.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = insumos.map(i => {
      const pct = pctInsumo(i);
      const st = statusInsumo(pct);
      return `
      <tr>
        <td><strong>${escapeHtml(i.nome)}</strong></td>
        <td class="muted">${escapeHtml(i.categoria || '—')}</td>
        <td>${i.quantidadeAtual} / ${i.capacidadeMaxima} ${escapeHtml(i.unidadeMedida)}</td>
        <td>
          <div style="width:100px; height:8px; background:var(--surface-2); border-radius:999px; overflow:hidden;">
            <div style="width:${pct}%; height:100%; background:${pct <= 20 ? 'var(--red)' : pct < 50 ? 'var(--amber)' : pct < 75 ? 'var(--blue)' : 'var(--green)'};"></div>
          </div>
          <span class="muted" style="font-size:0.76rem;">${pct}%</span>
        </td>
        <td><span class="pill ${st.cor}">${st.texto}</span></td>
        <td class="row-actions">
          <button class="icon-only-btn" data-edit-insumo="${i.id}" title="Editar">✏️</button>
          <button class="icon-only-btn" data-del-insumo="${i.id}" title="Excluir">🗑️</button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit-insumo]').forEach(b => b.addEventListener('click', () => openInsumoModal(b.dataset.editInsumo)));
    tbody.querySelectorAll('[data-del-insumo]').forEach(b => b.addEventListener('click', () => {
      const i = A.insumos.find(x => x.id === b.dataset.delInsumo);
      showConfirm({
        icon: '🗑️', title: `Excluir "${escapeHtml(i.nome)}"?`,
        text: 'Isso também remove esse insumo da ficha técnica de qualquer produto que o use.',
        confirmLabel: 'Excluir', onConfirm: async () => {
          A.insumos = A.insumos.filter(x => x.id !== i.id);
          persist('admin_insumos', A.insumos);
          renderInsumosTable();
          const sync = window.__brasaCatalogSync;
          if (sync) {
            const res = await sync.deleteInsumoRemote(i.id);
            if (!res.ok) { showToast('Excluído localmente, mas falhou ao apagar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
          }
          showToast('Insumo excluído');
        },
      });
    }));
  }

  function openInsumoModal(insumoId) {
    const i = insumoId ? A.insumos.find(x => x.id === insumoId) : null;
    const el = document.getElementById('adminModalContent');
    el.innerHTML = `
      <div class="modal__head"><h2>${i ? 'Editar insumo' : 'Novo insumo'}</h2><button class="icon-only-btn" id="closeInsumoModal">✕</button></div>
      <div class="modal__body">
        <div class="field"><label>Nome</label><input type="text" id="fInsumoNome" value="${i ? escapeHtml(i.nome) : ''}" placeholder="Ex: Pão Brioche"><div class="field-error-msg" id="errInsumoNome">Digite o nome do insumo.</div></div>
        <div class="field"><label>Categoria</label><input type="text" id="fInsumoCategoria" value="${i ? escapeHtml(i.categoria || '') : ''}" placeholder="Ex: Pães, Carnes, Embalagens"></div>
        <div class="field-row">
          <div class="field"><label>Quantidade atual</label><input type="number" min="0" step="0.01" id="fInsumoAtual" value="${i ? i.quantidadeAtual : 0}"></div>
          <div class="field"><label>Capacidade máxima</label><input type="number" min="0.01" step="0.01" id="fInsumoMaxima" value="${i ? i.capacidadeMaxima : 100}"><div class="field-error-msg" id="errInsumoMaxima">Deve ser maior que zero.</div></div>
        </div>
        <div class="field"><label>Unidade de medida</label><input type="text" id="fInsumoUnidade" value="${i ? escapeHtml(i.unidadeMedida) : 'un'}" placeholder="Ex: un, g, ml, kg"></div>
      </div>
      <div class="modal__foot">
        <button class="btn btn-secondary" id="cancelInsumoBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveInsumoBtn">Salvar insumo</button>
      </div>`;
    document.getElementById('closeInsumoModal').addEventListener('click', A.closeAllOverlays);
    document.getElementById('cancelInsumoBtn').addEventListener('click', A.closeAllOverlays);
    document.getElementById('saveInsumoBtn').addEventListener('click', async () => {
      const nome = document.getElementById('fInsumoNome').value.trim();
      const maxima = parseFloat(document.getElementById('fInsumoMaxima').value);
      const nomeErr = !nome, maxErr = !maxima || maxima <= 0;
      document.getElementById('fInsumoNome').classList.toggle('field-error', nomeErr);
      document.getElementById('errInsumoNome').classList.toggle('is-visible', nomeErr);
      document.getElementById('fInsumoMaxima').classList.toggle('field-error', maxErr);
      document.getElementById('errInsumoMaxima').classList.toggle('is-visible', maxErr);
      if (nomeErr || maxErr) return;

      const data = {
        nome, categoria: document.getElementById('fInsumoCategoria').value.trim(),
        quantidadeAtual: parseFloat(document.getElementById('fInsumoAtual').value) || 0,
        capacidadeMaxima: maxima,
        unidadeMedida: document.getElementById('fInsumoUnidade').value.trim() || 'un',
      };
      const sync = window.__brasaCatalogSync;
      let insumoRef, isNew = false;
      if (i) { Object.assign(i, data); insumoRef = i; }
      else { insumoRef = { id: uid('insumo-'), ...data }; A.insumos.push(insumoRef); isNew = true; }
      persist('admin_insumos', A.insumos);
      A.closeAllOverlays();
      renderInsumosTable();
      if (sync) {
        const res = await sync.upsertInsumo(isNew ? null : insumoRef.id, insumoRef);
        if (res.ok && res.newId) { insumoRef.id = res.newId; persist('admin_insumos', A.insumos); }
        else if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast(isNew ? 'Insumo criado' : 'Insumo atualizado');
    });
    openBackdrop();
  }

  async function handleCsvImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.SUPABASE_READY) { showToast('Conecte o Supabase pra importar de verdade.', 'error'); return; }
    const text = await file.text();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) { showToast('Arquivo vazio.', 'error'); return; }
    const header = lines[0].split(';').map(h => h.trim().toLowerCase());
    const expected = ['categoria', 'nome', 'quantidade_atual', 'capacidade_maxima', 'unidade_medida'];
    if (expected.some(h => !header.includes(h))) {
      showToast('Cabeçalho inválido. Use: categoria;nome;quantidade_atual;capacidade_maxima;unidade_medida', 'error');
      return;
    }
    const idx = Object.fromEntries(expected.map(h => [h, header.indexOf(h)]));
    const rows = lines.slice(1).map(line => {
      const cols = line.split(';');
      return {
        categoria: cols[idx.categoria]?.trim() || null,
        nome: cols[idx.nome]?.trim(),
        quantidade_atual: parseFloat(cols[idx.quantidade_atual]) || 0,
        capacidade_maxima: parseFloat(cols[idx.capacidade_maxima]) || 1,
        unidade_medida: cols[idx.unidade_medida]?.trim() || 'un',
      };
    }).filter(r => r.nome);

    if (!rows.length) { showToast('Nenhuma linha válida encontrada no CSV.', 'error'); return; }
    showToast(`Importando ${rows.length} insumos...`);
    const { error } = await window.sb.from('insumos').upsert(rows, { onConflict: 'nome' });
    if (error) { showToast('Falha na importação: ' + error.message, 'error'); return; }
    showToast('Importação concluída!');
    await window.__brasaSyncCatalogFromSupabase();
    e.target.value = '';
  }

  window.__brasaInventory = { pctInsumo, statusInsumo };
})();
