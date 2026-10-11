const products = Object.freeze([
  Object.freeze({
    id: 'duck',
    name: 'Kaczka Luzaczka',
    category: 'home',
    categoryLabel: 'Do domu',
    price: 79.90,
    oldPrice: 99.90,
    tag: 'DOBRY HUMOR W CENIE',
    image: './assets/duck.png',
    description: 'Miękka lampka-kaczka, która zamienia zwykły wieczór w mały rytuał chillowania.',
    details: 'Zgaś duże światło, rozsiądź się wygodnie i pozwól tej małej kaczce robić klimat. Trochę lampka, trochę kumpel od dobrego nastroju.',
    features: ['Przyjemne, ciepłe światło na spokojny wieczór', 'Miękka forma, którą chce się przytulić', 'Mały akcent z wielką dawką charakteru'],
  }),
  Object.freeze({
    id: 'arcade',
    name: 'Mini Arcade',
    category: 'play',
    categoryLabel: 'Do zabawy',
    price: 149.90,
    oldPrice: null,
    tag: 'MAŁY SPRZĘT, WIELKA FRAJDA',
    image: './assets/arcade.png',
    description: 'Mini automat z klimatem salonu gier. Jeszcze tylko jedna rundka. Obiecujesz?',
    details: 'Wielkie emocje w małym wydaniu. Postaw własny automat na biurku, wskocz w retro klimat i przypomnij sobie, ile frajdy potrafi dać prosta gra.',
    features: ['Miniaturowy automat na biurko', 'Retro klimat i kolorowa forma', 'Idealny pomysł dla fana oldschoolowych gier'],
  }),
  Object.freeze({
    id: 'astronaut',
    name: 'Kosmos w pokoju',
    category: 'space',
    categoryLabel: 'Kosmos',
    price: 129.90,
    oldPrice: 159.90,
    tag: 'ODLOTOWY WIECZÓR',
    image: './assets/astronaut.png',
    description: 'Mały astronauta, wielki kosmos. Projektor, który wysyła nudny sufit na orbitę.',
    details: 'Twój pokój właśnie dostał własną galaktykę. Ten mały astronauta robi wielkie wrażenie i podkręca klimat przy filmie, muzyce albo wieczornym odpoczynku.',
    features: ['Kosmiczny efekt świetlny na wieczorny chill', 'Astronauta, który sam w sobie jest ozdobą', 'Prezent z efektem „wow, ale odlot!”'],
  }),
]);

const productMap = new Map(products.map((product) => [product.id, product]));
const storageKeys = { cart: 'funny-gadgets-cart-v1', favorites: 'funny-gadgets-favorites-v1' };
const shippingThreshold = 19900;
const shippingFee = 1290;
const quantityLimit = 99;
const currency = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
const state = { cart: new Map(), favorites: new Set(), filter: 'all', sort: 'featured', query: '', detailId: null, detailQuantity: 1 };
const focusReturns = new WeakMap();
let productGrid;
let overlayRoot;
let dialogs = {};
let scrollStyle = null;
let toastTimer;
let toastHideTimer;

const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const money = (cents) => currency.format(cents / 100);
const priceCents = (product) => Math.round(product.price * 100);
const normalize = (value) => String(value).toLocaleLowerCase('pl-PL').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').trim();
const isQuantity = (value) => Number.isInteger(value) && value >= 1 && value <= quantityLimit;
const cartCount = () => [...state.cart.values()].reduce((sum, quantity) => sum + quantity, 0);
const cartSubtotal = () => [...state.cart].reduce((sum, [id, quantity]) => sum + priceCents(productMap.get(id)) * quantity, 0);
const currentShipping = () => {
  const subtotal = cartSubtotal();
  return subtotal === 0 || subtotal >= shippingThreshold ? 0 : shippingFee;
};

