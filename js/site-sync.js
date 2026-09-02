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

      // Banners promocionais (independente do resto — mostra mesmo se cardápio ainda estiver de exemplo)
      if (!bannersErr && banners && banners.length) {
        const strip = document.getElementById('bannersStrip');
        const inner = document.getElementById('bannersStripInner');
        if (strip && inner) {
          inner.innerHTML = banners.map(b => `
            <a href="${b.link || '#cardapio'}" style="flex:0 0 auto; width:min(420px,85vw); scroll-snap-align:start; position:relative; display:block; border-radius:16px; overflow:hidden; text-decoration:none;">
              <img src="${b.image_url || 'assets/brand/hero-burger.jpg'}" alt="${(b.title || '').replace(/"/g, '&quot;')}" style="width:100%; height:180px; object-fit:cover; display:block;">
              <div style="position:absolute; inset:0; background:linear-gradient(180deg, transparent 40%, rgba(0,0,0,.75) 100%); display:flex; flex-direction:column; justify-content:flex-end; padding:14px;">
                ${b.period_label ? `<span style="color:var(--primary,#f4790a); font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.04em;">${b.period_label}</span>` : ''}
                <strong style="color:#fff; font-size:1.05rem; line-height:1.25;">${(b.title || '').replace(/</g, '&lt;')}</strong>
              </div>
            </a>`).join('');
          strip.style.display = 'block';
        }
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
        const mappedAreas = areas.map(a => ({ id: a.id, name: a.name, fee: Number(a.fee), etaExtra: a.eta_min_minutes || 0 }));
        DELIVERY_AREAS.length = 0;
        mappedAreas.forEach(a => DELIVERY_AREAS.push(a));
      }

      // Cupons reais (substitui os de exemplo)
      if (!couponsErr && coupons && coupons.length) {
        Object.keys(COUPONS).forEach(k => delete COUPONS[k]);
        coupons.forEach(c => {
          const label = c.type === 'percent' ? `${c.value}% OFF` : c.type === 'fixed' ? `R$ ${Number(c.value).toFixed(2)} OFF` : 'Frete grátis';
          COUPONS[c.code] = { type: c.type, value: Number(c.value), label };
        });
      }

      // Pedido mínimo geral, se configurado
      // Pedido mínimo e formas de pagamento habilitadas, se configurados
      if (!settingsErr && settingsRows && settingsRows.length) {
        const storeInfoRow = settingsRows.find(r => r.key === 'store_info');
        if (storeInfoRow && storeInfoRow.value && storeInfoRow.value.minOrder) {
          MIN_ORDER = Number(storeInfoRow.value.minOrder);
        }
        const paymentsRow = settingsRows.find(r => r.key === 'payments_enabled');
        if (paymentsRow && paymentsRow.value) {
          window.PAYMENTS_ENABLED = paymentsRow.value;
        }
      }

      if (typeof window.__brasaRefreshMenu === 'function') window.__brasaRefreshMenu();
      if (typeof window.__brasaRefreshCart === 'function') window.__brasaRefreshCart();
    } catch (e) {
      console.warn('Erro ao sincronizar cardápio com o Supabase, usando dados de exemplo.', e);
    }
  }

  loadCatalogFromSupabase();
})();
