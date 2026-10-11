import test from 'node:test';
import assert from 'node:assert/strict';
import {
  products,
  storageKeys,
  money,
  isQuantity,
  normalize,
  matchingProducts,
  visibleProducts,
  decodeCart,
  decodeFavorites,
  cartCount,
  cartSubtotal,
  currentShipping,
  shippingForSubtotal,
  addCartQuantity,
  changeCartQuantity,
} from '../lib/store.js';

test('existing v1 browser selections survive migration unchanged', () => {
  assert.deepEqual(storageKeys, { cart: 'funny-gadgets-cart-v1', favorites: 'funny-gadgets-favorites-v1' });
  const cart = decodeCart(JSON.parse('[{"id":"duck","quantity":2},{"id":"astronaut","quantity":1}]'));
  const favorites = decodeFavorites(JSON.parse('["astronaut","duck"]'));
  assert.deepEqual([...cart], [['duck', 2], ['astronaut', 1]]);
  assert.deepEqual([...favorites], ['astronaut', 'duck']);
  assert.equal(cartCount(cart), 3);
  assert.equal(cartSubtotal(cart), 28970);
  assert.equal(currentShipping(cart), 0);
});

test('corrupt parsed storage is ignored without preventing valid entries from loading', () => {
  for (const saved of [null, undefined, {}, 5, true, '[]']) {
    assert.deepEqual([...decodeCart(saved)], []);
    assert.deepEqual([...decodeFavorites(saved)], []);
  }
  const cart = decodeCart([
    null,
    'duck',
    ['duck', 3],
    { id: 'unknown', quantity: 1 },
    { id: 'duck', quantity: '2' },
    { id: 'duck', quantity: 0 },
    { id: 'duck', quantity: 100 },
    { id: 'duck', quantity: 1.5 },
    { id: 'duck', quantity: 2 },
    { id: 'arcade', quantity: 99 },
  ]);
  assert.deepEqual([...cart], [['duck', 2], ['arcade', 99]]);
  assert.deepEqual([...decodeFavorites([null, 'unknown', {}, 'duck', 'duck', 'astronaut', 3])], ['duck', 'astronaut']);
});

test('duplicate cart records retain the last valid quantity', () => {
  const cart = decodeCart([{ id: 'duck', quantity: 2 }, { id: 'duck', quantity: 3 }, { id: 'duck', quantity: -1 }]);
  assert.deepEqual([...cart], [['duck', 3]]);
});

test('cart additions and stepper changes are immutable and enforce purchase quantities', () => {
  const original = new Map([['duck', 98], ['astronaut', 1]]);
  const added = addCartQuantity(original, 'duck', 3);
  assert.notEqual(added, original);
  assert.deepEqual([...original], [['duck', 98], ['astronaut', 1]]);
  assert.equal(added.get('duck'), 99);
  assert.equal(changeCartQuantity(added, 'duck', 1).get('duck'), 99);
  const removed = changeCartQuantity(added, 'astronaut', -1);
  assert.equal(removed.has('astronaut'), false);
  assert.equal(added.get('astronaut'), 1);
  assert.equal(addCartQuantity(new Map(), 'arcade').get('arcade'), 1);
  for (const invalid of [0, -1, 100, 1.5, '2', NaN, Infinity, null]) {
    assert.equal(isQuantity(invalid), false);
    assert.deepEqual([...addCartQuantity(original, 'duck', invalid)], [...original]);
  }
  assert.deepEqual([...addCartQuantity(original, 'unknown', 1)], [...original]);
  for (const invalidDelta of [0, 2, -2, '1', NaN]) {
    assert.deepEqual([...changeCartQuantity(original, 'duck', invalidDelta)], [...original]);
  }
  assert.deepEqual([...changeCartQuantity(original, 'arcade', -1)], [...original]);
});

test('totals use exact pennies, with shipping charged only below 199 PLN', () => {
  const cart = new Map([['duck', 3], ['arcade', 2], ['astronaut', 4]]);
  assert.equal(cartSubtotal(cart), 105910);
  assert.equal(Number.isInteger(cartSubtotal(cart)), true);
  assert.equal(cartCount(cart), 9);
  assert.equal(currentShipping(new Map()), 0);
  assert.equal(currentShipping(new Map([['duck', 1]])), 1290);
  assert.equal(currentShipping(new Map([['duck', 1], ['astronaut', 1]])), 0);
  assert.equal(shippingForSubtotal(19899), 1290);
  assert.equal(shippingForSubtotal(19900), 0);
  assert.equal(shippingForSubtotal(19901), 0);
  assert.match(money(7990), /79,90\s*zł/u);
});

test('Polish searches accept case, accents, multiple words, and surrounding whitespace', () => {
  assert.equal(normalize('  ŁÓDŹ ŻÓŁĆ  '), 'lodz zolc');
  assert.deepEqual(matchingProducts('  MIEKKA   LAMPKA  ').map(({ id }) => id), ['duck']);
  assert.deepEqual(matchingProducts('mały sprzet').map(({ id }) => id), ['arcade']);
  assert.deepEqual(matchingProducts('kosmos sufit').map(({ id }) => id), ['astronaut']);
  assert.equal(matchingProducts('kosmos kaczka').length, 0);
  assert.equal(matchingProducts('   ').length, 3);
});

test('favorites combine with search and sorting without changing featured catalog order', () => {
  const favorites = new Set(['duck', 'astronaut']);
  assert.deepEqual(visibleProducts({ filter: 'favorites', favorites, sort: 'price-desc' }).map(({ id }) => id), ['astronaut', 'duck']);
  assert.deepEqual(visibleProducts({ filter: 'favorites', favorites, query: 'kaczka' }).map(({ id }) => id), ['duck']);
  assert.deepEqual(visibleProducts({ filter: 'favorites' }), []);
  assert.deepEqual(visibleProducts({ filter: 'play' }).map(({ id }) => id), ['arcade']);
  assert.deepEqual(visibleProducts({ sort: 'price-asc' }).map(({ id }) => id), ['duck', 'astronaut', 'arcade']);
  assert.deepEqual(visibleProducts({ sort: 'price-desc' }).map(({ id }) => id), ['arcade', 'astronaut', 'duck']);
  assert.deepEqual(products.map(({ id }) => id), ['duck', 'arcade', 'astronaut']);
  assert.deepEqual(visibleProducts().map(({ id }) => id), ['duck', 'arcade', 'astronaut']);
});
