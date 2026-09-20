// ============================================================
// BRASA BURGER CO. — ADMIN — Business (Multi-Delivery / Bairro Digital Project)
// ============================================================
(function () {
  'use strict';
  const A = window.__brasaAdmin;
  const showToast = A.showToast;
  const escapeHtml = A.escapeHtml;
  const showConfirm = window.__brasaShowConfirm;

  let presets = []; // sempre buscado fresco do banco ao entrar na tela — nunca fica em cache local

  async function fetchPresets() {
    if (!window.SUPABASE_READY) return [];
    const { data, error } = await window.sb.from('business_presets').select('*').order('business_name');
    if (error) { showToast('Erro ao buscar presets: ' + error.message, 'error'); return []; }
    return data || [];
  }

  A.VIEW_RENDERERS['business'] = async function renderBusiness() {
    const root = document.getElementById('viewContent');
    if (!window.SUPABASE_READY) {
      root.innerHTML = `<div class="empty-state"><div class="ic">🌎</div><h3>Conecte o Supabase</h3><p>A aba Business só funciona com o banco de verdade conectado.</p></div>`;
      return;
    }
    root.innerHTML = `<div class="empty-state"><p>Carregando presets...</p></div>`;
    presets = await fetchPresets();
    root.innerHTML = `
      <p class="muted" style="margin-bottom:20px; max-width:760px;">
        Cada card abaixo é um segmento de delivery completo (produtos, banner, cor, cupom) pronto pra assumir a
        identidade do site com um clique — sem apagar nada, tudo fica guardado aqui pra sempre.
      </p>
      <div class="product-admin-grid" id="businessGrid"></div>
      <div style="margin-top:24px; display:flex; gap:12px;">
        <button class="btn btn-secondary" id="importPresetBtn">📥 Importar Delivery</button>
        <input type="file" id="importPresetFile" accept="application/json" style="display:none;">
      </div>`;
    renderBusinessGrid();
    document.getElementById('importPresetBtn').addEventListener('click', () => document.getElementById('importPresetFile').click());
    document.getElementById('importPresetFile').addEventListener('change', handleImportFile);
  };

  function renderBusinessGrid() {
    const grid = document.getElementById('businessGrid');
    if (!grid) return;
    if (!presets.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ic">🌎</div><h3>Nenhum preset carregado ainda</h3></div>`;
      return;
    }
    grid.innerHTML = presets.map(p => `
      <div class="card product-admin-card" data-preset="${p.id}">
        <div class="pac-img"><img src="${p.banner_strip_url || p.logo_url || ''}" alt=""></div>
        <div class="pac-body">
          <h4 style="font-size:0.98rem;">${escapeHtml(p.business_name)}</h4>
          <div class="cat">${(p.products || []).length} produtos · categoria "${escapeHtml(p.category_title)}"</div>
          <div class="pac-actions" style="margin-top:10px;">
            <button class="btn btn-primary" data-terraformar="${p.id}" style="flex:1; justify-content:center;">🌎 Terraformar</button>
          </div>
          <div class="pac-actions" style="margin-top:8px;">
            <button class="btn btn-secondary" data-exportar="${p.id}" style="flex:1; justify-content:center;">Exportar</button>
            <button class="icon-only-btn" data-apagar="${p.id}" title="Apagar">🗑️</button>
          </div>
        </div>
      </div>`).join('');

    grid.querySelectorAll('[data-terraformar]').forEach(btn => btn.addEventListener('click', () => confirmTerraformar(btn.dataset.terraformar)));
    grid.querySelectorAll('[data-exportar]').forEach(btn => btn.addEventListener('click', () => exportPreset(btn.dataset.exportar)));
    grid.querySelectorAll('[data-apagar]').forEach(btn => btn.addEventListener('click', () => confirmApagar(btn.dataset.apagar)));
  }

  // ============================================================
  // EXPORTAR
  // ============================================================
  function exportPreset(id) {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preset_${p.business_name.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ============================================================
  // IMPORTAR (recebe um .json já pronto — nunca lê planilha/pasta direto)
  // ============================================================
  async function handleImportFile(e) {
    const file = e.target.files[0];
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois, se precisar
    if (!file) return;
    let preset;
    try {
      preset = JSON.parse(await file.text());
    } catch (err) {
      showToast('Esse arquivo não é um JSON válido.', 'error');
      return;
    }
    if (!preset.business_name || !Array.isArray(preset.products) || preset.products.length === 0) {
      showToast('Arquivo não parece um preset de delivery válido (faltou nome ou produtos).', 'error');
      return;
    }
    const { error } = await window.sb.from('business_presets').upsert({
      business_name: preset.business_name,
      category_title: preset.category_title || preset.business_name,
      logo_url: preset.logo_url, banner_strip_url: preset.banner_strip_url,
      banner_eyebrow: preset.banner_eyebrow, banner_title: preset.banner_title,
      banner_description: preset.banner_description, coupon_code: preset.coupon_code,
      coupon_label: preset.coupon_label, background_color: preset.background_color,
      section2_title: preset.section2_title, section3_title: preset.section3_title,
      offer_title: preset.offer_title,
      products: preset.products,
    }, { onConflict: 'business_name' });
    if (error) { showToast('Erro ao importar: ' + error.message, 'error'); return; }
    showToast(`Delivery "${preset.business_name}" importado!`);
    presets = await fetchPresets();
    renderBusinessGrid();
  }

  // ============================================================
  // APAGAR (dupla confirmação, como pedido)
  // ============================================================
  function confirmApagar(id) {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    showConfirm({
      icon: '🗑️', title: `Apagar o delivery "${p.business_name}"?`,
      text: 'Remove esse preset da lista pra sempre. Se ele estiver ativo no site agora, o site continua como está até você terraformar outro — isso aqui não muda nada no ar.',
      confirmLabel: 'Continuar', keepOpenOnConfirm: true,
      onConfirm: () => {
        showConfirm({
          icon: '⚠️', title: 'Confirmação final',
          text: `Clique de novo pra realmente apagar "${p.business_name}". Essa ação não tem volta.`,
          confirmLabel: 'Apagar de vez', confirmClass: 'btn-danger',
          onConfirm: async () => {
            const { error } = await window.sb.from('business_presets').delete().eq('id', id);
            if (error) { showToast('Erro ao apagar: ' + error.message, 'error'); return; }
            presets = presets.filter(x => x.id !== id);
            renderBusinessGrid();
            showToast('Delivery apagado');
          },
        });
      },
    });
  }

  // ============================================================
  // TERRAFORMAR (dupla confirmação + snapshot de segurança antes de tudo)
  // ============================================================
  function confirmTerraformar(id) {
    const p = presets.find(x => x.id === id);
    if (!p) return;
    showConfirm({
      icon: '🌎', title: `Terraformar o sistema para "${p.business_name}"?`,
      text: 'Troca a 1ª categoria e os produtos dela, o nome da loja, o banner grande e a cor do site. Porções, Bebidas, Sobremesas e Combos ficam intactos. Nada é apagado de verdade — sempre dá pra voltar.',
      confirmLabel: 'Continuar', keepOpenOnConfirm: true,
      onConfirm: () => {
        showConfirm({
          icon: '⚠️', title: 'Confirmação final',
          text: `Clique de novo pra realmente terraformar o sistema pra "${p.business_name}" agora.`,
          confirmLabel: 'Terraformar agora', confirmClass: 'btn-danger',
          onConfirm: () => runTerraformar(p),
        });
      },
    });
  }

  async function runTerraformar(preset) {
    showToast('Terraformando o sistema, aguenta aí...');
    try {
      // 1. Snapshot de segurança — cópia de tudo antes de mexer em qualquer coisa
      const [{ data: catSnap }, { data: prodSnap }, { data: settingsSnap }, { data: bannerSnap }] = await Promise.all([
        window.sb.from('categories').select('*'),
        window.sb.from('products').select('*'),
        window.sb.from('store_settings').select('*'),
        window.sb.from('banners').select('*'),
      ]);
      await window.sb.from('terraform_snapshots').insert({
        label: `Antes de terraformar para ${preset.business_name}`,
        categories: catSnap || [], products: prodSnap || [],
        store_settings: settingsSnap || [], banners: bannerSnap || [],
      });

      // 2. Acha a categoria "principal" (1ª por ordem de exibição, nunca a "Combos")
      const cats = (catSnap || []).slice().sort((a, b) => a.display_order - b.display_order);
      const primary = cats.find(c => c.name !== 'Combos');
      const combos = cats.find(c => c.name === 'Combos');
      if (!primary) { showToast('Não encontrei a categoria principal pra renomear — abortando.', 'error'); return; }

      // 3. Remove produtos de um terraform ANTERIOR (nunca toca em produto original da loja)
      await window.sb.from('products').delete().not('source_preset_id', 'is', null);

      // 4. Renomeia a categoria principal
      await window.sb.from('categories').update({ name: preset.category_title }).eq('id', primary.id);

      // 5. Insere os 13 produtos novos — "combo" vai pra Combos, o resto pra categoria principal
      const newProductsPayload = preset.products.map((prod) => ({
        category_id: (prod.is_combo && combos) ? combos.id : primary.id,
        name: prod.name, code: prod.sku, price: prod.price, image_url: prod.image_url,
        ingredients: prod.ingredients_text || '', active: true, source_preset_id: preset.id,
      }));
      const { data: insertedProducts, error: prodErr } = await window.sb.from('products')
        .insert(newProductsPayload).select('id, code');
      if (prodErr) { showToast('Erro ao inserir produtos: ' + prodErr.message, 'error'); return; }

      // 6. Insumos (Estoque) + ficha técnica — insumo é uma "biblioteca" compartilhada (nome é único),
      // então usamos upsert por nome em vez de sempre criar linha nova.
      for (let i = 0; i < preset.products.length; i++) {
        const prod = preset.products[i];
        const inserted = insertedProducts.find(ip => ip.code === prod.sku);
        if (!inserted) continue;
        for (const ins of (prod.insumos || [])) {
          const { data: insumoRow } = await window.sb.from('insumos')
            .upsert({
              nome: ins.name, unidade_medida: ins.unit,
              capacidade_maxima: Math.max(Number(ins.quantity) * 20, 1),
              quantidade_atual: Math.max(Number(ins.quantity) * 20, 1),
              cost_price: ins.cost_price, margin_pct: ins.margin_pct,
              gross_profit: ins.gross_profit, net_profit: ins.net_profit, profit_pct: ins.profit_pct,
            }, { onConflict: 'nome' })
            .select('id').single();
          if (!insumoRow) continue;
          await window.sb.from('ficha_tecnica').upsert({
            product_id: inserted.id, insumo_id: insumoRow.id, quantidade_gasta: ins.quantity,
          }, { onConflict: 'product_id,insumo_id' });
        }
      }

      // 7. Nome da loja + logo + H1/subtítulo do Banner de Topo (dentro de store_info) e
      // cor de fundo (chave "theme")
      const storeInfoRow = (settingsSnap || []).find(r => r.key === 'store_info');
      const newStoreInfo = Object.assign({}, storeInfoRow ? storeInfoRow.value : {}, {
        storeName: preset.business_name, logoUrl: preset.logo_url,
        heroTitle: preset.banner_title, heroSubtitle: preset.banner_description,
      });
      await window.sb.from('store_settings').upsert({ key: 'store_info', value: newStoreInfo }, { onConflict: 'key' });
      await window.sb.from('store_settings').upsert({ key: 'theme', value: { backgroundColor: preset.background_color } }, { onConflict: 'key' });

      // 7b. Faixa 2 e 3 da página inicial (títulos configuráveis por preset)
      const homeSectionsRow = (settingsSnap || []).find(r => r.key === 'home_sections');
      const newHomeSections = Object.assign({}, homeSectionsRow ? homeSectionsRow.value : {});
      newHomeSections.section2 = Object.assign({}, newHomeSections.section2, { title: preset.section2_title });
      newHomeSections.section3 = Object.assign({}, newHomeSections.section3, { title: preset.section3_title });
      await window.sb.from('store_settings').upsert({ key: 'home_sections', value: newHomeSections }, { onConflict: 'key' });

      // 7c. Banner de Oferta — eyebrow, código do cupom exibido, e agora também o
      // Título Grande (offer_title). Botão e pra-onde-leva continuam manuais.
      const promoBannerRow = (settingsSnap || []).find(r => r.key === 'promo_banner');
      const newPromoBanner = Object.assign({}, promoBannerRow ? promoBannerRow.value : {}, {
        eyebrow: preset.banner_eyebrow, couponCode: preset.coupon_code, title: preset.offer_title,
      });
      await window.sb.from('store_settings').upsert({ key: 'promo_banner', value: newPromoBanner }, { onConflict: 'key' });

      // 8. Banner grande: some com o de um terraform anterior, desativa qualquer outro banner
      // (pra não misturar identidade visual de negócios diferentes), e cria o novo, ativo, prioridade máxima.
      await window.sb.from('banners').delete().not('source_preset_id', 'is', null);
      const remainingBannerIds = (bannerSnap || []).filter(b => !b.source_preset_id).map(b => b.id);
      if (remainingBannerIds.length) {
        await window.sb.from('banners').update({ active: false }).in('id', remainingBannerIds);
      }
      await window.sb.from('banners').insert({
        title: preset.coupon_label || preset.banner_title, image_url: preset.banner_strip_url,
        media_type: 'image', display_seconds: 8, link: '#cardapio', priority: 1, active: true,
        source_preset_id: preset.id,
      });

      showToast(`Terraformado para "${preset.business_name}"! Recarregue o admin e confira o site público.`);
      A.goToView('produtos');
    } catch (err) {
      showToast('Erro inesperado ao terraformar: ' + (err.message || err), 'error');
    }
  }
})();
