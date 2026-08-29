/* ============================================================
   BRASA BURGER CO. — ADMIN — Dados mock
   ============================================================ */

const ADMIN_USER = { name: 'Marina Silva', role: 'Administradora', initials: 'MS', email: 'marina@brasaburger.com.br' };

const ADMIN_CATEGORIES = [
  { id: 'hamburgueres', name: 'Hambúrgueres', order: 1, active: true, img: 'assets/products/brasa-bacon.jpg' },
  { id: 'combos', name: 'Combos', order: 2, active: true, img: 'assets/products/combo-casal.jpg' },
  { id: 'porcoes', name: 'Porções', order: 3, active: true, img: 'assets/products/batata-brasa.jpg' },
  { id: 'bebidas', name: 'Bebidas', order: 4, active: true, img: 'assets/products/cola-gelada.jpg' },
  { id: 'sobremesas', name: 'Sobremesas', order: 5, active: true, img: 'assets/products/brownie-brasa.jpg' },
];

const ADMIN_ADDON_GROUPS = [
  { id: 'ponto', name: 'Ponto da carne', required: true, min: 1, max: 1, appliesTo: 6, options: [
    { name: 'Mal passado', price: 0 }, { name: 'Ao ponto', price: 0 }, { name: 'Bem passado', price: 0 },
  ]},
  { id: 'molhos', name: 'Molhos', required: false, min: 0, max: 2, appliesTo: 6, options: [
    { name: 'Molho brasa', price: 0 }, { name: 'Barbecue', price: 0 }, { name: 'Maionese temperada', price: 0 }, { name: 'Mostarda e mel', price: 0 },
  ]},
  { id: 'extras', name: 'Extras', required: false, min: 0, max: 5, appliesTo: 6, options: [
    { name: 'Bacon extra', price: 6.9 }, { name: 'Cheddar extra', price: 5.9 }, { name: 'Cebola caramelizada', price: 4.9 },
  ]},
  { id: 'remover', name: 'Retirar ingredientes', required: false, min: 0, max: 6, appliesTo: 6, options: [
    { name: 'Sem cebola', price: 0 }, { name: 'Sem picles', price: 0 }, { name: 'Sem alface', price: 0 }, { name: 'Sem tomate', price: 0 },
  ]},
];

