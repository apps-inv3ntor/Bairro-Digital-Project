/* ============================================================
   BRASA BURGER CO. — ADMIN — Funções e permissões (o que cada usuário vê no painel)
   ============================================================
   Arquivo novo. Regras (decididas com o dono do sistema):
   - PERMISSÕES VAZIAS (null) = ACESSO TOTAL. É o caso de quem já era administrador antes
     das permissões existirem: ninguém perde nada, nem a tela Business.
   - Isto controla o que APARECE no painel (menus, abas e sub-abas). Não troca as regras de
     segurança do banco — por isso é "só no painel".
   - Se o painel não conseguir descobrir quem está logado, NÃO esconde nada: melhor mostrar
     demais do que trancar o dono pra fora.
   ============================================================ */
(function () {
  'use strict';
  const A = () => window.__brasaAdmin;

  const ROLES = [['proprietario', 'Proprietário'], ['administrador', 'Administrador'], ['parceiro', 'Parceiro'], ['atendente', 'Atendente'], ['cozinha', 'Cozinha']];
  const MENUS = [
    ['visao-geral', 'Visão geral'], ['dashboard', 'Dashboard'], ['pedidos', 'Pedidos'], ['produtos', 'Produtos'], ['categorias', 'Categorias'],
    ['adicionais', 'Adicionais'], ['estoque', 'Estoque'], ['cupons', 'Cupons'], ['areas', 'Áreas de entrega'], ['banners', 'Banners'],
    ['configuracoes', 'Configurações'], ['business', 'Business'],
  ];
  const CHILDREN = {
    dashboard: [['vendas', 'Vendas'], ['detalhe', 'Vendas detalhadas'], ['insumos', 'Insumos'], ['produtos', 'Produtos']],
    configuracoes: [['loja', 'Dados da loja'], ['horarios', 'Horário de funcionamento'], ['pagamentos', 'Pagamentos'], ['home', 'Página inicial'],
      ['topo', 'Banner de Topo'], ['banner', 'Banner de oferta'], ['rodape', 'Texto do Rodapé'], ['faq', 'Perguntas frequentes'],
      ['usuarios', 'Usuários e permissões'], ['notificacoes', 'Notificações']],
  };
  const keyMenu = (id) => 'menu.' + id;
  const keyChild = (parent, child) => parent + '.' + child;
  const KEYS = [];
  MENUS.forEach(([id]) => { KEYS.push(keyMenu(id)); (CHILDREN[id] || []).forEach(([c]) => KEYS.push(keyChild(id, c))); });

  // Padrões ao escolher uma função no seletor (a pessoa pode ajustar os marcadores depois)
  const DEFAULTS = (() => {
    const all = {}; KEYS.forEach(k => { all[k] = true; });
    const without = (...off) => { const o = { ...all }; off.forEach(k => { o[k] = false; }); return o; };
    const only = (...on) => { const o = {}; KEYS.forEach(k => { o[k] = false; }); on.forEach(k => { o[k] = true; }); return o; };
    return {
      proprietario: { ...all },
      administrador: without('menu.business', 'configuracoes.usuarios'),
      parceiro: without('menu.business', 'configuracoes.usuarios'),
      atendente: only('menu.visao-geral', 'menu.pedidos', 'menu.produtos'),
      cozinha: only('menu.pedidos'),
    };
  })();
  const defaultsFor = (role) => ({ ...(DEFAULTS[role] || DEFAULTS.administrador) });
  const roleLabel = (role) => (ROLES.find(r => r[0] === role) || [role, role || ''])[1];

  /* ---------- quem está logado ---------- */
  let myUserId = null;
  async function ensureMe() {
    if (!window.SUPABASE_READY || !window.sb || !window.sb.auth) return;
    try {
      const { data } = await window.sb.auth.getSession();
      myUserId = (data && data.session && data.session.user && data.session.user.id) || null;
    } catch (_) { /* mantém o que já sabia */ }
  }
  function me() {
    const a = A();
    if (!myUserId || !a) return null;
    return (a.adminUsers || []).find(u => u.userId === myUserId) || null;
  }

  /* ---------- o que cada pessoa pode ver ---------- */
  function can(key, row) {
    if (!row) return true;                                   // não sei quem é → não esconde nada
    const p = row.permissions;
    if (p === null || p === undefined || typeof p !== 'object') return true;   // legado: acesso total
    if (key in p) return p[key] === true;
    const d = DEFAULTS[row.role];                             // chave nova (ex.: aba criada depois) → padrão da função
    return d ? d[key] === true : true;
  }
  const isKnownMenu = (view) => MENUS.some(m => m[0] === view);
  const canView = (view, row = me()) => !isKnownMenu(view) || can(keyMenu(view), row);
  const canTab = (parent, child, row = me()) => canView(parent, row) && can(keyChild(parent, child), row);
  function firstAllowedView(row = me()) {
    const m = MENUS.find(([id]) => canView(id, row));
    return m ? m[0] : 'visao-geral';
  }

  /* ---------- gestão de usuários ---------- */
  // "Dono" = Proprietário OU administrador antigo com acesso total (você e sua esposa hoje).
  const isOwnerLike = (row) => !!row && row.active !== false && (row.role === 'proprietario' || (row.permissions == null && row.role === 'administrador'));
  const isLastOwner = (target, users) => isOwnerLike(target) && !(users || []).some(u => u.userId !== target.userId && isOwnerLike(u));
  const canManageUsersTab = (row) => !!row && can(keyMenu('configuracoes'), row) && can(keyChild('configuracoes', 'usuarios'), row);
  const assignableRoles = (row) => ROLES.filter(([id]) => id !== 'proprietario' || isOwnerLike(row));
  // Editar: a si mesmo sempre (com travas no editor); outros, exceto "donos" quando quem edita não é dono
  function canEditUser(row, target) {
    if (!row || !target || !canManageUsersTab(row)) return false;
    if (target.userId === row.userId) return true;
    return !(isOwnerLike(target) && !isOwnerLike(row));
  }
  // Ativar/desativar/excluir: nunca a si mesmo; nunca o último dono; só dono mexe em dono
  function canManageUser(row, target, users) {
    if (!row || !target || !canManageUsersTab(row)) return false;
    if (target.userId === row.userId) return false;
    if (isOwnerLike(target) && !isOwnerLike(row)) return false;
    if (isLastOwner(target, users)) return false;
    return true;
  }
  // No próprio cadastro só dá pra manter a função ou subir para Proprietário (quem é dono)
  const ownRoleOptions = (row) => ROLES.filter(([id]) => id === row.role || (id === 'proprietario' && isOwnerLike(row)));
  const LOCKED_SELF_KEYS = [keyMenu('configuracoes'), keyChild('configuracoes', 'usuarios')];

  /* ---------- aplica no painel ---------- */
  async function apply() {
    await ensureMe();
    const row = me();
    document.querySelectorAll('#sidebarNav .nav-item[data-view]').forEach(b => {
      b.style.display = canView(b.dataset.view, row) ? '' : 'none';
    });
    const roleEl = document.getElementById('profileRole');
    if (roleEl && row) roleEl.textContent = roleLabel(row.role);
    const a = A();
    if (a && a.currentView && !canView(a.currentView, row)) a.goToView(firstAllowedView(row));
  }
  // Esconde as abas de Configurações sem permissão e, se a aberta ficou escondida, abre a primeira liberada
  function applySettingsTabs() {
    const btns = [...document.querySelectorAll('#settingsTabs .tab-btn')];
    btns.forEach(b => { b.style.display = canTab('configuracoes', b.dataset.tab) ? '' : 'none'; });
    const active = btns.find(b => b.classList.contains('is-active'));
    if (active && active.style.display === 'none') {
      const first = btns.find(b => b.style.display !== 'none');
      if (first) first.click();
    }
  }

  window.__brasaAccess = {
    catalog: { ROLES, MENUS, CHILDREN, KEYS }, keyMenu, keyChild, defaultsFor, roleLabel,
    me, can, canView, canTab, firstAllowedView, isOwnerLike, isLastOwner, canManageUsersTab, assignableRoles,
    canEditUser, canManageUser, ownRoleOptions, LOCKED_SELF_KEYS, apply, applySettingsTabs,
    _setMeForTests: (id) => { myUserId = id; },
  };
})();
