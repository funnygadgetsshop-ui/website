'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  products, productMap, storageKeys, shippingThreshold, quantityLimit,
  money, priceCents, isQuantity, matchingProducts, visibleProducts,
  decodeCart, decodeFavorites, cartCount, cartSubtotal, currentShipping,
  addCartQuantity, changeCartQuantity,
} from '../lib/store.js';

function Icon({ name }) {
  return <svg className="icon" aria-hidden="true"><use href={`#i-${name}`} /></svg>;
}

function IconSprite() {
  return <svg className="svg-sprite" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M4 12h15M13 5l7 7-7 7" /></symbol>
    <symbol id="i-bag" viewBox="0 0 24 24"><path d="M5 7h14l1 14H4L5 7ZM8 8V6a4 4 0 0 1 8 0v2" /></symbol>
    <symbol id="i-heart" viewBox="0 0 24 24"><path d="M20.5 4.6a5.5 5.5 0 0 0-7.8 0l-.7.7-.7-.7a5.5 5.5 0 0 0-7.8 7.8L12 21l8.5-8.6a5.5 5.5 0 0 0 0-7.8Z" /></symbol>
    <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
    <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14" /></symbol>
    <symbol id="i-close" viewBox="0 0 24 24"><path d="m6 6 12 12M6 18 18 6" /></symbol>
    <symbol id="i-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
    <symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></symbol>
    <symbol id="i-star" viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></symbol>
    <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" /></symbol>
    <symbol id="i-truck" viewBox="0 0 24 24"><path d="M2 5h12v12H2V5Zm12 5h4l4 4v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></symbol>
    <symbol id="i-sparkle" viewBox="0 0 24 24"><path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z" /></symbol>
    <symbol id="i-gift" viewBox="0 0 24 24"><path d="M3 10h18v4H3zM5 14h14v7H5zM12 10v11M12 10H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z" /></symbol>
    <symbol id="i-smile" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8 14a4 4 0 0 0 8 0M8 9h.01M16 9h.01" /></symbol>
  </svg>;
}

function ProductPrice({ product, children }) {
  return <div className="product-price">
    {product.oldPrice ? <span className="old-price"><s>{money(Math.round(product.oldPrice * 100))}</s></span> : null}
    <strong>{money(priceCents(product))}</strong>{children}
  </div>;
}

function ProductCard({ product, index, favorite, onFavorite, onProduct, onAdd }) {
  return <article className="product-card" style={{ '--card-index': index }}>
    <div className={`product-media theme-${product.id}`}>
      <span className="product-badge">{product.tag}</span>
      <button className={`favorite-button${favorite ? ' is-favorite' : ''}`} data-favorite={product.id} aria-pressed={favorite} aria-label={`${favorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}: ${product.name}`} onClick={(event) => onFavorite(product.id, event.currentTarget)}><Icon name="heart" /></button>
      <button className="product-image-button" data-product={product.id} aria-label={`Zobacz ${product.name}`} onClick={(event) => onProduct(product.id, event.currentTarget)}><img src={product.image} alt={product.name} loading="lazy" width="800" height="800" /></button>
    </div>
    <div className="product-info">
      <span className="product-category">{product.categoryLabel}</span>
      <h3 className="product-title"><button data-product={product.id} onClick={(event) => onProduct(product.id, event.currentTarget)}>{product.name}</button></h3>
      <p className="product-description">{product.description}</p>
      <div className="product-bottom"><ProductPrice product={product} /><button className="add-button" data-add={product.id} aria-label={`Dodaj do koszyka: ${product.name}`} onClick={() => onAdd(product.id)}><Icon name="plus" /><span>Do koszyka</span></button></div>
    </div>
  </article>;
}

function StoreDialog({ name, open, onDismiss, initialFocus = '.dialog-close', children }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    let focusFrame;
    if (open) {
      if (!dialog.open) dialog.showModal();
      focusFrame = requestAnimationFrame(() => dialog.querySelector(initialFocus)?.focus({ preventScroll: true }));
    } else if (dialog.open) dialog.close();
    return () => { if (focusFrame) cancelAnimationFrame(focusFrame); };
  }, [open, initialFocus]);
  return <dialog ref={dialogRef} id={`${name}-dialog`} className={`store-dialog ${name}-dialog`} aria-labelledby={`${name}-dialog-title`} onCancel={(event) => { event.preventDefault(); onDismiss(); }} onClick={(event) => {
    if (event.target !== event.currentTarget) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onDismiss();
  }}>{children}</dialog>;
}

