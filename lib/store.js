export const products = Object.freeze([
  Object.freeze({
    id: 'duck',
    name: 'Kaczka Luzaczka',
    category: 'home',
    categoryLabel: 'Do domu',
    price: 79.90,
    oldPrice: 99.90,
    tag: 'DOBRY HUMOR W CENIE',
    image: '/assets/duck.png',
    description: 'Miękka lampka-kaczka, która zamienia zwykły wieczór w mały rytuał chillowania.',
    details: 'Zgaś duże światło, rozsiądź się wygodnie i pozwól tej małej kaczce robić klimat. Trochę lampka, trochę kumpel od dobrego nastroju.',
    features: Object.freeze(['Przyjemne, ciepłe światło na spokojny wieczór', 'Miękka forma, którą chce się przytulić', 'Mały akcent z wielką dawką charakteru']),
  }),
  Object.freeze({
    id: 'arcade',
    name: 'Mini Arcade',
    category: 'play',
    categoryLabel: 'Do zabawy',
    price: 149.90,
    oldPrice: null,
    tag: 'MAŁY SPRZĘT, WIELKA FRAJDA',
    image: '/assets/arcade.png',
    description: 'Mini automat z klimatem salonu gier. Jeszcze tylko jedna rundka. Obiecujesz?',
    details: 'Wielkie emocje w małym wydaniu. Postaw własny automat na biurku, wskocz w retro klimat i przypomnij sobie, ile frajdy potrafi dać prosta gra.',
    features: Object.freeze(['Miniaturowy automat na biurko', 'Retro klimat i kolorowa forma', 'Idealny pomysł dla fana oldschoolowych gier']),
  }),
  Object.freeze({
    id: 'astronaut',
    name: 'Kosmos w pokoju',
    category: 'space',
    categoryLabel: 'Kosmos',
    price: 129.90,
    oldPrice: 159.90,
    tag: 'ODLOTOWY WIECZÓR',
    image: '/assets/astronaut.png',
    description: 'Mały astronauta, wielki kosmos. Projektor, który wysyła nudny sufit na orbitę.',
    details: 'Twój pokój właśnie dostał własną galaktykę. Ten mały astronauta robi wielkie wrażenie i podkręca klimat przy filmie, muzyce albo wieczornym odpoczynku.',
    features: Object.freeze(['Kosmiczny efekt świetlny na wieczorny chill', 'Astronauta, który sam w sobie jest ozdobą', 'Prezent z efektem „wow, ale odlot!”']),
  }),
]);

export const productMap = new Map(products.map((product) => [product.id, product]));
export const storageKeys = Object.freeze({ cart: 'funny-gadgets-cart-v1', favorites: 'funny-gadgets-favorites-v1' });
export const shippingThreshold = 19900;
export const shippingFee = 1290;
export const quantityLimit = 99;

const currency = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
export const money = (cents) => currency.format(cents / 100);
export const priceCents = (product) => Math.round(product.price * 100);
export const normalize = (value) => String(value).toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').trim();
export const isQuantity = (value) => Number.isInteger(value) && value >= 1 && value <= quantityLimit;

export function matchingProducts(query = '') {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return products.filter((product) => {
    const searchable = normalize(`${product.name} ${product.categoryLabel} ${product.description} ${product.tag}`);
    return words.every((word) => searchable.includes(word));
  });
}

export function visibleProducts({ query = '', filter = 'all', sort = 'featured', favorites = new Set() } = {}) {
  const found = matchingProducts(query).filter((product) => {
    if (filter === 'favorites') return favorites.has(product.id);
    return filter === 'all' || product.category === filter;
  });
  if (sort === 'price-asc') found.sort((a, b) => priceCents(a) - priceCents(b));
  if (sort === 'price-desc') found.sort((a, b) => priceCents(b) - priceCents(a));
  return found;
}

// Keep the original v1 storage shape so returning visitors retain their selections.
export function decodeCart(saved) {
  const cart = new Map();
  if (!Array.isArray(saved)) return cart;
  for (const entry of saved.slice(0, products.length * 10)) {
    if (entry && typeof entry === 'object' && productMap.has(entry.id) && isQuantity(entry.quantity)) {
      cart.set(entry.id, entry.quantity);
    }
  }
  return cart;
}

export function decodeFavorites(saved) {
  const favorites = new Set();
  if (!Array.isArray(saved)) return favorites;
  for (const id of saved.slice(0, products.length * 10)) {
    if (typeof id === 'string' && productMap.has(id)) favorites.add(id);
  }
  return favorites;
}

export function cartCount(cart) {
  let count = 0;
  for (const [id, quantity] of cart) {
    if (productMap.has(id) && isQuantity(quantity)) count += quantity;
  }
  return count;
}

export function cartSubtotal(cart) {
  let subtotal = 0;
  for (const [id, quantity] of cart) {
    if (productMap.has(id) && isQuantity(quantity)) subtotal += priceCents(productMap.get(id)) * quantity;
  }
  return subtotal;
}

export function shippingForSubtotal(subtotal) {
  return subtotal === 0 || subtotal >= shippingThreshold ? 0 : shippingFee;
}

export const currentShipping = (cart) => shippingForSubtotal(cartSubtotal(cart));

export function addCartQuantity(cart, id, quantity = 1) {
  const nextCart = new Map(cart);
  if (!productMap.has(id) || !isQuantity(quantity)) return nextCart;
  const previous = isQuantity(cart.get(id)) ? cart.get(id) : 0;
  nextCart.set(id, Math.min(quantityLimit, previous + quantity));
  return nextCart;
}

export function changeCartQuantity(cart, id, delta) {
  const nextCart = new Map(cart);
  if (!productMap.has(id) || !isQuantity(cart.get(id)) || (delta !== 1 && delta !== -1)) return nextCart;
  const quantity = cart.get(id) + delta;
  if (quantity < 1) nextCart.delete(id);
  else nextCart.set(id, Math.min(quantityLimit, quantity));
  return nextCart;
}
