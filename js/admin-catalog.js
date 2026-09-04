/* ============================================================
   BRASA BURGER CO. — ADMIN — Catálogo (Produtos, Categorias, Adicionais)
   ============================================================ */
(function () {
  'use strict';
  const A = window.__brasaAdmin;
  const { formatBRL, escapeHtml, uid, showToast, persist, openBackdrop } = A;
  const showConfirm = window.__brasaShowConfirm;

  /* ============================================================
     PRODUTOS
     ============================================================ */
  let prodSearch = '', prodCategoryFilter = 'todas';

  A.VIEW_RENDERERS['produtos'] = function renderProducts() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar">
        <div class="toolbar__search"><span>🔍</span><input type="text" id="prodSearch" placeholder="Buscar produto ou código"></div>
        <select id="prodCategoryFilter">
          <option value="todas">Todas as categorias</option>
          ${A.categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" id="newProductBtn" style="margin-left:auto;">+ Novo produto</button>
      </div>
      <div class="product-admin-grid" id="productAdminGrid"></div>`;

    document.getElementById('prodSearch').addEventListener('input', (e) => { prodSearch = e.target.value.toLowerCase().trim(); renderProductGrid(); });
    document.getElementById('prodCategoryFilter').addEventListener('change', (e) => { prodCategoryFilter = e.target.value; renderProductGrid(); });
    document.getElementById('newProductBtn').addEventListener('click', () => openProductModal(null));

    renderProductGrid();
  };

  function renderProductGrid() {
    const grid = document.getElementById('productAdminGrid');
    if (!grid) return;
    let list = A.products.filter(p => {
      if (prodCategoryFilter !== 'todas' && p.category !== prodCategoryFilter) return false;
      if (prodSearch && !(`${p.name} ${p.code}`.toLowerCase().includes(prodSearch))) return false;
      return true;
    });
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic">🍔</div><h3>Nenhum produto encontrado</h3><p>Tente outro termo de busca ou categoria.</p></div>`;
      return;
    }
    grid.innerHTML = list.map(p => `
      <div class="card product-admin-card" data-product="${p.id}">
        <div class="pac-img ${!p.active ? 'is-inactive' : ''}">
          ${p.featured ? '<span class="pac-badge">Destaque</span>' : ''}
          ${p.soldOut ? '<span class="pac-badge soldout">Esgotado</span>' : ''}
          <img src="${p.img}" alt="${escapeHtml(p.name)}">
        </div>
        <div class="pac-body">
          <h4>${escapeHtml(p.name)}</h4>
          <div class="cat">${A.CATEGORY_NAME(p.category)} · Cód. ${p.code}</div>
          <div class="pac-foot">
            <span class="pac-price">${formatBRL(p.promoPrice || p.price)} ${p.promoPrice ? `<span style="text-decoration:line-through; color:var(--text-muted); font-size:0.78rem; font-weight:400;">${formatBRL(p.price)}</span>` : ''}</span>
            <span class="pill ${p.active ? 'pill-green' : 'pill-gray'}">${p.active ? 'Ativo' : 'Inativo'}</span>
          </div>
          <div class="pac-actions">
            <button class="btn btn-secondary" data-edit="${p.id}" style="flex:1; justify-content:center;">Editar</button>
            <button class="icon-only-btn" data-delete="${p.id}" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>`).join('');

    grid.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', (e) => { e.stopPropagation(); openProductModal(b.dataset.edit); }));
    grid.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = A.findProduct(b.dataset.delete);
      showConfirm({
        icon: '🗑️', title: `Excluir "${escapeHtml(p.name)}"?`, text: 'Esse produto será removido do cardápio permanentemente.',
        confirmLabel: 'Excluir', onConfirm: async () => {
          A.products = A.products.filter(x => x.id !== p.id);
          persist('admin_products', A.products);
          renderProductGrid();
          const sync = window.__brasaCatalogSync;
          if (sync) {
            const res = await sync.deleteProductRemote(p.id);
            if (!res.ok) { showToast('Excluído localmente, mas falhou ao apagar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
          }
          showToast('Produto excluído');
        },
      });
    }));
  }

  async function openProductModal(productId) {
    A.editingProductId = productId;
    const p = productId ? A.findProduct(productId) : null;
    const extras = p && p.extras ? JSON.parse(JSON.stringify(p.extras)) : [];
    const removeOpts = p && p.removeOptions ? [...p.removeOptions] : [];
    const sync = window.__brasaCatalogSync;
    const fichaExistente = (p && sync) ? await sync.getFichaTecnica(p.id) : [];
    const fichaItems = fichaExistente.map(f => ({ insumoId: f.insumo_id, quantidade: f.quantidade_gasta }));
    const el = document.getElementById('adminModalContent');
    el.innerHTML = `
      <div class="modal__head"><h2>${p ? 'Editar produto' : 'Novo produto'}</h2><button class="icon-only-btn" id="closeProductModal">✕</button></div>
      <div class="modal__body">
        <div class="upload-zone" id="uploadZone" style="cursor:pointer;">
          <img id="uploadPreview" src="${p ? p.img : ''}" alt="" style="${p ? '' : 'display:none;'}">
          <div id="uploadLabel">📷 ${p ? 'Clique para trocar a imagem' : 'Clique para enviar uma imagem do produto'}</div>
          <div style="font-size:0.72rem; margin-top:4px;">JPG ou PNG, recomendado 800×600px</div>
          <input type="file" id="uploadInput" accept="image/png, image/jpeg" style="display:none;">
        </div>
        <div id="uploadPendingData" data-img="${p ? p.img : ''}" style="display:none;"></div>
        <div class="field-row">
          <div class="field"><label>Nome do produto</label><input type="text" id="fName" value="${p ? escapeHtml(p.name) : ''}" placeholder="Ex: Brasa Bacon"><div class="field-error-msg" id="errName">Digite o nome do produto.</div></div>
          <div class="field"><label>Código (SKU)</label><input type="text" id="fCode" value="${p ? p.code : ''}" placeholder="Ex: HB-007"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Categoria</label><select id="fCategory">${A.categories.map(c => `<option value="${c.id}" ${p && p.category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></div>
          <div class="field"><label>Tempo de preparo (min)</label><input type="number" id="fPrepTime" min="1" value="${p ? p.prepTime : 15}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Preço (R$)</label><input type="number" step="0.01" min="0" id="fPrice" value="${p ? p.price : ''}" placeholder="0,00"><div class="field-error-msg" id="errPrice">Digite um preço válido.</div></div>
          <div class="field"><label>Preço promocional (opcional)</label><input type="number" step="0.01" min="0" id="fPromoPrice" value="${p && p.promoPrice ? p.promoPrice : ''}" placeholder="0,00"></div>
        </div>
        <div class="field"><label>Descrição / ingredientes</label><textarea id="fDesc" placeholder="Descreva os ingredientes...">${p ? escapeHtml(p.desc) : ''}</textarea></div>

        <div style="margin-top:6px;">
          <label style="display:block; font-size:0.78rem; color:var(--text-2); margin-bottom:8px;">Adicionais (com preço extra)</label>
          <div id="extrasRows"></div>
          <button class="btn-ghost" id="addExtraBtn" type="button">+ Adicionar adicional</button>
        </div>
        <div style="margin-top:18px;">
          <label style="display:block; font-size:0.78rem; color:var(--text-2); margin-bottom:8px;">Quer tirar algo? (sem custo)</label>
          <div id="removeRows"></div>
          <button class="btn-ghost" id="addRemoveBtn" type="button">+ Adicionar opção</button>
        </div>

        <div style="margin-top:18px;">
          <label style="display:block; font-size:0.78rem; color:var(--text-2); margin-bottom:8px;">Ficha técnica (insumos gastos por unidade vendida)</label>
          <div id="fichaRows"></div>
          <button class="btn-ghost" id="addFichaBtn" type="button">+ Ligar insumo</button>
          ${!(A.insumos || []).length ? '<p class="muted" style="font-size:0.78rem; margin-top:6px;">Nenhum insumo cadastrado ainda — cadastre em "Estoque" primeiro.</p>' : ''}
        </div>

        <div class="field-inline" style="margin-top:12px;"><span class="fi-label">Produto ativo no cardápio</span><button class="toggle ${!p || p.active ? 'is-on' : ''}" id="toggleActive" type="button"></button></div>
        <div class="field-inline"><span class="fi-label">Destacar como "Mais pedido"</span><button class="toggle ${p && p.featured ? 'is-on' : ''}" id="toggleFeatured" type="button"></button></div>
        <div class="field-inline"><span class="fi-label">Marcar como esgotado</span><button class="toggle ${p && p.soldOut ? 'is-on' : ''}" id="toggleSoldOut" type="button"></button></div>
      </div>
      <div class="modal__foot">
        <button class="btn btn-secondary" id="cancelProductBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveProductBtn">Salvar produto</button>
      </div>`;

    function paintExtras() {
      document.getElementById('extrasRows').innerHTML = extras.map((ex, i) => `
        <div class="field-row" style="align-items:flex-end; margin-bottom:8px;">
          <div class="field" style="margin-bottom:0;"><input type="text" data-ex-name="${i}" value="${escapeHtml(ex.name)}" placeholder="Ex: Bacon extra"></div>
          <div style="display:flex; gap:8px; align-items:flex-end;">
            <div class="field" style="margin-bottom:0; width:100px;"><input type="number" step="0.01" min="0" data-ex-price="${i}" value="${ex.price}" placeholder="Preço"></div>
            <button class="icon-only-btn" data-rm-extra="${i}" style="margin-bottom:1px;" title="Remover">🗑️</button>
          </div>
        </div>`).join('') || `<p class="muted" style="font-size:0.8rem; margin-bottom:8px;">Nenhum adicional cadastrado.</p>`;
      document.querySelectorAll('[data-ex-name]').forEach(inp => inp.addEventListener('input', () => { extras[+inp.dataset.exName].name = inp.value; }));
      document.querySelectorAll('[data-ex-price]').forEach(inp => inp.addEventListener('input', () => { extras[+inp.dataset.exPrice].price = parseFloat(inp.value) || 0; }));
      document.querySelectorAll('[data-rm-extra]').forEach(btn => btn.addEventListener('click', () => { extras.splice(+btn.dataset.rmExtra, 1); paintExtras(); }));
    }

    function paintRemoveOpts() {
      document.getElementById('removeRows').innerHTML = removeOpts.map((name, i) => `
        <div class="field-row" style="align-items:flex-end; margin-bottom:8px; grid-template-columns:1fr auto;">
          <div class="field" style="margin-bottom:0;"><input type="text" data-rem-name="${i}" value="${escapeHtml(name)}" placeholder="Ex: Sem cebola"></div>
          <button class="icon-only-btn" data-rm-remove="${i}" style="margin-bottom:1px;" title="Remover">🗑️</button>
        </div>`).join('') || `<p class="muted" style="font-size:0.8rem; margin-bottom:8px;">Nenhuma opção cadastrada.</p>`;
      document.querySelectorAll('[data-rem-name]').forEach(inp => inp.addEventListener('input', () => { removeOpts[+inp.dataset.remName] = inp.value; }));
      document.querySelectorAll('[data-rm-remove]').forEach(btn => btn.addEventListener('click', () => { removeOpts.splice(+btn.dataset.rmRemove, 1); paintRemoveOpts(); }));
    }

    function paintFicha() {
      const rows = document.getElementById('fichaRows');
      if (!rows) return;
      const insumosDisponiveis = A.insumos || [];
      rows.innerHTML = fichaItems.map((it, i) => `
        <div class="field-row" style="align-items:flex-end; margin-bottom:8px;">
          <div class="field" style="margin-bottom:0;">
            <select data-ficha-insumo="${i}">
              ${insumosDisponiveis.map(ins => `<option value="${ins.id}" ${it.insumoId === ins.id ? 'selected' : ''}>${escapeHtml(ins.nome)} (${escapeHtml(ins.unidadeMedida)})</option>`).join('')}
            </select>
          </div>
          <div style="display:flex; gap:8px; align-items:flex-end;">
            <div class="field" style="margin-bottom:0; width:100px;"><input type="number" step="0.01" min="0" data-ficha-qtd="${i}" value="${it.quantidade}" placeholder="Qtd."></div>
            <button class="icon-only-btn" data-rm-ficha="${i}" style="margin-bottom:1px;" title="Remover">🗑️</button>
          </div>
        </div>`).join('') || `<p class="muted" style="font-size:0.8rem; margin-bottom:8px;">Nenhum insumo ligado a este produto.</p>`;
      document.querySelectorAll('[data-ficha-insumo]').forEach(sel => sel.addEventListener('change', () => { fichaItems[+sel.dataset.fichaInsumo].insumoId = sel.value; }));
      document.querySelectorAll('[data-ficha-qtd]').forEach(inp => inp.addEventListener('input', () => { fichaItems[+inp.dataset.fichaQtd].quantidade = parseFloat(inp.value) || 0; }));
      document.querySelectorAll('[data-rm-ficha]').forEach(btn => btn.addEventListener('click', () => { fichaItems.splice(+btn.dataset.rmFicha, 1); paintFicha(); }));
    }

    paintExtras();
    paintRemoveOpts();
    paintFicha();
    document.getElementById('addExtraBtn').addEventListener('click', () => { extras.push({ name: '', price: 0 }); paintExtras(); });
    document.getElementById('addRemoveBtn').addEventListener('click', () => { removeOpts.push(''); paintRemoveOpts(); });
    const addFichaBtn = document.getElementById('addFichaBtn');
    if (addFichaBtn) addFichaBtn.addEventListener('click', () => {
      if (!(A.insumos || []).length) { showToast('Cadastre um insumo em "Estoque" primeiro.', 'error'); return; }
      fichaItems.push({ insumoId: A.insumos[0].id, quantidade: 1 });
      paintFicha();
    });

    document.querySelectorAll('#adminModalContent .toggle').forEach(t => t.addEventListener('click', () => t.classList.toggle('is-on')));
    document.getElementById('closeProductModal').addEventListener('click', A.closeAllOverlays);
    document.getElementById('cancelProductBtn').addEventListener('click', A.closeAllOverlays);
    document.getElementById('saveProductBtn').addEventListener('click', () => saveProduct(extras, removeOpts, fichaItems));

    const uploadZone = document.getElementById('uploadZone');
    const uploadInput = document.getElementById('uploadInput');
    uploadZone.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => {
      const file = uploadInput.files[0];
      if (!file) return;
      if (!/^image\/(png|jpeg)$/.test(file.type)) { showToast('Envie um arquivo JPG ou PNG', 'error'); return; }
      if (file.size > 3 * 1024 * 1024) { showToast('Imagem muito grande (máx. 3MB)', 'error'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById('uploadPreview').src = reader.result;
        document.getElementById('uploadPreview').style.display = 'block';
        document.getElementById('uploadLabel').textContent = '📷 Clique para trocar a imagem';
        document.getElementById('uploadPendingData').dataset.img = reader.result;
        showToast('Imagem carregada — clique em "Salvar produto" para confirmar');
      };
      reader.onerror = () => showToast('Não foi possível ler a imagem', 'error');
      reader.readAsDataURL(file);
    });

    openBackdrop();
    document.getElementById('adminModal').classList.add('is-open');
  }

  async function saveProduct(extras, removeOpts, fichaItems) {
    const name = document.getElementById('fName').value.trim();
    const price = parseFloat(document.getElementById('fPrice').value);
    let valid = true;
    toggleErr('fName', 'errName', !name); if (!name) valid = false;
    toggleErr('fPrice', 'errPrice', !price || price <= 0); if (!price || price <= 0) valid = false;
    if (!valid) return;

    const promoRaw = document.getElementById('fPromoPrice').value;
    const stagedImg = document.getElementById('uploadPendingData').dataset.img;
    const data = {
      name, price,
      promoPrice: promoRaw ? parseFloat(promoRaw) : null,
      code: document.getElementById('fCode').value.trim() || uid('SKU-').toUpperCase(),
      category: document.getElementById('fCategory').value,
      prepTime: parseInt(document.getElementById('fPrepTime').value, 10) || 15,
      desc: document.getElementById('fDesc').value.trim(),
      extras: (extras || []).filter(e => e.name.trim()),
      removeOptions: (removeOpts || []).filter(n => n.trim()),
      active: document.getElementById('toggleActive').classList.contains('is-on'),
      featured: document.getElementById('toggleFeatured').classList.contains('is-on'),
      soldOut: document.getElementById('toggleSoldOut').classList.contains('is-on'),
    };
    if (stagedImg) data.img = stagedImg;

    const sync = window.__brasaCatalogSync;
    if (A.editingProductId) {
      const p = A.findProduct(A.editingProductId);
      Object.assign(p, data);
      persist('admin_products', A.products);
      A.closeAllOverlays();
      renderProductGrid();
      if (sync) {
        const res = await sync.upsertProduct(A.editingProductId, p);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
        await sync.saveFichaTecnica(A.editingProductId, (fichaItems || []).filter(f => f.insumoId && f.quantidade > 0));
      }
      showToast('Produto atualizado');
    } else {
      const newProduct = { id: uid('prod-'), img: 'assets/products/brasa-bacon.jpg', ...data };
      A.products.push(newProduct);
      persist('admin_products', A.products);
      A.closeAllOverlays();
      renderProductGrid();
      if (sync) {
        const res = await sync.upsertProduct(null, newProduct);
        if (res.ok && res.newId) { newProduct.id = res.newId; persist('admin_products', A.products); }
        else if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
        await sync.saveFichaTecnica(newProduct.id, (fichaItems || []).filter(f => f.insumoId && f.quantidade > 0));
      }
      showToast('Produto criado');
    }
  }

  function toggleErr(inputId, errId, hasError) {
    document.getElementById(inputId).classList.toggle('field-error', hasError);
    document.getElementById(errId).classList.toggle('is-visible', hasError);
  }

  /* ============================================================
     CATEGORIAS
     ============================================================ */
  A.VIEW_RENDERERS['categorias'] = function renderCategories() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar"><p class="muted">Arraste para reordenar como aparecem no cardápio.</p><button class="btn btn-primary" id="newCategoryBtn" style="margin-left:auto;">+ Nova categoria</button></div>
      <div class="card table-wrap">
        <table class="data-table">
          <thead><tr><th></th><th>Categoria</th><th>Produtos</th><th>Status</th><th></th></tr></thead>
          <tbody id="categoriesTbody"></tbody>
        </table>
      </div>`;
    document.getElementById('newCategoryBtn').addEventListener('click', () => openCategoryModal(null));
    renderCategoriesTable();
  };

  function renderCategoriesTable() {
    const tbody = document.getElementById('categoriesTbody');
    if (!tbody) return;
    const sorted = [...A.categories].sort((a, b) => a.order - b.order);
    tbody.innerHTML = sorted.map(c => {
      const count = A.products.filter(p => p.category === c.id).length;
      return `
        <tr>
          <td class="drag-handle">⠿</td>
          <td style="display:flex; align-items:center; gap:10px;"><img src="${c.img}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;" alt=""> <strong>${escapeHtml(c.name)}</strong></td>
          <td>${count} produto${count === 1 ? '' : 's'}</td>
          <td><span class="pill ${c.active ? 'pill-green' : 'pill-gray'}">${c.active ? 'Ativa' : 'Inativa'}</span></td>
          <td class="row-actions">
            <button class="icon-only-btn" data-edit-cat="${c.id}" title="Editar">✏️</button>
            <button class="icon-only-btn" data-del-cat="${c.id}" title="Excluir">🗑️</button>
          </td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit-cat]').forEach(b => b.addEventListener('click', () => openCategoryModal(b.dataset.editCat)));
    tbody.querySelectorAll('[data-del-cat]').forEach(b => b.addEventListener('click', () => {
      const c = A.findCategory(b.dataset.delCat);
      const count = A.products.filter(p => p.category === c.id).length;
      showConfirm({
        icon: '🗑️', title: `Excluir "${c.name}"?`,
        text: count > 0 ? `Essa categoria tem ${count} produto(s) vinculado(s). Exclua ou mova os produtos antes de continuar.` : 'Essa categoria será removida permanentemente.',
        confirmLabel: 'Excluir', onConfirm: async () => {
          if (count > 0) { showToast('Não é possível excluir: categoria em uso', 'error'); return; }
          A.categories = A.categories.filter(x => x.id !== c.id);
          persist('admin_categories', A.categories);
          renderCategoriesTable();
          const sync = window.__brasaCatalogSync;
          if (sync) {
            const res = await sync.deleteCategoryRemote(c.id);
            if (!res.ok) { showToast('Excluída localmente, mas falhou ao apagar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
          }
          showToast('Categoria excluída');
        },
      });
    }));
  }

  function openCategoryModal(catId) {
    A.editingCategoryId = catId;
    const c = catId ? A.findCategory(catId) : null;
    const el = document.getElementById('adminModalContent');
    el.innerHTML = `
      <div class="modal__head"><h2>${c ? 'Editar categoria' : 'Nova categoria'}</h2><button class="icon-only-btn" id="closeCatModal">✕</button></div>
      <div class="modal__body">
        <div class="field"><label>Nome da categoria</label><input type="text" id="fCatName" value="${c ? escapeHtml(c.name) : ''}" placeholder="Ex: Sobremesas"><div class="field-error-msg" id="errCatName">Digite o nome da categoria.</div></div>
        <div class="field-inline"><span class="fi-label">Categoria ativa</span><button class="toggle ${!c || c.active ? 'is-on' : ''}" id="toggleCatActive" type="button"></button></div>
      </div>
      <div class="modal__foot">
        <button class="btn btn-secondary" id="cancelCatBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveCatBtn">Salvar categoria</button>
      </div>`;
    el.querySelector('.toggle').addEventListener('click', function () { this.classList.toggle('is-on'); });
    document.getElementById('closeCatModal').addEventListener('click', A.closeAllOverlays);
    document.getElementById('cancelCatBtn').addEventListener('click', A.closeAllOverlays);
    document.getElementById('saveCatBtn').addEventListener('click', async () => {
      const name = document.getElementById('fCatName').value.trim();
      toggleErr('fCatName', 'errCatName', !name);
      if (!name) return;
      const active = document.getElementById('toggleCatActive').classList.contains('is-on');
      const sync = window.__brasaCatalogSync;
      let catRef, isNew = false;
      if (c) { c.name = name; c.active = active; catRef = c; }
      else { catRef = { id: uid('cat-'), name, active, order: A.categories.length + 1, img: 'assets/products/brasa-bacon.jpg' }; A.categories.push(catRef); isNew = true; }
      persist('admin_categories', A.categories);
      A.closeAllOverlays();
      renderCategoriesTable();
      if (sync) {
        const res = await sync.upsertCategory(catRef.id, catRef, isNew);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast(isNew ? 'Categoria criada' : 'Categoria atualizada');
    });
    openBackdrop();
    document.getElementById('adminModal').classList.add('is-open');
  }

  /* ============================================================
     ADICIONAIS
     ============================================================ */
  A.VIEW_RENDERERS['adicionais'] = function renderAddons() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar"><p class="muted">Grupos de opções aplicados aos produtos (ponto da carne, molhos, extras...).</p><button class="btn btn-primary" id="newAddonBtn" style="margin-left:auto;">+ Novo grupo</button></div>
      <div id="addonGroupsList" style="display:flex; flex-direction:column; gap:14px;"></div>`;
    document.getElementById('newAddonBtn').addEventListener('click', () => openAddonModal(null));
    renderAddonGroups();
  };

  function renderAddonGroups() {
    const list = document.getElementById('addonGroupsList');
    if (!list) return;
    if (!A.addonGroups.length) {
      list.innerHTML = `<div class="empty-state"><div class="ic">➕</div><h3>Nenhum grupo de adicionais</h3><p>Crie grupos como "Molhos" ou "Extras" para usar nos produtos.</p></div>`;
      return;
    }
    list.innerHTML = A.addonGroups.map(g => `
      <div class="card" style="padding:18px 20px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
          <div>
            <h4 style="font-size:1rem; text-transform:none; letter-spacing:0;">${escapeHtml(g.name)}</h4>
            <p class="muted" style="font-size:0.78rem; margin-top:2px;">
              ${g.required ? 'Obrigatório' : 'Opcional'} · min ${g.min}, máx ${g.max} · usado em ${g.appliesTo || 0} produto(s)
            </p>
          </div>
          <div class="row-actions">
            <button class="icon-only-btn" data-edit-addon="${g.id}" title="Editar">✏️</button>
            <button class="icon-only-btn" data-del-addon="${g.id}" title="Excluir">🗑️</button>
          </div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${g.options.map(o => `<span class="pill pill-gray">${escapeHtml(o.name)}${o.price > 0 ? ' · +' + formatBRL(o.price) : ''}</span>`).join('')}
        </div>
      </div>`).join('');

    list.querySelectorAll('[data-edit-addon]').forEach(b => b.addEventListener('click', () => openAddonModal(b.dataset.editAddon)));
    list.querySelectorAll('[data-del-addon]').forEach(b => b.addEventListener('click', () => {
      const g = A.addonGroups.find(x => x.id === b.dataset.delAddon);
      showConfirm({
        icon: '🗑️', title: `Excluir grupo "${g.name}"?`, text: 'Produtos que usam esse grupo deixarão de exibir essas opções.',
        confirmLabel: 'Excluir', onConfirm: () => {
          A.addonGroups = A.addonGroups.filter(x => x.id !== g.id);
          persist('admin_addons', A.addonGroups);
          renderAddonGroups();
          showToast('Grupo excluído');
        },
      });
    }));
  }

  function openAddonModal(groupId) {
    A.editingAddonId = groupId;
    const g = groupId ? A.addonGroups.find(x => x.id === groupId) : null;
    const options = g ? JSON.parse(JSON.stringify(g.options)) : [{ name: '', price: 0 }];
    const el = document.getElementById('adminModalContent');

    function renderOptionsRows() {
      return options.map((o, i) => `
        <div class="field-row" data-opt-row="${i}" style="align-items:flex-end; margin-bottom:8px;">
          <div class="field" style="margin-bottom:0;"><label>${i === 0 ? 'Opção' : ''}</label><input type="text" data-opt-name="${i}" value="${escapeHtml(o.name)}" placeholder="Nome da opção"></div>
          <div style="display:flex; gap:8px; align-items:flex-end;">
            <div class="field" style="margin-bottom:0; width:110px;"><label>${i === 0 ? 'Preço extra' : ''}</label><input type="number" step="0.01" min="0" data-opt-price="${i}" value="${o.price}"></div>
            <button class="icon-only-btn" data-remove-opt="${i}" style="margin-bottom:1px;" title="Remover">🗑️</button>
          </div>
        </div>`).join('');
    }

    function paintModal() {
      el.innerHTML = `
        <div class="modal__head"><h2>${g ? 'Editar grupo' : 'Novo grupo de adicionais'}</h2><button class="icon-only-btn" id="closeAddonModal">✕</button></div>
        <div class="modal__body">
          <div class="field"><label>Nome do grupo</label><input type="text" id="fAddonName" value="${g ? escapeHtml(g.name) : ''}" placeholder="Ex: Molhos"><div class="field-error-msg" id="errAddonName">Digite o nome do grupo.</div></div>
          <div class="field-row">
            <div class="field"><label>Mínimo de seleções</label><input type="number" min="0" id="fAddonMin" value="${g ? g.min : 0}"></div>
            <div class="field"><label>Máximo de seleções</label><input type="number" min="1" id="fAddonMax" value="${g ? g.max : 1}"></div>
          </div>
          <div class="field-inline"><span class="fi-label">Obrigatório</span><button class="toggle ${g && g.required ? 'is-on' : ''}" id="toggleAddonRequired" type="button"></button></div>
          <div style="margin-top:16px;">
            <label style="display:block; font-size:0.78rem; color:var(--text-2); margin-bottom:8px;">Opções</label>
            <div id="optionsRows">${renderOptionsRows()}</div>
            <button class="btn-ghost" id="addOptionBtn" type="button">+ Adicionar opção</button>
          </div>
        </div>
        <div class="modal__foot">
          <button class="btn btn-secondary" id="cancelAddonBtn">Cancelar</button>
          <button class="btn btn-primary" id="saveAddonBtn">Salvar grupo</button>
        </div>`;

      el.querySelector('.toggle').addEventListener('click', function () { this.classList.toggle('is-on'); });
      document.getElementById('closeAddonModal').addEventListener('click', A.closeAllOverlays);
      document.getElementById('cancelAddonBtn').addEventListener('click', A.closeAllOverlays);
      document.getElementById('addOptionBtn').addEventListener('click', () => { syncOptionsFromDom(); options.push({ name: '', price: 0 }); paintModal(); });
      document.querySelectorAll('[data-remove-opt]').forEach(b => b.addEventListener('click', () => {
        syncOptionsFromDom();
        options.splice(parseInt(b.dataset.removeOpt, 10), 1);
        if (!options.length) options.push({ name: '', price: 0 });
        paintModal();
      }));
      document.getElementById('saveAddonBtn').addEventListener('click', saveAddonGroup);
    }

    function syncOptionsFromDom() {
      document.querySelectorAll('[data-opt-name]').forEach(inp => { options[parseInt(inp.dataset.optName, 10)].name = inp.value; });
      document.querySelectorAll('[data-opt-price]').forEach(inp => { options[parseInt(inp.dataset.optPrice, 10)].price = parseFloat(inp.value) || 0; });
    }

    function saveAddonGroup() {
      syncOptionsFromDom();
      const name = document.getElementById('fAddonName').value.trim();
      toggleErr('fAddonName', 'errAddonName', !name);
      if (!name) return;
      const cleanOptions = options.filter(o => o.name.trim());
      if (!cleanOptions.length) { showToast('Adicione ao menos uma opção', 'error'); return; }
      const data = {
        name, options: cleanOptions,
        min: parseInt(document.getElementById('fAddonMin').value, 10) || 0,
        max: parseInt(document.getElementById('fAddonMax').value, 10) || 1,
        required: document.getElementById('toggleAddonRequired').classList.contains('is-on'),
      };
      if (g) { Object.assign(g, data); showToast('Grupo atualizado'); }
      else { A.addonGroups.push({ id: uid('addon-'), appliesTo: 0, ...data }); showToast('Grupo criado'); }
      persist('admin_addons', A.addonGroups);
      A.closeAllOverlays();
      renderAddonGroups();
    }

    paintModal();
    openBackdrop();
    document.getElementById('adminModal').classList.add('is-open');
  }
})();
