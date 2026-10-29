/* =========================================================================
   utils.js — utilitários compartilhados (cliente + admin)
   Helpers de DOM, formatação, storage, toasts e modais acessíveis.
   ========================================================================= */
(function () {
  'use strict';

  /* ----------------------------- DOM ---------------------------------- */
  function $(selector, root) { return (root || document).querySelector(selector); }
  function $$(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  /** Cria um elemento com atributos e filhos. */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === 'class') node.className = attrs[key];
        else if (key === 'html') node.innerHTML = attrs[key];
        else if (key === 'text') node.textContent = attrs[key];
        else if (key.indexOf('on') === 0) node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        else if (attrs[key] !== null && attrs[key] !== undefined) node.setAttribute(key, attrs[key]);
      });
    }
    (children || []).forEach(function (child) {
      if (child == null) return;
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  /* --------------------------- Formatação ----------------------------- */
  var brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  function money(value) { return brl.format(Number(value) || 0); }

  /** Aceita "18,90", "R$ 18,90", "18.90" e devolve número. */
  function parseMoney(value) {
    if (typeof value === 'number') return value;
    var clean = String(value || '').replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    var parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  function round2(value) { return Math.round((Number(value) || 0) * 100) / 100; }

  /** Remove acentos e normaliza para busca. */
  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function plural(count, singular, pluralForm) {
    return count + ' ' + (count === 1 ? singular : pluralForm);
  }

  var dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
  var timeFmt = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  /** "Hoje, 18:32" | "Ontem, 20:10" | "12/10, 19:00" */
  function dayLabel(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    var now = new Date();
    var yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    var time = timeFmt.format(date);
    if (isSameDay(date, now)) return 'Hoje, ' + time;
    if (isSameDay(date, yesterday)) return 'Ontem, ' + time;
    return dateFmt.format(date) + ', ' + time;
  }

  function fullDateLabel(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' + timeFmt.format(date);
  }

  /** Apenas dígitos do telefone, com DDI 55 quando necessário. */
  function phoneDigits(phone) {
    var digits = String(phone || '').replace(/\D/g, '');
    if (digits.length <= 11) digits = '55' + digits;
    return digits;
  }

  function debounce(fn, wait) {
    var timer;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

  /* ---------------------------- Storage ------------------------------- */
  var Storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (err) {
        console.warn('[storage] falha ao ler', key, err);
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.warn('[storage] falha ao salvar', key, err);
        return false;
      }
    },
    remove: function (key) {
      try { localStorage.removeItem(key); } catch (err) { /* ignore */ }
    }
  };

  /* ----------------------------- Toasts -------------------------------- */
  var TOAST_ICONS = { success: 'check-circle', error: 'x-circle', warning: 'alert', info: 'info' };

  function toastContainer() {
    var container = document.getElementById('toasts');
    if (!container) {
      container = el('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'false' });
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Notificação temporária.
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   */
  function toast(message, type) {
    var container = toastContainer();
    var kind = type || 'success';
    var node = el('div', { class: 'toast toast--' + kind, role: 'alert' }, [
      el('span', { class: 'toast__icon', html: Icons.svg(TOAST_ICONS[kind] || 'info') }),
      el('span', { class: 'toast__text', text: message })
    ]);
    container.appendChild(node);
    // anima entrada no próximo frame
    requestAnimationFrame(function () { node.classList.add('is-visible'); });

    setTimeout(function () {
      node.classList.remove('is-visible');
      setTimeout(function () { node.remove(); }, 260);
    }, 3200);
  }

  /* ----------------------------- Modais -------------------------------- */
  var openStack = [];
  var lastFocused = null;

  function focusable(modal) {
    return $$('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
      .filter(function (node) { return node.offsetParent !== null; });
  }

  function lockScroll(lock) {
    if (lock) {
      if (document.body.classList.contains('is-locked')) return;
      var scrollbar = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = scrollbar > 0 ? scrollbar + 'px' : '';
      document.body.classList.add('is-locked');
    } else {
      if (openStack.length) return;
      document.body.classList.remove('is-locked');
      document.body.style.paddingRight = '';
    }
  }

  function bindModal(modal) {
    if (modal.dataset.bound === '1') return;
    modal.dataset.bound = '1';
    modal.addEventListener('click', function (event) {
      var closer = event.target.closest('[data-close]');
      if (closer && modal.contains(closer)) {
        event.preventDefault();
        closeModal(modal);
      }
    });
  }

  function openModal(modal) {
    if (!modal || !modal.hidden === false) { /* noop */ }
    if (!modal) return;
    bindModal(modal);
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.appendChild(modal); // garante empilhamento correto
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
    lockScroll(true);
    if (openStack.indexOf(modal) === -1) openStack.push(modal);
    var target = modal.querySelector('[data-autofocus]') || focusable(modal)[0] || modal.querySelector('.modal__sheet');
    if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 60);
  }

  function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    var index = openStack.indexOf(modal);
    if (index > -1) openStack.splice(index, 1);
    lockScroll(false);
    setTimeout(function () {
      if (!modal.classList.contains('is-open')) modal.hidden = true;
    }, 240);
    if (lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
  }

  function closeTopModal() {
    if (openStack.length) closeModal(openStack[openStack.length - 1]);
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (openStack.length) {
        event.preventDefault();
        closeTopModal();
      }
      return;
    }
    if (event.key !== 'Tab' || !openStack.length) return;
    var modal = openStack[openStack.length - 1];
    var items = focusable(modal);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  /* --------------------------- Confirmação ----------------------------- */
  /**
   * Diálogo de confirmação (substitui window.confirm, com o mesmo visual do app).
   * @returns {Promise<boolean>}
   */
  function confirmDialog(options) {
    var opts = options || {};
    return new Promise(function (resolve) {
      var modal = el('div', { class: 'modal modal--center', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'confirm-title' });
      modal.innerHTML =
        '<div class="modal__overlay" data-close></div>' +
        '<div class="modal__sheet modal__sheet--confirm">' +
          '<div class="confirm">' +
            '<div class="confirm__icon confirm__icon--' + (opts.danger ? 'danger' : 'primary') + '">' +
              Icons.svg(opts.icon || (opts.danger ? 'alert' : 'info')) +
            '</div>' +
            '<h2 class="confirm__title" id="confirm-title">' + escapeHtml(opts.title || 'Confirmar') + '</h2>' +
            '<p class="confirm__text">' + escapeHtml(opts.message || '') + '</p>' +
            '<div class="confirm__actions">' +
              '<button type="button" class="btn btn--ghost" data-cancel>' + escapeHtml(opts.cancelText || 'Cancelar') + '</button>' +
              '<button type="button" class="btn ' + (opts.danger ? 'btn--danger' : 'btn--primary') + '" data-confirm>' + escapeHtml(opts.confirmText || 'Confirmar') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(modal);
      modal.querySelector('[data-cancel]').addEventListener('click', function () { done(false); });
      modal.querySelector('[data-confirm]').addEventListener('click', function () { done(true); });
      modal.querySelector('.modal__overlay').addEventListener('click', function () { done(false); });

      function done(result) {
        closeModal(modal);
        setTimeout(function () { modal.remove(); }, 260);
        resolve(result);
      }

      openModal(modal);
      setTimeout(function () { modal.querySelector('[data-confirm]').focus(); }, 80);
    });
  }

  /* ------------------------- Estados de botão -------------------------- */
  function busy(button, isBusy, label) {
    if (!button) return;
    if (isBusy) {
      button.dataset.originalHtml = button.innerHTML;
      button.disabled = true;
      button.classList.add('is-busy');
      if (label) button.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + escapeHtml(label);
    } else {
      button.disabled = false;
      button.classList.remove('is-busy');
      if (button.dataset.originalHtml) {
        button.innerHTML = button.dataset.originalHtml;
        delete button.dataset.originalHtml;
      }
    }
  }

  window.Utils = {
    $: $, $$: $$, el: el,
    money: money, parseMoney: parseMoney, round2: round2,
    normalize: normalize, escapeHtml: escapeHtml, plural: plural,
    dayLabel: dayLabel, fullDateLabel: fullDateLabel, isSameDay: isSameDay,
    phoneDigits: phoneDigits, debounce: debounce, uid: uid, clamp: clamp,
    storage: Storage
  };

  window.UI = {
    toast: toast,
    openModal: openModal,
    closeModal: closeModal,
    closeTopModal: closeTopModal,
    confirm: confirmDialog,
    busy: busy
  };
})();
