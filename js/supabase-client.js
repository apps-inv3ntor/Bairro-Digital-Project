/* ============================================================
   BRASA BURGER CO. — Cliente Supabase compartilhado
   Carregado depois de supabase-config.js e do script da biblioteca
   (CDN) em toda página que precisa falar com o banco.
   Expõe `window.sb` pra ser usado pelos outros arquivos JS do site.
   ============================================================ */
(function () {
  'use strict';

  if (typeof window.supabase === 'undefined') {
    console.error('Biblioteca do Supabase não carregou. Verifique a tag <script> do CDN em index.html/admin.html.');
    window.sb = null;
    window.SUPABASE_READY = false;
    return;
  }
  if (SUPABASE_URL.includes('SEU-PROJETO') || SUPABASE_ANON_KEY.includes('SUA-ANON-KEY')) {
    console.warn('Supabase ainda não configurado — edite js/supabase-config.js com os dados do seu projeto. Usando armazenamento local (localStorage) como reserva por enquanto.');
    window.sb = null;
    window.SUPABASE_READY = false;
    return;
  }

  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.SUPABASE_READY = true;
})();