function readStorage(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

function loadSavedState() {
  const savedCart = readStorage(storageKeys.cart);
  const savedFavorites = readStorage(storageKeys.favorites);
  state.cart = new Map();
  state.favorites = new Set();
  if (Array.isArray(savedCart)) {
    for (const entry of savedCart.slice(0, products.length * 10)) {
      if (entry && typeof entry === 'object' && productMap.has(entry.id) && isQuantity(entry.quantity)) {
        state.cart.set(entry.id, entry.quantity);
      }
    }
  }
  if (Array.isArray(savedFavorites)) {
    for (const id of savedFavorites.slice(0, products.length * 10)) {
      if (typeof id === 'string' && productMap.has(id)) state.favorites.add(id);
    }
  }
}

function persistState() {
  try {
    localStorage.setItem(storageKeys.cart, JSON.stringify([...state.cart].map(([id, quantity]) => ({ id, quantity }))));
    localStorage.setItem(storageKeys.favorites, JSON.stringify([...state.favorites]));
  } catch {
    // The storefront still works for this visit when browser storage is unavailable.
  }
}

function matchingProducts(query = state.query) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return products.filter((product) => {
    const searchable = normalize(`${product.name} ${product.categoryLabel} ${product.description} ${product.tag}`);
    return words.every((word) => searchable.includes(word));
  });
}

function visibleProducts() {
  const found = matchingProducts().filter((product) => {
    if (state.filter === 'favorites') return state.favorites.has(product.id);
    return state.filter === 'all' || product.category === state.filter;
  });
  if (state.sort === 'price-asc') found.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') found.sort((a, b) => b.price - a.price);
  return found;
}

function productCard(product, index) {
  const favorite = state.favorites.has(product.id);
  return `<article class="product-card" style="--card-index:${index}">
    <div class="product-media theme-${product.id}">
      <span class="product-badge">${escapeHTML(product.tag)}</span>
      <button class="favorite-button${favorite ? ' is-favorite' : ''}" data-favorite="${product.id}" aria-pressed="${favorite}" aria-label="${favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}: ${escapeHTML(product.name)}">${icon('heart')}</button>
      <button class="product-image-button" data-product="${product.id}" aria-label="Zobacz ${escapeHTML(product.name)}"><img src="${product.image}" alt="${escapeHTML(product.name)}" loading="lazy" width="800" height="800"></button>
    </div>
    <div class="product-info">
      <span class="product-category">${escapeHTML(product.categoryLabel)}</span>
      <h3 class="product-title"><button data-product="${product.id}">${escapeHTML(product.name)}</button></h3>
      <p class="product-description">${escapeHTML(product.description)}</p>
      <div class="product-bottom">
        <div class="product-price">${product.oldPrice ? `<span class="old-price"><s>${money(Math.round(product.oldPrice * 100))}</s></span>` : ''}<strong>${money(priceCents(product))}</strong></div>
        <button class="add-button" data-add="${product.id}" aria-label="Dodaj do koszyka: ${escapeHTML(product.name)}">${icon('plus')}<span>Do koszyka</span></button>
      </div>
    </div>
  </article>`;
}