const ADMIN_PRODUCTS = [
  { id: 'brasa-bacon', name: 'Brasa Bacon', category: 'hamburgueres', price: 38.9, promoPrice: null, img: 'assets/products/brasa-bacon.jpg', desc: 'Blend 180g grelhado na brasa, bacon crocante, cheddar derretido, picles e maionese da casa.', code: 'HB-001', active: true, featured: true, soldOut: false, prepTime: 18, extras: [{ name: 'Bacon extra', price: 6.9 }, { name: 'Cheddar extra', price: 5.9 }, { name: 'Smash extra', price: 10 }], removeOptions: ['Sem pão brioche', 'Sem 2° smash', 'Sem cheddar', 'Sem bacon e cebola caramelizada'] },
  { id: 'burger-costela', name: 'Burger de Costela', category: 'hamburgueres', price: 42.9, promoPrice: null, img: 'assets/products/burger-costela.jpg', desc: 'Blend de costela desfiada e grelhada na brasa, cheddar, cebola caramelizada e molho barbecue.', code: 'HB-002', active: true, featured: true, soldOut: false, prepTime: 20, extras: [{ name: 'Smash extra', price: 10 }, { name: 'Cheddar extra', price: 5.9 }], removeOptions: ['Sem pão brioche', 'Sem coleslaw', 'Sem cebolas', 'Sem barbecue e picles'] },
  { id: 'x-bacon', name: 'X-Bacon da Brasa', category: 'hamburgueres', price: 32.9, promoPrice: 28.9, img: 'assets/products/x-bacon.jpg', desc: 'O clássico da casa: blend bovino, muito bacon, queijo prato derretido e molho especial.', code: 'HB-003', active: true, featured: true, soldOut: false, prepTime: 15, extras: [{ name: 'Bacon extra', price: 6.9 }, { name: 'Queijo extra', price: 5.9 }], removeOptions: ['Sem pão brioche', 'Sem bacon', 'Sem molho brasa'] },
  { id: 'brasa-salad', name: 'Brasa Salad', category: 'hamburgueres', price: 31.9, promoPrice: null, img: 'assets/products/brasa-salad.jpg', desc: 'Blend grelhado, alface americana, tomate, cebola roxa e maionese leve.', code: 'HB-004', active: true, featured: false, soldOut: false, prepTime: 15, extras: [{ name: 'Queijo extra', price: 5.9 }], removeOptions: ['Sem alface', 'Sem tomate', 'Sem cebola roxa', 'Sem maionese'] },
  { id: 'duplo-cheddar', name: 'Duplo Cheddar', category: 'hamburgueres', price: 39.9, promoPrice: null, img: 'assets/products/duplo-cheddar.jpg', desc: 'Duas carnes grelhadas na brasa, dose dupla de cheddar cremoso e cebola crocante.', code: 'HB-005', active: true, featured: false, soldOut: false, prepTime: 20, extras: [{ name: 'Cheddar extra', price: 5.9 }, { name: 'Bacon extra', price: 6.9 }], removeOptions: ['Sem pão brioche', 'Sem cebola crocante'] },
  { id: 'frango-crocante', name: 'Frango Crocante', category: 'hamburgueres', price: 34.9, promoPrice: null, img: 'assets/products/frango-crocante.jpg', desc: 'Filé de frango empanado crocante, alface, tomate e maionese de ervas.', code: 'HB-006', active: true, featured: false, soldOut: true, prepTime: 17, extras: [{ name: 'Queijo extra', price: 5.9 }], removeOptions: ['Sem alface', 'Sem tomate', 'Sem maionese de ervas'] },
  { id: 'combo-casal', name: 'Combo Casal', category: 'combos', price: 74.9, promoPrice: null, img: 'assets/products/combo-casal.jpg', desc: '2 burgers Brasa Bacon, 1 batata brasa grande e 2 bebidas geladas.', code: 'CB-001', active: true, featured: true, soldOut: false, prepTime: 22, extras: [], removeOptions: ['Sem 1 dos burgers', 'Sem fritas', 'Sem bebidas'] },
  { id: 'combo-duplo', name: 'Combo Duplo Cheddar', category: 'combos', price: 49.9, promoPrice: null, img: 'assets/products/combo-duplo.jpg', desc: 'Duplo Cheddar + batata brasa média + bebida gelada.', code: 'CB-002', active: true, featured: false, soldOut: false, prepTime: 20, extras: [], removeOptions: ['Sem batata', 'Sem bebida'] },
  { id: 'batata-brasa', name: 'Batata Brasa', category: 'porcoes', price: 24.9, promoPrice: null, img: 'assets/products/batata-brasa.jpg', desc: 'Porção generosa de batatas fritas crocantes temperadas com especiarias da casa.', code: 'PR-001', active: true, featured: false, soldOut: false, prepTime: 10, extras: [{ name: 'Cheddar extra', price: 5.9 }, { name: 'Bacon extra', price: 6.9 }], removeOptions: ['Sem cheddar', 'Sem bacon', 'Sem cebolinha'] },
  { id: 'onion-rings', name: 'Onion Rings', category: 'porcoes', price: 22.9, promoPrice: null, img: 'assets/products/onion-rings.jpg', desc: 'Anéis de cebola empanados e crocantes, acompanha molho barbecue.', code: 'PR-002', active: true, featured: false, soldOut: false, prepTime: 10, extras: [], removeOptions: ['Sem cebola empanada', 'Sem molho barbecue'] },
  { id: 'cola-gelada', name: 'Cola Gelada 350ml', category: 'bebidas', price: 7.9, promoPrice: null, img: 'assets/products/cola-gelada.jpg', desc: 'Refrigerante de cola bem gelado, lata 350ml.', code: 'BB-001', active: true, featured: false, soldOut: false, prepTime: 2, extras: [], removeOptions: ['Sem gelo'] },
  { id: 'milkshake-caramelo', name: 'Milkshake de Caramelo', category: 'bebidas', price: 16.9, promoPrice: null, img: 'assets/products/milkshake-caramelo.jpg', desc: 'Milkshake cremoso de caramelo com calda e chantilly.', code: 'BB-002', active: true, featured: false, soldOut: false, prepTime: 6, extras: [{ name: 'Chantilly extra', price: 3.9 }], removeOptions: ['Sem chantilly', 'Sem calda de caramelo'] },
  { id: 'brownie-brasa', name: 'Brownie da Brasa', category: 'sobremesas', price: 18.9, promoPrice: null, img: 'assets/products/brownie-brasa.jpg', desc: 'Brownie de chocolate meio amargo quentinho com sorvete de creme.', code: 'SB-001', active: false, featured: false, soldOut: false, prepTime: 8, extras: [{ name: 'Sorvete extra', price: 4.9 }], removeOptions: ['Sem calda de chocolate', 'Sem sorvete'] },
];

