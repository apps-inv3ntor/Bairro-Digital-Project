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
      store_display_name: preset.store_display_name, hero_title: preset.hero_title,
      hero_subtitle: preset.hero_subtitle,
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
      // Tudo acontece dentro de UMA função no banco (terraform_apply, ver migração
      // 0015) — ou aplica tudo, ou não aplica nada. Antes eram ~12 chamadas
      // separadas daqui do navegador; se qualquer uma no meio falhasse (como
      // vinha acontecendo com produtos/cupons já usados em pedidos reais), o
      // sistema ficava pela metade sem avisar ninguém.
      const { data, error } = await window.sb.rpc('terraform_apply', { p_preset_id: preset.id });
      if (error) {
        showToast('Erro ao terraformar: ' + error.message, 'error');
        return;
      }
      showToast(`Terraformado para "${preset.business_name}"! ${data?.products_inserted || 0} produtos novos. Recarregue o admin e confira o site público.`);
      A.goToView('produtos');
    } catch (err) {
      showToast('Erro inesperado ao terraformar: ' + (err.message || err), 'error');
    }
  }
})();
