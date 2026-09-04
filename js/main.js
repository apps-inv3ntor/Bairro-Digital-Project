/* ============================================================
   BRASA BURGER CO. — Lógica da aplicação
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Estado ---------------- */
  let cart = loadJSON('brasa_cart', []); // [{lineId, productId, qty, selections:{groupId:[optionIds]}, obs, unitPrice}]
  let appliedCoupon = loadJSON('brasa_coupon', null);
  let activeCategory = 'todos';
  let currentProduct = null; // produto aberto no modal
  let currentSelections = {};
  let currentQty = 1;
  let checkoutStep = 1;
  let checkoutData = loadJSON('brasa_checkout_draft', { nome: '', telefone: '', email: '', modo: 'entrega', area: 'centro', bairro: '', cep: '', endereco: '', referencia: '', pagamento: 'pix', troco: '', areaValidated: false, deliveryFeeOverride: null });
  let lastOrder = loadJSON('brasa_last_order', null);
  let authUser = loadJSON('brasa_auth', null); // {name, email} ou null
  let quickAccessTab = 'entrar';
  let accountModalTab = 'entrar';
  let trackFoundOrder = false;

  /* ---------------- Utilidades ---------------- */
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* silencioso */ }
  }
  function formatBRL(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  function findProduct(id) { return PRODUCTS.find(p => p.id === id); }
  function uid() { return 'l' + Math.random().toString(36).slice(2, 10); }

  function showToast(message, type) {
    const stack = document.getElementById('toastStack');
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ---------------- Cálculo de preço de item ---------------- */
  function computeUnitPrice(product, selections) {
    let total = product.price;
    const extraNames = (selections && selections.extras) || [];
    extraNames.forEach(name => {
      const ex = (product.extras || []).find(e => e.name === name);
      if (ex) total += ex.price;
    });
    return total;
  }

  function cartLineTotal(line) {
    return line.unitPrice * line.qty;
  }

  function cartSubtotal() {
    return cart.reduce((sum, l) => sum + cartLineTotal(l), 0);
  }

  function currentDeliveryFee() {
    if (checkoutData.modo === 'retirada') return 0;
    if (checkoutData.deliveryFeeOverride !== null && checkoutData.deliveryFeeOverride !== undefined) return checkoutData.deliveryFeeOverride;
    const area = DELIVERY_AREAS.find(a => a.id === checkoutData.area);
    return area ? area.fee : 0;
  }

  function discountAmount(subtotal) {
    if (!appliedCoupon) return 0;
    const coupon = COUPONS[appliedCoupon];
    if (!coupon) return 0;
    if (coupon.type === 'percent') return subtotal * (coupon.value / 100);
    return coupon.value;
  }

  /* ============================================================
     RENDER: MENU
     ============================================================ */
  function renderMenu() {
    const root = document.getElementById('menuRoot');
    let html = '';

    if (activeCategory === 'todos') {
      // Home: exatamente 3 seções, cada uma em carrossel (item 3 e 4 do briefing)
      const highlights = PRODUCTS.filter(p => p.highlight);
      const hamburgueres = PRODUCTS.filter(p => p.category === 'hamburgueres');
      const acompanhamentos = PRODUCTS.filter(p => ['combos', 'porcoes', 'bebidas', 'sobremesas'].includes(p.category));

      html += carouselSection('mais-pedidos', 'Mais pedidos', highlights);
      html += carouselSection('hamburgueres', 'Hambúrgueres', hamburgueres);
      html += carouselSection('combos-acompanhamentos', 'Combos & Acompanhamentos', acompanhamentos);
    } else if (activeCategory === 'mais-pedidos') {
      html += gridSection('mais-pedidos', 'Mais pedidos', PRODUCTS.filter(p => p.highlight));
    } else {
      const items = PRODUCTS.filter(p => p.category === activeCategory);
      html += gridSection(activeCategory, CATEGORY_LABELS[activeCategory], items);
    }

    if (!html) {
      html = `<div class="empty-state"><h3>Nenhum item nessa categoria</h3><p>Escolha outra categoria no menu acima.</p></div>`;
    }
    root.innerHTML = html;

    root.querySelectorAll('.product-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-quickadd]')) return;
        openProductModal(card.dataset.product);
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') openProductModal(card.dataset.product);
      });
    });
    root.querySelectorAll('[data-quickadd]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const product = findProduct(btn.dataset.quickadd);
        if (!product) return;
        addToCart(product, {}, 1, '');
        showToast(`${product.name} adicionado ao carrinho`);
        pulseCartIcon();
      });
    });

    bindCarouselArrows(root);
  }

  function carouselSection(id, label, items) {
    if (!items.length) return '';
    return `
      <div class="section-head" id="sec-${id}">
        <h2>${label}</h2>
        <div class="section-head__actions">
          <span class="count">${items.length} itens</span>
          <div class="carousel-arrows" data-carousel-arrows="${id}">
            <button class="carousel-arrow" data-scroll="-1" aria-label="Anterior">‹</button>
            <button class="carousel-arrow" data-scroll="1" aria-label="Próximo">›</button>
          </div>
        </div>
      </div>
      <div class="product-carousel" id="carousel-${id}">${items.map(renderCard).join('')}</div>`;
  }

  function gridSection(id, label, items) {
    if (!items.length) return '';
    return `
      <div class="section-head" id="sec-${id}"><h2>${label}</h2><span class="count">${items.length} itens</span></div>
      <div class="product-grid">${items.map(renderCard).join('')}</div>`;
  }

  function renderCard(p) {
    return `
      <article class="product-card" data-product="${p.id}" tabindex="0" role="button" aria-label="Ver ${p.name}">
        <div class="product-card__img">
          ${p.highlight ? '<span class="badge-highlight">Mais pedido</span>' : ''}
          <img src="${p.img}" alt="${p.name}" loading="lazy">
        </div>
        <div class="product-card__body">
          <h3>${p.name}</h3>
          <p>${p.desc}</p>
          <div class="product-card__footer">
            <span class="price">${formatBRL(p.price)}</span>
            <button class="add-btn" data-quickadd="${p.id}" aria-label="Adicionar ${p.name} rapidamente">+</button>
          </div>
        </div>
      </article>`;
  }

  function bindCarouselArrows(root) {
    root.querySelectorAll('[data-carousel-arrows]').forEach(group => {
      const id = group.dataset.carouselArrows;
      const track = document.getElementById(`carousel-${id}`);
      if (!track) return;
      const prevBtn = group.querySelector('[data-scroll="-1"]');
      const nextBtn = group.querySelector('[data-scroll="1"]');
      function updateArrows() {
        prevBtn.disabled = track.scrollLeft <= 4;
        nextBtn.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
      }
      function scrollByCards(dir) {
        const card = track.querySelector('.product-card');
        const cardWidth = card ? card.getBoundingClientRect().width + 18 : 260;
        track.scrollBy({ left: dir * cardWidth * 2, behavior: 'smooth' });
      }
      prevBtn.addEventListener('click', () => scrollByCards(-1));
      nextBtn.addEventListener('click', () => scrollByCards(1));
      track.addEventListener('scroll', updateArrows);
      updateArrows();
    });
  }

  function pulseCartIcon() {
    const btn = document.getElementById('openCartBtn');
    btn.style.transform = 'scale(1.15)';
    setTimeout(() => { btn.style.transform = ''; }, 180);
  }

  /* ============================================================
     MODAL DE PRODUTO
     ============================================================ */
  function openProductModal(productId) {
    currentProduct = findProduct(productId);
    currentSelections = { extras: [], remove: [] };
    currentQty = 1;
    renderProductModal();
    openOverlay('productModal');
  }

  function renderProductModal() {
    const p = currentProduct;
    const extras = p.extras || [];
    const removeOptions = p.removeOptions || [];

    let extrasHtml = '';
    if (extras.length) {
      extrasHtml = `<div class="option-group">
        <div class="option-group__head"><h4>Adicionais</h4><span class="option-group__hint">Opcional</span></div>
        ${extras.map((ex, i) => `
          <label class="option-row">
            <span><input type="checkbox" data-extra="${i}"> ${ex.name}</span>
            <span class="opt-price">+ ${formatBRL(ex.price)}</span>
          </label>`).join('')}
      </div>`;
    }

    let removeHtml = '';
    if (removeOptions.length) {
      removeHtml = `<div class="option-group">
        <div class="option-group__head"><h4>Quer tirar algo?</h4><span class="option-group__hint">Opcional</span></div>
        ${removeOptions.map((name, i) => `
          <label class="option-row">
            <span><input type="checkbox" data-remove="${i}"> ${name}</span>
          </label>`).join('')}
      </div>`;
    }

    document.getElementById('productModalContent').innerHTML = `
      <div class="modal__img">
        <img src="${p.img}" alt="${p.name}">
        <button class="modal__close" id="closeProductModal" aria-label="Fechar">✕</button>
      </div>
      <div class="modal__body">
        <h2>${p.name}</h2>
        <p class="ingredients">${p.ingredients}</p>
        <div class="modal__price" id="modalUnitPrice">${formatBRL(computeUnitPrice(p, currentSelections))}</div>
        ${extrasHtml}
        ${removeHtml}
        <div class="option-group">
          <div class="option-group__head"><h4>Observação</h4><span class="option-group__hint">Opcional</span></div>
          <textarea class="obs-field" id="obsField" placeholder="Ex: cortar ao meio, molho à parte..." maxlength="140"></textarea>
        </div>
        <div class="modal__footer">
          <div class="qty-control" style="padding:8px 10px;">
            <button id="qtyMinus" aria-label="Diminuir quantidade">−</button>
            <span id="qtyValue" style="min-width:18px; text-align:center;">1</span>
            <button id="qtyPlus" aria-label="Aumentar quantidade">+</button>
          </div>
          <button class="btn btn-primary" id="addToCartBtn" style="flex:1; justify-content:center;">Adicionar · ${formatBRL(computeUnitPrice(p, currentSelections))}</button>
        </div>
      </div>`;

    document.getElementById('closeProductModal').addEventListener('click', closeAllOverlays);

    document.querySelectorAll('#productModalContent [data-extra]').forEach(input => {
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.extra, 10);
        const name = extras[idx].name;
        if (input.checked) currentSelections.extras.push(name);
        else currentSelections.extras = currentSelections.extras.filter(n => n !== name);
        updateModalPrice();
      });
    });
    document.querySelectorAll('#productModalContent [data-remove]').forEach(input => {
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.remove, 10);
        const name = removeOptions[idx];
        if (input.checked) currentSelections.remove.push(name);
        else currentSelections.remove = currentSelections.remove.filter(n => n !== name);
      });
    });

    document.getElementById('qtyMinus').addEventListener('click', () => {
      if (currentQty > 1) { currentQty--; updateModalQty(); }
    });
    document.getElementById('qtyPlus').addEventListener('click', () => {
      currentQty++; updateModalQty();
    });
    document.getElementById('addToCartBtn').addEventListener('click', () => {
      const obs = document.getElementById('obsField').value.trim();
      addToCart(p, currentSelections, currentQty, obs);
      showToast(`${p.name} adicionado ao carrinho`);
      closeAllOverlays();
      pulseCartIcon();
    });
  }

  function updateModalPrice() {
    const unit = computeUnitPrice(currentProduct, currentSelections);
    document.getElementById('modalUnitPrice').textContent = formatBRL(unit);
    document.getElementById('addToCartBtn').textContent = `Adicionar · ${formatBRL(unit * currentQty)}`;
  }
  function updateModalQty() {
    document.getElementById('qtyValue').textContent = currentQty;
    updateModalPrice();
  }

  /* ============================================================
     CARRINHO
     ============================================================ */
  function addToCart(product, selections, qty, obs) {
    const unitPrice = computeUnitPrice(product, selections);
    cart.push({
      lineId: uid(),
      productId: product.id,
      qty,
      selections: JSON.parse(JSON.stringify(selections)),
      obs,
      unitPrice,
    });
    persistCart();
    renderCart();
  }

  function removeLine(lineId) {
    cart = cart.filter(l => l.lineId !== lineId);
    persistCart();
    renderCart();
  }

  function changeQty(lineId, delta) {
    const line = cart.find(l => l.lineId === lineId);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) { removeLine(lineId); return; }
    persistCart();
    renderCart();
  }

  function persistCart() { saveJSON('brasa_cart', cart); }

  function describeSelections(line) {
    if (!line.selections) return '';
    const parts = [];
    (line.selections.extras || []).forEach(name => parts.push('+ ' + name));
    (line.selections.remove || []).forEach(name => parts.push(name));
    return parts.join(', ');
  }

  function renderCart() {
    const itemsEl = document.getElementById('cartItems');
    const summaryEl = document.getElementById('cartSummary');
    const couponAreaEl = document.getElementById('couponArea');
    const countEl = document.getElementById('cartCount');
    const mobileBar = document.getElementById('mobileCartBar');
    const mobileCount = document.getElementById('mobileCartCount');
    const mobileTotal = document.getElementById('mobileCartTotal');

    renderQuickAccess();

    const totalQty = cart.reduce((s, l) => s + l.qty, 0);
    countEl.textContent = totalQty;
    countEl.hidden = totalQty === 0;
    mobileCount.textContent = totalQty;

    if (!cart.length) {
      itemsEl.innerHTML = `
        <div class="cart-empty">Sua sacola está vazia.<br>Que tal um Brasa Bacon pra começar? 🔥</div>
        <button class="btn btn-secondary" id="continueShoppingBtn" style="width:100%; justify-content:center;">← Continuar comprando</button>`;
      couponAreaEl.innerHTML = '';
      summaryEl.innerHTML = '';
      document.getElementById('inlineCheckoutArea').innerHTML = '';
      mobileBar.classList.remove('is-visible');
      document.getElementById('continueShoppingBtn').addEventListener('click', closeAllOverlays);
      return;
    }

    mobileBar.classList.add('is-visible');

    itemsEl.innerHTML = cart.map(line => {
      const product = findProduct(line.productId);
      if (!product) return ''; // item órfão (produto não existe mais) — ignora em vez de travar a página
      const desc = describeSelections(line);
      return `
        <div class="cart-item">
          <img src="${product.img}" alt="${product.name}">
          <div>
            <h4>${product.name}</h4>
            ${desc ? `<div class="obs">${escapeHtmlLite(desc)}</div>` : ''}
            ${line.obs ? `<div class="obs">Obs: ${escapeHtmlLite(line.obs)}</div>` : ''}
            <div class="qty-control">
              <button data-qty-minus="${line.lineId}" aria-label="Diminuir">−</button>
              <span>${line.qty}</span>
              <button data-qty-plus="${line.lineId}" aria-label="Aumentar">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <div class="cart-item__price">${formatBRL(cartLineTotal(line))}</div>
            <button class="remove-line" data-remove="${line.lineId}">remover</button>
          </div>
        </div>`;
    }).join('');

    itemsEl.querySelectorAll('[data-qty-minus]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.qtyMinus, -1)));
    itemsEl.querySelectorAll('[data-qty-plus]').forEach(b => b.addEventListener('click', () => changeQty(b.dataset.qtyPlus, 1)));
    itemsEl.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => removeLine(b.dataset.remove)));

    const subtotal = cartSubtotal();
    const discount = discountAmount(subtotal);
    const fee = currentDeliveryFee();
    const total = Math.max(0, subtotal - discount) + fee;
    mobileTotal.textContent = formatBRL(total);

    if (appliedCoupon) {
      couponAreaEl.innerHTML = `<div class="coupon-applied"><span>Cupom <strong>${appliedCoupon}</strong> aplicado</span><button id="removeCouponBtn">remover</button></div>`;
      document.getElementById('removeCouponBtn').addEventListener('click', () => {
        appliedCoupon = null;
        saveJSON('brasa_coupon', null);
        renderCart();
        showToast('Cupom removido');
      });
    } else {
      couponAreaEl.innerHTML = `
        <div class="coupon-row">
          <input type="text" id="couponInput" placeholder="Cupom de desconto" maxlength="20">
          <button id="applyCouponBtn">Aplicar</button>
        </div>`;
      document.getElementById('applyCouponBtn').addEventListener('click', applyCoupon);
      document.getElementById('couponInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCoupon(); });
    }

    summaryEl.innerHTML = `
      <div class="summary-row"><span>Subtotal</span><span>${formatBRL(subtotal)}</span></div>
      ${discount > 0 ? `<div class="summary-row discount"><span>Desconto</span><span>− ${formatBRL(discount)}</span></div>` : ''}
      <div class="summary-row"><span>Taxa de entrega</span><span>${fee > 0 ? formatBRL(fee) : 'A calcular'}</span></div>
      <div class="summary-row total"><span>Total</span><span>${formatBRL(total)}</span></div>
      ${subtotal < MIN_ORDER ? `<div class="checkout-locked" style="margin-top:14px;">Pedido mínimo ${formatBRL(MIN_ORDER)}</div>` : `
      <button class="btn btn-primary" id="goCheckoutBtn" style="width:100%; justify-content:center; margin-top:14px;">Finalizar pedido</button>`}`;

    const goBtn = document.getElementById('goCheckoutBtn');
    if (goBtn) {
      goBtn.addEventListener('click', () => {
        checkoutStep = 1;
        renderInlineCheckout();
        document.getElementById('inlineCheckoutBox').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    renderInlineCheckout();
  }

  function applyCoupon() {
    const input = document.getElementById('couponInput');
    const code = input.value.trim().toUpperCase();
    if (!code) return;
    if (COUPONS[code]) {
      appliedCoupon = code;
      saveJSON('brasa_coupon', code);
      renderCart();
      showToast(`Cupom ${code} aplicado — ${COUPONS[code].label}`);
    } else {
      showToast('Cupom inválido ou expirado', 'error');
    }
  }

  /* ============================================================
     ACESSO RÁPIDO (login/cadastro embutido na sacola)
     ============================================================ */
  function initials(name) {
    return (name || '').trim().split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  }

  function renderQuickAccess() {
    const area = document.getElementById('quickAccessArea');
    if (!area) return;
    area.innerHTML = ''; // removido: era decorativo, não autenticava de verdade — confundia clientes
    return;
    /* eslint-disable no-unreachable */
    if (authUser) {
      area.innerHTML = `
        <div class="quick-access-signed-in">
          <div class="who"><div class="avatar-initials">${initials(authUser.name)}</div><span>${escapeHtmlLite(authUser.name)}</span></div>
          <button id="qaLogoutBtn">Sair</button>
        </div>`;
      document.getElementById('qaLogoutBtn').addEventListener('click', () => {
        authUser = null;
        saveJSON('brasa_auth', null);
        renderQuickAccess();
        showToast('Você saiu da sua conta');
      });
      return;
    }
    area.innerHTML = `
      <div class="quick-access">
        <span class="quick-access__eyebrow">Acesso rápido</span>
        <h3 id="qaTitle">Acesse sua conta</h3>
        <div class="mode-toggle" id="qaTabs">
          <button data-qatab="entrar" class="${quickAccessTab === 'entrar' ? 'is-active' : ''}">Entrar</button>
          <button data-qatab="cadastrar" class="${quickAccessTab === 'cadastrar' ? 'is-active' : ''}">Cadastrar</button>
        </div>
        <div id="qaFormArea"></div>
      </div>`;
    document.querySelectorAll('#qaTabs [data-qatab]').forEach(b => b.addEventListener('click', () => {
      quickAccessTab = b.dataset.qatab;
      renderQuickAccess();
    }));
    renderQaForm();
  }

  function renderQaForm() {
    const wrap = document.getElementById('qaFormArea');
    const title = document.getElementById('qaTitle');
    if (quickAccessTab === 'entrar') {
      title.textContent = 'Acesse sua conta';
      wrap.innerHTML = `
        <div class="field"><label>E-mail</label><input type="email" id="qaEmail" placeholder="voce@email.com"></div>
        <div class="field"><label>Senha</label><input type="password" id="qaPass" placeholder="Sua senha"></div>
        <button class="btn btn-primary" id="qaSubmit" style="width:100%; justify-content:center;">Entrar</button>
        <p class="field-hint" style="margin-top:10px;">Use seu e-mail e senha para entrar.</p>`;
      document.getElementById('qaSubmit').addEventListener('click', () => {
        const email = document.getElementById('qaEmail').value.trim();
        if (!email.includes('@')) { showToast('Digite um e-mail válido', 'error'); return; }
        authUser = { name: email.split('@')[0], email };
        saveJSON('brasa_auth', authUser);
        renderQuickAccess();
        showToast('Login realizado com sucesso');
      });
    } else {
      title.textContent = 'Crie sua conta';
      wrap.innerHTML = `
        <div class="field"><label>Nome</label><input type="text" id="qaName" placeholder="Seu nome"></div>
        <div class="field"><label>WhatsApp</label><input type="tel" id="qaWhats" placeholder="(11) 90000-0000"></div>
        <div class="field"><label>E-mail</label><input type="email" id="qaEmail2" placeholder="voce@email.com"></div>
        <div class="field"><label>Senha</label><input type="password" id="qaPass2" placeholder="Mínimo de 10 caracteres"></div>
        <button class="btn btn-primary" id="qaSubmit2" style="width:100%; justify-content:center;">Cadastrar</button>
        <p class="field-hint" style="margin-top:10px;">Preencha nome, WhatsApp, e-mail e uma senha de 10 caracteres.</p>`;
      document.getElementById('qaSubmit2').addEventListener('click', () => {
        const name = document.getElementById('qaName').value.trim();
        const email = document.getElementById('qaEmail2').value.trim();
        const pass = document.getElementById('qaPass2').value;
        if (!name) { showToast('Digite seu nome', 'error'); return; }
        if (!email.includes('@')) { showToast('Digite um e-mail válido', 'error'); return; }
        if (pass.length < 10) { showToast('A senha precisa ter no mínimo 10 caracteres', 'error'); return; }
        authUser = { name, email };
        saveJSON('brasa_auth', authUser);
        renderQuickAccess();
        showToast('Conta criada com sucesso');
      });
    }
  }

  function escapeHtmlLite(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ============================================================
     CHECKOUT EMBUTIDO NA SACOLA (3 etapas: Pedido / Endereço / Pagamento)
     ============================================================ */
  function persistCheckoutDraft() { saveJSON('brasa_checkout_draft', checkoutData); }

  function renderInlineCheckout() {
    const area = document.getElementById('inlineCheckoutArea');
    if (!area) return;
    const subtotal = cartSubtotal();
    if (!cart.length) { area.innerHTML = ''; return; }
    if (subtotal < MIN_ORDER) {
      area.innerHTML = `<div class="inline-checkout"><div class="checkout-locked">Faltam ${formatBRL(MIN_ORDER - subtotal)} para o pedido mínimo de ${formatBRL(MIN_ORDER)}.</div></div>`;
      return;
    }
    area.innerHTML = `
      <div class="inline-checkout" id="inlineCheckoutBox">
        <span class="inline-checkout__eyebrow">Finalizar pedido</span>
        <h3>Fechar pedido</h3>
        <div class="checkout-steps">${[1, 2, 3].map(n =>
          `<div class="step ${n < checkoutStep ? 'is-done' : ''} ${n === checkoutStep ? 'is-active' : ''}"></div>`).join('')}</div>
        <div id="checkoutStepBody"></div>
      </div>`;
    renderCheckoutStepBody();
  }

  function renderCheckoutStepBody() {
    const body = document.getElementById('checkoutStepBody');
    if (!body) return;
    if (checkoutStep === 1) body.innerHTML = stepPedido();
    if (checkoutStep === 2) body.innerHTML = stepEndereco();
    if (checkoutStep === 3) body.innerHTML = stepPagamentoFinal();
    bindCheckoutEvents();
  }

  function stepPedido() {
    return `
      <div class="field">
        <label for="inpNome">Nome completo</label>
        <input type="text" id="inpNome" value="${escapeHtmlLite(checkoutData.nome)}" placeholder="Como podemos te chamar?">
        <div class="field-error-msg" id="errNome">Digite seu nome.</div>
      </div>
      <div class="field">
        <label for="inpTelefone">WhatsApp</label>
        <input type="tel" id="inpTelefone" value="${escapeHtmlLite(checkoutData.telefone)}" placeholder="(11) 90000-0000">
        <div class="field-error-msg" id="errTelefone">Digite um telefone válido.</div>
      </div>
      <div class="field">
        <label for="inpEmail">E-mail</label>
        <input type="email" id="inpEmail" value="${escapeHtmlLite(checkoutData.email)}" placeholder="voce@email.com">
        <div class="field-error-msg" id="errEmail">Digite um e-mail válido — você vai usar ele para acompanhar o pedido.</div>
      </div>
      <div class="checkout-nav" style="justify-content:flex-end;">
        <button class="btn btn-primary" id="nextStepBtn">Continuar</button>
      </div>`;
  }

  function stepEndereco() {
    const isEntrega = checkoutData.modo === 'entrega';
    return `
      <div class="mode-toggle">
        <button data-mode="entrega" class="${isEntrega ? 'is-active' : ''}">Entrega</button>
        <button data-mode="retirada" class="${!isEntrega ? 'is-active' : ''}">Retirada no balcão</button>
      </div>
      ${isEntrega ? `
        <div class="field">
          <label for="inpEndereco">Endereço completo (rua, número, complemento)</label>
          <input type="text" id="inpEndereco" value="${escapeHtmlLite(checkoutData.endereco)}" placeholder="Rua, número, complemento">
          <div class="field-error-msg" id="errEndereco">Digite o endereço de entrega.</div>
        </div>
        <div class="field-row">
          <div class="field"><label for="inpBairro">Bairro</label><input type="text" id="inpBairro" value="${escapeHtmlLite(checkoutData.bairro)}" placeholder="Ex: Centro"></div>
          <div class="field"><label for="inpCep">CEP</label><input type="text" id="inpCep" value="${escapeHtmlLite(checkoutData.cep)}" placeholder="00000-000"></div>
        </div>
        <div class="field">
          <label for="inpReferencia">Ponto de referência (opcional)</label>
          <input type="text" id="inpReferencia" value="${escapeHtmlLite(checkoutData.referencia)}" placeholder="Ex: perto da praça">
        </div>
        <button class="btn btn-secondary" id="checkAreaBtn" type="button" style="width:100%; margin-bottom:10px;">📍 Verificar disponibilidade</button>
        <div id="areaCheckResult" style="margin-bottom:14px; font-size:0.88rem;">
          ${checkoutData.areaValidated ? `<div class="checkout-locked" style="background:rgba(63,174,107,0.14); color:var(--green,#3fae6b); border-color:transparent;">✅ Atendemos sua localidade!</div>` : ''}
        </div>` : `
        <div class="field"><p style="color:var(--text-secondary); font-size:0.88rem;">Retirada em Rua das Brasas, 147 — Centro. Pronto em até 30 minutos.</p></div>`}
      <div class="checkout-nav">
        <button class="btn btn-secondary" id="prevStepBtn">Voltar</button>
        <button class="btn btn-primary" id="nextStepBtn" ${isEntrega && !checkoutData.areaValidated ? 'disabled' : ''}>Continuar</button>
      </div>`;
  }

  async function checkDeliveryAvailability() {
    const endereco = document.getElementById('inpEndereco').value.trim();
    const bairro = document.getElementById('inpBairro').value.trim();
    const cep = document.getElementById('inpCep').value.trim();
    const resultBox = document.getElementById('areaCheckResult');
    const checkBtn = document.getElementById('checkAreaBtn');
    if (!endereco || !bairro) {
      resultBox.innerHTML = `<div class="checkout-locked">Preencha o endereço e o bairro antes de verificar.</div>`;
      return;
    }
    checkoutData.endereco = endereco; checkoutData.bairro = bairro; checkoutData.cep = cep;
    checkBtn.disabled = true;
    checkBtn.textContent = 'Verificando...';
    resultBox.innerHTML = `<div class="muted">Verificando disponibilidade...</div>`;
    try {
      if (!window.SUPABASE_READY) throw new Error('offline');
      const { data, error } = await window.sb.functions.invoke('validate-delivery-address', {
        body: { street: endereco, neighborhood: bairro, cep },
      });
      if (error || !data || data.error) {
        resultBox.innerHTML = `<div class="checkout-locked">Não foi possível verificar agora. Tente novamente em instantes.</div>`;
        checkoutData.areaValidated = false;
        return;
      }
      if (data.atendido) {
        checkoutData.areaValidated = true;
        if (data.area) { checkoutData.area = data.area.id; checkoutData.deliveryFeeOverride = null; }
        else { checkoutData.area = null; checkoutData.deliveryFeeOverride = 0; }
        resultBox.innerHTML = `<div class="checkout-locked" style="background:rgba(63,174,107,0.14); color:var(--green,#3fae6b); border-color:transparent;">✅ ${data.mensagem}</div>`;
      } else {
        checkoutData.areaValidated = false;
        resultBox.innerHTML = `<div class="checkout-locked" style="background:rgba(220,60,60,0.14); color:#e15b5b; border-color:transparent;">${data.mensagem}</div>`;
      }
    } catch (e) {
      checkoutData.areaValidated = false;
      resultBox.innerHTML = `<div class="checkout-locked">Não foi possível verificar agora. Tente novamente em instantes.</div>`;
    } finally {
      checkBtn.disabled = false;
      checkBtn.textContent = '📍 Verificar disponibilidade';
      persistCheckoutDraft();
      const nextBtn = document.getElementById('nextStepBtn');
      if (nextBtn) nextBtn.disabled = !checkoutData.areaValidated;
    }
  }

  function stepPagamentoFinal() {
    const allOptions = [
      { id: 'pix', label: 'Pix na entrega/retirada' },
      { id: 'debito', label: 'Cartão de débito' },
      { id: 'credito', label: 'Cartão de crédito' },
      { id: 'dinheiro', label: 'Dinheiro' },
    ];
    const enabled = window.PAYMENTS_ENABLED || { pix: true, debito: true, credito: true, dinheiro: true };
    const options = allOptions.filter(o => enabled[o.id] !== false);
    const subtotal = cartSubtotal();
    const discount = discountAmount(subtotal);
    const fee = currentDeliveryFee();
    const total = Math.max(0, subtotal - discount) + fee;
    return `
      <div class="pay-options">
        ${options.map(o => `<label class="pay-option ${checkoutData.pagamento === o.id ? 'is-active' : ''}" data-pay="${o.id}">
          <input type="radio" name="pay" value="${o.id}" ${checkoutData.pagamento === o.id ? 'checked' : ''} style="accent-color: var(--brasa-orange);"> ${o.label}
        </label>`).join('')}
      </div>
      ${checkoutData.pagamento === 'dinheiro' ? `
        <div class="field">
          <label for="inpTroco">Precisa de troco para quanto?</label>
          <input type="text" id="inpTroco" value="${escapeHtmlLite(checkoutData.troco)}" placeholder="Ex: R$ 100,00 (deixe em branco se não precisar)">
        </div>` : ''}
      <div class="review-block" style="margin-top:16px;">
        <div class="summary-row"><span>Subtotal</span><span>${formatBRL(subtotal)}</span></div>
        ${discount > 0 ? `<div class="summary-row discount"><span>Desconto</span><span>− ${formatBRL(discount)}</span></div>` : ''}
        <div class="summary-row"><span>Taxa de entrega</span><span>${formatBRL(fee)}</span></div>
        <div class="summary-row total"><span>Total</span><span>${formatBRL(total)}</span></div>
      </div>
      <div class="checkout-nav">
        <button class="btn btn-secondary" id="prevStepBtn">Voltar</button>
        <button class="btn btn-primary" id="confirmOrderBtn">Confirmar pedido</button>
      </div>`;
  }

  function bindCheckoutEvents() {
    const prev = document.getElementById('prevStepBtn');
    const next = document.getElementById('nextStepBtn');
    const confirm = document.getElementById('confirmOrderBtn');

    if (prev) prev.addEventListener('click', () => { checkoutStep--; renderInlineCheckout(); });

    if (next) next.addEventListener('click', () => {
      if (checkoutStep === 1) {
        const nome = document.getElementById('inpNome').value.trim();
        const telefone = document.getElementById('inpTelefone').value.trim();
        const email = document.getElementById('inpEmail').value.trim();
        let valid = true;
        toggleFieldError('inpNome', 'errNome', !nome); if (!nome) valid = false;
        toggleFieldError('inpTelefone', 'errTelefone', telefone.length < 8); if (telefone.length < 8) valid = false;
        toggleFieldError('inpEmail', 'errEmail', !email.includes('@')); if (!email.includes('@')) valid = false;
        if (!valid) return;
        checkoutData.nome = nome; checkoutData.telefone = telefone; checkoutData.email = email;
      }
      if (checkoutStep === 2 && checkoutData.modo === 'entrega') {
        const endereco = document.getElementById('inpEndereco').value.trim();
        toggleFieldError('inpEndereco', 'errEndereco', !endereco);
        if (!endereco) return;
        if (!checkoutData.areaValidated) { showToast('Verifique a disponibilidade de entrega antes de continuar.', 'error'); return; }
        checkoutData.endereco = endereco;
        checkoutData.referencia = document.getElementById('inpReferencia').value.trim();
      }
      persistCheckoutDraft();
      checkoutStep++;
      renderInlineCheckout();
    });

    if (confirm) confirm.addEventListener('click', submitOrder);

    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        checkoutData.modo = btn.dataset.mode;
        if (btn.dataset.mode === 'retirada') checkoutData.areaValidated = false;
        persistCheckoutDraft();
        renderInlineCheckout();
      });
    });

    const checkAreaBtn = document.getElementById('checkAreaBtn');
    if (checkAreaBtn) checkAreaBtn.addEventListener('click', checkDeliveryAvailability);

    ['inpEndereco', 'inpBairro', 'inpCep'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => {
        if (checkoutData.areaValidated) {
          checkoutData.areaValidated = false;
          const nextBtn = document.getElementById('nextStepBtn');
          if (nextBtn) nextBtn.disabled = true;
          const resultBox = document.getElementById('areaCheckResult');
          if (resultBox) resultBox.innerHTML = `<div class="muted">Endereço alterado — verifique a disponibilidade de novo.</div>`;
        }
      });
    });

    document.querySelectorAll('[data-pay]').forEach(label => {
      label.addEventListener('click', () => {
        checkoutData.pagamento = label.dataset.pay;
        persistCheckoutDraft();
        renderCheckoutStepBody();
      });
    });
  }

  function toggleFieldError(inputId, errId, hasError) {
    document.getElementById(inputId).classList.toggle('field-error', hasError);
    document.getElementById(errId).classList.toggle('is-visible', hasError);
  }

  async function submitOrder() {
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const subtotal = cartSubtotal();
    const discount = discountAmount(subtotal);
    const fee = currentDeliveryFee();
    const total = Math.max(0, subtotal - discount) + fee;

    const usesRealPayment = window.SUPABASE_READY;

    if (!usesRealPayment) {
      // Supabase ainda não configurado: fluxo local de sempre (só pra nunca travar a demonstração)
      lastOrder = {
        code: '#' + Math.floor(1000 + Math.random() * 9000),
        items: cart.map(l => { const p = findProduct(l.productId); return { name: p ? p.name : 'Item', qty: l.qty }; }),
        total,
        createdAt: Date.now(),
        status: 'recebido',
        customer: checkoutData,
      };
      saveJSON('brasa_last_order', lastOrder);
      cart = [];
      appliedCoupon = null;
      checkoutStep = 1;
      persistCart();
      saveJSON('brasa_coupon', null);
      renderCart();
      closeAllOverlays();
      showToast('Pedido confirmado! Acompanhe abaixo.');
      trackFoundOrder = true;
      setTimeout(() => openTrackModal(), 260);
      return;
    }

    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Processando...'; }

    const payload = {
      items: cart.map(l => ({
        product_id: l.productId,
        quantity: l.qty,
        selected_extras: (l.selections && l.selections.extras) || [],
        selected_removals: (l.selections && l.selections.remove) || [],
        observation: l.obs || undefined,
      })),
      couponCode: appliedCoupon || null,
      modality: checkoutData.modo,
      deliveryAreaId: checkoutData.modo === 'entrega' ? checkoutData.area : null,
      customer: { name: checkoutData.nome, email: checkoutData.email, phone: checkoutData.telefone },
      address: checkoutData.modo === 'entrega' ? { street: checkoutData.endereco, reference: checkoutData.referencia } : undefined,
    };

    try {
      const fnName = checkoutData.pagamento === 'pix' ? 'create-pix-payment'
        : checkoutData.pagamento === 'dinheiro' ? 'create-cash-order'
        : 'create-card-payment';
      const { data, error } = await window.sb.functions.invoke(fnName, { body: payload });

      if (error || !data || data.error) {
        let detail = (data && data.error) || (error && error.message) || 'erro desconhecido';
        // Quando a função responde com erro (não-2xx), o supabase-js só dá uma mensagem
        // genérica ("non-2xx status code") — o corpo de verdade fica em error.context.
        if (error && error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            if (body && body.error) detail = body.error;
          } catch (_) { /* corpo não era JSON, mantém a mensagem genérica */ }
        }
        console.error('Erro ao gerar pagamento:', detail, error);
        showToast('Não foi possível gerar o pagamento: ' + detail, 'error');
        return;
      }

      cart = [];
      appliedCoupon = null;
      checkoutStep = 1;
      persistCart();
      saveJSON('brasa_coupon', null);
      renderCart();

      if (checkoutData.pagamento === 'pix') {
        openPixPaymentModal(data);
      } else if (checkoutData.pagamento === 'dinheiro') {
        lastOrder = { code: String(data.orderNumber), items: [], total: data.total, createdAt: Date.now(), status: 'recebido', customer: checkoutData };
        saveJSON('brasa_last_order', lastOrder);
        closeAllOverlays();
        showToast('Pedido confirmado! Pague na entrega/retirada.');
        trackFoundOrder = true;
        setTimeout(() => openTrackModal(), 260);
      } else {
        showToast('Redirecionando para o pagamento...');
        window.location.href = data.checkoutUrl;
      }
    } catch (e) {
      showToast('Erro de conexão ao gerar o pagamento. Tente novamente.', 'error');
    } finally {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar pedido'; }
    }
  }

  /* -------- Pagamento Pix real (Mercado Pago) -------- */
  let pixPollTimer = null;
  function openPixPaymentModal(data) {
    document.getElementById('cartDrawer').classList.remove('is-open');
    const content = document.getElementById('pixPaymentContent');
    content.innerHTML = `
      <button class="modal__close" id="closePixModalBtn" aria-label="Fechar">✕</button>
      <div style="text-align:center; padding:8px 4px;">
        <h3 style="margin:0 0 4px;">Pague com Pix</h3>
        <p class="muted" style="margin:0 0 16px;">Pedido ${escapeHtmlLite(String(data.orderNumber || ''))} — ${formatBRL(data.total)}</p>
        ${data.qrCodeBase64 ? `<img src="data:image/png;base64,${data.qrCodeBase64}" alt="QR Code Pix" style="width:220px; height:220px; margin:0 auto 16px; display:block; border-radius:12px; background:#fff; padding:8px;">` : '<p class="muted">QR Code indisponível — use o código abaixo.</p>'}
        <label style="display:block; text-align:left; font-size:.8rem; color:var(--muted,#999); margin-bottom:6px;">Pix Copia e Cola</label>
        <textarea readonly id="pixCopiaColaText" style="width:100%; min-height:70px; resize:none; font-size:.75rem; padding:8px; border-radius:8px;">${data.qrCodeCopiaCola || ''}</textarea>
        <button class="btn btn-secondary" id="copyPixBtn" style="margin-top:10px; width:100%;">Copiar código Pix</button>
        <p class="muted" style="margin:16px 0 0; font-size:.85rem;">Aguardando confirmação do pagamento...</p>
      </div>
    `;
    document.getElementById('closePixModalBtn').addEventListener('click', closeAllOverlays);
    document.getElementById('copyPixBtn').addEventListener('click', () => {
      navigator.clipboard.writeText(data.qrCodeCopiaCola || '').then(() => showToast('Código Pix copiado!'));
    });
    openOverlay('pixPaymentModal');
    startPixPolling(data.orderNumber, checkoutData.email, data.total);
  }

  function startPixPolling(orderNumber, email, total) {
    stopPixPolling();
    pixPollTimer = setInterval(async () => {
      if (!window.sb) return;
      const { data: rows, error } = await window.sb.rpc('get_order_status', {
        p_email: email,
        p_order_number: String(orderNumber),
      });
      if (error) { console.warn('Erro ao verificar status do pedido:', error); return; }
      const status = rows && rows[0] && rows[0].payment_status;
      if (status === 'pago') {
        stopPixPolling();
        lastOrder = { code: String(orderNumber), items: [], total, createdAt: Date.now(), status: 'recebido', customer: checkoutData };
        saveJSON('brasa_last_order', lastOrder);
        closeAllOverlays();
        showToast('Pagamento confirmado! Pedido em preparo. 🔥');
        trackFoundOrder = true;
        setTimeout(() => openTrackModal(), 260);
      }
    }, 4000);
  }
  function stopPixPolling() { if (pixPollTimer) { clearInterval(pixPollTimer); pixPollTimer = null; } }

  /* ============================================================
     ACOMPANHAMENTO DE PEDIDO
     ============================================================ */
  const ORDER_STAGES = [
    { id: 'recebido', label: 'Pedido recebido' },
    { id: 'confirmado', label: 'Confirmado pela loja' },
    { id: 'preparo', label: 'Em preparo na brasa' },
    { id: 'saiu', label: 'Saiu para entrega' },
    { id: 'entregue', label: 'Entregue — bom apetite!' },
  ];

  function openTrackModal() {
    renderTrackModal();
    openOverlay('trackModal');
  }

  function renderTrackModal() {
    const el = document.getElementById('trackModalContent');

    if (!trackFoundOrder) {
      el.innerHTML = `
        <span class="quick-access__eyebrow">Acompanhamento</span>
        <h2 style="text-transform:none; letter-spacing:0; margin:4px 0 8px;">Acompanhar pedido</h2>
        <p style="color:var(--lm-text-2); font-size:0.88rem; margin-bottom:18px;">Informe apenas o e-mail usado na compra.</p>
        <div class="field">
          <label for="trackEmailInput">E-mail</label>
          <input type="email" id="trackEmailInput" placeholder="voce@email.com">
          <div class="field-error-msg" id="trackEmailErr">Não encontramos pedidos para esse e-mail nesta sessão.</div>
        </div>
        <button class="btn btn-primary" id="trackSubmitBtn" style="width:100%; justify-content:center; margin-top:6px;">Consultar pedido →</button>`;
      document.getElementById('trackSubmitBtn').addEventListener('click', () => {
        const email = document.getElementById('trackEmailInput').value.trim().toLowerCase();
        if (!email.includes('@')) {
          toggleFieldError('trackEmailInput', 'trackEmailErr', true);
          document.getElementById('trackEmailErr').textContent = 'Digite um e-mail válido.';
          return;
        }
        const orderEmail = lastOrder && lastOrder.customer ? (lastOrder.customer.email || '').toLowerCase() : '';
        if (lastOrder && orderEmail === email) {
          trackFoundOrder = true;
          renderTrackModal();
        } else {
          toggleFieldError('trackEmailInput', 'trackEmailErr', true);
          document.getElementById('trackEmailErr').textContent = 'Não encontramos pedidos para esse e-mail nesta sessão.';
        }
      });
      return;
    }

    if (!lastOrder) {
      el.innerHTML = `<h2 style="margin-bottom:10px;">Acompanhar pedido</h2>
        <p style="color:var(--lm-text-2); font-size:0.9rem;">Você ainda não fez nenhum pedido nesta sessão.</p>`;
      return;
    }
    const currentIdx = ORDER_STAGES.findIndex(s => s.id === lastOrder.status);
    el.innerHTML = `
      <div class="track-success">
        <div class="check-circle">🔥</div>
        <h2 style="text-transform:none; letter-spacing:0;">Pedido ${lastOrder.code} confirmado</h2>
        <p style="color:var(--text-secondary); font-size:0.88rem;">${formatBRL(lastOrder.total)} · ${lastOrder.items.reduce((s, i) => s + i.qty, 0)} itens</p>
      </div>
      <div class="timeline">
        ${ORDER_STAGES.map((s, i) => `
          <div class="timeline-item ${i < currentIdx ? 'is-done' : ''} ${i === currentIdx ? 'is-current' : ''}">
            <div class="dot-col">
              <div class="dot">${i < currentIdx ? '✓' : ''}</div>
              ${i < ORDER_STAGES.length - 1 ? '<div class="line"></div>' : ''}
            </div>
            <div class="label">${s.label}</div>
          </div>`).join('')}
      </div>
      <button class="btn btn-secondary" id="closeTrackBtn" style="width:100%; justify-content:center; margin-top:8px;">Fechar</button>`;
    document.getElementById('closeTrackBtn').addEventListener('click', closeAllOverlays);

    // Simulação demonstrativa de progresso do pedido
    if (currentIdx < ORDER_STAGES.length - 1 && !lastOrder._simRunning) {
      lastOrder._simRunning = true;
      simulateProgress();
    }
  }

  function simulateProgress() {
    const idx = ORDER_STAGES.findIndex(s => s.id === lastOrder.status);
    if (idx >= ORDER_STAGES.length - 1) return;
    setTimeout(() => {
      lastOrder.status = ORDER_STAGES[idx + 1].id;
      saveJSON('brasa_last_order', lastOrder);
      if (document.getElementById('trackModal').classList.contains('is-open')) {
        renderTrackModal();
      }
      simulateProgress();
    }, 9000);
  }

  /* ============================================================
     MODAL MINHA CONTA (ícone do header — Entrar / Fazer cadastro)
     ============================================================ */
  function openAccountModal() {
    if (authUser) {
      showToast(`Você já está logado como ${authUser.name}`);
      return;
    }
    accountModalTab = 'entrar';
    renderAccountModal();
    openOverlay('accountModal');
  }

  function renderAccountModal() {
    const el = document.getElementById('accountModalContent');
    el.innerHTML = `
      <span class="quick-access__eyebrow">Minha conta</span>
      <h2 style="text-transform:none; letter-spacing:0; margin:4px 0 16px;">Acesse sua conta</h2>
      <div class="mode-toggle" id="amTabs">
        <button data-amtab="entrar" class="${accountModalTab === 'entrar' ? 'is-active' : ''}">Entrar</button>
        <button data-amtab="cadastrar" class="${accountModalTab === 'cadastrar' ? 'is-active' : ''}">Fazer cadastro</button>
      </div>
      <div id="amFormArea"></div>`;
    document.querySelectorAll('#amTabs [data-amtab]').forEach(b => b.addEventListener('click', () => {
      accountModalTab = b.dataset.amtab;
      renderAccountModal();
    }));
    renderAmForm();
  }

  function renderAmForm() {
    const wrap = document.getElementById('amFormArea');
    if (accountModalTab === 'entrar') {
      wrap.innerHTML = `
        <div class="field"><label>E-mail</label><input type="email" id="amEmail" placeholder="voce@email.com"></div>
        <div class="field"><label>Senha</label><input type="password" id="amPass" placeholder="Sua senha"></div>
        <button class="btn btn-primary" id="amSubmit" style="width:100%; justify-content:center;">Entrar</button>`;
      document.getElementById('amSubmit').addEventListener('click', () => {
        const email = document.getElementById('amEmail').value.trim();
        if (!email.includes('@')) { showToast('Digite um e-mail válido', 'error'); return; }
        authUser = { name: email.split('@')[0], email };
        saveJSON('brasa_auth', authUser);
        renderCart();
        closeAllOverlays();
        showToast('Login realizado com sucesso');
      });
    } else {
      wrap.innerHTML = `
        <div class="field"><label>Nome</label><input type="text" id="amName" placeholder="Seu nome"></div>
        <div class="field"><label>WhatsApp</label><input type="tel" id="amWhats" placeholder="(11) 90000-0000"></div>
        <div class="field"><label>E-mail</label><input type="email" id="amEmail2" placeholder="voce@email.com"></div>
        <div class="field"><label>Senha</label><input type="password" id="amPass2" placeholder="Mínimo de 10 caracteres"></div>
        <button class="btn btn-primary" id="amSubmit2" style="width:100%; justify-content:center;">Criar minha conta</button>`;
      document.getElementById('amSubmit2').addEventListener('click', () => {
        const name = document.getElementById('amName').value.trim();
        const email = document.getElementById('amEmail2').value.trim();
        const pass = document.getElementById('amPass2').value;
        if (!name) { showToast('Digite seu nome', 'error'); return; }
        if (!email.includes('@')) { showToast('Digite um e-mail válido', 'error'); return; }
        if (pass.length < 10) { showToast('A senha precisa ter no mínimo 10 caracteres', 'error'); return; }
        authUser = { name, email };
        saveJSON('brasa_auth', authUser);
        renderCart();
        closeAllOverlays();
        showToast('Conta criada com sucesso');
      });
    }
  }

  document.getElementById('openAccountBtn').addEventListener('click', openAccountModal);

  /* ============================================================
     OVERLAYS (backdrop, drawer, modais)
     ============================================================ */
  function openOverlay(id) {
    document.getElementById('backdrop').classList.add('is-open');
    document.getElementById(id).classList.add('is-open');
  }
  function closeAllOverlays() {
    document.getElementById('backdrop').classList.remove('is-open');
    ['cartDrawer', 'productModal', 'accountModal', 'trackModal', 'pixPaymentModal'].forEach(id => {
      document.getElementById(id).classList.remove('is-open');
    });
    stopPixPolling();
  }

  document.getElementById('backdrop').addEventListener('click', closeAllOverlays);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });

  document.getElementById('openCartBtn').addEventListener('click', () => openOverlay('cartDrawer'));
  document.getElementById('mobileCartBar').addEventListener('click', () => openOverlay('cartDrawer'));
  document.getElementById('closeCartBtn').addEventListener('click', closeAllOverlays);
  document.getElementById('openTrackBtn').addEventListener('click', () => { trackFoundOrder = false; openTrackModal(); });

  /* ============================================================
     CATEGORIAS
     ============================================================ */
  document.getElementById('categoryScroll').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('is-active'));
    chip.classList.add('is-active');
    activeCategory = chip.dataset.cat;
    renderMenu();
  });

  /* ============================================================
     TEMA CLARO/ESCURO
     ============================================================ */
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';
    saveJSON('brasa_theme', theme);
  }
  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.body.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });
  applyTheme(loadJSON('brasa_theme', 'dark'));

  /* ============================================================
     LOJA ABERTA/FECHADA (com base no horário)
     ============================================================ */
  function updateStoreStatus() {
    const now = new Date();
    const day = now.getDay(); // 0 = domingo
    const hour = now.getHours() + now.getMinutes() / 60;
    const isOpenDay = day !== 1; // terça a domingo (fechado às segundas)
    const isOpenHour = hour >= 18 && hour < 23.5;
    const isOpen = isOpenDay && isOpenHour;
    const dot = document.querySelector('.status-dot');
    const text = document.getElementById('statusText');
    if (isOpen) {
      dot.style.background = 'var(--state-success)';
      text.textContent = 'Aberto agora · entrega em 30–45 min';
    } else {
      dot.style.background = 'var(--state-danger)';
      text.textContent = 'Fechado agora · abre às 18h';
    }
  }
  updateStoreStatus();

  /* ============================================================
     PARTÍCULAS DE BRASA (assinatura visual do hero)
     ============================================================ */
  function spawnEmbers() {
    const container = document.getElementById('embers');
    if (!container) return;
    for (let i = 0; i < 24; i++) {
      const ember = document.createElement('span');
      ember.className = 'ember';
      ember.style.left = Math.random() * 100 + '%';
      ember.style.setProperty('--drift', (Math.random() * 60 - 30) + 'px');
      ember.style.animationDuration = (3 + Math.random() * 3) + 's';
      ember.style.animationDelay = (Math.random() * 5) + 's';
      container.appendChild(ember);
    }
  }
  spawnEmbers();

  /* ============================================================
     FAQ (acordeão)
     ============================================================ */
  function initFaq() {
    const list = document.getElementById('faqList');
    if (!list) return;
    list.querySelectorAll('.faq-item').forEach(item => {
      const question = item.querySelector('.faq-question');
      const answer = item.querySelector('.faq-answer');
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        list.querySelectorAll('.faq-item.is-open').forEach(open => {
          if (open !== item) {
            open.classList.remove('is-open');
            open.querySelector('.faq-answer').style.maxHeight = '';
          }
        });
        item.classList.toggle('is-open', !isOpen);
        answer.style.maxHeight = !isOpen ? answer.scrollHeight + 'px' : '';
      });
    });
  }
  initFaq();

  /* ============================================================
     INICIALIZAÇÃO
     ============================================================ */
  renderMenu();
  renderCart();
  if (lastOrder && lastOrder.status !== 'entregue') {
    // retoma simulação de progresso se havia um pedido em andamento
    lastOrder._simRunning = false;
  }

  // Exposto para js/site-sync.js poder redesenhar o cardápio assim que os
  // dados reais chegarem do Supabase (a busca é assíncrona, então o primeiro
  // desenho acima usa os dados de exemplo e este é chamado de novo em seguida).
  window.__brasaRefreshMenu = renderMenu;
  window.__brasaRefreshCart = renderCart;
})();
