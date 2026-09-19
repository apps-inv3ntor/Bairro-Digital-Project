/* ============================================================
   BRASA BURGER CO. — ADMIN — Configurações
   ============================================================ */
(function () {
  'use strict';
  const A = window.__brasaAdmin;
  const { showToast, persist, escapeHtml, uid } = A;

  const DAY_LABELS = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };

  function faqItemRow(item, i) {
    return `
      <div class="field-row" data-faq-row="${item.id}" style="align-items:flex-start; border-bottom:1px solid var(--border); padding:14px 0;">
        <div class="field" style="flex:1;"><label>Pergunta ${i + 1}</label><input type="text" data-faq-question value="${escapeHtml(item.question)}"></div>
        <button class="btn btn-danger" data-remove-faq="${item.id}" type="button" style="margin-top:26px; padding:8px 12px;" title="Remover pergunta">🗑️</button>
      </div>
      <div class="field" style="margin-top:-8px; margin-bottom:14px;"><label>Resposta</label><textarea rows="2" data-faq-answer>${escapeHtml(item.answer)}</textarea></div>`;
  }

  A.VIEW_RENDERERS['configuracoes'] = function renderSettings() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="tabs-row" id="settingsTabs">
        <button class="tab-btn is-active" data-tab="loja">Dados da loja</button>
        <button class="tab-btn" data-tab="entrega">Raio de cobertura</button>
        <button class="tab-btn" data-tab="horarios">Horário de funcionamento</button>
        <button class="tab-btn" data-tab="pagamentos">Pagamentos</button>
        <button class="tab-btn" data-tab="home">Página inicial</button>
        <button class="tab-btn" data-tab="banner">Banner de oferta</button>
        <button class="tab-btn" data-tab="faq">Perguntas frequentes</button>
        <button class="tab-btn" data-tab="usuarios">Usuários e permissões</button>
        <button class="tab-btn" data-tab="notificacoes">Notificações</button>
      </div>

      <div class="tab-panel is-active" id="tabLoja">
        <div class="card" style="padding:22px 24px; max-width:560px;">
          <div class="field"><label>Nome da loja</label><input type="text" id="sStoreName" value="${A.settings.storeName}"></div>
          <div class="field"><label>Telefone / WhatsApp</label><input type="text" id="sPhone" value="${A.settings.phone}"></div>
          <div class="field"><label>Rua e número</label><input type="text" id="sAddressStreet" value="${A.settings.addressStreet || ''}" placeholder="Ex: Rua do Balneário, 369"></div>
          <div class="field-row">
            <div class="field"><label>Bairro</label><input type="text" id="sAddressNeighborhood" value="${A.settings.addressNeighborhood || ''}" placeholder="Ex: Amaralina"></div>
            <div class="field"><label>CEP</label><input type="text" id="sAddressCep" value="${A.settings.addressCep || ''}" placeholder="00000-000"></div>
          </div>
          <div class="field"><label>Cidade</label><input type="text" id="sAddressCity" value="${A.settings.addressCity || ''}" placeholder="Ex: Salvador"></div>
          <div class="field"><label>Instagram</label><input type="text" id="sInstagram" value="${A.settings.instagram}"></div>
          <div class="field"><label>Pedido mínimo geral (R$)</label><input type="number" min="0" step="0.01" id="sMinOrder" value="${A.settings.minOrder}"></div>
          <button class="btn btn-primary" id="saveStoreBtn">Salvar alterações</button>
        </div>
      </div>

      <div class="tab-panel" id="tabEntrega">
        <div class="card" style="padding:22px 24px; max-width:560px;">
          <p class="muted" style="margin:0 0 14px;">Usamos o endereço já cadastrado em "Dados da loja" como o ponto central. Defina o raio máximo de entrega — qualquer cliente fora desse raio verá a mensagem de que a região ainda não é atendida. <strong>Isso não define a taxa de entrega</strong> — quem faz isso continua sendo a lista de bairros em "Marketing → Áreas de entrega".</p>
          <div class="field"><label>Raio máximo de entrega (km)</label><input type="number" min="1" step="0.5" id="sDeliveryRadius" value="${A.settings.deliveryGeo && A.settings.deliveryGeo.radiusKm || 5}"></div>
          <button class="btn btn-secondary" id="locateStoreBtn" type="button" style="margin-bottom:14px;">📍 Localizar endereço da loja</button>
          <div id="geoResultBox" class="muted" style="font-size:0.85rem; margin-bottom:14px;">
            ${A.settings.deliveryGeo && A.settings.deliveryGeo.lat ? `Localização salva: ${A.settings.deliveryGeo.lat.toFixed(5)}, ${A.settings.deliveryGeo.lng.toFixed(5)}` : 'Ainda não localizado — clique no botão acima.'}
          </div>
          <button class="btn btn-primary" id="saveDeliveryGeoBtn">Salvar área de entrega</button>
        </div>
      </div>

      <div class="tab-panel" id="tabHorarios">
        <div class="card" style="padding:8px 24px; max-width:640px;">
          ${Object.keys(DAY_LABELS).map(day => {
            const d = A.settings.hours[day];
            return `
            <div class="field-inline" data-day="${day}">
              <span class="fi-label" style="width:90px;">${DAY_LABELS[day]}</span>
              <button class="toggle ${d.open ? 'is-on' : ''}" data-day-toggle="${day}" type="button"></button>
              <input type="time" value="${d.from || '18:00'}" data-day-from="${day}" style="width:110px; background:var(--card); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:6px 8px;" ${!d.open ? 'disabled' : ''}>
              <span class="muted">até</span>
              <input type="time" value="${d.to || '23:30'}" data-day-to="${day}" style="width:110px; background:var(--card); border:1px solid var(--border); border-radius:8px; color:var(--text); padding:6px 8px;" ${!d.open ? 'disabled' : ''}>
            </div>`;
          }).join('')}
          <div style="padding:16px 0 4px;"><button class="btn btn-primary" id="saveHoursBtn">Salvar horários</button></div>
        </div>
      </div>

      <div class="tab-panel" id="tabPagamentos">
        <div class="card" style="padding:8px 24px; max-width:480px;">
          <div class="field-inline"><span class="fi-label">Pix</span><button class="toggle ${A.settings.payments.pix ? 'is-on' : ''}" data-pay="pix" type="button"></button></div>
          <div class="field-inline"><span class="fi-label">Cartão de débito</span><button class="toggle ${A.settings.payments.debito ? 'is-on' : ''}" data-pay="debito" type="button"></button></div>
          <div class="field-inline"><span class="fi-label">Cartão de crédito</span><button class="toggle ${A.settings.payments.credito ? 'is-on' : ''}" data-pay="credito" type="button"></button></div>
          <div class="field-inline"><span class="fi-label">Dinheiro</span><button class="toggle ${A.settings.payments.dinheiro ? 'is-on' : ''}" data-pay="dinheiro" type="button"></button></div>
          <div style="padding:16px 0 4px;"><button class="btn btn-primary" id="savePaymentsBtn">Salvar formas de pagamento</button></div>
        </div>
        <div class="card" style="padding:22px 24px; max-width:480px; margin-top:16px;">
          <p class="muted" style="margin:0 0 14px;">Dados exibidos pro cliente na hora de pagar via Pix. <strong>Não é aqui</strong> que fica a integração com o Mercado Pago — o Access Token de pagamento fica só nos Secrets das Edge Functions do Supabase, nunca no site.</p>
          <div class="field"><label>Chave Pix</label><input type="text" id="sPixKey" value="${A.settings.pixKey || ''}" placeholder="CPF, e-mail, telefone ou chave aleatória"></div>
          <div class="field"><label>Nome do recebedor</label><input type="text" id="sPixRecipient" value="${A.settings.pixRecipient || ''}" placeholder="Ex: Brasa Burger Co."></div>
          <button class="btn btn-primary" id="savePixBtn">Salvar dados do Pix</button>
        </div>
      </div>

      <div class="tab-panel" id="tabHome">
        <div class="card" style="padding:22px 24px; max-width:640px;">
          <p class="muted" style="margin:0 0 14px;">A 1ª faixa da home ("Mais pedidos") sempre mostra os produtos marcados como destaque em "Produtos". As outras duas você customiza aqui: o título e quais categorias de produto aparecem em cada uma.</p>
          ${['section2', 'section3'].map((key, i) => {
            const sec = A.settings.homeSections[key];
            return `
            <div style="border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:14px;">
              <div class="field"><label>Título da faixa ${i + 2}</label><input type="text" id="sHome${key}Title" value="${escapeHtml(sec.title)}"></div>
              <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:var(--muted, #999);">Quais categorias aparecem nessa faixa</label>
              <div style="display:flex; flex-wrap:wrap; gap:8px;">
                ${(A.categories || []).map(c => `
                  <label style="display:flex; align-items:center; gap:6px; border:1px solid var(--border); border-radius:8px; padding:6px 10px; cursor:pointer; font-size:0.85rem;">
                    <input type="checkbox" data-home-cat="${key}" value="${c.id}" ${sec.categoryIds.includes(c.id) ? 'checked' : ''}> ${escapeHtml(c.name)}
                  </label>`).join('')}
              </div>
            </div>`;
          }).join('')}
          <button class="btn btn-primary" id="saveHomeSectionsBtn">Salvar faixas da home</button>
        </div>

        <div class="card" style="padding:22px 24px; max-width:640px; margin-top:20px;">
          <h3 style="margin:0 0 4px;">Seu pedido em 3 passos</h3>
          <p class="muted" style="margin:0 0 14px;">Só o título e o texto de cada passo são editáveis — a ordem e os números (01, 02, 03) são fixos.</p>
          ${A.settings.howItWorks.map((step, i) => `
            <div style="border:1px solid var(--border); border-radius:12px; padding:16px; margin-bottom:14px;">
              <div class="field"><label>Título do passo ${i + 1}</label><input type="text" id="sStep${i}Title" value="${escapeHtml(step.title)}"></div>
              <div class="field"><label>Texto do passo ${i + 1}</label><textarea id="sStep${i}Desc" rows="2">${escapeHtml(step.description)}</textarea></div>
            </div>`).join('')}
          <button class="btn btn-primary" id="saveHowItWorksBtn">Salvar textos dos 3 passos</button>
        </div>
      </div>

      <div class="tab-panel" id="tabBanner">
        <div class="card" style="padding:22px 24px; max-width:560px;">
          <div class="field-inline" style="margin-bottom:14px;"><span class="fi-label">Banner ativo</span><button class="toggle ${A.settings.promoBanner.active ? 'is-on' : ''}" id="bannerActiveToggle" type="button"></button></div>
          <div class="field"><label>Texto pequeno (acima do título)</label><input type="text" id="sBannerEyebrow" value="${escapeHtml(A.settings.promoBanner.eyebrow)}"></div>
          <div class="field"><label>Título (use quebra de linha pra 2 linhas)</label><textarea id="sBannerTitle" rows="2">${escapeHtml(A.settings.promoBanner.title)}</textarea></div>
          <div class="field"><label>Texto do botão</label><input type="text" id="sBannerButtonText" value="${escapeHtml(A.settings.promoBanner.buttonText)}"></div>
          <div class="field">
            <label>Pra onde o botão leva</label>
            <select id="sBannerLinkTarget">
              <option value="#cardapio" ${A.settings.promoBanner.linkTarget === '#cardapio' ? 'selected' : ''}>Cardápio (topo)</option>
              ${(A.categories || []).map(c => `<option value="#cat-${c.id}" ${A.settings.promoBanner.linkTarget === '#cat-' + c.id ? 'selected' : ''}>Categoria: ${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field-row">
            <div class="field"><label>Texto do selo de cupom</label><input type="text" id="sBannerCouponLabel" value="${escapeHtml(A.settings.promoBanner.couponLabel)}"></div>
            <div class="field"><label>Código do cupom exibido</label><input type="text" id="sBannerCouponCode" value="${escapeHtml(A.settings.promoBanner.couponCode)}"></div>
          </div>
          <p class="muted" style="font-size:0.8rem; margin:4px 0 14px;">Esse código é só o texto mostrado no banner (o "selo") — pra ele realmente dar desconto, crie um cupom de verdade com esse mesmo código em Marketing → Cupons.</p>
          <button class="btn btn-primary" id="saveBannerBtn">Salvar banner</button>
        </div>
      </div>

      <div class="tab-panel" id="tabFaq">
        <div class="toolbar"><button class="btn btn-primary" id="addFaqBtn" style="margin-left:auto;">+ Nova pergunta</button></div>
        <div class="card" style="padding:8px 24px;" id="faqEditorList">
          ${A.settings.faq.map((item, i) => faqItemRow(item, i)).join('')}
        </div>
        <div style="padding:16px 0;"><button class="btn btn-primary" id="saveFaqBtn">Salvar perguntas frequentes</button></div>
      </div>

      <div class="tab-panel" id="tabUsuarios">
        <div class="toolbar"><button class="btn btn-primary" id="newUserBtn" style="margin-left:auto;">+ Convidar usuário</button></div>
        <div class="card table-wrap">
          <table class="data-table">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Status</th><th></th></tr></thead>
            <tbody id="usersTableBody">
              ${(A.adminUsers || []).map(u => `
                <tr data-user="${u.userId}">
                  <td style="display:flex; align-items:center; gap:10px;"><div class="avatar-initials" style="width:28px;height:28px;font-size:0.66rem;">${(u.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>${escapeHtml(u.name || '')}</td>
                  <td class="muted">${escapeHtml(u.email || '')}</td>
                  <td><span class="pill pill-gray">${u.role}</span></td>
                  <td><span class="pill ${u.active ? 'pill-green' : 'pill-gray'}">${u.active ? 'Ativo' : 'Inativo'}</span></td>
                  <td style="text-align:right; white-space:nowrap;">
                    <button class="btn btn-secondary" data-toggle-user="${u.userId}" style="padding:6px 10px; font-size:0.75rem;">${u.active ? 'Desativar' : 'Ativar'}</button>
                    <button class="btn btn-danger" data-delete-user="${u.userId}" style="padding:6px 10px; font-size:0.75rem;">Excluir</button>
                  </td>
                </tr>`).join('') || `<tr><td colspan="5" class="muted" style="text-align:center; padding:24px;">Nenhum usuário cadastrado ainda.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>

      <div class="tab-panel" id="tabNotificacoes">
        <div class="card" style="padding:8px 24px; max-width:480px;">
          <div class="field-inline"><span class="fi-label">Notificar novos pedidos</span><button class="toggle ${A.settings.notifyNewOrder ? 'is-on' : ''}" data-notif="notifyNewOrder" type="button"></button></div>
          <div class="field-inline"><span class="fi-label">Som ao receber pedido</span><button class="toggle ${A.settings.notifySound ? 'is-on' : ''}" data-notif="notifySound" type="button"></button></div>
          <div class="field-inline"><span class="fi-label">Alertar produtos esgotando</span><button class="toggle ${A.settings.notifyLowStock ? 'is-on' : ''}" data-notif="notifyLowStock" type="button"></button></div>
          <div style="padding:16px 0 4px;"><button class="btn btn-primary" id="saveNotifBtn">Salvar preferências</button></div>
        </div>
      </div>`;

    bindSettingsEvents();
    bindUsersEvents();
  };

  function bindUsersEvents() {
    const newUserBtn = document.getElementById('newUserBtn');
    if (newUserBtn) newUserBtn.addEventListener('click', () => {
      const name = prompt('Nome da pessoa:');
      if (!name) return;
      const email = prompt('E-mail (vai receber um convite pra criar a senha):');
      if (!email) return;
      const role = prompt('Função (administrador, atendente ou cozinha):', 'atendente');
      if (!role || !['administrador', 'atendente', 'cozinha'].includes(role)) { showToast('Função inválida', 'error'); return; }
      inviteUser(name, email, role);
    });

    document.querySelectorAll('[data-toggle-user]').forEach(btn => btn.addEventListener('click', () => toggleUserActive(btn.dataset.toggleUser)));
    document.querySelectorAll('[data-delete-user]').forEach(btn => btn.addEventListener('click', () => deleteAdminUser(btn.dataset.deleteUser)));
  }

  async function inviteUser(name, email, role) {
    if (!window.SUPABASE_READY) { showToast('Conecte o Supabase pra convidar usuários de verdade.', 'error'); return; }
    showToast('Enviando convite...');
    const { data, error } = await window.sb.functions.invoke('invite-admin-user', { body: { name, email, role } });
    if (error || !data || data.error) {
      showToast('Não foi possível convidar: ' + ((data && data.error) || (error && error.message) || 'erro desconhecido'), 'error');
      return;
    }
    showToast('Convite enviado! A pessoa recebe um e-mail pra criar a senha.');
    await window.__brasaSyncCatalogFromSupabase();
  }

  async function toggleUserActive(userId) {
    const u = (A.adminUsers || []).find(x => x.userId === userId);
    if (!u || !window.SUPABASE_READY) return;
    const { error } = await window.sb.from('admin_users').update({ active: !u.active }).eq('user_id', userId);
    if (error) { showToast('Falhou ao atualizar: ' + error.message, 'error'); return; }
    u.active = !u.active;
    A.goToView('configuracoes');
    showToast(u.active ? 'Usuário ativado' : 'Usuário desativado');
  }

  async function deleteAdminUser(userId) {
    const u = (A.adminUsers || []).find(x => x.userId === userId);
    if (!u) return;
    if (!confirm(`Remover o acesso de administrador de ${u.name}? Essa ação não pode ser desfeita.`)) return;
    const { error } = await window.sb.from('admin_users').delete().eq('user_id', userId);
    if (error) { showToast('Falhou ao excluir: ' + error.message, 'error'); return; }
    A.adminUsers = (A.adminUsers || []).filter(x => x.userId !== userId);
    A.goToView('configuracoes');
    showToast('Acesso removido');
  }

  function bindSettingsEvents() {
    document.getElementById('settingsTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('is-active'));
      btn.classList.add('is-active');
      const map = { loja: 'tabLoja', entrega: 'tabEntrega', horarios: 'tabHorarios', pagamentos: 'tabPagamentos', home: 'tabHome', banner: 'tabBanner', faq: 'tabFaq', usuarios: 'tabUsuarios', notificacoes: 'tabNotificacoes' };
      document.getElementById(map[btn.dataset.tab]).classList.add('is-active');
    });

    document.getElementById('saveStoreBtn').addEventListener('click', async () => {
      A.settings.storeName = document.getElementById('sStoreName').value.trim();
      A.settings.phone = document.getElementById('sPhone').value.trim();
      A.settings.addressStreet = document.getElementById('sAddressStreet').value.trim();
      A.settings.addressNeighborhood = document.getElementById('sAddressNeighborhood').value.trim();
      A.settings.addressCep = document.getElementById('sAddressCep').value.trim();
      A.settings.addressCity = document.getElementById('sAddressCity').value.trim();
      A.settings.address = [A.settings.addressStreet, A.settings.addressNeighborhood, A.settings.addressCity, A.settings.addressCep].filter(Boolean).join(', ');
      A.settings.instagram = document.getElementById('sInstagram').value.trim();
      A.settings.minOrder = parseFloat(document.getElementById('sMinOrder').value) || 0;
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('store_info', {
          storeName: A.settings.storeName, phone: A.settings.phone, address: A.settings.address,
          addressStreet: A.settings.addressStreet, addressNeighborhood: A.settings.addressNeighborhood, addressCep: A.settings.addressCep, addressCity: A.settings.addressCity,
          instagram: A.settings.instagram, minOrder: A.settings.minOrder,
        });
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Dados da loja atualizados');
    });

    let pendingGeo = A.settings.deliveryGeo || null;
    const locateBtn = document.getElementById('locateStoreBtn');
    if (locateBtn) locateBtn.addEventListener('click', async () => {
      const { addressStreet, addressNeighborhood, addressCity, addressCep } = A.settings;
      if (!addressStreet || !addressNeighborhood) { showToast('Cadastre rua e bairro da loja na aba "Dados da loja" primeiro.', 'error'); return; }
      locateBtn.disabled = true;
      locateBtn.textContent = 'Localizando...';
      const tryGeocode = async (parts) => {
        const q = parts.filter(Boolean).join(', ') + ', Brasil';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        return res.json();
      };
      try {
        // Primeira tentativa: endereço completo com CEP. Se não achar, tenta de novo sem o CEP
        // (às vezes o Nominatim não reconhece o CEP junto com o resto do endereço).
        let results = await tryGeocode([addressStreet, addressNeighborhood, addressCity, addressCep]);
        if (!results.length) results = await tryGeocode([addressStreet, addressNeighborhood, addressCity]);
        if (!results.length) { showToast('Não encontramos esse endereço — confira rua e bairro e tente de novo.', 'error'); return; }
        pendingGeo = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), radiusKm: pendingGeo?.radiusKm || 5 };
        document.getElementById('geoResultBox').textContent = `Encontrado: ${pendingGeo.lat.toFixed(5)}, ${pendingGeo.lng.toFixed(5)} — clique em "Salvar" pra confirmar.`;
        showToast('Endereço localizado!');
      } catch (e) {
        showToast('Erro ao localizar endereço. Tente novamente.', 'error');
      } finally {
        locateBtn.disabled = false;
        locateBtn.textContent = '📍 Localizar endereço da loja';
      }
    });

    const saveGeoBtn = document.getElementById('saveDeliveryGeoBtn');
    if (saveGeoBtn) saveGeoBtn.addEventListener('click', async () => {
      const radiusKm = parseFloat(document.getElementById('sDeliveryRadius').value) || 5;
      if (!pendingGeo || !pendingGeo.lat) { showToast('Clique em "Localizar endereço da loja" antes de salvar.', 'error'); return; }
      pendingGeo.radiusKm = radiusKm;
      A.settings.deliveryGeo = pendingGeo;
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('delivery_geo', pendingGeo);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Área de entrega salva!');
    });

    document.querySelectorAll('[data-day-toggle]').forEach(t => t.addEventListener('click', function () {
      this.classList.toggle('is-on');
      const day = this.dataset.dayToggle;
      const row = this.closest('[data-day]');
      row.querySelectorAll('input[type=time]').forEach(inp => { inp.disabled = !this.classList.contains('is-on'); });
    }));
    document.getElementById('saveHoursBtn').addEventListener('click', async () => {
      Object.keys(DAY_LABELS).forEach(day => {
        const open = document.querySelector(`[data-day-toggle="${day}"]`).classList.contains('is-on');
        const from = document.querySelector(`[data-day-from="${day}"]`).value;
        const to = document.querySelector(`[data-day-to="${day}"]`).value;
        A.settings.hours[day] = { open, from, to };
      });
      // Mantém a pergunta "Qual o horário de funcionamento?" do FAQ sempre batendo com o
      // horário real — é exatamente o que estava desatualizado antes.
      const faqHours = A.settings.faq.find(f => f.id === 'f1');
      let faqNeedsSync = false;
      if (faqHours) { faqHours.answer = A.describeHours(A.settings.hours); faqNeedsSync = true; }
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('hours', A.settings.hours);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
        if (faqNeedsSync) await sync.saveSettingsKey('faq_items', A.settings.faq);
      }
      showToast('Horários de funcionamento atualizados');
    });

    document.querySelectorAll('[data-pay]').forEach(t => t.addEventListener('click', function () { this.classList.toggle('is-on'); }));
    document.getElementById('savePaymentsBtn').addEventListener('click', async () => {
      document.querySelectorAll('[data-pay]').forEach(t => { A.settings.payments[t.dataset.pay] = t.classList.contains('is-on'); });
      // Mesma lógica: mantém a pergunta de formas de pagamento do FAQ sempre correta.
      const faqPay = A.settings.faq.find(f => f.id === 'f2');
      let faqNeedsSync = false;
      if (faqPay) { faqPay.answer = A.describePayments(A.settings.payments); faqNeedsSync = true; }
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('payments_enabled', A.settings.payments);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
        if (faqNeedsSync) await sync.saveSettingsKey('faq_items', A.settings.faq);
      }
      showToast('Formas de pagamento atualizadas');
    });

    document.getElementById('savePixBtn').addEventListener('click', async () => {
      A.settings.pixKey = document.getElementById('sPixKey').value.trim();
      A.settings.pixRecipient = document.getElementById('sPixRecipient').value.trim();
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('pix_config', { pixKey: A.settings.pixKey, pixRecipient: A.settings.pixRecipient });
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Dados do Pix atualizados');
    });

    document.querySelectorAll('[data-notif]').forEach(t => t.addEventListener('click', function () { this.classList.toggle('is-on'); }));
    document.getElementById('saveNotifBtn').addEventListener('click', async () => {
      document.querySelectorAll('[data-notif]').forEach(t => { A.settings[t.dataset.notif] = t.classList.contains('is-on'); });
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('notifications', { notifyNewOrder: A.settings.notifyNewOrder, notifySound: A.settings.notifySound, notifyLowStock: A.settings.notifyLowStock });
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Preferências de notificação atualizadas');
    });

    document.getElementById('saveHomeSectionsBtn').addEventListener('click', async () => {
      ['section2', 'section3'].forEach(key => {
        A.settings.homeSections[key].title = document.getElementById(`sHome${key}Title`).value.trim();
        A.settings.homeSections[key].categoryIds = [...document.querySelectorAll(`[data-home-cat="${key}"]:checked`)].map(el => el.value);
      });
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('home_sections', A.settings.homeSections);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Faixas da home atualizadas');
    });

    document.getElementById('saveHowItWorksBtn').addEventListener('click', async () => {
      A.settings.howItWorks.forEach((step, i) => {
        step.title = document.getElementById(`sStep${i}Title`).value.trim();
        step.description = document.getElementById(`sStep${i}Desc`).value.trim();
      });
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('how_it_works', A.settings.howItWorks);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Textos dos 3 passos atualizados');
    });

    const bannerToggle = document.getElementById('bannerActiveToggle');
    if (bannerToggle) bannerToggle.addEventListener('click', () => bannerToggle.classList.toggle('is-on'));
    document.getElementById('saveBannerBtn').addEventListener('click', async () => {
      A.settings.promoBanner = {
        active: bannerToggle.classList.contains('is-on'),
        eyebrow: document.getElementById('sBannerEyebrow').value.trim(),
        title: document.getElementById('sBannerTitle').value,
        buttonText: document.getElementById('sBannerButtonText').value.trim(),
        linkTarget: document.getElementById('sBannerLinkTarget').value,
        couponLabel: document.getElementById('sBannerCouponLabel').value.trim(),
        couponCode: document.getElementById('sBannerCouponCode').value.trim(),
      };
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('promo_banner', A.settings.promoBanner);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Banner de oferta atualizado');
    });

    function rerenderFaqList() {
      document.getElementById('faqEditorList').innerHTML = A.settings.faq.map((item, i) => faqItemRow(item, i)).join('');
      bindFaqRowEvents();
    }
    function bindFaqRowEvents() {
      document.querySelectorAll('[data-remove-faq]').forEach(btn => btn.addEventListener('click', () => {
        A.settings.faq = A.settings.faq.filter(f => f.id !== btn.dataset.removeFaq);
        rerenderFaqList();
      }));
    }
    bindFaqRowEvents();
    document.getElementById('addFaqBtn').addEventListener('click', () => {
      A.settings.faq.push({ id: uid('faq'), question: '', answer: '' });
      rerenderFaqList();
    });
    document.getElementById('saveFaqBtn').addEventListener('click', async () => {
      const rows = [...document.querySelectorAll('[data-faq-row]')];
      A.settings.faq = rows.map(row => ({
        id: row.dataset.faqRow,
        question: row.querySelector('[data-faq-question]').value.trim(),
        answer: row.nextElementSibling.querySelector('[data-faq-answer]').value.trim(),
      })).filter(f => f.question); // remove perguntas deixadas em branco
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('faq_items', A.settings.faq);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Perguntas frequentes atualizadas');
      rerenderFaqList();
    });

    document.getElementById('newUserBtn').addEventListener('click', () => showToast('Convite enviado por e-mail (simulado)'));
  }
})();