function renderCatalogue() {
  if (!productGrid) return;
  const focused = document.activeElement;
  const focusedAttribute = productGrid.contains(focused)
    ? ['data-favorite', 'data-product', 'data-add'].find((attribute) => focused.hasAttribute(attribute))
    : null;
  const focusedId = focusedAttribute ? focused.getAttribute(focusedAttribute) : null;
  const found = visibleProducts();
  productGrid.innerHTML = found.length ? found.map(productCard).join('') : `<div class="catalogue-empty">
    <span class="empty-icon">${icon(state.filter === 'favorites' ? 'heart' : 'search')}</span>
    <h3>${state.filter === 'favorites' && !state.query ? 'Twoje ulubione czekają na pierwszy gadżet.' : 'Tu jeszcze nic nie wyskoczyło.'}</h3>
    <p>${state.filter === 'favorites' && !state.query ? 'Kliknij serduszko przy produkcie, który wpadnie Ci w oko.' : 'Spróbuj innego hasła albo zobacz wszystkie nasze gadżety.'}</p>
    <button class="button button-dark" data-reset-catalogue>Zobacz wszystkie gadżety ${icon('arrow')}</button>
  </div>`;
  const count = document.querySelector('#results-count');
  if (count) {
    const label = found.length === 1 ? '1 produkt' : `${found.length} ${found.length === 0 ? 'produktów' : 'produkty'}`;
    count.innerHTML = `<span>${label}${state.query ? ` · „${escapeHTML(state.query)}”` : ''}</span>${state.query ? '<button class="clear-search" data-clear-search aria-label="Wyczyść wyszukiwanie">Wyczyść ' + icon('close') + '</button>' : ''}`;
  }
  document.querySelectorAll('[data-filter]').forEach((button) => {
    const active = button.dataset.filter === state.filter;
    button.classList.toggle('is-active', active);
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(active));
    else if (active) button.setAttribute('aria-current', 'true');
    else button.removeAttribute('aria-current');
  });
  if (focusedId && focusedAttribute) {
    const replacement = productGrid.querySelector(`[${focusedAttribute}="${focusedId}"]`);
    if (replacement) replacement.focus({ preventScroll: true });
    else document.querySelector(`[data-filter="${state.filter}"]`)?.focus({ preventScroll: true });
  }
}

function updateHeader() {
  const count = cartCount();
  const cartBadge = document.querySelector('#header-cart-count');
  const favoriteBadge = document.querySelector('#header-favorite-count');
  if (cartBadge) cartBadge.textContent = String(count);
  if (favoriteBadge) {
    favoriteBadge.textContent = String(state.favorites.size);
    favoriteBadge.hidden = state.favorites.size === 0;
  }
  document.querySelectorAll('[data-action="cart"]').forEach((button) => button.setAttribute('aria-label', `Koszyk, ${count} ${count === 1 ? 'produkt' : 'produktów'}`));
  document.querySelectorAll('[data-action="favorites"]').forEach((button) => button.setAttribute('aria-label', `Ulubione, ${state.favorites.size} ${state.favorites.size === 1 ? 'produkt' : 'produkty'}`));
}

function syncState() {
  persistState();
  updateHeader();
  renderCatalogue();
  if (dialogs.cart?.open) renderCart();
  if (dialogs.checkout?.open) renderCheckout();
}

function showToast(message, withCart = false) {
  const toast = document.querySelector('#toast');
  if (!toast) return;
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);
  toast.innerHTML = `${icon('check')}<span class="toast-message">${escapeHTML(message)}</span>${withCart ? '<button class="toast-action" data-action="cart">Koszyk ' + icon('arrow') + '</button>' : ''}`;
  toast.hidden = false;
  toast.classList.add('is-visible');
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
    toastHideTimer = setTimeout(() => { toast.hidden = true; }, 250);
  }, withCart ? 4500 : 3200);
}

function addToCart(id, quantity = 1) {
  const product = productMap.get(id);
  if (!product || !isQuantity(quantity)) return;
  const previous = state.cart.get(id) || 0;
  const next = Math.min(quantityLimit, previous + quantity);
  if (previous === next) {
    showToast('Maksymalnie 99 sztuk jednego gadżetu w koszyku.');
    return;
  }
  state.cart.set(id, next);
  syncState();
  showToast(`${product.name} ${next - previous > 1 ? `× ${next - previous} ` : ''}w koszyku!`, true);
}

function toggleFavorite(id) {
  const product = productMap.get(id);
  if (!product) return;
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    showToast('Gadżet usunięty z ulubionych.');
  } else {
    state.favorites.add(id);
    showToast(`${product.name} w ulubionych!`);
  }
  syncState();
}

function anyDialogOpen() {
  return Object.values(dialogs).some((dialog) => dialog.open);
}

