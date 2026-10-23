// scripts/keepalive.mjs
// Robô anti-pausa do Supabase (plano gratuito) — Node 18+ (sem dependências).
//
// Como funciona:
//  1) O GitHub Actions dispara este script todo dia em 7 horários fixos (cron).
//  2) O script calcula, de forma determinística, o PLANO DA SEMANA (3 dias + 3 horários).
//     Só executa se "hoje + esta hora" fizer parte do plano; senão, sai em segundos.
//  3) Ao executar: espera 5–45 min (jitter) e faz 1 a 3 consultas aleatórias
//     (cardápio, FAQ, promoções) com a anon_key e um User-Agent de navegador real.
//
// Modos:  node scripts/keepalive.mjs          -> modo normal (usado pelo Actions)
//         node scripts/keepalive.mjs --plan   -> imprime o plano das próximas semanas
//
// Variáveis de ambiente:
//  SUPABASE_URL, SUPABASE_ANON_KEY   (obrigatórias — GitHub Secrets)
//  FORCE_RUN=true     ignora o plano (teste manual)
//  SKIP_JITTER=true   pula a espera de 5–45 min (teste manual)
//  JITTER_MIN_MIN / JITTER_MAX_MIN   espera em minutos (padrão 5 e 45)
//  TABLE_PRODUCTS, TABLE_BANNERS, TABLE_SETTINGS, COL_PRODUCT_NAME  (já ajustados ao banco do Brasa Burger)
//  SITE_ORIGIN        origem do site público (cabeçalhos Origin/Referer)

// ---------------------------------------------------------------- plano da semana
const SLOTS_UTC = [11, 13, 15, 17, 19, 21, 23]; // = 08h, 10h, 12h, 14h, 16h, 18h, 20h (Brasília)
const ANCHOR = Date.UTC(2024, 0, 1); // uma segunda-feira
const DAY_MS = 86400000;
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const SALT = process.env.SCHEDULE_SALT || 'bairro-digital';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFor(w) {
  let h = 2166136261;
  for (const c of `${SALT}:${w}`) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weekIndex(d) {
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - ANCHOR) / (7 * DAY_MS));
}
function triples(items) {
  const out = [];
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++)
      for (let k = j + 1; k < items.length; k++) out.push([items[i], items[j], items[k]]);
  return out;
}
// Regras do sorteio: 3 dias diferentes dos da semana anterior; 3 horários diferentes dos da
// semana anterior; e proteção contra pausa: 1º dia <= quarta e último dia >= sexta, para que
// o intervalo máximo entre execuções fique bem abaixo de 7 dias.
function planWeek(w) {
  let prev = { days: [], slots: [] };
  let plan = [];
  for (let k = 0; k <= w; k++) { // cadeia fixa desde a âncora: semanas consecutivas ficam encadeadas
    const rnd = mulberry32(seedFor(k));
    const dayOpts = shuffle(triples([0, 1, 2, 3, 4, 5, 6]), rnd);
    const spread = (t) => t[0] <= 2 && t[2] >= 4 && t[1] - t[0] <= 4 && t[2] - t[1] <= 4;
    const disjoint = (t, base) => t.every((d) => !base.includes(d));
    // olha 1 semana à frente: só aceita um conjunto que ainda permita uma próxima semana válida
    const hasNext = (t) => dayOpts.some((n) => spread(n) && disjoint(n, t));
    let days =
      dayOpts.find((t) => spread(t) && disjoint(t, prev.days) && hasNext(t)) ||
      dayOpts.find((t) => spread(t)); // plano B (não deve ser necessário)
    const slots = shuffle(SLOTS_UTC.filter((s) => !prev.slots.includes(s)), rnd).slice(0, 3);
    prev = { days, slots };
    plan = days.map((d, i) => ({ day: d, hourUtc: slots[i] }));
  }
  return plan;
}
const fmtBRT = (p) => `${DIAS[p.day]} ${String(p.hourUtc - 3).padStart(2, '0')}h (Brasília)`;

if (process.argv.includes('--plan')) {
  const w0 = weekIndex(new Date());
  for (let w = w0; w < w0 + 4; w++) {
    console.log(`Semana +${w - w0}: ` + planWeek(w).map(fmtBRT).join(' | '));
  }
  process.exit(0);
}

