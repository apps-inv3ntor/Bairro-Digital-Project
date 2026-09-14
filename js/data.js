/* ============================================================
   BRASA BURGER CO. — Dados do cardápio
   Cada produto define seus próprios "extras" (adicionais com preço)
   e "removeOptions" (o que dá pra tirar, sem custo) — customizável
   por produto no painel admin.
   ============================================================ */

const PRODUCTS = [
  {
    id: 'brasa-bacon',
    name: 'Brasa Bacon',
    category: 'hamburgueres',
    highlight: true,
    price: 38.9,
    img: 'assets/products/brasa-bacon.jpg',
    desc: 'Blend 180g grelhado na brasa, bacon crocante, cheddar derretido, picles e maionese da casa no pão brioche.',
    ingredients: 'Pão brioche, blend bovino 180g, bacon, cheddar, picles, cebola roxa, maionese da casa.',
    extras: [
      { name: 'Bacon extra', price: 6.9 },
      { name: 'Cheddar extra', price: 5.9 },
      { name: 'Smash extra', price: 10 },
    ],
    removeOptions: ['Sem pão brioche', 'Sem 2° smash', 'Sem cheddar', 'Sem bacon e cebola caramelizada'],
  },
  {
    id: 'burger-costela',
    name: 'Burger de Costela',
    category: 'hamburgueres',
    highlight: true,
    price: 42.9,
    img: 'assets/products/burger-costela.jpg',
    desc: 'Blend de costela desfiada e grelhada na brasa, cheddar, cebola caramelizada e molho barbecue defumado.',
    ingredients: 'Pão brioche, blend de costela 200g, cheddar, cebola caramelizada, molho barbecue.',
    extras: [
      { name: 'Smash extra', price: 10 },
      { name: 'Cheddar extra', price: 5.9 },
    ],
    removeOptions: ['Sem pão brioche', 'Sem coleslaw', 'Sem cebolas', 'Sem barbecue e picles'],
  },
  {
    id: 'x-bacon',
    name: 'X-Bacon da Brasa',
    category: 'hamburgueres',
    highlight: true,
    price: 32.9,
    img: 'assets/products/x-bacon.jpg',
    desc: 'O clássico da casa: blend bovino, muito bacon, queijo prato derretido e molho especial da brasa.',
    ingredients: 'Pão brioche, blend bovino 150g, bacon, queijo prato, molho brasa.',
    extras: [
      { name: 'Bacon extra', price: 6.9 },
      { name: 'Queijo extra', price: 5.9 },
    ],
    removeOptions: ['Sem pão brioche', 'Sem bacon', 'Sem molho brasa'],
  },
  {
    id: 'brasa-salad',
    name: 'Brasa Salad',
    category: 'hamburgueres',
    price: 31.9,
    img: 'assets/products/brasa-salad.jpg',
    desc: 'Blend grelhado, alface americana, tomate, cebola roxa e maionese leve — mais fresco, sem perder o sabor de brasa.',
    ingredients: 'Pão brioche, blend bovino 150g, alface, tomate, cebola roxa, maionese leve.',
    extras: [
      { name: 'Queijo extra', price: 5.9 },
    ],
    removeOptions: ['Sem alface', 'Sem tomate', 'Sem cebola roxa', 'Sem maionese'],
  },
  {
    id: 'duplo-cheddar',
    name: 'Duplo Cheddar',
    category: 'hamburgueres',
    price: 39.9,
    img: 'assets/products/duplo-cheddar.jpg',
    desc: 'Duas carnes grelhadas na brasa, dose dupla de cheddar cremoso e cebola crocante.',
    ingredients: 'Pão brioche, 2x blend bovino 100g, cheddar duplo, cebola crocante.',
    extras: [
      { name: 'Cheddar extra', price: 5.9 },
      { name: 'Bacon extra', price: 6.9 },
    ],
    removeOptions: ['Sem pão brioche', 'Sem cebola crocante'],
  },
  {
    id: 'frango-crocante',
    name: 'Frango Crocante',
    category: 'hamburgueres',
    price: 34.9,
    img: 'assets/products/frango-crocante.jpg',
    desc: 'Filé de frango empanado crocante, alface, tomate e maionese de ervas no pão brioche.',
    ingredients: 'Pão brioche, filé de frango empanado, alface, tomate, maionese de ervas.',
    extras: [
      { name: 'Queijo extra', price: 5.9 },
    ],
    removeOptions: ['Sem alface', 'Sem tomate', 'Sem maionese de ervas'],
  },
  {
    id: 'combo-casal',
    name: 'Combo Casal',
    category: 'combos',
    highlight: true,
    price: 74.9,
    img: 'assets/products/combo-casal.jpg',
    desc: '2 burgers Brasa Bacon, 1 batata brasa grande pra dividir e 2 bebidas geladas.',
    ingredients: '2x Brasa Bacon, batata brasa grande, 2 bebidas à escolha.',
    extras: [],
    removeOptions: ['Sem 1 dos burgers', 'Sem fritas', 'Sem bebidas'],
  },
  {
    id: 'combo-duplo',
    name: 'Combo Duplo Cheddar',
    category: 'combos',
    price: 49.9,
    img: 'assets/products/combo-duplo.jpg',
    desc: 'Duplo Cheddar + batata brasa média + bebida gelada.',
    ingredients: '1x Duplo Cheddar, batata brasa média, 1 bebida à escolha.',
    extras: [],
    removeOptions: ['Sem batata', 'Sem bebida'],
  },
  {
    id: 'batata-brasa',
    name: 'Batata Brasa',
    category: 'porcoes',
    price: 24.9,
    img: 'assets/products/batata-brasa.jpg',
    desc: 'Porção generosa de batatas fritas crocantes temperadas com especiarias da casa.',
    ingredients: 'Batata frita, tempero da brasa, cheiro-verde.',
    extras: [
      { name: 'Cheddar extra', price: 5.9 },
      { name: 'Bacon extra', price: 6.9 },
    ],
    removeOptions: ['Sem cheddar', 'Sem bacon', 'Sem cebolinha'],
  },
  {
    id: 'onion-rings',
    name: 'Onion Rings',
    category: 'porcoes',
    price: 22.9,
    img: 'assets/products/onion-rings.jpg',
    desc: 'Anéis de cebola empanados e crocantes, acompanha molho barbecue.',
    ingredients: 'Cebola empanada, molho barbecue.',
    extras: [],
    removeOptions: ['Sem cebola empanada', 'Sem molho barbecue'],
  },
  {
    id: 'cola-gelada',
    name: 'Cola Gelada 350ml',
    category: 'bebidas',
    price: 7.9,
    img: 'assets/products/cola-gelada.jpg',
    desc: 'Refrigerante de cola bem gelado, lata 350ml.',
    ingredients: 'Refrigerante de cola.',
    extras: [],
    removeOptions: ['Sem gelo'],
  },
  {
    id: 'milkshake-caramelo',
    name: 'Milkshake de Caramelo',
    category: 'bebidas',
    price: 16.9,
    img: 'assets/products/milkshake-caramelo.jpg',
    desc: 'Milkshake cremoso de caramelo com calda e chantilly.',
    ingredients: 'Sorvete de creme, calda de caramelo, leite, chantilly.',
    extras: [
      { name: 'Chantilly extra', price: 3.9 },
    ],
    removeOptions: ['Sem chantilly', 'Sem calda de caramelo'],
  },
  {
    id: 'brownie-brasa',
    name: 'Brownie da Brasa',
    category: 'sobremesas',
    price: 18.9,
    img: 'assets/products/brownie-brasa.jpg',
    desc: 'Brownie de chocolate meio amargo quentinho com sorvete de creme.',
    ingredients: 'Brownie de chocolate, sorvete de creme, calda de chocolate.',
    extras: [
      { name: 'Sorvete extra', price: 4.9 },
    ],
    removeOptions: ['Sem calda de chocolate', 'Sem sorvete'],
  },
];

const CATEGORY_LABELS = {
  'mais-pedidos': 'Mais pedidos',
  'hamburgueres': 'Hambúrgueres',
  'combos': 'Combos',
  'porcoes': 'Porções',
  'bebidas': 'Bebidas',
  'sobremesas': 'Sobremesas',
};

const DELIVERY_AREAS = [
  { id: 'centro', name: 'Centro', fee: 6.9, etaExtra: 0 },
  { id: 'jardins', name: 'Jardins', fee: 8.9, etaExtra: 10 },
  { id: 'vila-nova', name: 'Vila Nova', fee: 5.9, etaExtra: 5 },
];

const COUPONS = {
  BRASA15: { type: 'percent', value: 15, label: '15% OFF' },
};

let MIN_ORDER = 20;
window.PAYMENTS_ENABLED = { pix: true, debito: true, credito: true, dinheiro: true };
const STORE_WHATSAPP = '5511999992026';
