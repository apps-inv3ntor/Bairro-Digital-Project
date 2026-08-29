/* ============================================================
   BRASA BURGER CO. — ADMIN — Configurações
   ============================================================ */
(function () {
  'use strict';
  const A = window.__brasaAdmin;
  const { showToast, persist, escapeHtml } = A;

  const DAY_LABELS = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };

  A.VIEW_RENDERERS['configuracoes'] = function renderSettings() {
    const root = document.getElementById('viewContent');
    root.innerHTML = `
      <div class="tabs-row" id="settingsTabs">
        <button class="tab-btn is-active" data-tab="loja">Dados da loja</button>
        <button class="tab-btn" data-tab="horarios">Horário de funcionamento</button>
        <button class="tab-btn" data-tab="pagamentos">Pagamentos</button>
        <button class="tab-btn" data-tab="usuarios">Usuários e permissões</button>
        <button class="tab-btn" data-tab="notificacoes">Notificações</button>
      </div>

      <div class="tab-panel is-active" id="tabLoja">
        <div class="card" style="padding:22px 24px; max-width:560px;">
          <div class="field"><label>Nome da loja</label><input type="text" id="sStoreName" value="${A.settings.storeName}"></div>
          <div class="field"><label>Telefone / WhatsApp</label><input type="text" id="sPhone" value="${A.settings.phone}"></div>
          <div class="field"><label>Endereço</label><input type="text" id="sAddress" value="${A.settings.address}"></div>
          <div class="field"><label>Instagram</label><input type="text" id="sInstagram" value="${A.settings.instagram}"></div>
          <div class="field"><label>Pedido mínimo geral (R$)</label><input type="number" min="0" step="0.01" id="sMinOrder" value="${A.settings.minOrder}"></div>
          <button class="btn btn-primary" id="saveStoreBtn">Salvar alterações</button>
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
      const map = { loja: 'tabLoja', horarios: 'tabHorarios', pagamentos: 'tabPagamentos', usuarios: 'tabUsuarios', notificacoes: 'tabNotificacoes' };
      document.getElementById(map[btn.dataset.tab]).classList.add('is-active');
    });

    document.getElementById('saveStoreBtn').addEventListener('click', async () => {
      A.settings.storeName = document.getElementById('sStoreName').value.trim();
      A.settings.phone = document.getElementById('sPhone').value.trim();
      A.settings.address = document.getElementById('sAddress').value.trim();
      A.settings.instagram = document.getElementById('sInstagram').value.trim();
      A.settings.minOrder = parseFloat(document.getElementById('sMinOrder').value) || 0;
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('store_info', { storeName: A.settings.storeName, phone: A.settings.phone, address: A.settings.address, instagram: A.settings.instagram, minOrder: A.settings.minOrder });
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Dados da loja atualizados');
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
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('hours', A.settings.hours);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
      }
      showToast('Horários de funcionamento atualizados');
    });

    document.querySelectorAll('[data-pay]').forEach(t => t.addEventListener('click', function () { this.classList.toggle('is-on'); }));
    document.getElementById('savePaymentsBtn').addEventListener('click', async () => {
      document.querySelectorAll('[data-pay]').forEach(t => { A.settings.payments[t.dataset.pay] = t.classList.contains('is-on'); });
      persist('admin_settings', A.settings);
      const sync = window.__brasaCatalogSync;
      if (sync) {
        const res = await sync.saveSettingsKey('payments_enabled', A.settings.payments);
        if (!res.ok) { showToast('Salvo localmente, mas falhou ao gravar no banco: ' + (res.error && res.error.message || ''), 'error'); return; }
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

    document.getElementById('newUserBtn').addEventListener('click', () => showToast('Convite enviado por e-mail (simulado)'));
  }
})();
