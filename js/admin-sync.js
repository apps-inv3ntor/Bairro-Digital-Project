/* ============================================================
   BRASA BURGER CO. — ADMIN — Sincronização com o Supabase
   ============================================================
   Busca o catálogo real do banco assim que o admin loga de
   verdade (não no modo demonstração), e expõe funções de tradução
   usadas pelo admin-catalog.js para gravar cada alteração no
   Supabase, além de salvar em localStorage como sempre.
   ============================================================ */
(function () {
  'use strict';

  function productToDb(p) {
    return {
      name: p.name,
      category_id: p.category,
      code: p.code || null,
      description: p.desc || null,
      price: p.price,
      promo_price: p.promoPrice || null,
      image_url: p.img || null,
      prep_time_minutes: p.prepTime || 15,
      active: !!p.active,
      featured: !!p.featured,
      sold_out: !!p.soldOut,
      extras: p.extras || [],
      remove_options: p.removeOptions || [],
    };
  }

  function productFromDb(p) {
    return {
      id: p.id, name: p.name, category: p.category_id, code: p.code || '',
      desc: p.description || '', price: Number(p.price),
      promoPrice: p.promo_price !== null && p.promo_price !== undefined ? Number(p.promo_price) : null,
      img: p.image_url || 'assets/products/brasa-bacon.jpg', prepTime: p.prep_time_minutes,
      active: p.active, featured: p.featured, soldOut: p.sold_out,
      extras: Array.isArray(p.extras) ? p.extras : [], removeOptions: Array.isArray(p.remove_options) ? p.remove_options : [],
    };
  }

  function categoryToDb(c) {
    return { name: c.name, display_order: c.order || 0, active: !!c.active, image_url: c.img || null };
  }

  function categoryFromDb(c) {
    return { id: c.id, name: c.name, order: c.display_order, active: c.active, img: c.image_url || 'assets/products/brasa-bacon.jpg' };
  }

  function couponToDb(c) {
    return { type: c.type, value: c.value, min_order: c.minOrder || 0, usage_limit: c.limit || null, usage_count: c.uses || 0, expires_at: c.expiry || null, active: !!c.active };
  }
  function couponFromDb(c) {
    return { code: c.code, type: c.type, value: Number(c.value), minOrder: Number(c.min_order), limit: c.usage_limit, uses: c.usage_count, expiry: c.expires_at, active: c.active };
  }

  function areaToDb(a) {
    return { name: a.name, fee: a.fee || 0, eta_min_minutes: a.etaMin || 20, eta_max_minutes: a.etaMax || 40, min_order: a.minOrder || 0, active: !!a.active };
  }
  function areaFromDb(a) {
    return { id: a.id, name: a.name, fee: Number(a.fee), etaMin: a.eta_min_minutes, etaMax: a.eta_max_minutes, minOrder: Number(a.min_order), active: a.active };
  }

  function bannerToDb(b) {
    return { title: b.title, image_url: b.img || null, period_label: b.period || '', link: b.link || '#cardapio', priority: b.priority || 1, active: !!b.active };
  }
  function bannerFromDb(b) {
    return { id: b.id, title: b.title, img: b.image_url || 'assets/brand/hero-burger.jpg', period: b.period_label || '', priority: b.priority, link: b.link || '#cardapio', active: b.active };
  }

  const PAYMENT_LABELS = { pix: 'Pix', credito: 'Cartão de crédito', debito: 'Cartão de débito', dinheiro: 'Dinheiro' };

  function insumoFromDb(i) {
    return {
      id: i.id, nome: i.nome, categoria: i.categoria || '',
      quantidadeAtual: Number(i.quantidade_atual), capacidadeMaxima: Number(i.capacidade_maxima),
      unidadeMedida: i.unidade_medida,
    };
  }
  function insumoToDb(i) {
    return { nome: i.nome, categoria: i.categoria || null, quantidade_atual: i.quantidadeAtual, capacidade_maxima: i.capacidadeMaxima, unidade_medida: i.unidadeMedida };
  }
  async function upsertInsumo(localId, data) {
    if (!window.SUPABASE_READY) return { ok: true };
    const payload = insumoToDb(data);
    if (localId) {
      const { error } = await window.sb.from('insumos').update(payload).eq('id', localId);
      return { ok: !error, error };
    }
    const { data: inserted, error } = await window.sb.from('insumos').insert(payload).select('id').single();
    return { ok: !error, error, newId: inserted ? inserted.id : null };
  }
  async function deleteInsumoRemote(id) {
    if (!window.SUPABASE_READY) return { ok: true };
    const { error } = await window.sb.from('insumos').delete().eq('id', id);
    return { ok: !error, error };
  }

  async function getFichaTecnica(productId) {
    if (!window.SUPABASE_READY) return [];
    const { data, error } = await window.sb.from('ficha_tecnica').select('id, insumo_id, quantidade_gasta').eq('product_id', productId);
    if (error) { console.error('Erro ao buscar ficha técnica:', error); return []; }
    return data || [];
  }
  async function saveFichaTecnica(productId, itens) {
    if (!window.SUPABASE_READY) return { ok: true };
    // Substitui a lista inteira: mais simples e confiável do que tentar diferenciar o que mudou.
    const { error: delErr } = await window.sb.from('ficha_tecnica').delete().eq('product_id', productId);
    if (delErr) return { ok: false, error: delErr };
    if (!itens.length) return { ok: true };
    const rows = itens.map(it => ({ product_id: productId, insumo_id: it.insumoId, quantidade_gasta: it.quantidade }));
    const { error } = await window.sb.from('ficha_tecnica').insert(rows);
    return { ok: !error, error };
  }
  function orderFromDb(o) {
    return {
      id: (o.order_number || '').replace('#', ''),
      _dbId: o.id,
      status: o.order_status,
      createdAt: new Date(o.created_at).getTime(),
      customer: o.customer_name,
      phone: o.customer_phone,
      modality: o.modality,
      area: o.delivery_areas ? o.delivery_areas.name : '',
      address: o.address || '',
      payment: (PAYMENT_LABELS[o.payment_method] || o.payment_method) + (o.payment_status === 'pago' ? ' (pago)' : ''),
      paymentStatus: o.payment_status,
      items: (o.order_items || []).map(i => ({ qty: i.quantity, name: i.product_name })),
      subtotal: Number(o.subtotal), discount: Number(o.discount), fee: Number(o.delivery_fee), total: Number(o.total),
    };
  }

  async function updateOrderStatusRemote(dbId, status, order) {
    if (!window.SUPABASE_READY) return { ok: true };
    const patch = { order_status: status };
    // Pedido em dinheiro: "confirmado pela loja" é o momento em que consideramos o pagamento
    // recebido (ele é pago na entrega/retirada, não online) — é aqui que o estoque é baixado.
    const isCashFirstConfirm = order && order.payment && order.payment.startsWith('Dinheiro') && status === 'confirmado' && order.paymentStatus !== 'pago';
    if (isCashFirstConfirm) patch.payment_status = 'pago';
    const { error } = await window.sb.from('orders').update(patch).eq('id', dbId);
    if (!error && isCashFirstConfirm) {
      const { error: estoqueErr } = await window.sb.rpc('baixar_estoque_pedido', { p_order_id: dbId });
      if (estoqueErr) console.error('Falha ao dar baixa no estoque:', estoqueErr);
    }
    return { ok: !error, error };
  }

  /* -------- Chamadas usadas pelo admin-catalog.js -------- */
  async function upsertProduct(localId, data) {
    if (!window.SUPABASE_READY) return { ok: true };
    const payload = productToDb(data);
    if (localId && /^[0-9a-f-]{36}$/i.test(localId)) {
      const { error } = await window.sb.from('products').update(payload).eq('id', localId);
      return { ok: !error, error };
    }
    const { data: inserted, error } = await window.sb.from('products').insert(payload).select('id').single();
    return { ok: !error, error, newId: inserted ? inserted.id : null };
  }

  async function deleteProductRemote(id) {
    if (!window.SUPABASE_READY || !/^[0-9a-f-]{36}$/i.test(id || '')) return { ok: true };
    const { error } = await window.sb.from('products').delete().eq('id', id);
    return { ok: !error, error };
  }

  async function upsertCategory(localId, data, isNew) {
    if (!window.SUPABASE_READY) return { ok: true };
    const payload = categoryToDb(data);
    if (!isNew) {
      const { error } = await window.sb.from('categories').update(payload).eq('id', localId);
      return { ok: !error, error };
    }
    const { error } = await window.sb.from('categories').insert({ id: localId, ...payload });
    return { ok: !error, error };
  }

  async function deleteCategoryRemote(id) {
    if (!window.SUPABASE_READY) return { ok: true };
    const { error } = await window.sb.from('categories').delete().eq('id', id);
    return { ok: !error, error };
  }

  async function upsertCoupon(code, data, isNew) {
    if (!window.SUPABASE_READY) return { ok: true };
    const payload = couponToDb(data);
    if (!isNew) {
      const { error } = await window.sb.from('coupons').update(payload).eq('code', code);
      return { ok: !error, error };
    }
    const { error } = await window.sb.from('coupons').insert({ code, ...payload });
    return { ok: !error, error };
  }
  async function deleteCouponRemote(code) {
    if (!window.SUPABASE_READY) return { ok: true };
    const { error } = await window.sb.from('coupons').delete().eq('code', code);
    return { ok: !error, error };
  }

  async function upsertArea(localId, data) {
    if (!window.SUPABASE_READY) return { ok: true };
    const payload = areaToDb(data);
    if (localId && /^[0-9a-f-]{36}$/i.test(localId)) {
      const { error } = await window.sb.from('delivery_areas').update(payload).eq('id', localId);
      return { ok: !error, error };
    }
    const { data: inserted, error } = await window.sb.from('delivery_areas').insert(payload).select('id').single();
    return { ok: !error, error, newId: inserted ? inserted.id : null };
  }
  async function deleteAreaRemote(id) {
    if (!window.SUPABASE_READY || !/^[0-9a-f-]{36}$/i.test(id || '')) return { ok: true };
    const { error } = await window.sb.from('delivery_areas').delete().eq('id', id);
    return { ok: !error, error };
  }

  async function upsertBanner(localId, data) {
    if (!window.SUPABASE_READY) return { ok: true };
    const payload = bannerToDb(data);
    if (localId && /^[0-9a-f-]{36}$/i.test(localId)) {
      const { error } = await window.sb.from('banners').update(payload).eq('id', localId);
      return { ok: !error, error };
    }
    const { data: inserted, error } = await window.sb.from('banners').insert(payload).select('id').single();
    return { ok: !error, error, newId: inserted ? inserted.id : null };
  }
  async function deleteBannerRemote(id) {
    if (!window.SUPABASE_READY || !/^[0-9a-f-]{36}$/i.test(id || '')) return { ok: true };
    const { error } = await window.sb.from('banners').delete().eq('id', id);
    return { ok: !error, error };
  }

  async function saveSettingsKey(key, value) {
    if (!window.SUPABASE_READY) return { ok: true };
    const { error } = await window.sb.from('store_settings').upsert({ key, value }, { onConflict: 'key' });
    return { ok: !error, error };
  }

  /* -------- Atualização automática dos pedidos (sem precisar relogar) -------- */
  let ordersPollTimer = null;
  async function pollOrdersOnce() {
    if (!window.SUPABASE_READY) return;
    const A = window.__brasaAdmin;
    const { data: rawOrders, error } = await window.sb
      .from('orders')
      .select('*, delivery_areas(name), order_items(product_name, quantity)')
      .order('created_at', { ascending: false });
    if (error || !rawOrders) return;
    const fresh = rawOrders.map(orderFromDb);
    const prevById = new Map((A.orders || []).map(o => [o._dbId, o]));
    let hasNewOrder = false, hasNewlyPaid = false;
    fresh.forEach(o => {
      const prev = prevById.get(o._dbId);
      if (!prev) hasNewOrder = true;
      else if (prev.paymentStatus !== 'pago' && o.paymentStatus === 'pago') hasNewlyPaid = true;
    });
    A.orders = fresh;
    A.persist('admin_orders', A.orders);
    A.updateOrdersBadge();
    if (A.currentView === 'pedidos' || A.currentView === 'visao-geral') A.goToView(A.currentView);
    if (hasNewOrder) A.showToast('🔔 Novo pedido recebido!');
    if (hasNewlyPaid) A.showToast('✅ Um pagamento foi confirmado!');
  }
  function startOrdersPolling() {
    if (ordersPollTimer) return; // já rodando, evita duplicar
    ordersPollTimer = setInterval(pollOrdersOnce, 15000);
  }

  /* -------- Carga inicial após login real -------- */
  async function syncCatalogFromSupabase() {
    if (!window.SUPABASE_READY) return;
    const A = window.__brasaAdmin;
    try {
      const [{ data: cats, error: catsErr }, { data: prods, error: prodsErr }, { data: coupons, error: couponsErr },
             { data: areas, error: areasErr }, { data: banners, error: bannersErr }, { data: settingsRows, error: settingsErr },
             { data: rawOrders, error: ordersErr }, { data: rawAdminUsers, error: adminUsersErr },
             { data: rawInsumos, error: insumosErr }] = await Promise.all([
        window.sb.from('categories').select('*').order('display_order'),
        window.sb.from('products').select('*'),
        window.sb.from('coupons').select('*'),
        window.sb.from('delivery_areas').select('*'),
        window.sb.from('banners').select('*'),
        window.sb.from('store_settings').select('*'),
        window.sb.from('orders').select('*, delivery_areas(name), order_items(product_name, quantity)').order('created_at', { ascending: false }),
        window.sb.from('admin_users').select('*').order('created_at'),
        window.sb.from('insumos').select('*').order('nome'),
      ]);
      if (catsErr || prodsErr) {
        A.showToast('Não foi possível carregar o catálogo do banco — mostrando dados salvos localmente.', 'error');
        console.warn(catsErr || prodsErr);
        return;
      }
      if (cats && cats.length) { A.categories = cats.map(categoryFromDb); A.persist('admin_categories', A.categories); }
      if (prods && prods.length) { A.products = prods.map(productFromDb); A.persist('admin_products', A.products); }
      if (!couponsErr && coupons) { A.coupons = coupons.map(couponFromDb); A.persist('admin_coupons', A.coupons); }
      if (!areasErr && areas && areas.length) { A.areas = areas.map(areaFromDb); A.persist('admin_areas', A.areas); }
      if (!bannersErr && banners && banners.length) { A.banners = banners.map(bannerFromDb); A.persist('admin_banners', A.banners); }
      if (!ordersErr && rawOrders) { A.orders = rawOrders.map(orderFromDb); A.persist('admin_orders', A.orders); A.updateOrdersBadge(); }
      if (!adminUsersErr && rawAdminUsers) {
        A.adminUsers = rawAdminUsers.map(u => ({ userId: u.user_id, name: u.name, email: u.email || '', role: u.role, active: u.active }));
        A.persist('admin_admin_users', A.adminUsers);
      }
      if (!insumosErr && rawInsumos) {
        A.insumos = rawInsumos.map(insumoFromDb);
        A.persist('admin_insumos', A.insumos);
      }
      if (!settingsErr && settingsRows && settingsRows.length) {
        settingsRows.forEach(row => {
          if (row.key === 'store_info') Object.assign(A.settings, row.value);
          else if (row.key === 'hours') Object.assign(A.settings.hours, row.value);
          else if (row.key === 'payments_enabled') Object.assign(A.settings.payments, row.value);
          else if (row.key === 'notifications') Object.assign(A.settings, row.value);
          else if (row.key === 'pix_config') Object.assign(A.settings, row.value);
          else if (row.key === 'delivery_geo') A.settings.deliveryGeo = row.value;
        });
        A.persist('admin_settings', A.settings);
      }
      A.showToast('Catálogo e configurações carregados do banco de dados real ✅');
      A.goToView(A.currentView || 'visao-geral');
      startOrdersPolling();
    } catch (e) {
      console.warn('Erro ao sincronizar com o Supabase:', e);
      A.showToast('Erro ao conectar com o banco — mostrando dados salvos localmente.', 'error');
    }
  }

  window.__brasaSyncCatalogFromSupabase = syncCatalogFromSupabase;
  window.__brasaCatalogSync = {
    upsertProduct, deleteProductRemote, upsertCategory, deleteCategoryRemote,
    upsertCoupon, deleteCouponRemote, upsertArea, deleteAreaRemote, upsertBanner, deleteBannerRemote, saveSettingsKey,
    updateOrderStatusRemote, upsertInsumo, deleteInsumoRemote, getFichaTecnica, saveFichaTecnica,
  };
})();