function lockScroll() {
  if (scrollStyle) return;
  scrollStyle = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight };
  const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  if (scrollbar) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight || '0') + scrollbar}px`;
  document.body.style.overflow = 'hidden';
  document.body.classList.add('dialog-open');
}

function unlockScroll() {
  if (anyDialogOpen() || !scrollStyle) return;
  document.body.style.overflow = scrollStyle.overflow;
  document.body.style.paddingRight = scrollStyle.paddingRight;
  document.body.classList.remove('dialog-open');
  scrollStyle = null;
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function showDialog(dialog, trigger, initialFocus) {
  closeMenu();
  const current = trigger instanceof Element ? trigger : document.activeElement;
  focusReturns.set(dialog, current);
  Object.values(dialogs).forEach((other) => { if (other !== dialog) closeDialog(other); });
  if (!dialog.open) dialog.showModal();
  lockScroll();
  requestAnimationFrame(() => {
    if (!dialog.open) return;
    const focusTarget = initialFocus ? dialog.querySelector(initialFocus) : dialog.querySelector('.dialog-close');
    focusTarget?.focus({ preventScroll: true });
  });
}

function makeDialog(name, className) {
  const dialog = document.createElement('dialog');
  dialog.id = `${name}-dialog`;
  dialog.className = `store-dialog ${className}`;
  dialog.setAttribute('aria-labelledby', `${name}-dialog-title`);
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
  });
  dialog.addEventListener('close', () => {
    unlockScroll();
    requestAnimationFrame(() => {
      if (anyDialogOpen()) return;
      const original = focusReturns.get(dialog);
      const parentDialog = original?.closest?.('dialog');
      if (original?.isConnected && !original.disabled && (!parentDialog || parentDialog.open)) {
        original.focus({ preventScroll: true });
      } else {
        const fallbackAction = name === 'product' && parentDialog?.classList.contains('search-dialog') ? 'search' : name === 'search' ? 'search' : 'cart';
        document.querySelector(`[data-action="${fallbackAction}"]`)?.focus({ preventScroll: true });
      }
    });
  });
  overlayRoot.append(dialog);
  return dialog;
}

const dialogClose = (label = 'Zamknij') => `<button class="icon-button dialog-close" data-modal-close aria-label="${escapeHTML(label)}">${icon('close')}</button>`;

function renderProduct() {
  const product = productMap.get(state.detailId);
  if (!product) return;
  dialogs.product.innerHTML = `${dialogClose('Zamknij szczegóły produktu')}
    <div class="product-dialog-layout">
      <div class="product-detail-media theme-${product.id}"><span class="product-badge">${escapeHTML(product.tag)}</span><img src="${product.image}" alt="${escapeHTML(product.name)}" width="800" height="800"></div>
      <div class="product-detail-copy">
        <span class="eyebrow">${escapeHTML(product.categoryLabel)} · Funny Gadgets</span>
        <h2 id="product-dialog-title" tabindex="-1">${escapeHTML(product.name)}</h2>
        <p class="product-detail-description">${escapeHTML(product.details)}</p>
        <ul class="product-features">${product.features.map((feature) => `<li>${icon('check')}<span>${escapeHTML(feature)}</span></li>`).join('')}</ul>
        <div class="detail-purchase">
          <div class="product-price">${product.oldPrice ? `<span class="old-price"><s>${money(Math.round(product.oldPrice * 100))}</s></span>` : ''}<strong>${money(priceCents(product))}</strong><span class="detail-price-label">/ szt.</span></div>
          <div class="purchase-controls">
            <div class="quantity-stepper" role="group" aria-label="Liczba sztuk">
              <button data-detail-qty="-1" aria-label="Zmniejsz liczbę sztuk"${state.detailQuantity <= 1 ? ' disabled' : ''}>${icon('minus')}</button>
              <span class="quantity-value" aria-live="polite">${state.detailQuantity}</span>
              <button data-detail-qty="1" aria-label="Zwiększ liczbę sztuk"${state.detailQuantity >= quantityLimit ? ' disabled' : ''}>${icon('plus')}</button>
            </div>
            <button class="button button-dark detail-add" data-detail-add="${product.id}">${icon('bag')}<span>Do koszyka · ${money(priceCents(product) * state.detailQuantity)}</span></button>
          </div>
          <p class="demo-product-note">Gadżet przykładowy w wersji pokazowej sklepu.</p>
        </div>
      </div>
    </div>`;
}

function openProduct(id, trigger) {
  if (!productMap.has(id)) return;
  state.detailId = id;
  state.detailQuantity = 1;
  renderProduct();
  showDialog(dialogs.product, trigger, '#product-dialog-title');
}

function cartItem(id, quantity) {
  const product = productMap.get(id);
  return `<article class="cart-item">
    <button class="cart-item-media theme-${id}" data-product="${id}" aria-label="Zobacz ${escapeHTML(product.name)}"><img src="${product.image}" alt="" width="160" height="160"></button>
    <div class="cart-item-info">
      <div class="cart-item-top"><button class="cart-item-title" data-product="${id}">${escapeHTML(product.name)}</button><strong>${money(priceCents(product) * quantity)}</strong></div>
      <span class="cart-item-category">${escapeHTML(product.categoryLabel)} · ${money(priceCents(product))} / szt.</span>
      <div class="cart-item-controls">
        <div class="quantity-stepper" role="group" aria-label="Liczba sztuk: ${escapeHTML(product.name)}">
          <button data-cart-qty="${id}" data-delta="-1" aria-label="${quantity === 1 ? 'Usuń' : 'Zmniejsz liczbę sztuk'}: ${escapeHTML(product.name)}">${icon('minus')}</button>
          <span class="quantity-value" aria-live="polite">${quantity}</span>
          <button data-cart-qty="${id}" data-delta="1" aria-label="Zwiększ liczbę sztuk: ${escapeHTML(product.name)}"${quantity >= quantityLimit ? ' disabled' : ''}>${icon('plus')}</button>
        </div>
        <button class="cart-remove" data-cart-remove="${id}">Usuń</button>
      </div>
    </div>
  </article>`;
}

function shippingProgress(subtotal) {
  const remaining = Math.max(0, shippingThreshold - subtotal);
  const percent = Math.min(100, Math.round(subtotal / shippingThreshold * 100));
  return `<div class="shipping-progress${remaining === 0 ? ' is-complete' : ''}">
    <p>${icon('truck')}<span>${remaining === 0 ? '<strong>Dostawa na nas!</strong> Masz darmową dostawę.' : `Do darmowej dostawy brakuje <strong>${money(remaining)}</strong>.`}</span></p>
    <div class="shipping-progress-track" role="progressbar" aria-label="Postęp do darmowej dostawy" aria-valuemin="0" aria-valuemax="199" aria-valuenow="${Math.min(199, subtotal / 100)}" aria-valuetext="${remaining === 0 ? 'Darmowa dostawa' : `Brakuje ${money(remaining)}`}"><span style="width:${percent}%"></span></div>
  </div>`;
}

function renderCart() {
  const focused = document.activeElement;
  const focusId = dialogs.cart.contains(focused) ? focused.getAttribute('data-cart-qty') : null;
  const focusDelta = focusId ? focused.getAttribute('data-delta') : null;
  const subtotal = cartSubtotal();
  const shipping = currentShipping();
  dialogs.cart.innerHTML = `<div class="drawer-header"><div><span class="eyebrow">TWOJE MAŁE PRZYJEMNOŚCI</span><h2 id="cart-dialog-title">Koszyk <span class="drawer-count">${cartCount()}</span></h2></div>${dialogClose('Zamknij koszyk')}</div>
    <div class="cart-content">${state.cart.size ? `<div class="cart-items">${[...state.cart].map(([id, quantity]) => cartItem(id, quantity)).join('')}</div>` : `<div class="cart-empty"><span class="empty-icon">${icon('bag')}</span><h3 class="empty-title">Tu jeszcze jest miejsce na frajdę.</h3><p class="empty-description">Dodaj gadżet, który poprawi Ci dzień.</p><button class="button button-dark" data-continue-shopping>Zobacz gadżety ${icon('arrow')}</button></div>`}</div>
    ${state.cart.size ? `<div class="cart-summary">${shippingProgress(subtotal)}
      <div class="summary-row"><span>Produkty</span><span>${money(subtotal)}</span></div>
      <div class="summary-row"><span>Dostawa</span><span>${shipping === 0 ? '<strong class="free-shipping">Gratis!</strong>' : money(shipping)}</span></div>
      <div class="summary-row summary-total"><span>Razem</span><strong>${money(subtotal + shipping)}</strong></div>
      <button class="button button-dark cart-checkout" data-checkout>Przejdź do podsumowania ${icon('arrow')}</button>
      <p class="cart-note">Sklep pokazowy — zamówienia uruchomimy wkrótce.</p>
    </div>` : ''}`;
  if (focusId) {
    const nextFocus = dialogs.cart.querySelector(`[data-cart-qty="${focusId}"][data-delta="${focusDelta}"]`);
    if (nextFocus && !nextFocus.disabled) nextFocus.focus({ preventScroll: true });
    else dialogs.cart.querySelector('.cart-item-controls button, [data-continue-shopping]')?.focus({ preventScroll: true });
  }
}

function openCart(trigger) {
  renderCart();
  showDialog(dialogs.cart, trigger);
}

function changeCartQuantity(id, delta) {
  if (!state.cart.has(id) || (delta !== 1 && delta !== -1)) return;
  const next = state.cart.get(id) + delta;
  if (next < 1) state.cart.delete(id);
  else state.cart.set(id, Math.min(quantityLimit, next));
  syncState();
}

function renderSearch() {
  dialogs.search.innerHTML = `${dialogClose('Zamknij wyszukiwanie')}<div class="dialog-header"><span class="eyebrow">ZNAJDŹ SWOJĄ FRAJDĘ</span><h2 id="search-dialog-title">Czego szukasz?</h2></div>
    <form class="search-form" data-search-form><label class="sr-only" for="catalogue-search">Wyszukaj gadżet</label><div class="search-input-wrap">${icon('search')}<input id="catalogue-search" type="search" placeholder="Kaczka, kosmos, arcade…" value="${escapeHTML(state.query)}" maxlength="100" autocomplete="off" spellcheck="false"><button class="search-clear icon-button" type="button" data-clear-search aria-label="Wyczyść wyszukiwanie"${state.query ? '' : ' hidden'}>${icon('close')}</button></div></form>
    <p class="search-suggestions">Małe rzeczy. Dużo dobrego humoru.</p><div class="search-results" id="search-results"></div>`;
  renderSearchResults();
}

function renderSearchResults() {
  const list = dialogs.search.querySelector('#search-results');
  if (!list) return;
  const found = matchingProducts();
  list.innerHTML = found.length ? `<p class="search-count">${state.query ? 'Znalezione gadżety' : 'Poznaj nasze gadżety'} <span>(${found.length})</span></p>${found.map((product) => `<button class="search-result" data-product="${product.id}"><span class="search-result-image theme-${product.id}"><img src="${product.image}" alt="" width="120" height="120"></span><span class="search-result-copy"><span>${escapeHTML(product.categoryLabel)}</span><strong>${escapeHTML(product.name)}</strong></span><span class="search-result-price">${money(priceCents(product))}</span>${icon('arrow')}</button>`).join('')}` : `<div class="search-empty"><span class="empty-icon">${icon('search')}</span><h3>Żaden gadżet jeszcze się nie zgłosił.</h3><p>Spróbuj „kaczka”, „kosmos” albo „arcade”.</p></div>`;
  const clear = dialogs.search.querySelector('.search-clear');
  if (clear) clear.hidden = !state.query;
}

function openSearch(trigger) {
  renderSearch();
  showDialog(dialogs.search, trigger, '#catalogue-search');
}

function clearSearch() {
  state.query = '';
  const input = dialogs.search.querySelector('#catalogue-search');
  if (input) input.value = '';
  renderCatalogue();
  renderSearchResults();
  if (dialogs.search.open) input?.focus({ preventScroll: true });
}

function renderCheckout() {
  const subtotal = cartSubtotal();
  const shipping = currentShipping();
  dialogs.checkout.innerHTML = `${dialogClose('Zamknij podsumowanie')}<div class="checkout-content"><span class="demo-badge">${icon('sparkle')} WERSJA POKAZOWA</span><h2 id="checkout-dialog-title" tabindex="-1">Dobry wybór.<br>To będzie frajda!</h2><p class="checkout-intro">Oto Twoje gadżety w jednym miejscu.</p>
    <div class="checkout-items">${state.cart.size ? [...state.cart].map(([id, quantity]) => { const product = productMap.get(id); return `<div class="checkout-item"><span class="checkout-item-image theme-${id}"><img src="${product.image}" alt="" width="100" height="100"></span><span class="checkout-item-name">${escapeHTML(product.name)}<small>${quantity} ${quantity === 1 ? 'sztuka' : 'szt.'}</small></span><strong>${money(priceCents(product) * quantity)}</strong></div>`; }).join('') : '<p class="checkout-empty">Koszyk jest już pusty. Wybierz coś, co poprawi Ci dzień.</p>'}</div>
    <div class="checkout-summary"><div class="summary-row"><span>Produkty</span><span>${money(subtotal)}</span></div><div class="summary-row"><span>Dostawa</span><span>${shipping === 0 ? 'Gratis!' : money(shipping)}</span></div><div class="summary-row summary-total"><span>Razem</span><strong>${money(subtotal + shipping)}</strong></div></div>
    <div class="demo-notice">${icon('sparkle')}<p><strong>To sklep pokazowy.</strong> Zamówienia i płatności uruchomimy wkrótce.</p></div><button class="button button-dark" data-continue-shopping>Wracam do gadżetów ${icon('arrow')}</button></div>`;
}

function openCheckout(trigger) {
  if (!state.cart.size) {
    openCart(trigger);
    return;
  }
  renderCheckout();
  showDialog(dialogs.checkout, trigger, '#checkout-dialog-title');
}

function scrollToCatalogue() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelector('#catalogue')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
}

function closeMenu() {
  document.querySelector('#main-nav')?.classList.remove('is-open');
  document.querySelector('#mobile-menu-button')?.setAttribute('aria-expanded', 'false');
}

function toggleMenu() {
  const menu = document.querySelector('#main-nav');
  const button = document.querySelector('#mobile-menu-button');
  if (!menu || !button) return;
  const expanded = !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', expanded);
  button.setAttribute('aria-expanded', String(expanded));
}

function resetCatalogue() {
  state.filter = 'all';
  clearSearch();
  scrollToCatalogue();
}

function onClick(event) {
  if (!(event.target instanceof Element)) return;
  const target = event.target.closest('button, [data-action], [data-filter], [data-product], [data-add]');
  if (event.target.closest('#main-nav a')) closeMenu();
  if (!target) return;
  if (target.hasAttribute('data-modal-close')) {
    closeDialog(target.closest('dialog'));
  } else if (target.hasAttribute('data-favorite')) {
    toggleFavorite(target.dataset.favorite);
  } else if (target.hasAttribute('data-add')) {
    addToCart(target.dataset.add);
  } else if (target.hasAttribute('data-product')) {
    openProduct(target.dataset.product, target);
  } else if (target.hasAttribute('data-detail-qty')) {
    const delta = Number(target.dataset.detailQty);
    if (delta !== 1 && delta !== -1) return;
    state.detailQuantity = Math.min(quantityLimit, Math.max(1, state.detailQuantity + delta));
    renderProduct();
    const focusTarget = dialogs.product.querySelector(`[data-detail-qty="${delta}"]`);
    if (focusTarget && !focusTarget.disabled) focusTarget.focus({ preventScroll: true });
    else dialogs.product.querySelector('[data-detail-add]')?.focus({ preventScroll: true });
  } else if (target.hasAttribute('data-detail-add')) {
    addToCart(target.dataset.detailAdd, state.detailQuantity);
    openCart(target);
  } else if (target.hasAttribute('data-cart-qty')) {
    changeCartQuantity(target.dataset.cartQty, Number(target.dataset.delta));
  } else if (target.hasAttribute('data-cart-remove')) {
    if (!state.cart.has(target.dataset.cartRemove)) return;
    state.cart.delete(target.dataset.cartRemove);
    syncState();
    dialogs.cart.querySelector('.cart-item-controls button, [data-continue-shopping]')?.focus({ preventScroll: true });
  } else if (target.hasAttribute('data-checkout')) {
    openCheckout(target);
  } else if (target.hasAttribute('data-continue-shopping')) {
    Object.values(dialogs).forEach(closeDialog);
    scrollToCatalogue();
  } else if (target.hasAttribute('data-clear-search')) {
    clearSearch();
  } else if (target.hasAttribute('data-reset-catalogue')) {
    resetCatalogue();
  } else if (target.hasAttribute('data-filter')) {
    const filter = target.dataset.filter;
    if (!['all', 'home', 'play', 'space', 'favorites'].includes(filter)) return;
    state.filter = filter;
    renderCatalogue();
    if (target.matches('a[href="#catalogue"]')) scrollToCatalogue();
  } else if (target.hasAttribute('data-action')) {
    const action = target.dataset.action;
    if (action === 'cart') openCart(target);
    if (action === 'search') openSearch(target);
    if (action === 'favorites') {
      state.filter = 'favorites';
      clearSearch();
      closeMenu();
      scrollToCatalogue();
    }
    if (action === 'menu') toggleMenu();
  } else return;
  event.preventDefault();
}

function initialize() {
  productGrid = document.querySelector('#product-grid');
  overlayRoot = document.querySelector('#overlay-root');
  if (!overlayRoot) {
    overlayRoot = document.createElement('div');
    overlayRoot.id = 'overlay-root';
    document.body.append(overlayRoot);
  }
  dialogs = {
    product: makeDialog('product', 'product-dialog'),
    cart: makeDialog('cart', 'cart-dialog'),
    search: makeDialog('search', 'search-dialog'),
    checkout: makeDialog('checkout', 'checkout-dialog'),
  };
  loadSavedState();
  renderCatalogue();
  updateHeader();
  document.addEventListener('click', onClick);
  document.querySelector('#sort-products')?.addEventListener('change', (event) => {
    if (!['featured', 'price-asc', 'price-desc'].includes(event.target.value)) return;
    state.sort = event.target.value;
    renderCatalogue();
  });
  document.addEventListener('input', (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== 'catalogue-search') return;
    state.query = event.target.value.slice(0, 100).trim();
    state.filter = 'all';
    renderCatalogue();
    renderSearchResults();
  });
  document.addEventListener('submit', (event) => {
    if (!(event.target instanceof HTMLFormElement) || !event.target.hasAttribute('data-search-form')) return;
    event.preventDefault();
    closeDialog(dialogs.search);
    scrollToCatalogue();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !anyDialogOpen()) closeMenu();
    const typing = event.target instanceof Element && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
    if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey && !anyDialogOpen()) {
      event.preventDefault();
      openSearch(document.activeElement);
    }
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== null && !Object.values(storageKeys).includes(event.key)) return;
    loadSavedState();
    updateHeader();
    renderCatalogue();
    if (dialogs.cart.open) renderCart();
    if (dialogs.checkout.open) renderCheckout();
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