const ADMIN_COUPONS = [
  { code: 'BRASA15', type: 'percent', value: 15, minOrder: 20, uses: 87, limit: 200, expiry: '2026-09-30', active: true },
  { code: 'BEMVINDO10', type: 'percent', value: 10, minOrder: 0, uses: 214, limit: null, expiry: null, active: true },
  { code: 'FRETEGRATIS', type: 'freeshipping', value: 0, minOrder: 60, uses: 42, limit: 100, expiry: '2026-08-31', active: true },
  { code: 'BRASA20INATIVO', type: 'percent', value: 20, minOrder: 40, uses: 156, limit: 150, expiry: '2026-06-01', active: false },
];

const ADMIN_AREAS = [
  { id: 'centro', name: 'Centro', fee: 6.9, etaMin: 30, etaMax: 45, minOrder: 20, active: true },
  { id: 'jardins', name: 'Jardins', fee: 8.9, etaMin: 40, etaMax: 55, minOrder: 20, active: true },
  { id: 'vila-nova', name: 'Vila Nova', fee: 5.9, etaMin: 25, etaMax: 40, minOrder: 20, active: true },
  { id: 'zona-sul', name: 'Zona Sul', fee: 12.9, etaMin: 50, etaMax: 70, minOrder: 30, active: false },
];

const ADMIN_BANNERS = [
  { id: 'b1', title: 'Cupom BRASA15 — 15% OFF', period: '01/08 a 31/08/2026', link: '#cardapio', active: true, priority: 1, img: 'assets/brand/hero-burger.jpg' },
  { id: 'b2', title: 'Combo Casal em destaque', period: '01/08 a 15/08/2026', link: 'combo-casal', active: true, priority: 2, img: 'assets/products/combo-casal.jpg' },
  { id: 'b3', title: 'Frete grátis acima de R$ 60', period: '05/08 a 31/08/2026', link: '#cardapio', active: false, priority: 3, img: 'assets/products/onion-rings.jpg' },
];

