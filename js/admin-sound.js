/* ============================================================
   BRASA BURGER CO. — ADMIN — Som de notificação (pedido novo / pagamento confirmado)
   ============================================================
   Arquivo novo. Até aqui o botão do sino e a opção "Som ao receber pedido" só gravavam a
   preferência — nenhum som era tocado. Aqui o som é gerado pelo próprio navegador (Web Audio),
   sem arquivos de áudio. Regras:
   - Só toca se a preferência "Som ao receber pedido" estiver ligada (exceto o teste).
   - Nunca derruba nada: qualquer falha de áudio é engolida aqui dentro (o ciclo de 15s
     que atualiza os pedidos não pode parar por causa de um bipe).
   - Os navegadores só liberam áudio depois de um clique/toque na página; o login já conta.
   ============================================================ */
(function () {
  'use strict';
  const A = () => window.__brasaAdmin;
  let ctx = null;
  let hintShown = false;

  // [frequência em Hz, atraso em segundos] — duas notas = pedido novo; três notas (mais grave e subindo) = pagamento
  const TONES = {
    newOrder: [[880, 0], [1320, 0.16]],
    payment: [[660, 0], [880, 0.12], [1175, 0.24]],
    test: [[880, 0], [1320, 0.16]],
  };

  const enabled = () => { const a = A(); return !!(a && a.settings && a.settings.notifySound); };

  function ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (_) { return null; } }
    return ctx;
  }
  function resume(c) {
    if (c && c.state === 'suspended' && typeof c.resume === 'function') {
      try { const p = c.resume(); if (p && typeof p.catch === 'function') p.catch(() => {}); } catch (_) { /* ignora */ }
    }
  }
  function unlock() { resume(ensureCtx()); }

  function play(kind) {
    try {
      const tones = TONES[kind];
      if (!tones) return false;
      if (kind !== 'test' && !enabled()) return false;
      const c = ensureCtx();
      if (!c) return false;
      resume(c);
      const t0 = c.currentTime + 0.02;
      tones.forEach(([freq, off]) => {
        const osc = c.createOscillator(), gain = c.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t0 + off);
        gain.gain.exponentialRampToValueAtTime(0.25, t0 + off + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.28);
        osc.connect(gain);
        gain.connect(c.destination);
        osc.start(t0 + off);
        osc.stop(t0 + off + 0.3);
      });
      if (c.state === 'suspended' && !hintShown && A() && A().showToast) {
        hintShown = true;
        A().showToast('O navegador bloqueou o som. Clique em qualquer lugar da página para liberá-lo.', 'error');
      }
      return true;
    } catch (_) { return false; }
  }

  // O sino do topo mostra o estado de verdade (antes nascia sempre "silenciado")
  function refreshButton() {
    const b = document.getElementById('soundToggle');
    if (!b) return;
    const on = enabled();
    b.classList.toggle('is-muted', !on);
    b.title = on ? 'Som de novos pedidos: ligado (clique para desligar)' : 'Som de novos pedidos: desligado (clique para ligar)';
  }

  // iPhone/iPad só liberam o áudio no FIM do toque (touchend/click); os demais navegadores aceitam o início (pointerdown)
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { passive: true }));
  const btn = document.getElementById('soundToggle');
  if (btn) {
    // Este clique roda DEPOIS do que já existia no admin.js (que liga/desliga a preferência e avisa).
    btn.addEventListener('click', () => { refreshButton(); if (enabled()) play('test'); });
  }
  refreshButton();

  window.__brasaSound = { play, refreshButton, enabled, unlock };
})();
