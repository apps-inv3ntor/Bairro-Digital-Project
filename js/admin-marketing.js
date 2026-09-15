/* ============================================================
   BRASA BURGER CO. — ADMIN — Marketing (Cupons, Áreas, Banners)
   ============================================================ */
(function () {
  'use strict';
  const A = window.__brasaAdmin;
  const { formatBRL, escapeHtml, uid, showToast, persist, openBackdrop } = A;
  const showConfirm = window.__brasaShowConfirm;
  function toggleErr(inputId, errId, hasError) {
    document.getElementById(inputId).classList.toggle('field-error', hasError);
    document.getElementById(errId).classList.toggle('is-visible', hasError);
  }

  /* ============================================================
     CUPONS
     ============================================================ */
  A.VIEW_RENDERERS['cupons'] = function renderCoupons() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar"><p class="muted">Cupons de desconto disponíveis no checkout do site.</p><button class="btn btn-primary" id="newCouponBtn" style="margin-left:auto;">+ Novo cupom</button></div>
      <div class="card table-wrap">
        <table class="data-table">
          <thead><tr><th>Código</th><th>Desconto</th><th>Pedido mínimo</th><th>Usos</th><th>Validade</th><th>Status</th><th></th></tr></thead>
          <tbody id="couponsTbody"></tbody>
        </table>
      </div>`;
    document.getElementById('newCouponBtn').addEventListener('click', () => openCouponModal(null));
    renderCouponsTable();
  };

  function couponValueLabel(c) {
    if (c.type === 'percent') return `${c.value}% OFF`;
    if (c.type === 'fixed') return formatBRL(c.value) + ' OFF';
    return 'Frete grátis';
  }

  function renderCouponsTable() {
    const tbody = document.getElementById('couponsTbody');
    if (!tbody) return;
    if (!A.coupons.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="ic">🏷️</div><h3>Nenhum cupom cadastrado</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = A.coupons.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.code)}</strong></td>
        <td>${couponValueLabel(c)}</td>
        <td>${c.minOrder > 0 ? formatBRL(c.minOrder) : '—'}</td>
        <td>${c.uses}${c.limit ? ' / ' + c.limit : ''}</td>
        <td>${c.expiry ? new Date(c.expiry + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem validade'}</td>
        <td><span class="pill ${c.active ? 'pill-green' : 'pill-gray'}">${c.active ? 'Ativo' : 'Inativo'}</span></td>
        <td class="row-actions">
          <button class="icon-only-btn" data-edit-coupon="${escapeHtml(c.code)}" title="Editar">✏️</button>
          <button class="icon-only-btn" data-del-coupon="${escapeHtml(c.code)}" title="Excluir">🗑️</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-edit-coupon]').forEach(b => b.addEventListener('click', () => openCouponModal(b.dataset.editCoupon)));
    tbody.querySelectorAll('[data-del-coupon]').forEach(b => b.addEventListener('click', () => {
      const c = A.coupons.find(x => x.code === b.dataset.delCoupon);
      showConfirm({
        icon: '🗑️', title: `Excluir cupom "${c.code}"?`, text: 'Esse cupom deixará de funcionar no checkout imediatamente.',
        confirmLabel: 'Excluir', onConfirm: async () => {
          A.coupons = A.coupons.filter(x => x.code !== c.code);
          persist('admin_coupons', A.coupons);
          renderCouponsTable();
          const sync = window.__brasaCatalogSync;
          if (sync) {
            const res = await sync.deleteCouponRemote(c.code);
            if (!res.ok) { showToast('Excluído localmente, mas falhou ao apagar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
          }
          showToast('Cupom excluído');
        },
      });
    }));
  }

  function openCouponModal(code) {
    A.editingCouponCode = code;
    const c = code ? A.coupons.find(x => x.code === code) : null;
    const el = document.getElementById('adminModalContent');
    el.innerHTML = `
      <div class="modal__head"><h2>${c ? 'Editar cupom' : 'Novo cupom'}</h2><button class="icon-only-btn" id="closeCouponModal">✕</button></div>
      <div class="modal__body">
        <div class="field"><label>Código do cupom</label><input type="text" id="fCouponCode" value="${c ? escapeHtml(c.code) : ''}" placeholder="Ex: BRASA15" style="text-transform:uppercase;" ${c ? 'disabled' : ''}><div class="field-error-msg" id="errCouponCode">Use só letras, números e hífen.</div></div>
        <div class="field-row">
          <div class="field"><label>Tipo de desconto</label>
            <select id="fCouponType">
              <option value="percent" ${c && c.type === 'percent' ? 'selected' : ''}>Percentual (%)</option>
              <option value="fixed" ${c && c.type === 'fixed' ? 'selected' : ''}>Valor fixo (R$)</option>
              <option value="freeshipping" ${c && c.type === 'freeshipping' ? 'selected' : ''}>Frete grátis</option>
            </select>
          </div>
          <div class="field" id="couponValueField"><label>Valor</label><input type="number" step="0.01" min="0" id="fCouponValue" value="${c ? c.value : ''}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Pedido mínimo (R$)</label><input type="number" step="0.01" min="0" id="fCouponMinOrder" value="${c ? c.minOrder : 0}"></div>
          <div class="field"><label>Limite de usos (opcional)</label><input type="number" min="1" id="fCouponLimit" value="${c && c.limit ? c.limit : ''}" placeholder="Ilimitado"></div>
        </div>
        <div class="field"><label>Validade (opcional)</label><input type="date" id="fCouponExpiry" value="${c && c.expiry ? c.expiry : ''}"></div>
        <div class="field-inline"><span class="fi-label">Cupom ativo</span><button class="toggle ${!c || c.active ? 'is-on' : ''}" id="toggleCouponActive" type="button"></button></div>
      </div>
      <div class="modal__foot">
        <button class="btn btn-secondary" id="cancelCouponBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveCouponBtn">Salvar cupom</button>
      </div>`;

    function syncValueFieldVisibility() {
      const type = document.getElementById('fCouponType').value;
      document.getElementById('couponValueField').style.display = type === 'freeshipping' ? 'none' : 'block';
    }
    document.getElementById('fCouponType').addEventListener('change', syncValueFieldVisibility);
    syncValueFieldVisibility();

    el.querySelector('.toggle').addEventListener('click', function () { this.classList.toggle('is-on'); });
    document.getElementById('closeCouponModal').addEventListener('click', A.closeAllOverlays);
    document.getElementById('cancelCouponBtn').addEventListener('click', A.closeAllOverlays);
    document.getElementById('saveCouponBtn').addEventListener('click', async () => {
      // Só letras, números e hífen — qualquer outro caractere (aspas, &, <, > etc.) quebra os
      // atributos data-edit-coupon/data-del-coupon da tabela e faz o botão "editar" abrir o
      // cupom errado (ou um cupom "novo" em branco) da próxima vez.
      const code = document.getElementById('fCouponCode').value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
      const isDupe = !c && A.coupons.some(x => x.code === code);
      toggleErr('fCouponCode', 'errCouponCode', !code || isDupe);
      if (!code || isDupe) { if (isDupe) showToast('Já existe um cupom com esse código', 'error'); return; }
      const type = document.getElementById('fCouponType').value;
      const data = {
        type, value: type === 'freeshipping' ? 0 : parseFloat(document.getElementById('fCouponValue').value) || 0,
        minOrder: parseFloat(document.getElementById('fCouponMinOrder').value) || 0,
        limit: document.getElementById('fCouponLimit').value ? parseInt(document.getElementById('fCouponLimit').value, 10) : null,
        expiry: document.getElementById('fCouponExpiry').value || null,
        active: document.getElementById('toggleCouponActive').classList.contains('is-on'),
      };
      const sync = window.__brasaCatalogSync;
      let isNew = false;
      if (c) { Object.assign(c, data); }
      else { A.coupons.push({ code, uses: 0, ...data }); isNew = true; }
      persist('admin_coupons', A.coupons);
      A.closeAllOverlays();
      renderCouponsTable();
      if (sync) {
        // Preserva o número de usos já registrado ao editar; só começa em 0 pra cupom novo.
        // (mandar uses:0 sempre aqui zerava o contador de usos no banco toda vez que o cupom
        // era editado, mesmo que ele já tivesse sido usado dezenas de vezes)
        const usesForRemote = isNew ? 0 : c.uses;
        const res = await sync.upsertCoupon(code, { code, uses: usesForRemote, ...data }, isNew);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast(isNew ? 'Cupom criado' : 'Cupom atualizado');
    });

    openBackdrop();
    document.getElementById('adminModal').classList.add('is-open');
  }

  /* ============================================================
     ÁREAS DE ENTREGA
     ============================================================ */
  A.VIEW_RENDERERS['areas'] = function renderAreas() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar"><p class="muted">Bairros atendidos, taxa de entrega e tempo estimado.</p><button class="btn btn-primary" id="newAreaBtn" style="margin-left:auto;">+ Nova área</button></div>
      <div class="card table-wrap">
        <table class="data-table">
          <thead><tr><th>Bairro</th><th>Taxa</th><th>Tempo estimado</th><th>Pedido mínimo</th><th>Status</th><th></th></tr></thead>
          <tbody id="areasTbody"></tbody>
        </table>
      </div>`;
    document.getElementById('newAreaBtn').addEventListener('click', () => openAreaModal(null));
    renderAreasTable();
  };

  function renderAreasTable() {
    const tbody = document.getElementById('areasTbody');
    if (!tbody) return;
    if (!A.areas.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ic">📍</div><h3>Nenhuma área cadastrada</h3></div></td></tr>`;
      return;
    }
    tbody.innerHTML = A.areas.map(a => `
      <tr>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        <td>${formatBRL(a.fee)}</td>
        <td>${a.etaMin}–${a.etaMax} min</td>
        <td>${formatBRL(a.minOrder)}</td>
        <td><span class="pill ${a.active ? 'pill-green' : 'pill-gray'}">${a.active ? 'Ativa' : 'Inativa'}</span></td>
        <td class="row-actions">
          <button class="icon-only-btn" data-edit-area="${a.id}" title="Editar">✏️</button>
          <button class="icon-only-btn" data-del-area="${a.id}" title="Excluir">🗑️</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('[data-edit-area]').forEach(b => b.addEventListener('click', () => openAreaModal(b.dataset.editArea)));
    tbody.querySelectorAll('[data-del-area]').forEach(b => b.addEventListener('click', () => {
      const a = A.areas.find(x => x.id === b.dataset.delArea);
      showConfirm({
        icon: '🗑️', title: `Excluir área "${a.name}"?`, text: 'Clientes desse bairro não conseguirão mais pedir entrega pelo site.',
        confirmLabel: 'Excluir', onConfirm: async () => {
          A.areas = A.areas.filter(x => x.id !== a.id);
          persist('admin_areas', A.areas);
          renderAreasTable();
          const sync = window.__brasaCatalogSync;
          if (sync) {
            const res = await sync.deleteAreaRemote(a.id);
            if (!res.ok) { showToast('Excluída localmente, mas falhou ao apagar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
          }
          showToast('Área excluída');
        },
      });
    }));
  }

  function openAreaModal(areaId) {
    A.editingAreaId = areaId;
    const a = areaId ? A.areas.find(x => x.id === areaId) : null;
    const el = document.getElementById('adminModalContent');
    el.innerHTML = `
      <div class="modal__head"><h2>${a ? 'Editar área de entrega' : 'Nova área de entrega'}</h2><button class="icon-only-btn" id="closeAreaModal">✕</button></div>
      <div class="modal__body">
        <div class="field"><label>Nome do bairro</label><input type="text" id="fAreaName" value="${a ? escapeHtml(a.name) : ''}" placeholder="Ex: Jardins"><div class="field-error-msg" id="errAreaName">Digite o nome do bairro.</div></div>
        <div class="field-row">
          <div class="field"><label>Taxa de entrega (R$)</label><input type="number" step="0.01" min="0" id="fAreaFee" value="${a ? a.fee : ''}"></div>
          <div class="field"><label>Pedido mínimo (R$)</label><input type="number" step="0.01" min="0" id="fAreaMinOrder" value="${a ? a.minOrder : 20}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Tempo mínimo (min)</label><input type="number" min="1" id="fAreaEtaMin" value="${a ? a.etaMin : 30}"></div>
          <div class="field"><label>Tempo máximo (min)</label><input type="number" min="1" id="fAreaEtaMax" value="${a ? a.etaMax : 45}"></div>
        </div>
        <div class="field-inline"><span class="fi-label">Área ativa</span><button class="toggle ${!a || a.active ? 'is-on' : ''}" id="toggleAreaActive" type="button"></button></div>
      </div>
      <div class="modal__foot">
        <button class="btn btn-secondary" id="cancelAreaBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveAreaBtn">Salvar área</button>
      </div>`;
    el.querySelector('.toggle').addEventListener('click', function () { this.classList.toggle('is-on'); });
    document.getElementById('closeAreaModal').addEventListener('click', A.closeAllOverlays);
    document.getElementById('cancelAreaBtn').addEventListener('click', A.closeAllOverlays);
    document.getElementById('saveAreaBtn').addEventListener('click', async () => {
      const name = document.getElementById('fAreaName').value.trim();
      toggleErr('fAreaName', 'errAreaName', !name);
      if (!name) return;
      const data = {
        name, fee: parseFloat(document.getElementById('fAreaFee').value) || 0,
        minOrder: parseFloat(document.getElementById('fAreaMinOrder').value) || 0,
        etaMin: parseInt(document.getElementById('fAreaEtaMin').value, 10) || 20,
        etaMax: parseInt(document.getElementById('fAreaEtaMax').value, 10) || 40,
        active: document.getElementById('toggleAreaActive').classList.contains('is-on'),
      };
      const sync = window.__brasaCatalogSync;
      let areaRef, isNew = false;
      if (a) { Object.assign(a, data); areaRef = a; }
      else { areaRef = { id: uid('area-'), ...data }; A.areas.push(areaRef); isNew = true; }
      persist('admin_areas', A.areas);
      A.closeAllOverlays();
      renderAreasTable();
      if (sync) {
        const res = await sync.upsertArea(isNew ? null : areaRef.id, areaRef);
        if (res.ok && res.newId) { areaRef.id = res.newId; persist('admin_areas', A.areas); }
        else if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast(isNew ? 'Área criada' : 'Área atualizada');
    });
    openBackdrop();
    document.getElementById('adminModal').classList.add('is-open');
  }

  /* ============================================================
     BANNERS
     ============================================================ */
  A.VIEW_RENDERERS['banners'] = function renderBanners() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="toolbar"><p class="muted">Banners promocionais exibidos no topo do site público.</p><button class="btn btn-primary" id="newBannerBtn" style="margin-left:auto;">+ Novo banner</button></div>
      <div class="product-admin-grid" id="bannersGrid"></div>`;
    document.getElementById('newBannerBtn').addEventListener('click', () => openBannerModal(null));
    renderBannersGrid();
  };

  function bannerDisplayStatus(b) {
    if (!b.active) return { label: 'Inativo', cls: 'pill-gray' };
    const today = new Date().toISOString().slice(0, 10);
    if (b.startDate && today < b.startDate) return { label: 'Agendado', cls: 'pill-orange' };
    if (b.endDate && today > b.endDate) return { label: 'Expirado', cls: 'pill-gray' };
    return { label: 'Ativo', cls: 'pill-green' };
  }
  function formatBannerPeriod(b) {
    const fmt = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null;
    const start = fmt(b.startDate), end = fmt(b.endDate);
    if (start && end) return `${start} a ${end}`;
    if (start) return `A partir de ${start}`;
    if (end) return `Até ${end}`;
    return 'Sem data definida';
  }

  function renderBannersGrid() {
    const grid = document.getElementById('bannersGrid');
    if (!grid) return;
    if (!A.banners.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic">🖼️</div><h3>Nenhum banner cadastrado</h3></div>`;
      return;
    }
    const sorted = [...A.banners].sort((a, b) => a.priority - b.priority);
    grid.innerHTML = sorted.map(b => {
      const status = bannerDisplayStatus(b);
      return `
      <div class="card product-admin-card" data-banner="${b.id}">
        <div class="pac-img ${!b.active ? 'is-inactive' : ''}">${b.mediaType === 'video' ? `<video src="${b.img}" muted playsinline preload="metadata"></video>` : `<img src="${b.img}" alt="">`}</div>
        <div class="pac-body">
          <h4 style="font-size:0.95rem;">${escapeHtml(b.title)}</h4>
          <div class="cat">${formatBannerPeriod(b)} · prioridade ${b.priority}</div>
          <div class="pac-foot"><span class="pill ${status.cls}">${status.label}</span></div>
          <div class="pac-actions">
            <button class="btn btn-secondary" data-edit-banner="${b.id}" style="flex:1; justify-content:center;">Editar</button>
            <button class="icon-only-btn" data-del-banner="${b.id}" title="Excluir">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('[data-edit-banner]').forEach(btn => btn.addEventListener('click', () => openBannerModal(btn.dataset.editBanner)));
    grid.querySelectorAll('[data-del-banner]').forEach(btn => btn.addEventListener('click', () => {
      const b = A.banners.find(x => x.id === btn.dataset.delBanner);
      showConfirm({
        icon: '🗑️', title: `Excluir banner "${b.title}"?`, text: 'Ele deixará de aparecer no site imediatamente.',
        confirmLabel: 'Excluir', onConfirm: async () => {
          A.banners = A.banners.filter(x => x.id !== b.id);
          persist('admin_banners', A.banners);
          renderBannersGrid();
          const sync = window.__brasaCatalogSync;
          if (sync) {
            const res = await sync.deleteBannerRemote(b.id);
            if (!res.ok) { showToast('Excluído localmente, mas falhou ao apagar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
          }
          showToast('Banner excluído');
        },
      });
    }));
  }

  function openBannerModal(bannerId) {
    A.editingBannerId = bannerId;
    const b = bannerId ? A.banners.find(x => x.id === bannerId) : null;
    let uploadedImg = b ? b.img : null;
    let mediaType = b ? b.mediaType : 'image';
    const initialMinutes = b ? Math.floor((b.displaySeconds || 8) / 60) : 0;
    const initialSeconds = b ? (b.displaySeconds || 8) % 60 : 8;
    const el = document.getElementById('adminModalContent');
    const previewHtml = (img, type) => type === 'video'
      ? `<video src="${img}" muted loop autoplay playsinline id="bannerPreviewImg"></video>`
      : `<img src="${img}" alt="" id="bannerPreviewImg">`;
    el.innerHTML = `
      <div class="modal__head"><h2>${b ? 'Editar banner' : 'Novo banner'}</h2><button class="icon-only-btn" id="closeBannerModal">✕</button></div>
      <div class="modal__body">
        <div class="field-inline" style="margin-bottom:12px;">
          <span class="fi-label">Tipo de mídia</span>
          <div class="segmented" id="bannerMediaTypeSeg">
            <button type="button" class="seg-btn ${mediaType === 'image' ? 'is-active' : ''}" data-media-type="image">🖼️ Imagem</button>
            <button type="button" class="seg-btn ${mediaType === 'video' ? 'is-active' : ''}" data-media-type="video">🎬 Vídeo</button>
          </div>
        </div>
        <input type="file" id="fBannerImageFile" accept="${mediaType === 'video' ? 'video/*' : 'image/*'}" style="display:none;">
        <div class="upload-zone" id="bannerUploadZone" style="cursor:pointer;">${b ? previewHtml(b.img, mediaType) : ''}<div id="bannerUploadLabel">📷 ${b ? 'Clique para trocar a mídia' : 'Clique para enviar a imagem ou vídeo do banner'}</div></div>
        <div class="field"><label>Título / chamada</label><input type="text" id="fBannerTitle" value="${b ? escapeHtml(b.title) : ''}" placeholder="Ex: Cupom especial de aniversário"><div class="field-error-msg" id="errBannerTitle">Digite o título do banner.</div></div>
        <div class="field-row">
          <div class="field"><label>Início da exibição (opcional)</label><input type="date" id="fBannerStartDate" value="${b ? b.startDate : ''}"></div>
          <div class="field"><label>Fim da exibição (opcional)</label><input type="date" id="fBannerEndDate" value="${b ? b.endDate : ''}"></div>
          <div class="field"><label>Prioridade (ordem)</label><input type="number" min="1" id="fBannerPriority" value="${b ? b.priority : A.banners.length + 1}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Duração na tela — minutos</label><input type="number" min="0" id="fBannerDurationMin" value="${initialMinutes}"></div>
          <div class="field"><label>Duração na tela — segundos</label><input type="number" min="0" max="59" id="fBannerDurationSec" value="${initialSeconds}"></div>
        </div>
        <p class="muted" style="font-size:0.8rem; margin-top:-8px;">Quanto tempo esse banner fica na tela antes do carrossel passar pro próximo (só importa se houver mais de um banner ativo ao mesmo tempo).</p>
        <div class="field"><label>Link de destino</label><input type="text" id="fBannerLink" value="${b ? b.link : '#cardapio'}" placeholder="Ex: #cardapio ou id de um produto"></div>
        <div class="field-inline"><span class="fi-label">Banner ativo</span><button class="toggle ${!b || b.active ? 'is-on' : ''}" id="toggleBannerActive" type="button"></button></div>
      </div>
      <div class="modal__foot">
        <button class="btn btn-secondary" id="cancelBannerBtn">Cancelar</button>
        <button class="btn btn-primary" id="saveBannerBtn">Salvar banner</button>
      </div>`;
    el.querySelector('.toggle').addEventListener('click', function () { this.classList.toggle('is-on'); });
    document.getElementById('closeBannerModal').addEventListener('click', A.closeAllOverlays);
    document.getElementById('cancelBannerBtn').addEventListener('click', A.closeAllOverlays);

    document.getElementById('bannerMediaTypeSeg').querySelectorAll('[data-media-type]').forEach(btn => {
      btn.addEventListener('click', () => {
        mediaType = btn.dataset.mediaType;
        document.querySelectorAll('#bannerMediaTypeSeg .seg-btn').forEach(x => x.classList.remove('is-active'));
        btn.classList.add('is-active');
        document.getElementById('fBannerImageFile').accept = mediaType === 'video' ? 'video/*' : 'image/*';
        uploadedImg = null;
        document.getElementById('bannerUploadZone').innerHTML = `<div id="bannerUploadLabel">📷 Clique para enviar ${mediaType === 'video' ? 'o vídeo' : 'a imagem'} do banner</div>`;
      });
    });

    const fileInput = document.getElementById('fBannerImageFile');
    const uploadZone = document.getElementById('bannerUploadZone');
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (!window.SUPABASE_READY) { showToast('Conecte o Supabase pra enviar mídia de verdade.', 'error'); return; }
      document.getElementById('bannerUploadLabel').textContent = 'Enviando...';
      const ext = file.name.split('.').pop();
      const path = `banners/${uid()}.${ext}`;
      const { error } = await window.sb.storage.from('public-media').upload(path, file, { upsert: true });
      if (error) {
        showToast('Falhou ao enviar a mídia: ' + error.message, 'error');
        document.getElementById('bannerUploadLabel').textContent = `📷 Clique para enviar ${mediaType === 'video' ? 'o vídeo' : 'a imagem'} do banner`;
        return;
      }
      const { data: pub } = window.sb.storage.from('public-media').getPublicUrl(path);
      uploadedImg = pub.publicUrl;
      uploadZone.innerHTML = previewHtml(uploadedImg, mediaType) + `<div>📷 Clique para trocar a mídia</div>`;
      showToast(mediaType === 'video' ? 'Vídeo enviado!' : 'Imagem enviada!');
    });

    document.getElementById('saveBannerBtn').addEventListener('click', async () => {
      const title = document.getElementById('fBannerTitle').value.trim();
      const startDate = document.getElementById('fBannerStartDate').value;
      const endDate = document.getElementById('fBannerEndDate').value;
      toggleErr('fBannerTitle', 'errBannerTitle', !title);
      if (!title) return;
      if (startDate && endDate && endDate < startDate) {
        showToast('A data de fim não pode ser antes da data de início', 'error');
        return;
      }
      const durationMin = parseInt(document.getElementById('fBannerDurationMin').value, 10) || 0;
      const durationSec = parseInt(document.getElementById('fBannerDurationSec').value, 10) || 0;
      const displaySeconds = Math.max(1, durationMin * 60 + durationSec);
      const data = {
        title, startDate, endDate, mediaType, displaySeconds,
        priority: parseInt(document.getElementById('fBannerPriority').value, 10) || 1,
        link: document.getElementById('fBannerLink').value.trim() || '#cardapio',
        active: document.getElementById('toggleBannerActive').classList.contains('is-on'),
        img: uploadedImg || 'assets/brand/hero-burger.jpg',
      };
      const sync = window.__brasaCatalogSync;
      let bannerRef, isNew = false;
      if (b) { Object.assign(b, data); bannerRef = b; }
      else { bannerRef = { id: uid('banner-'), ...data }; A.banners.push(bannerRef); isNew = true; }
      persist('admin_banners', A.banners);
      A.closeAllOverlays();
      renderBannersGrid();
      if (sync) {
        const res = await sync.upsertBanner(isNew ? null : bannerRef.id, bannerRef);
        if (res.ok && res.newId) { bannerRef.id = res.newId; persist('admin_banners', A.banners); }
        else if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast(isNew ? 'Banner criado' : 'Banner atualizado');
    });
    openBackdrop();
    document.getElementById('adminModal').classList.add('is-open');
  }
})();