/* ---------------- Pedidos (kanban: novo -> confirmado -> preparo -> entrega) ---------------- */
const ADMIN_ORDERS = [
  { id: 4231, customer: 'Rafael Torres', phone: '(11) 98221-4090', status: 'novo', createdAt: Date.now() - 3 * 60000,
    modality: 'entrega', area: 'Centro', address: 'Rua das Acácias, 210', payment: 'Pix',
    items: [{ name: 'Brasa Bacon', qty: 2 }, { name: 'Batata Brasa', qty: 1 }],
    subtotal: 102.7, fee: 6.9, discount: 0, total: 109.6 },
  { id: 4230, customer: 'Camila Duarte', phone: '(11) 97110-3382', status: 'novo', createdAt: Date.now() - 6 * 60000,
    modality: 'retirada', area: null, address: null, payment: 'Cartão de crédito',
    items: [{ name: 'X-Bacon da Brasa', qty: 1 }, { name: 'Milkshake de Caramelo', qty: 1 }],
    subtotal: 45.8, fee: 0, discount: 0, total: 45.8 },
  { id: 4229, customer: 'Diego Almeida', phone: '(11) 99887-1120', status: 'confirmado', createdAt: Date.now() - 14 * 60000,
    modality: 'entrega', area: 'Vila Nova', address: 'Av. Brasil, 1500, apto 34', payment: 'Dinheiro (troco p/ R$100)',
    items: [{ name: 'Combo Casal', qty: 1 }],
    subtotal: 74.9, fee: 5.9, discount: 11.24, total: 69.56 },
  { id: 4228, customer: 'Fernanda Lopes', phone: '(11) 98765-4321', status: 'confirmado', createdAt: Date.now() - 19 * 60000,
    modality: 'entrega', area: 'Jardins', address: 'Rua dos Ipês, 88', payment: 'Pix',
    items: [{ name: 'Duplo Cheddar', qty: 1 }, { name: 'Onion Rings', qty: 1 }, { name: 'Cola Gelada 350ml', qty: 2 }],
    subtotal: 78.6, fee: 8.9, discount: 0, total: 87.5 },
  { id: 4227, customer: 'Bruno Cardoso', phone: '(11) 91234-5566', status: 'preparo', createdAt: Date.now() - 24 * 60000,
    modality: 'entrega', area: 'Centro', address: 'Rua das Brasas, 55', payment: 'Cartão de débito',
    items: [{ name: 'Burger de Costela', qty: 2 }],
    subtotal: 85.8, fee: 6.9, discount: 0, total: 92.7 },
  { id: 4226, customer: 'Juliana Prado', phone: '(11) 99001-2233', status: 'preparo', createdAt: Date.now() - 27 * 60000,
    modality: 'retirada', area: null, address: null, payment: 'Pix',
    items: [{ name: 'Brasa Salad', qty: 1 }, { name: 'Brownie da Brasa', qty: 1 }],
    subtotal: 50.8, fee: 0, discount: 0, total: 50.8 },
  { id: 4225, customer: 'Thiago Nunes', phone: '(11) 98123-9988', status: 'entrega', createdAt: Date.now() - 33 * 60000,
    modality: 'entrega', area: 'Centro', address: 'Rua Sete de Setembro, 320', payment: 'Pix',
    items: [{ name: 'Combo Duplo Cheddar', qty: 1 }, { name: 'Cola Gelada 350ml', qty: 1 }],
    subtotal: 57.8, fee: 6.9, discount: 0, total: 64.7 },
  { id: 4224, customer: 'Patrícia Moreira', phone: '(11) 97654-3311', status: 'entrega', createdAt: Date.now() - 41 * 60000,
    modality: 'entrega', area: 'Vila Nova', address: 'Rua Marechal Deodoro, 402', payment: 'Cartão de crédito',
    items: [{ name: 'Brasa Bacon', qty: 1 }, { name: 'Batata Brasa', qty: 1 }, { name: 'Milkshake de Caramelo', qty: 1 }],
    subtotal: 80.7, fee: 5.9, discount: 0, total: 86.6 },
];

const ORDER_STATUS_LABELS = {
  novo: 'Novos pedidos', confirmado: 'Confirmados', preparo: 'Em preparo', entrega: 'Saiu para entrega',
};
const ORDER_STATUS_FLOW = ['novo', 'confirmado', 'preparo', 'entrega', 'concluido'];
const ORDER_TIMELINE_LABELS = {
  novo: 'Pedido recebido', confirmado: 'Confirmado pela loja', preparo: 'Em preparo na brasa', entrega: 'Saiu para entrega', concluido: 'Entregue',
};

/* ---------------- Métricas do dashboard ---------------- */
const ADMIN_WEEK_SALES = [
  { label: 'Seg', value: 1240 }, { label: 'Ter', value: 1480 }, { label: 'Qua', value: 1360 },
  { label: 'Qui', value: 1710 }, { label: 'Sex', value: 2240 }, { label: 'Sáb', value: 2860 }, { label: 'Dom', value: 2010 },
];

const ADMIN_TOP_SELLERS = [
  { id: 'brasa-bacon', sold: 214, revenue: 8324.6 },
  { id: 'x-bacon', sold: 189, revenue: 6218.1 },
  { id: 'burger-costela', sold: 142, revenue: 6091.8 },
  { id: 'combo-casal', sold: 76, revenue: 5692.4 },
];
