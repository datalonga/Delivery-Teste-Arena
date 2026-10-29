/* =========================================================================
   cart.js — estado e regras do carrinho
   Persistido no localStorage: o carrinho sobrevive ao recarregar a página.
   ========================================================================= */
(function () {
  'use strict';

  var CART_KEY = 'brasa.cart.v1';
  var MAX_QTY = 50;

  var items = [];
  var listeners = [];
  var loaded = false;

  var Utils = window.Utils;

  function lineKey(produtoId, observacao) {
    return produtoId + '::' + Utils.normalize(observacao || '');
  }

  function sanitizeItem(raw) {
    if (!raw || raw.produtoId == null) return null;
    var quantidade = Math.round(Number(raw.quantidade));
    if (!isFinite(quantidade) || quantidade < 1) return null;
    var observacao = String(raw.observacao || '').slice(0, 240);
    return {
      key: lineKey(Number(raw.produtoId), observacao),
      produtoId: Number(raw.produtoId),
      nome: String(raw.nome || 'Produto'),
      preco: Utils.round2(Number(raw.preco) || 0),
      imagem: String(raw.imagem || 'assets/produtos/placeholder.svg'),
      quantidade: Utils.clamp(quantidade, 1, MAX_QTY),
      observacao: observacao
    };
  }

  function load() {
    var stored = Utils.storage.get(CART_KEY, []);
    if (!Array.isArray(stored)) stored = [];
    var merged = {};
    stored.forEach(function (raw) {
      var item = sanitizeItem(raw);
      if (!item) return;
      if (merged[item.key]) {
        merged[item.key].quantidade = Utils.clamp(merged[item.key].quantidade + item.quantidade, 1, MAX_QTY);
      } else {
        merged[item.key] = item;
      }
    });
    items = Object.keys(merged).map(function (key) { return merged[key]; });
    loaded = true;
    return items;
  }

  function ensureLoaded() { if (!loaded) load(); }

  function persist() {
    Utils.storage.set(CART_KEY, items);
  }

  function snapshot() {
    ensureLoaded();
    var subtotal = Utils.round2(items.reduce(function (sum, item) {
      return sum + item.preco * item.quantidade;
    }, 0));
    var count = items.reduce(function (sum, item) { return sum + item.quantidade; }, 0);
    var settings = window.Database ? window.Database.getSettings() : { frete: 0, pedidoMinimo: 0 };
    var shipping = items.length ? Utils.round2(Number(settings.frete) || 0) : 0;
    var total = Utils.round2(subtotal + shipping);
    var missing = Math.max(0, Utils.round2((Number(settings.pedidoMinimo) || 0) - subtotal));
    return {
      items: items.slice(),
      count: count,
      subtotal: subtotal,
      shipping: shipping,
      total: total,
      missing: missing,
      isEmpty: items.length === 0
    };
  }

  function emit() {
    var data = snapshot();
    listeners.forEach(function (listener) {
      try { listener(data); } catch (err) { console.error('[cart] listener falhou', err); }
    });
  }

  var Cart = {
    MAX_QTY: MAX_QTY,

    init: function () {
      load();
      emit();
      return Cart;
    },

    snapshot: snapshot,

    items: function () { ensureLoaded(); return items.slice(); },

    count: function () { return snapshot().count; },

    subtotal: function () { return snapshot().subtotal; },

    shipping: function () { return snapshot().shipping; },

    total: function () { return snapshot().total; },

    isEmpty: function () { return snapshot().isEmpty; },

    /** Adiciona um produto (ou soma na linha de mesma observação). */
    add: function (produto, quantidade, observacao) {
      ensureLoaded();
      if (!produto) return null;
      if (produto.disponivel === false) return null;

      var qty = Utils.clamp(Math.round(Number(quantidade) || 1), 1, MAX_QTY);
      var note = String(observacao || '').slice(0, 240);
      var key = lineKey(produto.id, note);
      var existing = items.find(function (item) { return item.key === key; });
      var merged = false;

      if (existing) {
        existing.quantidade = Utils.clamp(existing.quantidade + qty, 1, MAX_QTY);
        existing.preco = Utils.round2(Number(produto.preco));
        merged = true;
      } else {
        items.push({
          key: key,
          produtoId: Number(produto.id),
          nome: String(produto.nome),
          preco: Utils.round2(Number(produto.preco) || 0),
          imagem: String(produto.imagem || 'assets/produtos/placeholder.svg'),
          quantidade: qty,
          observacao: note
        });
      }

      persist();
      emit();
      return { key: key, merged: merged };
    },

    setQuantity: function (key, quantidade) {
      ensureLoaded();
      var item = items.find(function (entry) { return entry.key === key; });
      if (!item) return;
      var qty = Math.round(Number(quantidade));
      if (!isFinite(qty) || qty < 1) {
        Cart.remove(key);
        return;
      }
      item.quantidade = Utils.clamp(qty, 1, MAX_QTY);
      persist();
      emit();
    },

    increase: function (key) {
      ensureLoaded();
      var item = items.find(function (entry) { return entry.key === key; });
      if (!item) return;
      if (item.quantidade >= MAX_QTY) return;
      item.quantidade += 1;
      persist();
      emit();
    },

    /** Diminui; ao chegar em zero a linha é removida. */
    decrease: function (key) {
      ensureLoaded();
      var item = items.find(function (entry) { return entry.key === key; });
      if (!item) return;
      item.quantidade -= 1;
      if (item.quantidade < 1) {
        Cart.remove(key);
        return;
      }
      persist();
      emit();
    },

    remove: function (key) {
      ensureLoaded();
      items = items.filter(function (item) { return item.key !== key; });
      persist();
      emit();
    },

    clear: function () {
      items = [];
      persist();
      emit();
    },

    subscribe: function (listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function () {
        listeners = listeners.filter(function (item) { return item !== listener; });
      };
    }
  };

  window.Cart = Cart;
})();