function DialogClose({ label, onDismiss }) {
  return <button className="icon-button dialog-close" data-modal-close aria-label={label} onClick={onDismiss}><Icon name="close" /></button>;
}

function ShippingProgress({ subtotal }) {
  const remaining = Math.max(0, shippingThreshold - subtotal);
  const percent = Math.min(100, Math.round(subtotal / shippingThreshold * 100));
  return <div className={`shipping-progress${remaining === 0 ? ' is-complete' : ''}`}>
    <p><Icon name="truck" /><span>{remaining === 0 ? <><strong>Dostawa na nas!</strong> Masz darmową dostawę.</> : <>Do darmowej dostawy brakuje <strong>{money(remaining)}</strong>.</>}</span></p>
    <div className="shipping-progress-track" role="progressbar" aria-label="Postęp do darmowej dostawy" aria-valuemin="0" aria-valuemax={shippingThreshold / 100} aria-valuenow={Math.min(shippingThreshold, subtotal) / 100} aria-valuetext={remaining === 0 ? 'Darmowa dostawa' : `Brakuje ${money(remaining)}`}><span style={{ width: `${percent}%` }} /></div>
  </div>;
}

function Summary({ subtotal, shipping, checkout = false }) {
  return <>
    <div className="summary-row"><span>Produkty</span><span>{money(subtotal)}</span></div>
    <div className="summary-row"><span>Dostawa</span><span>{shipping === 0 ? checkout ? 'Gratis!' : <strong className="free-shipping">Gratis!</strong> : money(shipping)}</span></div>
    <div className="summary-row summary-total"><span>Razem</span><strong>{money(subtotal + shipping)}</strong></div>
  </>;
}

function readSaved(key) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function scrollToCatalogue() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('catalogue')?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
}

