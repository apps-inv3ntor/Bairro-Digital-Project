/* ============================================================
   BRASA BURGER CO. — Sincronização do cardápio público com o Supabase
   ============================================================
   Carregado depois de data.js e main.js. Se o Supabase ainda não
   estiver configurado (ou a busca falhar), o site continua 100%
   funcional com os dados de exemplo de data.js — nada quebra.
   ============================================================ */
(function () {
  'use strict';

  if (!window.SUPABASE_READY) return; // continua em modo demonstração

  function formatBRL(v) { return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  // Mesma lógica do admin (admin.js) pra transformar horário/pagamento configurado em frase —
  // duplicada aqui de propósito: o site público e o admin são dois bundles JS separados.
  function describeHours(hours) {
    const order = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const names = { seg: 'segunda', ter: 'terça', qua: 'quarta', qui: 'quinta', sex: 'sexta', sab: 'sábado', dom: 'domingo' };
    const fmt = t => (t || '').replace(':00', 'h').replace(':', 'h');
    const openDays = order.filter(d => hours[d] && hours[d].open);
    if (!openDays.length) return 'No momento estamos fechados.';
    const groups = [];
    let start = openDays[0];
    for (let i = 1; i <= openDays.length; i++) {
      const prev = openDays[i - 1], curr = openDays[i];
      const sameSlot = curr && hours[curr].from === hours[prev].from && hours[curr].to === hours[prev].to;
      if (!sameSlot) { groups.push({ from: start, to: prev, h: hours[prev] }); start = curr; }
    }
    const closedDays = order.filter(d => !(hours[d] && hours[d].open)).map(d => names[d]);
    const parts = groups.map(g => {
      const label = g.from === g.to ? names[g.from] : `${names[g.from]} a ${names[g.to]}`;
      return `${label}, das ${fmt(g.h.from)} às ${fmt(g.h.to)}`;
    });
    let text = 'Funcionamos ' + parts.join('; ') + '.';
    if (closedDays.length) text += ` ${closedDays.map(d => d[0].toUpperCase() + d.slice(1)).join(' e ')}-feira${closedDays.length > 1 ? 's' : ''} não abrimos.`;
    return text;
  }
  function describePayments(payments) {
    const labels = { pix: 'Pix', debito: 'cartão de débito', credito: 'cartão de crédito', dinheiro: 'dinheiro' };
    const active = ['pix', 'debito', 'credito', 'dinheiro'].filter(k => payments[k]).map(k => labels[k]);
    if (!active.length) return 'No momento não há formas de pagamento configuradas.';
    return `Aceitamos ${active.join(', ').replace(/, ([^,]*)$/, ' e $1')}, pagos na entrega ou retirada.`;
  }

  // Reconstrói o menu de categorias no topo (Todos + Mais pedidos são fixos; o resto vem do banco)
  function renderCategoryNav(cats) {
    const scroll = document.getElementById('categoryScroll');
    if (!scroll || !cats) return;
    scroll.innerHTML = `
      <button class="chip is-active" data-cat="todos">Todos</button>
      <button class="chip" data-cat="mais-pedidos">Mais pedidos</button>
      ${cats.map(c => `<button class="chip" data-cat="${c.id}">${(c.name || '').replace(/</g, '&lt;')}</button>`).join('')}`;
  }

  function renderPromoBanner(banner) {
    const section = document.getElementById('promocoes');
    if (!section) return;
    if (!banner || banner.active === false) { section.style.display = 'none'; return; }
    section.style.display = '';
    const titleHtml = (banner.title || '').split('\n').map(l => l.replace(/</g, '&lt;')).join('<br>');
    section.innerHTML = `
      <div class="promo-banner__inner">
        <div>
          <span class="eyebrow">${(banner.eyebrow || '').replace(/</g, '&lt;')}</span>
          <h2>${titleHtml}</h2>
          <button type="button" class="btn btn-primary" id="promoBannerCta" style="margin-top:18px;">${(banner.buttonText || 'Ver oferta →').replace(/</g, '&lt;')}</button>
        </div>
        ${banner.couponCode ? `
        <div class="promo-banner__coupon">
          <span class="eyebrow">${(banner.couponLabel || 'Cupom').replace(/</g, '&lt;')}</span>
          <strong>${banner.couponCode.replace(/</g, '&lt;')}</strong>
        </div>` : ''}
      </div>`;
    document.getElementById('promoBannerCta').addEventListener('click', () => {
      const target = banner.linkTarget || '#cardapio';
      if (target.startsWith('#cat-') && typeof window.__brasaGoToCategory === 'function') {
        window.__brasaGoToCategory(target.replace('#cat-', ''));
      } else {
        (document.querySelector(target) || document.getElementById('cardapio')).scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  function renderFaq(items) {
    const list = document.getElementById('faqList');
    if (!list || !Array.isArray(items)) return;
    list.innerHTML = items.map(item => `
      <div class="faq-item">
        <button class="faq-question">${(item.question || '').replace(/</g, '&lt;')}<span class="faq-icon">+</span></button>
        <div class="faq-answer"><p>${(item.answer || '').replace(/</g, '&lt;')}</p></div>
      </div>`).join('');
    // O toggle de abrir/fechar cada pergunta é feito por delegação de evento em main.js
    // (ouve clique em .faq-question dentro de #faqList), então reconstruir o innerHTML
    // aqui não quebra o comportamento — não precisa religar nada.
  }

  function renderHowItWorks(steps) {
    if (!Array.isArray(steps)) return;
    steps.forEach((step, i) => {
      const titleEl = document.getElementById(`step${i + 1}Title`);
      const descEl = document.getElementById(`step${i + 1}Desc`);
      if (titleEl && step.title) titleEl.textContent = step.title;
      if (descEl && step.description) descEl.textContent = step.description;
    });
  }

  function renderFooter(storeInfo, hours, payments) {
    const addrEl = document.getElementById('footerAddress');
    const hoursEl = document.getElementById('footerHours');
    const phoneEl = document.getElementById('footerPhone');
    const payEl = document.getElementById('footerPayments');
    const footerNameEl = document.getElementById('footerStoreName');
    const brandNameEl = document.getElementById('brandName');

    if (storeInfo && storeInfo.storeName) {
      if (footerNameEl) footerNameEl.textContent = storeInfo.storeName;
      if (brandNameEl) {
        // Mantém o mesmo efeito visual (1ª palavra normal, resto em laranja) — sem isso,
        // um nome digitado inteiro sairia todo branco, perdendo o destaque de marca.
        const parts = storeInfo.storeName.toUpperCase().split(' ');
        const first = parts.shift();
        brandNameEl.innerHTML = parts.length ? `${first} <span>${parts.join(' ')}</span>` : first;
      }
      document.title = document.title.replace(/^[^—]*/, storeInfo.storeName + ' ');
    }
    if (storeInfo && addrEl) addrEl.innerHTML = `${(storeInfo.address || '').replace(/</g, '&lt;')}.`;
    if (hours && hoursEl) hoursEl.textContent = describeHours(hours);
    if (storeInfo && phoneEl) phoneEl.textContent = `WhatsApp ${storeInfo.phone || ''}`;
    if (payments && payEl) payEl.textContent = describePayments(payments);
  }

  async function loadCatalogFromSupabase() {
    try {
      const [{ data: cats, error: catsErr }, { data: prods, error: prodsErr }, { data: areas, error: areasErr },
             { data: coupons, error: couponsErr }, { data: settingsRows, error: settingsErr }, { data: banners, error: bannersErr }] = await Promise.all([
        window.sb.from('categories').select('*').eq('active', true).order('display_order'),
        window.sb.from('products').select('*').eq('active', true),
        window.sb.from('delivery_areas').select('*').eq('active', true),
        window.sb.from('coupons').select('*').eq('active', true),
        window.sb.from('store_settings').select('*'),
        window.sb.from('banners').select('*').eq('active', true).order('priority'),
      ]);
      if (catsErr || prodsErr) {
        console.warn('Não foi possível buscar o cardápio do Supabase, usando dados de exemplo.', catsErr || prodsErr);
        return;
      }

      // Banner principal (topo do site) — carrossel automático entre todos os banners
      // ativos e dentro do período. O cliente decidiu não usar mais a faixa pequena:
      // agora só existe o banner grande, girando entre os cadastrados.
      if (!bannersErr && banners) {
        const today = new Date().toISOString().slice(0, 10);
        const displayable = banners.filter(b =>
          (!b.start_date || today >= b.start_date) && (!b.end_date || today <= b.end_date)
        ); // já vem ordenado por prioridade (query .order('priority'))

        const heroImg = document.getElementById('heroBgImg');
        const heroVideo = document.getElementById('heroBgVideo');
        const heroCoupon = document.getElementById('heroCoupon');

        if (displayable.length && heroImg && heroVideo && heroCoupon) {
          if (window.__brasaHeroRotationTimer) clearTimeout(window.__brasaHeroRotationTimer);

          const showBanner = (index) => {
            const b = displayable[index];
            heroCoupon.textContent = b.title || '';
            heroCoupon.href = b.link || '#cardapio';
            if (b.media_type === 'video') {
              heroImg.style.display = 'none';
              heroVideo.style.display = 'block';
              if (heroVideo.getAttribute('src') !== b.image_url) heroVideo.setAttribute('src', b.image_url || '');
              heroVideo.play().catch(() => {}); // navegador pode bloquear autoplay com som; o vídeo é sempre mudo (muted), então normalmente toca
            } else {
              heroVideo.pause();
              heroVideo.style.display = 'none';
              heroImg.style.display = 'block';
              heroImg.src = b.image_url || 'assets/brand/hero-burger.jpg';
            }
            if (displayable.length > 1) {
              const seconds = b.display_seconds > 0 ? b.display_seconds : 8;
              window.__brasaHeroRotationTimer = setTimeout(() => showBanner((index + 1) % displayable.length), seconds * 1000);
            }
          };
          showBanner(0);
        }
        // Sem nenhum banner dentro do período: mantém a imagem/texto padrão do site (não mexe em nada).
      }
      if (!prods || !prods.length) {
        console.warn('Supabase conectado mas sem produtos cadastrados ainda — mantendo dados de exemplo.');
        return;
      }

      // Reconstrói CATEGORY_LABELS (mantém a entrada especial "Mais pedidos")
      if (cats && cats.length) {
        Object.keys(CATEGORY_LABELS).forEach(k => { if (k !== 'mais-pedidos') delete CATEGORY_LABELS[k]; });
        cats.forEach(c => { CATEGORY_LABELS[c.id] = c.name; });
      }

      // Reconstrói PRODUCTS no mesmo formato que main.js espera
      const mapped = prods.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category_id,
        highlight: !!p.featured,
        price: Number(p.price),
        promoPrice: p.promo_price !== null && p.promo_price !== undefined ? Number(p.promo_price) : null,
        img: p.image_url || 'assets/products/brasa-bacon.jpg',
        desc: p.description || '',
        ingredients: p.ingredients || '',
        soldOut: !!p.sold_out,
        extras: Array.isArray(p.extras) ? p.extras : [],
        removeOptions: Array.isArray(p.remove_options) ? p.remove_options : [],
      }));
      PRODUCTS.length = 0;
      mapped.forEach(p => PRODUCTS.push(p));

      // Áreas de entrega reais
      if (!areasErr && areas && areas.length) {
        const mappedAreas = areas.map(a => ({ id: a.id, name: a.name, fee: Number(a.fee), etaExtra: a.eta_min_minutes || 0, etaMax: a.eta_max_minutes || 0 }));
        DELIVERY_AREAS.length = 0;
        mappedAreas.forEach(a => DELIVERY_AREAS.push(a));

        const listEl = document.getElementById('deliveryAreasList');
        if (listEl) {
          listEl.innerHTML = mappedAreas.map(a => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:var(--bg-card,#1c1712); border-radius:12px;">
              <div><strong>${a.name}</strong>${a.etaExtra ? `<div class="muted" style="font-size:0.82rem;">${a.etaExtra}${a.etaMax ? '–' + a.etaMax : ''} min</div>` : ''}</div>
              <strong style="color:var(--primary,#f4790a);">${formatBRL(a.fee)}</strong>
            </div>`).join('');
        }
        const footerEl = document.getElementById('footerAreasList');
        if (footerEl) footerEl.textContent = mappedAreas.map(a => `${a.name} ${formatBRL(a.fee)}`).join(' · ') + '.';
      }

      // Cupons reais (substitui os de exemplo)
      if (!couponsErr && coupons && coupons.length) {
        Object.keys(COUPONS).forEach(k => delete COUPONS[k]);
        coupons.forEach(c => {
          const label = c.type === 'percent' ? `${c.value}% OFF` : c.type === 'fixed' ? `R$ ${Number(c.value).toFixed(2)} OFF` : 'Frete grátis';
          // minOrder/active/expiry/limit/uses precisam vir junto — sem eles o site não tinha
          // como saber que um cupom exige pedido mínimo, expirou, está inativo ou já bateu o limite
          COUPONS[c.code] = {
            type: c.type, value: Number(c.value), label,
            minOrder: Number(c.min_order) || 0, active: c.active !== false,
            expiry: c.expires_at || null, limit: c.usage_limit || null, uses: c.usage_count || 0,
          };
        });
      }

      // Reconstrói o menu de categorias do topo com as categorias reais (resolve o problema de
      // categorias novas — ex: "Promoções" — nunca aparecerem por o menu ser fixo no HTML)
      if (cats && cats.length) renderCategoryNav(cats);

      // Pedido mínimo geral e formas de pagamento habilitadas, se configurados
      let hoursValue = null, paymentsValue = null, storeInfoValue = null;
      if (!settingsErr && settingsRows && settingsRows.length) {
        const storeInfoRow = settingsRows.find(r => r.key === 'store_info');
        if (storeInfoRow && storeInfoRow.value) {
          storeInfoValue = storeInfoRow.value;
          if (storeInfoRow.value.minOrder) MIN_ORDER = Number(storeInfoRow.value.minOrder);
        }
        const paymentsRow = settingsRows.find(r => r.key === 'payments_enabled');
        if (paymentsRow && paymentsRow.value) { paymentsValue = paymentsRow.value; window.PAYMENTS_ENABLED = paymentsRow.value; }
        const hoursRow = settingsRows.find(r => r.key === 'hours');
        if (hoursRow && hoursRow.value) hoursValue = hoursRow.value;
        const homeSectionsRow = settingsRows.find(r => r.key === 'home_sections');
        if (homeSectionsRow && homeSectionsRow.value) window.HOME_SECTIONS = homeSectionsRow.value;
        const bannerRow = settingsRows.find(r => r.key === 'promo_banner');
        if (bannerRow && bannerRow.value) { window.PROMO_BANNER = bannerRow.value; renderPromoBanner(bannerRow.value); }
        const faqRow = settingsRows.find(r => r.key === 'faq_items');
        if (faqRow && Array.isArray(faqRow.value)) { window.FAQ_ITEMS = faqRow.value; renderFaq(faqRow.value); }
        const stepsRow = settingsRows.find(r => r.key === 'how_it_works');
        if (stepsRow && Array.isArray(stepsRow.value)) renderHowItWorks(stepsRow.value);
      }
      renderFooter(storeInfoValue, hoursValue, paymentsValue);

      if (typeof window.__brasaRefreshMenu === 'function') window.__brasaRefreshMenu();
      if (typeof window.__brasaRefreshCart === 'function') window.__brasaRefreshCart();
    } catch (e) {
      console.warn('Erro ao sincronizar cardápio com o Supabase, usando dados de exemplo.', e);
    }
  }

  loadCatalogFromSupabase();
})();