// ---------------------------------------------------------------- execução
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const T = {
  products: process.env.TABLE_PRODUCTS || 'products',
  banners: process.env.TABLE_BANNERS || 'banners',
  settings: process.env.TABLE_SETTINGS || 'store_settings', // FAQ e promoção ficam aqui (chaves faq_items / promo_banner)
};
const COL_NAME = process.env.COL_PRODUCT_NAME || 'name';
const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://apps-inv3ntor.github.io';

const USER_AGENTS = [
  { label: 'Chrome/Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
  { label: 'Edge/Windows', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0' },
  { label: 'Safari/macOS', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15' },
  { label: 'Safari/iPhone', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1' },
  { label: 'Chrome/Android', ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36' },
  { label: 'Edge/Android', ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 EdgA/124.0.0.0' },
];
const TERMOS = ['pizza', 'lanche', 'suco', 'burger', 'batata', 'refri', 'combo', 'sobremesa', 'porção'];

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);

function shouldRunNow() {
  if (process.env.FORCE_RUN === 'true') return true;
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7; // 0 = segunda
  const hour = now.getUTCHours();
  // tolera até 1h de atraso do agendador do GitHub
  return planWeek(weekIndex(now)).some((p) => p.day === day && hour - p.hourUtc >= 0 && hour - p.hourUtc <= 1);
}

async function rest(table, query, agent) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'User-Agent': agent.ua,
      Accept: 'application/json',
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.6',
      Origin: SITE_ORIGIN,
      Referer: `${SITE_ORIGIN}/`,
    },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  const rows = await res.json();
  log(`  ${table}: HTTP ${res.status}, ${Array.isArray(rows) ? rows.length : 0} linha(s)`);
  return rows;
}

const ACTIONS = {
  async cardapio(agent) {
    if (Math.random() < 0.5) {
      const termo = pick(TERMOS);
      log(`Ação 1 (cardápio): busca por "${termo}"`);
      await rest(T.products, `select=*&${COL_NAME}=ilike.*${encodeURIComponent(termo)}*&limit=10`, agent);
    } else {
      log('Ação 1 (cardápio): produto aleatório por ID');
      const ids = await rest(T.products, 'select=id&limit=100', agent);
      if (ids.length) await rest(T.products, `select=*&id=eq.${encodeURIComponent(pick(ids).id)}`, agent);
    }
  },
  async faq(agent) {
    log('Ação 2 (FAQ): perguntas frequentes (store_settings.faq_items)');
    await rest(T.settings, 'select=key,value&key=eq.faq_items', agent);
  },
  async promocoes(agent) {
    if (Math.random() < 0.5) {
      log('Ação 3 (promoções): banners ativos');
      await rest(T.banners, 'select=*&active=eq.true&order=priority.desc&limit=10', agent);
    } else {
      log('Ação 3 (promoções): banner de oferta (store_settings.promo_banner)');
      await rest(T.settings, 'select=key,value&key=eq.promo_banner', agent);
    }
  },
};

async function main() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('Faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY (configure nos GitHub Secrets).');
    process.exit(1);
  }
  if (!shouldRunNow()) {
    log('Hoje/agora não faz parte do plano desta semana. Nada a fazer.');
    return;
  }
  if (process.env.SKIP_JITTER !== 'true') {
    const jmin = Number(process.env.JITTER_MIN_MIN) || 5;
    const jmax = Math.max(jmin, Number(process.env.JITTER_MAX_MIN) || 45);
    const min = rint(jmin, jmax);
    log(`Plano confirmado. Aguardando ${min} min (jitter) antes de começar...`);
    await sleep(min * 60 * 1000 + rint(0, 59) * 1000);
  }
  const agent = pick(USER_AGENTS);
  log(`Iniciando. Navegador simulado: ${agent.label}`);

  const sequencia = shuffle(Object.keys(ACTIONS), Math.random).slice(0, rint(1, 3));
  let ok = 0;
  for (const nome of sequencia) {
    try {
      await ACTIONS[nome](agent);
      ok++;
    } catch (e) {
      log(`  falhou (${nome}): ${e.message}`);
    }
    await sleep(rint(2, 8) * 1000);
  }
  if (ok === 0) {
    console.error('Nenhuma consulta funcionou — confira nomes de tabelas, RLS e Secrets.');
    process.exit(1);
  }
  log(`Concluído: ${ok}/${sequencia.length} consulta(s) com sucesso.`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