export default function Storefront() {
  const [cart, setCart] = useState(() => new Map());
  const [favorites, setFavorites] = useState(() => new Set());
  const [storageReady, setStorageReady] = useState(false);
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('featured');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [toast, setToast] = useState({ message: '', withCart: false, visible: false, hidden: true });
  const toastTimer = useRef(null);
  const toastHideTimer = useRef(null);
  const focusReturn = useRef(null);
  const searchInput = useRef(null);
  const modalRef = useRef(modal);
  modalRef.current = modal;
  const shownProducts = useMemo(() => visibleProducts({ query: query.trim(), filter, sort, favorites }), [query, filter, sort, favorites]);
  const searchProducts = useMemo(() => matchingProducts(query.trim()), [query]);
  const count = cartCount(cart);
  const subtotal = cartSubtotal(cart);
  const shipping = currentShipping(cart);
  const detailProduct = productMap.get(detailId);

  useEffect(() => {
    const load = () => {
      setCart(decodeCart(readSaved(storageKeys.cart)));
      setFavorites(decodeFavorites(readSaved(storageKeys.favorites)));
    };
    load();
    setStorageReady(true);
    const onStorage = (event) => {
      if (event.key === null || Object.values(storageKeys).includes(event.key)) load();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    try {
      localStorage.setItem(storageKeys.cart, JSON.stringify([...cart].map(([id, quantity]) => ({ id, quantity }))));
      localStorage.setItem(storageKeys.favorites, JSON.stringify([...favorites]));
    } catch { /* Browser storage is optional: the shop still works for this visit. */ }
  }, [cart, favorites, storageReady]);

  useEffect(() => {
    if (!modal) return;
    const body = document.body;
    const previous = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    if (scrollbar) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight || '0') + scrollbar}px`;
    body.style.overflow = 'hidden';
    body.classList.add('dialog-open');
    return () => {
      body.style.overflow = previous.overflow;
      body.style.paddingRight = previous.paddingRight;
      body.classList.remove('dialog-open');
    };
  }, [Boolean(modal)]);

  useEffect(() => () => { clearTimeout(toastTimer.current); clearTimeout(toastHideTimer.current); }, []);

  const showToast = useCallback((message, withCart = false) => {
    clearTimeout(toastTimer.current);
    clearTimeout(toastHideTimer.current);
    setToast({ message, withCart, visible: true, hidden: false });
    toastTimer.current = setTimeout(() => {
      setToast((previous) => ({ ...previous, visible: false }));
      toastHideTimer.current = setTimeout(() => setToast((previous) => ({ ...previous, hidden: true })), 250);
    }, withCart ? 4500 : 3200);
  }, []);

  const openModal = useCallback((name, trigger, initialFallback) => {
    const source = trigger || document.activeElement;
    const parentDialog = source?.closest?.('dialog');
    const fallback = initialFallback || (parentDialog?.id === 'search-dialog' ? 'search' : name === 'search' ? 'search' : 'cart');
    focusReturn.current = { source, fallback };
    setMenuOpen(false);
    setModal(name);
  }, []);

  const dismissModal = useCallback(() => {
    setModal(null);
    requestAnimationFrame(() => {
      if (modalRef.current) return;
      const { source, fallback } = focusReturn.current || {};
      const parentDialog = source?.closest?.('dialog');
      if (source?.isConnected && !source.disabled && (!parentDialog || parentDialog.open)) source.focus({ preventScroll: true });
      else document.querySelector(`[data-action="${fallback || 'cart'}"]`)?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !modalRef.current) setMenuOpen(false);
      const typing = event.target instanceof Element && (event.target.matches('input, textarea, select') || event.target.isContentEditable);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey && !modalRef.current) {
        event.preventDefault();
        openModal('search', document.activeElement);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openModal]);

  const addToCart = (id, quantity = 1) => {
    const product = productMap.get(id);
    if (!product || !isQuantity(quantity)) return;
    const previous = cart.get(id) || 0;
    const added = Math.min(quantityLimit, previous + quantity) - previous;
    if (!added) { showToast('Maksymalnie 99 sztuk jednego gadżetu w koszyku.'); return; }
    setCart((current) => addCartQuantity(current, id, quantity));
    showToast(`${product.name} ${added > 1 ? `× ${added} ` : ''}w koszyku!`, true);
  };

  const toggleFavorite = (id, trigger) => {
    const product = productMap.get(id);
    if (!product) return;
    const removing = favorites.has(id);
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    showToast(removing ? 'Gadżet usunięty z ulubionych.' : `${product.name} w ulubionych!`);
    if (removing && filter === 'favorites') requestAnimationFrame(() => {
      if (!trigger?.isConnected) document.querySelector('.category-filters [data-filter="favorites"]')?.focus({ preventScroll: true });
    });
  };

  const openProduct = (id, trigger) => {
    if (!productMap.has(id)) return;
    setDetailId(id);
    setDetailQuantity(1);
    openModal('product', trigger);
  };

  const selectFilter = (next, event) => {
    setFilter(next);
    setMenuOpen(false);
    if (event?.currentTarget.tagName === 'A') {
      event.preventDefault();
      scrollToCatalogue();
    }
  };

  const resetCatalogue = () => { setFilter('all'); setQuery(''); scrollToCatalogue(); };
  const clearSearch = () => { setQuery(''); if (modal === 'search') searchInput.current?.focus({ preventScroll: true }); };
  const continueShopping = () => { dismissModal(); scrollToCatalogue(); };

  const changeDetailQuantity = (delta, trigger) => {
    setDetailQuantity((current) => Math.max(1, Math.min(quantityLimit, current + delta)));
    requestAnimationFrame(() => {
      if (trigger.disabled) document.querySelector('[data-detail-add]')?.focus({ preventScroll: true });
    });
  };

  const changeQuantity = (id, delta, trigger) => {
    setCart((current) => changeCartQuantity(current, id, delta));
    requestAnimationFrame(() => {
      if (!trigger.isConnected || trigger.disabled) document.querySelector('#cart-dialog .cart-item-controls button, #cart-dialog [data-continue-shopping]')?.focus({ preventScroll: true });
    });
  };

  const removeFromCart = (id) => {
    setCart((current) => { const next = new Map(current); next.delete(id); return next; });
    requestAnimationFrame(() => document.querySelector('#cart-dialog .cart-item-controls button, #cart-dialog [data-continue-shopping]')?.focus({ preventScroll: true }));
  };

  const filterLinkProps = (name) => ({
    'data-filter': name,
    'aria-current': filter === name ? 'true' : undefined,
    className: filter === name ? 'is-active' : undefined,
    onClick: (event) => selectFilter(name, event),
  });

  return <>
    <a className="skip-link" href="#catalogue">Przejdź do produktów</a>
    <IconSprite />
    <div className="announcement-bar"><div className="container announcement-inner"><span>Małe gadżety. <strong>Wielka frajda.</strong> <Icon name="sparkle" /></span><span><Icon name="truck" /> Darmowa dostawa od 199 zł</span></div></div>
    <header className="site-header">
      <div className="container header-inner">
        <a className="brand" href="#" aria-label="Funny Gadgets — strona główna"><img src="/assets/logo.png?v=2" alt="Funny Gadgets" width="1774" height="887" /></a>
        <nav id="main-nav" className={`main-nav${menuOpen ? ' is-open' : ''}`} aria-label="Menu główne">
          <a href="#catalogue" {...filterLinkProps('all')}>Wszystkie gadżety</a><a href="#catalogue" {...filterLinkProps('home')}>Do domu</a><a href="#catalogue" {...filterLinkProps('play')}>Do zabawy</a><a href="#gift-ideas" onClick={() => setMenuOpen(false)}>Na prezent <span className="nav-spark">✦</span></a>
        </nav>
        <div className="header-actions">
          <button className="icon-button" data-action="search" aria-label="Szukaj gadżetów" onClick={(event) => openModal('search', event.currentTarget)}><Icon name="search" /></button>
          <button className="icon-button header-favorites" data-action="favorites" aria-label={`Ulubione, ${favorites.size} ${favorites.size === 1 ? 'produkt' : 'produkty'}`} onClick={() => { setFilter('favorites'); setQuery(''); setMenuOpen(false); scrollToCatalogue(); }}><Icon name="heart" /><span id="header-favorite-count" className="small-count" hidden={favorites.size === 0}>{favorites.size}</span></button>
          <button className="cart-button" data-action="cart" aria-label={`Koszyk, ${count} ${count === 1 ? 'produkt' : 'produktów'}`} onClick={(event) => openModal('cart', event.currentTarget)}><Icon name="bag" /><span className="cart-label">Koszyk</span><span id="header-cart-count" className="cart-count">{count}</span></button>
          <button className="icon-button mobile-menu-button" id="mobile-menu-button" data-action="menu" aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'} aria-controls="main-nav" aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}><Icon name="menu" /></button>
        </div>
      </div>
    </header>
    <main>
      <section className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><span className="red-dot" /> 100% FRAJDY. ZERO NUDY.</div>
          <h1 id="hero-title">Codzienność?<br /><span className="hero-highlight">Podkręć ją.</span><svg className="title-spark" viewBox="0 0 64 64" aria-hidden="true"><path d="m32 3 5 20 19-10-11 19 16 9-23-1-5 21-8-20-20 8 12-18L3 20l21 5Z" fill="currentColor" /></svg></h1>
          <p className="hero-description">Gadżety, które robią małe „wow”. <br />Do domu, na prezent i po prostu — dla siebie.</p>
          <a className="button button-red hero-cta" href="#catalogue" data-filter="all" onClick={(event) => selectFilter('all', event)}>Znajdź swój gadżet <Icon name="arrow" /></a>
          <div className="hero-footnote"><span className="mini-smile"><Icon name="smile" /></span> Bo fajne rzeczy nie muszą być poważne.</div>
        </div>
        <div className="hero-visual">
          <div className="hero-orbit" aria-hidden="true" /><div className="hero-dots" aria-hidden="true" />
          <span className="hero-sticker sticker-fun">UWAGA!<br /><strong>ZARAŻA<br />HUMOREM</strong><Icon name="sparkle" /></span>
          <svg className="hero-swish" viewBox="0 0 130 105" aria-hidden="true"><path d="M8 8c37 0 69 21 59 42-12 28-47 0-29-13 20-15 66 4 75 47M88 72l28 17 6-28" /></svg>
          <img className="hero-product" src="/assets/duck.png" alt="Żółta lampka w kształcie uroczej kaczki" width="1024" height="1024" fetchPriority="high" />
          <span className="hero-sticker sticker-price"><span>DUŻO FRAJDY ZA</span><strong>79,90 <small>zł</small></strong></span>
          <div className="hero-product-caption"><span className="caption-label">POZNAJ KACZKĘ LUZACZKĘ</span><button data-add="duck" onClick={() => addToCart('duck')}>Przygarnij ją <Icon name="plus" /></button></div>
          <span className="hero-tiny-star star-one" aria-hidden="true">✦</span><span className="hero-tiny-star star-two" aria-hidden="true">✧</span>
        </div>
      </section>
      <div className="fun-ticker" aria-hidden="true"><div className="ticker-track"><span>NUDZIE MÓWIMY NIE <b>✦</b> MAŁE GADŻETY, WIELKA FRAJDA <b>✦</b> PREZENT? OGARNIĘTY. <b>✦</b> NUDZIE MÓWIMY NIE <b>✦</b> MAŁE GADŻETY, WIELKA FRAJDA <b>✦</b> PREZENT? OGARNIĘTY. <b>✦</b></span></div></div>
      <section id="catalogue" className="catalogue-section container" aria-labelledby="catalogue-title">
        <div className="section-heading"><div><span className="eyebrow section-eyebrow"><span className="section-number">01</span> TWOJA PORCJA DOBREGO HUMORU</span><h2 id="catalogue-title">O, to jest <span className="scribble-word">fajne.<svg viewBox="0 0 175 15" aria-hidden="true"><path d="M4 10c53-9 111-9 166-4M28 14c37-5 73-7 111-6" /></svg></span></h2></div><span className="catalogue-note">Trzy gadżety.<br />Mnóstwo możliwości.</span></div>
        <div className="catalogue-toolbar">
          <div className="category-filters" role="group" aria-label="Kategorie produktów">
            {[['all', 'Wszystkie', null], ['home', 'Do domu', 'smile'], ['play', 'Do zabawy', 'star'], ['space', 'Kosmos', 'sparkle'], ['favorites', 'Ulubione', 'heart']].map(([name, label, symbol]) => <button key={name} className={`filter-button${filter === name ? ' is-active' : ''}`} data-filter={name} aria-pressed={filter === name} onClick={(event) => selectFilter(name, event)}>{symbol && <Icon name={symbol} />}{label}{name === 'all' && <span>{products.length}</span>}</button>)}
          </div>
          <label className="sort-control"><span className="sr-only">Sortuj produkty</span><select id="sort-products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Polecane</option><option value="price-asc">Cena: od najniższej</option><option value="price-desc">Cena: od najwyższej</option></select><Icon name="chevron" /></label>
        </div>
        <div id="results-count" className="results-count" aria-live="polite"><span>{shownProducts.length === 1 ? '1 produkt' : `${shownProducts.length} ${shownProducts.length === 0 ? 'produktów' : 'produkty'}`}{query.trim() ? ` · „${query.trim()}”` : ''}</span>{query.trim() && <button className="clear-search" data-clear-search aria-label="Wyczyść wyszukiwanie" onClick={clearSearch}>Wyczyść <Icon name="close" /></button>}</div>
        <div id="product-grid" className="product-grid">
          {shownProducts.length ? shownProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} favorite={favorites.has(product.id)} onFavorite={toggleFavorite} onProduct={openProduct} onAdd={addToCart} />) : <div className="catalogue-empty"><span className="empty-icon"><Icon name={filter === 'favorites' ? 'heart' : 'search'} /></span><h3>{filter === 'favorites' && !query.trim() ? 'Twoje ulubione czekają na pierwszy gadżet.' : 'Tu jeszcze nic nie wyskoczyło.'}</h3><p>{filter === 'favorites' && !query.trim() ? 'Kliknij serduszko przy produkcie, który wpadnie Ci w oko.' : 'Spróbuj innego hasła albo zobacz wszystkie nasze gadżety.'}</p><button className="button button-dark" data-reset-catalogue onClick={resetCatalogue}>Zobacz wszystkie gadżety <Icon name="arrow" /></button></div>}
        </div>
        <noscript><p>Włącz JavaScript, aby korzystać z koszyka, wyszukiwania i ulubionych.</p></noscript>
        <p className="catalogue-demo-note"><span /> Wersja pokazowa · produkty i ceny są przykładowe</p>
      </section>
      <section id="gift-ideas" className="gift-section container" aria-labelledby="gift-title"><div className="gift-banner">
        <div className="gift-copy"><span className="eyebrow">MISJA: TRAFIONY PREZENT</span><h2 id="gift-title">Dla tych, którzy<br />mają już <span>wszystko.</span></h2><p>Założymy się, że tego jeszcze nie mają?<br />Podaruj coś nieoczywistego. I trochę frajdy.</p><a href="#catalogue" data-filter="all" className="button button-dark" onClick={(event) => selectFilter('all', event)}>Wybierz prezent <Icon name="arrow" /></a></div>
        <div className="gift-visual"><div className="gift-orbit" aria-hidden="true" /><img src="/assets/astronaut.png" alt="Projektor w kształcie astronauty — pomysł na prezent" width="1024" height="1024" loading="lazy" /><span className="gift-sticker">EFEKT<br /><strong>WOW!</strong></span><span className="gift-star" aria-hidden="true">✦</span></div>
      </div></section>
      <section className="values-section container" aria-label="Cała filozofia Funny Gadgets">
        <div className="value-item"><div className="value-icon red-icon"><Icon name="smile" /></div><div><h3>Dobry humor w zestawie</h3><p>Małe rzeczy, które zmieniają zwykły dzień.</p></div></div>
        <div className="value-item"><div className="value-icon yellow-icon"><Icon name="gift" /></div><div><h3>Prezenty z charakterem</h3><p>Trochę praktyczne. Trochę totalnie odjechane.</p></div></div>
        <div className="value-item"><div className="value-icon lavender-icon"><Icon name="sparkle" /></div><div><h3>Fun mamy w nazwie</h3><p>A frajdę z odkrywania — w każdym gadżecie.</p></div></div>
      </section>
      <section id="faq" className="faq-section container" aria-labelledby="faq-title">
        <div className="faq-heading"><span className="eyebrow"><span className="section-number">02</span> WARTO WIEDZIEĆ</span><h2 id="faq-title">Dobre pytania.<br />Proste odpowiedzi.</h2><svg className="faq-spark" viewBox="0 0 64 64" aria-hidden="true"><path d="m32 3 5 20 19-10-11 19 16 9-23-1-5 21-8-20-20 8 12-18L3 20l21 5Z" fill="currentColor" /></svg></div>
        <div className="faq-list">
          <details><summary>Co znajdę w Funny Gadgets?<Icon name="plus" /></summary><p>Rzeczy, które dodają codzienności charakteru: zabawne lampki, gadżety do zabawy i kosmiczne dodatki do pokoju. Na początek przygotowaliśmy trzy przykładowe produkty.</p></details>
          <details><summary>Czy mogę już złożyć zamówienie?<Icon name="plus" /></summary><p>To wersja pokazowa sklepu. Możesz obejrzeć produkty, dodawać je do koszyka i sprawdzić podsumowanie. Przyjmowanie zamówień i płatności uruchomimy w kolejnym etapie.</p></details>
          <details><summary>Czy moje ulubione i koszyk się zapisują?<Icon name="plus" /></summary><p>Tak — w tej przeglądarce, jeśli pozwala ona zapisywać dane strony. Możesz wrócić do wybranych gadżetów po odświeżeniu. Nie potrzebujesz konta.</p></details>
          <details><summary>Jak wygląda dostawa w tej wersji?<Icon name="plus" /></summary><p>W pokazowym koszyku dostawa kosztuje 12,90 zł, a od 199 zł jest bezpłatna. To przykładowe warunki, które dopracujemy przed otwarciem sklepu.</p></details>
        </div>
      </section>
    </main>
    <footer className="site-footer">
      <div className="container footer-top"><div><span className="eyebrow">POWAŻNIE. BAW SIĘ DOBRZE.</span><p>Życie jest za krótkie<br />na nudne gadżety<span>✦</span></p></div><a className="footer-cta" href="#catalogue" data-filter="all" aria-label="Odkryj gadżety" onClick={(event) => selectFilter('all', event)}><Icon name="arrow" /></a></div>
      <div className="container footer-bottom"><a className="footer-brand" href="#"><img src="/assets/logo.png?v=2" alt="Funny Gadgets" width="1774" height="887" /></a><span>© 2026 Funny Gadgets <span className="footer-domain">e-gadgets.com.pl</span></span><div className="footer-links"><a href="#catalogue" {...filterLinkProps('all')}>Gadżety</a><a href="#gift-ideas">Na prezent</a><a href="#faq">Pytania i odpowiedzi</a></div><span className="footer-demo">Wersja pokazowa</span></div>
    </footer>
    <div id="overlay-root">
      <StoreDialog name="product" open={modal === 'product'} onDismiss={dismissModal} initialFocus="#product-dialog-title">
        {detailProduct && <><DialogClose label="Zamknij szczegóły produktu" onDismiss={dismissModal} /><div className="product-dialog-layout">
          <div className={`product-detail-media theme-${detailProduct.id}`}><span className="product-badge">{detailProduct.tag}</span><img src={detailProduct.image} alt={detailProduct.name} width="800" height="800" /></div>
          <div className="product-detail-copy"><span className="eyebrow">{detailProduct.categoryLabel} · Funny Gadgets</span><h2 id="product-dialog-title" tabIndex="-1">{detailProduct.name}</h2><p className="product-detail-description">{detailProduct.details}</p><ul className="product-features">{detailProduct.features.map((feature) => <li key={feature}><Icon name="check" /><span>{feature}</span></li>)}</ul>
            <div className="detail-purchase"><ProductPrice product={detailProduct}><span className="detail-price-label">/ szt.</span></ProductPrice>
              <div className="purchase-controls"><div className="quantity-stepper" role="group" aria-label="Liczba sztuk"><button data-detail-qty="-1" aria-label="Zmniejsz liczbę sztuk" disabled={detailQuantity <= 1} onClick={(event) => changeDetailQuantity(-1, event.currentTarget)}><Icon name="minus" /></button><span className="quantity-value" aria-live="polite">{detailQuantity}</span><button data-detail-qty="1" aria-label="Zwiększ liczbę sztuk" disabled={detailQuantity >= quantityLimit} onClick={(event) => changeDetailQuantity(1, event.currentTarget)}><Icon name="plus" /></button></div>
                <button className="button button-dark detail-add" data-detail-add={detailProduct.id} onClick={(event) => { addToCart(detailProduct.id, detailQuantity); openModal('cart', event.currentTarget); }}><Icon name="bag" /><span>Do koszyka · {money(priceCents(detailProduct) * detailQuantity)}</span></button>
              </div><p className="demo-product-note">Gadżet przykładowy w wersji pokazowej sklepu.</p>
            </div>
          </div>
        </div></>}
      </StoreDialog>
      <StoreDialog name="cart" open={modal === 'cart'} onDismiss={dismissModal}>
        <div className="drawer-header"><div><span className="eyebrow">TWOJE MAŁE PRZYJEMNOŚCI</span><h2 id="cart-dialog-title">Koszyk <span className="drawer-count">{count}</span></h2></div><DialogClose label="Zamknij koszyk" onDismiss={dismissModal} /></div>
        <div className="cart-content">{cart.size ? <div className="cart-items">{[...cart].map(([id, quantity]) => {
          const product = productMap.get(id);
          return <article className="cart-item" key={id}><button className={`cart-item-media theme-${id}`} data-product={id} aria-label={`Zobacz ${product.name}`} onClick={(event) => openProduct(id, event.currentTarget)}><img src={product.image} alt="" width="160" height="160" /></button><div className="cart-item-info"><div className="cart-item-top"><button className="cart-item-title" data-product={id} onClick={(event) => openProduct(id, event.currentTarget)}>{product.name}</button><strong>{money(priceCents(product) * quantity)}</strong></div><span className="cart-item-category">{product.categoryLabel} · {money(priceCents(product))} / szt.</span><div className="cart-item-controls"><div className="quantity-stepper" role="group" aria-label={`Liczba sztuk: ${product.name}`}><button data-cart-qty={id} data-delta="-1" aria-label={`${quantity === 1 ? 'Usuń' : 'Zmniejsz liczbę sztuk'}: ${product.name}`} onClick={(event) => changeQuantity(id, -1, event.currentTarget)}><Icon name="minus" /></button><span className="quantity-value" aria-live="polite">{quantity}</span><button data-cart-qty={id} data-delta="1" aria-label={`Zwiększ liczbę sztuk: ${product.name}`} disabled={quantity >= quantityLimit} onClick={(event) => changeQuantity(id, 1, event.currentTarget)}><Icon name="plus" /></button></div><button className="cart-remove" data-cart-remove={id} onClick={() => removeFromCart(id)}>Usuń</button></div></div></article>;
        })}</div> : <div className="cart-empty"><span className="empty-icon"><Icon name="bag" /></span><h3 className="empty-title">Tu jeszcze jest miejsce na frajdę.</h3><p className="empty-description">Dodaj gadżet, który poprawi Ci dzień.</p><button className="button button-dark" data-continue-shopping onClick={continueShopping}>Zobacz gadżety <Icon name="arrow" /></button></div>}</div>
        {cart.size > 0 && <div className="cart-summary"><ShippingProgress subtotal={subtotal} /><Summary subtotal={subtotal} shipping={shipping} /><button className="button button-dark cart-checkout" data-checkout onClick={(event) => openModal('checkout', event.currentTarget)}>Przejdź do podsumowania <Icon name="arrow" /></button><p className="cart-note">Sklep pokazowy — zamówienia uruchomimy wkrótce.</p></div>}
      </StoreDialog>
      <StoreDialog name="search" open={modal === 'search'} onDismiss={dismissModal} initialFocus="#catalogue-search">
        <DialogClose label="Zamknij wyszukiwanie" onDismiss={dismissModal} /><div className="dialog-header"><span className="eyebrow">ZNAJDŹ SWOJĄ FRAJDĘ</span><h2 id="search-dialog-title">Czego szukasz?</h2></div>
        <form className="search-form" data-search-form onSubmit={(event) => { event.preventDefault(); dismissModal(); scrollToCatalogue(); }}><label className="sr-only" htmlFor="catalogue-search">Wyszukaj gadżet</label><div className="search-input-wrap"><Icon name="search" /><input ref={searchInput} id="catalogue-search" type="search" placeholder="Kaczka, kosmos, arcade…" value={query} maxLength="100" autoComplete="off" spellCheck="false" onChange={(event) => { setQuery(event.target.value.slice(0, 100)); setFilter('all'); }} />{query && <button className="search-clear icon-button" type="button" data-clear-search aria-label="Wyczyść wyszukiwanie" onClick={clearSearch}><Icon name="close" /></button>}</div></form>
        <p className="search-suggestions">Małe rzeczy. Dużo dobrego humoru.</p><div className="search-results" id="search-results">{searchProducts.length ? <><p className="search-count">{query.trim() ? 'Znalezione gadżety' : 'Poznaj nasze gadżety'} <span>({searchProducts.length})</span></p>{searchProducts.map((product) => <button key={product.id} className="search-result" data-product={product.id} onClick={(event) => openProduct(product.id, event.currentTarget)}><span className={`search-result-image theme-${product.id}`}><img src={product.image} alt="" width="120" height="120" /></span><span className="search-result-copy"><span>{product.categoryLabel}</span><strong>{product.name}</strong></span><span className="search-result-price">{money(priceCents(product))}</span><Icon name="arrow" /></button>)}</> : <div className="search-empty"><span className="empty-icon"><Icon name="search" /></span><h3>Żaden gadżet jeszcze się nie zgłosił.</h3><p>Spróbuj „kaczka”, „kosmos” albo „arcade”.</p></div>}</div>
      </StoreDialog>
      <StoreDialog name="checkout" open={modal === 'checkout'} onDismiss={dismissModal} initialFocus="#checkout-dialog-title">
        <DialogClose label="Zamknij podsumowanie" onDismiss={dismissModal} /><div className="checkout-content"><span className="demo-badge"><Icon name="sparkle" /> WERSJA POKAZOWA</span><h2 id="checkout-dialog-title" tabIndex="-1">Dobry wybór.<br />To będzie frajda!</h2><p className="checkout-intro">Oto Twoje gadżety w jednym miejscu.</p>
          <div className="checkout-items">{cart.size ? [...cart].map(([id, quantity]) => { const product = productMap.get(id); return <div key={id} className="checkout-item"><span className={`checkout-item-image theme-${id}`}><img src={product.image} alt="" width="100" height="100" /></span><span className="checkout-item-name">{product.name}<small>{quantity} {quantity === 1 ? 'sztuka' : 'szt.'}</small></span><strong>{money(priceCents(product) * quantity)}</strong></div>; }) : <p className="checkout-empty">Koszyk jest już pusty. Wybierz coś, co poprawi Ci dzień.</p>}</div>
          <div className="checkout-summary"><Summary subtotal={subtotal} shipping={shipping} checkout /></div><div className="demo-notice"><Icon name="sparkle" /><p><strong>To sklep pokazowy.</strong> Zamówienia i płatności uruchomimy wkrótce.</p></div><button className="button button-dark" data-continue-shopping onClick={continueShopping}>Wracam do gadżetów <Icon name="arrow" /></button>
        </div>
      </StoreDialog>
    </div>
    <div id="toast" className={`toast${toast.visible ? ' is-visible' : ''}`} role="status" aria-live="polite" aria-atomic="true" hidden={toast.hidden}>{toast.message && <><Icon name="check" /><span className="toast-message">{toast.message}</span>{toast.withCart && <button className="toast-action" data-action="cart" onClick={(event) => openModal('cart', event.currentTarget)}>Koszyk <Icon name="arrow" /></button>}</>}</div>
  </>;
}
