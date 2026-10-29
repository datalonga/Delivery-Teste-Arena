/* =========================================================================
   app.js — aplicativo do cliente
   Cardápio, busca, categorias, modal de produto, carrinho, checkout e WhatsApp.
   ========================================================================= */
(function () {
  'use strict';

  var U = window.Utils;
  var UI = window.UI;
  var icon = window.Icons.svg;

  var state = {
    produtos: [],
    categorias: [],
    configuracoes: {},
    selectedCategory: 'all',
    search: '',
    produtoAtual: null,
    quantidade: 1,
    step: 1,
    pagamento: { tipo: '', precisaTroco: false, troco: null },
    lastOrderUrl: '',
    enviando: false
  };

  var els = {};

  /* --------------------------- Inicialização --------------------------- */
  document.addEventListener('DOMContentLoaded', boot);

  function boot() {
    window.Icons.mount();
    cacheElements();
    bindEvents();

    window.Cart.init();
    window.Cart.subscribe(renderCartState);
    renderCartState(window.Cart.snapshot());

    window.Database.init()
      .then(function () {
        readData();
        renderStore();
        renderCategories();
        renderMenu();
        renderFeatured();
        renderCartState(window.Cart.snapshot());
        restoreCustomer();
      })
      .catch(function (error) {
        console.error('[app] falha ao carregar dados', error);
        UI.toast('Não foi possível carregar o cardápio.', 'error');
      });
  }

  function cacheElements() {
    els.menu = document.getElementById('menu');
    els.skeleton = document.getElementById('menu-skeleton');
    els.emptySearch = document.getElementById('empty-search');
    els.categories = document.getElementById('categories');
    els.featured = document.getElementById('featured');
    els.featuredTrack = document.getElementById('featured-track');
    els.search = document.getElementById('search-input');
    els.searchClear = document.getElementById('search-clear');
    els.headerCart = document.getElementById('header-cart');
    els.headerBadge = document.getElementById('header-cart-badge');

    els.cartBar = document.getElementById('cart-bar');
    els.cartBarBtn = document.getElementById('cart-bar-btn');
    els.cartBarCount = document.getElementById('cart-bar-count');
    els.cartBarSub = document.getElementById('cart-bar-sub');
    els.cartBarTotal = document.getElementById('cart-bar-total');

    els.modalProduct = document.getElementById('modal-product');
    els.pmImg = document.getElementById('pm-img');
    els.pmName = document.getElementById('pm-name');
    els.pmDesc = document.getElementById('pm-desc');
    els.pmPrice = document.getElementById('pm-price');
    els.pmBadge = document.getElementById('pm-badge');
    els.pmQty = document.getElementById('pm-qty');
    els.pmMinus = document.getElementById('pm-minus');
    els.pmPlus = document.getElementById('pm-plus');
    els.pmNote = document.getElementById('pm-note');
    els.pmAdd = document.getElementById('pm-add');
    els.pmTotal = document.getElementById('pm-total');

    els.modalCart = document.getElementById('modal-cart');
    els.cartItems = document.getElementById('cart-items');
    els.cartEmpty = document.getElementById('cart-empty');
    els.cartFooter = document.getElementById('cart-footer');
    els.cartCountLabel = document.getElementById('cart-count-label');
    els.cartSubtotal = document.getElementById('cart-subtotal');
    els.cartShipping = document.getElementById('cart-shipping');
    els.cartTotal = document.getElementById('cart-total');
    els.cartMinWarning = document.getElementById('cart-min-warning');
    els.cartCheckout = document.getElementById('cart-checkout');
    els.cartClear = document.getElementById('cart-clear');
    els.cartClearIcon = document.getElementById('cart-clear-icon');

    els.modalCheckout = document.getElementById('modal-checkout');
    els.checkoutTitle = document.getElementById('checkout-title');
    els.checkoutStepLabel = document.getElementById('checkout-step-label');
    els.checkoutProgress = document.getElementById('checkout-progress');
    els.checkoutForm = document.getElementById('checkout-form');
    els.checkoutReview = document.getElementById('checkout-review');
    els.checkoutNext = document.getElementById('checkout-next');
    els.checkoutSend = document.getElementById('checkout-send');
    els.checkoutBack = document.getElementById('checkout-back');
    els.coRua = document.getElementById('co-rua');
    els.coNumero = document.getElementById('co-numero');
    els.coBairro = document.getElementById('co-bairro');
    els.coReferencia = document.getElementById('co-referencia');
    els.coObs = document.getElementById('co-observacao');
    els.coTroco = document.getElementById('co-troco');
    els.paymentOptions = document.getElementById('payment-options');
    els.payNote = document.getElementById('pay-note');
    els.payNoteText = document.getElementById('pay-note-text');
    els.changeBox = document.getElementById('change-box');
    els.changeValueBox = document.getElementById('change-value-box');
    els.trocoSim = document.getElementById('troco-sim');
    els.trocoNao = document.getElementById('troco-nao');
    els.reviewItems = document.getElementById('review-items');
    els.reviewSubtotal = document.getElementById('review-subtotal');
    els.reviewShipping = document.getElementById('review-shipping');
    els.reviewTotal = document.getElementById('review-total');
    els.reviewAddress = document.getElementById('review-address');
    els.reviewPayment = document.getElementById('review-payment');
    els.reviewNote = document.getElementById('review-note');
    els.reviewNoteBlock = document.getElementById('review-note-block');

    els.modalSuccess = document.getElementById('modal-success');
    els.successNumber = document.getElementById('success-number');
    els.successWa = document.getElementById('success-wa');
  }

  function readData() {
    state.produtos = window.Database.getProducts();
    state.categorias = window.Database.getCategories();
    state.configuracoes = window.Database.getSettings();
  }

  /* ------------------------------ Loja -------------------------------- */
  function renderStore() {
    var config = state.configuracoes;
    U.$$('[data-store]').forEach(function (node) {
      var key = node.getAttribute('data-store');
      if (config[key]) node.textContent = config[key];
    });

    document.title = config.nomeLoja + ' — cardápio e pedidos';
    document.getElementById('fact-time').textContent = config.tempoEntrega;
    document.getElementById('fact-shipping').textContent = U.money(config.frete);
    document.getElementById('fact-minimum').textContent =
      Number(config.pedidoMinimo) > 0 ? U.money(config.pedidoMinimo) : 'Sem mínimo';
    document.getElementById('store-city').textContent = config.cidade;
    document.getElementById('store-hours').textContent = config.horario || '';

    var status = document.getElementById('store-status');
    var statusText = document.getElementById('store-status-text');
    var aberto = config.aberto !== false;
    status.classList.toggle('is-closed', !aberto);
    statusText.textContent = aberto ? 'Aberto agora' : 'Fechado no momento';
    status.title = aberto
      ? 'Estamos recebendo pedidos'
      : 'Você pode montar o pedido, mas a confirmação será feita quando abrirmos';
  }

  /* --------------------------- Categorias ----------------------------- */
  function renderCategories() {
    var chips = ['<button type="button" class="chip' + (state.selectedCategory === 'all' ? ' is-active' : '') +
      '" data-category="all" aria-pressed="' + (state.selectedCategory === 'all') + '">Todos</button>'];

    state.categorias.forEach(function (categoria) {
      var active = String(state.selectedCategory) === String(categoria.id);
      chips.push(
        '<button type="button" class="chip' + (active ? ' is-active' : '') + '" data-category="' + categoria.id +
        '" aria-pressed="' + active + '">' +
        '<span class="chip__emoji" aria-hidden="true">' + U.escapeHtml(categoria.icone) + '</span>' +
        U.escapeHtml(categoria.nome) +
        '</button>'
      );
    });

    els.categories.innerHTML = chips.join('');
  }

  /* ---------------------------- Filtros ------------------------------- */
  function filteredProducts() {
    var term = U.normalize(state.search);
    return state.produtos.filter(function (produto) {
      if (term) {
        return U.normalize(produto.nome).indexOf(term) > -1 || U.normalize(produto.descricao).indexOf(term) > -1;
      }
      if (state.selectedCategory !== 'all' && produto.categoriaId !== Number(state.selectedCategory)) return false;
      return true;
    });
  }

  /* --------------------------- Destaques ------------------------------ */
  function renderFeatured() {
    var destaques = state.produtos.filter(function (produto) {
      return produto.destaque && produto.disponivel;
    }).slice(0, 8);

    var esconder = !destaques.length || state.search.trim() !== '' || state.selectedCategory !== 'all';
    els.featured.hidden = esconder;
    if (esconder) return;

    els.featuredTrack.innerHTML = destaques.map(function (produto) {
      return (
        '<article class="mini-card">' +
          '<button type="button" class="mini-card__main" data-open="' + produto.id + '" aria-label="' +
            U.escapeHtml(produto.nome) + ', ' + U.money(produto.preco) + '. Ver detalhes">' +
            '<span class="mini-card__media">' +
              '<img src="' + U.escapeHtml(produto.imagem) + '" alt="' + U.escapeHtml(produto.nome) +
              '" loading="lazy" decoding="async" width="440" height="320">' +
            '</span>' +
            '<span class="mini-card__name">' + U.escapeHtml(produto.nome) + '</span>' +
            '<span class="mini-card__price">' + U.money(produto.preco) + '</span>' +
          '</button>' +
          '<button type="button" class="mini-card__add" data-add="' + produto.id + '" aria-label="Adicionar ' +
            U.escapeHtml(produto.nome) + ' ao carrinho">' + icon('plus') + '</button>' +
        '</article>'
      );
    }).join('');
  }

  /* ----------------------------- Cardápio ----------------------------- */
  function productCard(produto) {
    var indisponivel = produto.disponivel === false;
    return (
      '<article class="product-card' + (indisponivel ? ' is-unavailable' : '') + '">' +
        '<button type="button" class="product-card__main" data-open="' + produto.id + '" aria-label="' +
          U.escapeHtml(produto.nome) + ', ' + U.money(produto.preco) + (indisponivel ? ', indisponível' : '') +
          '. Ver detalhes">' +
          '<span class="product-card__media">' +
            '<img src="' + U.escapeHtml(produto.imagem) + '" alt="' + U.escapeHtml(produto.nome) +
            '" loading="lazy" decoding="async" width="640" height="480">' +
            (indisponivel ? '<span class="badge badge--off">Indisponível</span>' : '') +
            (produto.destaque && !indisponivel ? '<span class="badge badge--highlight">' + icon('flame') + 'Mais pedido</span>' : '') +
          '</span>' +
          '<span class="product-card__body">' +
            '<span class="product-card__name">' + U.escapeHtml(produto.nome) + '</span>' +
            '<span class="product-card__desc">' + U.escapeHtml(produto.descricao) + '</span>' +
            '<span class="product-card__price">' + U.money(produto.preco) + '</span>' +
          '</span>' +
        '</button>' +
        '<button type="button" class="product-card__add" data-add="' + produto.id + '"' +
          (indisponivel ? ' disabled' : '') +
          ' aria-label="Adicionar ' + U.escapeHtml(produto.nome) + ' ao carrinho">' +
          icon('plus') +
        '</button>' +
      '</article>'
    );
  }

  function sectionHtml(id, titulo, produtos, emoji) {
    return (
      '<section class="menu-section" aria-labelledby="' + id + '">' +
        '<div class="section-head">' +
          '<h2 class="section-head__title" id="' + id + '">' +
            (emoji ? '<span class="section-head__emoji" aria-hidden="true">' + U.escapeHtml(emoji) + '</span>' : '') +
            U.escapeHtml(titulo) +
          '</h2>' +
          '<span class="section-head__hint">' + U.plural(produtos.length, 'item', 'itens') + '</span>' +
        '</div>' +
        '<div class="product-grid">' + produtos.map(productCard).join('') + '</div>' +
      '</section>'
    );
  }

  function renderMenu() {
    if (els.skeleton) {
      els.skeleton.remove();
      els.skeleton = null;
    }

    var term = state.search.trim();

    if (!state.produtos.length) {
      showEmptyState('Cardápio em atualização', 'O lojista ainda não cadastrou produtos neste cardápio.', false);
      return;
    }

    var produtos = filteredProducts();
    if (!produtos.length) {
      showEmptyState('Nenhum produto encontrado', 'Tente pesquisar por outro nome ou escolha uma categoria diferente.', true);
      return;
    }

    hideEmptyState();

    if (term) {
      els.menu.innerHTML = sectionHtml('section-search', 'Resultados para “' + term + '”', produtos);
      return;
    }

    var html = [];
    state.categorias.forEach(function (categoria) {
      if (state.selectedCategory !== 'all' && String(state.selectedCategory) !== String(categoria.id)) return;
      var itens = produtos.filter(function (produto) { return produto.categoriaId === categoria.id; });
      if (!itens.length) return;
      html.push(sectionHtml('section-cat-' + categoria.id, categoria.nome, itens, categoria.icone));
    });

    // produtos de categorias removidas/desconhecidas continuam visíveis
    var idsConhecidos = state.categorias.map(function (categoria) { return categoria.id; });
    var orfaos = produtos.filter(function (produto) { return idsConhecidos.indexOf(produto.categoriaId) === -1; });
    if (orfaos.length) html.push(sectionHtml('section-outros', 'Outros', orfaos));

    els.menu.innerHTML = html.join('');
  }

  function showEmptyState(titulo, texto, mostrarReset) {
    els.menu.innerHTML = '';
    els.emptySearch.hidden = false;
    els.emptySearch.querySelector('.empty-state__title').textContent = titulo;
    els.emptySearch.querySelector('.empty-state__text').textContent = texto;
    document.getElementById('empty-reset').hidden = !mostrarReset;
  }

  function hideEmptyState() {
    els.emptySearch.hidden = true;
  }

  /* --------------------------- Modal produto -------------------------- */
  function openProduct(produtoId) {
    var produto = state.produtos.find(function (item) { return item.id === Number(produtoId); });
    if (!produto) return;

    state.produtoAtual = produto;
    state.quantidade = 1;

    els.pmImg.src = produto.imagem;
    els.pmImg.alt = produto.nome;
    els.pmName.textContent = produto.nome;
    els.pmDesc.textContent = produto.descricao || 'Sem descrição.';
    els.pmPrice.textContent = U.money(produto.preco);
    els.pmNote.value = '';

    var indisponivel = produto.disponivel === false;
    els.pmBadge.hidden = !indisponivel;
    els.pmAdd.disabled = indisponivel;
    els.pmAdd.querySelector('span').textContent = indisponivel ? 'Produto indisponível' : 'Adicionar';
    els.pmTotal.textContent = U.money(produto.preco);
    els.pmMinus.disabled = true;

    els.pmQty.textContent = '1';
    UI.openModal(els.modalProduct);
  }

  function updateProductQuantity(delta) {
    if (!state.produtoAtual) return;
    var proximo = U.clamp(state.quantidade + delta, 1, window.Cart.MAX_QTY);
    if (proximo === state.quantidade) return;
    state.quantidade = proximo;
    els.pmQty.textContent = String(proximo);
    els.pmQty.classList.remove('is-pop');
    void els.pmQty.offsetWidth;
    els.pmQty.classList.add('is-pop');
    els.pmTotal.textContent = U.money(state.produtoAtual.preco * proximo);
    els.pmMinus.disabled = proximo <= 1;
    els.pmPlus.disabled = proximo >= window.Cart.MAX_QTY;
  }

  function addCurrentProduct() {
    if (!state.produtoAtual) return;
    if (state.produtoAtual.disponivel === false) {
      UI.toast('Este produto está indisponível.', 'warning');
      return;
    }
    window.Cart.add(state.produtoAtual, state.quantidade, els.pmNote.value.trim());
    UI.toast(state.produtoAtual.nome + ' adicionado ao carrinho', 'success');
    UI.closeModal(els.modalProduct);
    bumpCartBar();
  }

  /* ----------------------------- Carrinho ----------------------------- */
  function addProductById(produtoId) {
    var produto = state.produtos.find(function (item) { return item.id === Number(produtoId); });
    if (!produto) return;
    if (produto.disponivel === false) {
      UI.toast('Este produto está indisponível.', 'warning');
      return;
    }
    var resultado = window.Cart.add(produto, 1, '');
    UI.toast(
      resultado && resultado.merged ? 'Carrinho atualizado' : produto.nome + ' adicionado ao carrinho',
      'success'
    );
    bumpCartBar();
  }

  function bumpCartBar() {
    if (!els.cartBar || els.cartBar.hidden) return;
    els.cartBar.classList.remove('is-bump');
    void els.cartBar.offsetWidth;
    els.cartBar.classList.add('is-bump');
  }

  function renderCartState(snapshot) {
    var empty = snapshot.isEmpty;

    // cabeçalho
    els.headerBadge.hidden = empty;
    els.headerBadge.textContent = snapshot.count > 99 ? '99+' : String(snapshot.count);
    els.headerCart.setAttribute('aria-label', empty ? 'Abrir carrinho' : 'Abrir carrinho com ' + U.plural(snapshot.count, 'item', 'itens'));

    // barra flutuante
    els.cartBar.hidden = empty;
    document.body.classList.toggle('has-cart-bar', !empty);
    if (!empty) {
      els.cartBarCount.textContent = snapshot.count > 99 ? '99+' : String(snapshot.count);
      els.cartBarSub.textContent = U.plural(snapshot.count, 'item', 'itens');
      els.cartBarTotal.textContent = U.money(snapshot.total);
      els.cartBarBtn.setAttribute('aria-label', 'Ver carrinho com ' + U.plural(snapshot.count, 'item', 'itens') + ', total ' + U.money(snapshot.total));
    }

    // modal do carrinho
    renderCartItems(snapshot);
    els.cartCountLabel.textContent = U.plural(snapshot.count, 'item', 'itens');
    els.cartSubtotal.textContent = U.money(snapshot.subtotal);
    els.cartShipping.textContent = U.money(snapshot.shipping);
    els.cartTotal.textContent = U.money(snapshot.total);
    els.cartEmpty.hidden = !empty;
    els.cartFooter.hidden = empty;
    els.cartClearIcon.hidden = empty;
    els.cartItems.hidden = empty;

    var bloqueado = snapshot.missing > 0;
    els.cartCheckout.disabled = bloqueado;
    els.cartMinWarning.hidden = !bloqueado;
    if (bloqueado) {
      els.cartMinWarning.textContent =
        'Pedido mínimo de ' + U.money(state.configuracoes.pedidoMinimo) + '. Faltam ' + U.money(snapshot.missing) + '.';
    }
  }

  function renderCartItems(snapshot) {
    if (!snapshot.items.length) {
      els.cartItems.innerHTML = '';
      return;
    }

    els.cartItems.innerHTML = snapshot.items.map(function (item) {
      return (
        '<div class="cart-item" data-key="' + U.escapeHtml(item.key) + '">' +
          '<img class="cart-item__img" src="' + U.escapeHtml(item.imagem) + '" alt="" loading="lazy" width="72" height="72">' +
          '<div class="cart-item__info">' +
            '<p class="cart-item__name">' + U.escapeHtml(item.nome) + '</p>' +
            (item.observacao ? '<p class="cart-item__note">' + icon('note') + U.escapeHtml(item.observacao) + '</p>' : '') +
            '<p class="cart-item__price">' + U.money(item.preco) + ' <span>·</span> ' +
              '<strong>' + U.money(item.preco * item.quantidade) + '</strong></p>' +
          '</div>' +
          '<div class="cart-item__actions">' +
            '<div class="stepper stepper--sm" role="group" aria-label="Quantidade de ' + U.escapeHtml(item.nome) + '">' +
              '<button type="button" class="stepper__btn" data-dec aria-label="Diminuir quantidade de ' + U.escapeHtml(item.nome) + '">' +
                icon('minus') + '</button>' +
              '<span class="stepper__value">' + item.quantidade + '</span>' +
              '<button type="button" class="stepper__btn" data-inc aria-label="Aumentar quantidade de ' + U.escapeHtml(item.nome) + '">' +
                icon('plus') + '</button>' +
            '</div>' +
            '<button type="button" class="icon-btn icon-btn--danger" data-remove aria-label="Remover ' +
              U.escapeHtml(item.nome) + ' do carrinho">' + icon('trash') + '</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function openCart() {
    renderCartState(window.Cart.snapshot());
    UI.openModal(els.modalCart);
  }

  function clearCart() {
    if (window.Cart.isEmpty()) return;
    UI.confirm({
      title: 'Limpar carrinho?',
      message: 'Todos os itens do pedido serão removidos.',
      confirmText: 'Limpar carrinho',
      cancelText: 'Manter itens',
      danger: true,
      icon: 'trash'
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.Cart.clear();
      UI.toast('Carrinho esvaziado', 'info');
    });
  }

  /* ----------------------------- Checkout ----------------------------- */
  function openCheckout() {
    var snapshot = window.Cart.snapshot();
    if (snapshot.isEmpty) {
      UI.toast('Seu carrinho está vazio.', 'warning');
      return;
    }
    if (snapshot.missing > 0) {
      UI.toast('Faltam ' + U.money(snapshot.missing) + ' para o pedido mínimo.', 'warning');
      return;
    }

    UI.closeModal(els.modalCart);
    UI.openModal(els.modalCheckout);
    goToStep(1);
    renderPaymentOptions();
    clearErrors();
  }

  function goToStep(step) {
    state.step = step;
    var etapa1 = step === 1;
    els.checkoutForm.hidden = !etapa1;
    els.checkoutReview.hidden = etapa1;
    els.checkoutNext.hidden = !etapa1;
    els.checkoutSend.hidden = etapa1;
    els.checkoutTitle.textContent = etapa1 ? 'Onde devemos entregar?' : 'Confira seu pedido';
    els.checkoutStepLabel.textContent = etapa1 ? 'Etapa 1 de 2' : 'Etapa 2 de 2';
    els.checkoutProgress.style.width = etapa1 ? '50%' : '100%';
    els.modalCheckout.querySelector('.sheet__scroll').scrollTop = 0;
    if (!etapa1) renderReview();
  }

  function renderPaymentOptions() {
    els.paymentOptions.innerHTML = window.Checkout.PAYMENTS.map(function (payment) {
      var checked = state.pagamento.tipo === payment.id;
      return (
        '<label class="pay-option' + (checked ? ' is-selected' : '') + '">' +
          '<input type="radio" name="pagamento" value="' + payment.id + '"' + (checked ? ' checked' : '') + '>' +
          '<span class="pay-option__body">' +
            '<span class="pay-option__icon">' + icon(payment.icon) + '</span>' +
            '<span class="pay-option__text"><strong>' + U.escapeHtml(payment.label) + '</strong>' +
              (payment.hint ? '<small>' + U.escapeHtml(payment.hint) + '</small>' : '') + '</span>' +
            '<span class="pay-option__radio" aria-hidden="true"></span>' +
          '</span>' +
        '</label>'
      );
    }).join('');

    updatePaymentExtras();
  }

  function updatePaymentExtras() {
    var tipo = state.pagamento.tipo;
    var meta = tipo ? window.Checkout.paymentMeta(tipo) : null;

    els.payNote.hidden = !(meta && meta.note);
    if (meta && meta.note) els.payNoteText.textContent = meta.note;

    var ehDinheiro = tipo === 'dinheiro';
    els.changeBox.hidden = !ehDinheiro;
    els.changeValueBox.hidden = !(ehDinheiro && state.pagamento.precisaTroco);

    U.$$('.pay-option', els.paymentOptions).forEach(function (option) {
      var input = option.querySelector('input');
      option.classList.toggle('is-selected', !!input && input.checked);
    });
  }

  function readDraft() {
    return {
      endereco: {
        rua: els.coRua.value,
        numero: els.coNumero.value,
        bairro: els.coBairro.value,
        referencia: els.coReferencia.value
      },
      pagamento: {
        tipo: state.pagamento.tipo,
        precisaTroco: state.pagamento.tipo === 'dinheiro' && state.pagamento.precisaTroco,
        troco: U.parseMoney(els.coTroco.value)
      },
      observacao: els.coObs.value
    };
  }

  function clearErrors() {
    U.$$('.field__error').forEach(function (node) { node.textContent = ''; });
    U.$$('.has-error').forEach(function (node) { node.classList.remove('has-error'); });
  }

  function showErrors(errors) {
    clearErrors();
    Object.keys(errors).forEach(function (field) {
      var errorNode = document.getElementById('err-' + field);
      if (errorNode) errorNode.textContent = errors[field];
      var input = {
        rua: els.coRua,
        numero: els.coNumero,
        bairro: els.coBairro,
        troco: els.coTroco
      }[field];
      if (input) input.classList.add('has-error');
      if (field === 'pagamento') els.paymentOptions.classList.add('has-error');
    });
    var primeiroCampo = Object.keys(errors)[0];
    var alvo = { rua: els.coRua, numero: els.coNumero, bairro: els.coBairro, troco: els.coTroco }[primeiroCampo];
    if (alvo) alvo.focus();
    if (errors.pagamento && !alvo) els.paymentOptions.querySelector('input').focus();
  }

  function continuarParaRevisao() {
    var draft = readDraft();
    var result = window.Checkout.validate(draft, { total: window.Cart.snapshot().total });

    if (!result.valid) {
      showErrors(result.errors);
      UI.toast(result.message, 'warning');
      return;
    }

    clearErrors();
    window.Checkout.saveCustomer({
      rua: draft.endereco.rua.trim(),
      numero: draft.endereco.numero.trim(),
      bairro: draft.endereco.bairro.trim(),
      referencia: draft.endereco.referencia.trim(),
      pagamento: draft.pagamento.tipo
    });
    goToStep(2);
  }

  function renderReview() {
    var snapshot = window.Cart.snapshot();
    var draft = readDraft();

    els.reviewItems.innerHTML = snapshot.items.map(function (item) {
      return (
        '<li class="review__item">' +
          '<span class="review__qty">' + item.quantidade + 'x</span>' +
          '<span class="review__name">' + U.escapeHtml(item.nome) +
            (item.observacao ? '<small>' + U.escapeHtml(item.observacao) + '</small>' : '') +
          '</span>' +
          '<span class="review__value">' + U.money(item.preco * item.quantidade) + '</span>' +
        '</li>'
      );
    }).join('');

    els.reviewSubtotal.textContent = U.money(snapshot.subtotal);
    els.reviewShipping.textContent = U.money(snapshot.shipping);
    els.reviewTotal.textContent = U.money(snapshot.total);

    var endereco = draft.endereco;
    els.reviewAddress.textContent = '';
    els.reviewAddress.appendChild(document.createTextNode(
      endereco.rua.trim() + ', ' + endereco.numero.trim() + '\n' + endereco.bairro.trim()
    ));
    if (endereco.referencia.trim()) {
      els.reviewAddress.appendChild(document.createTextNode('\nReferência: ' + endereco.referencia.trim()));
    }
    els.reviewAddress.style.whiteSpace = 'pre-line';

    els.reviewPayment.textContent = window.Checkout.paymentLabel(draft.pagamento);

    var obs = draft.observacao.trim();
    els.reviewNoteBlock.hidden = !obs;
    els.reviewNote.textContent = obs;
  }

  function enviarPedido() {
    if (state.enviando) return;

    var draft = readDraft();
    var totals = window.Cart.snapshot();
    var result = window.Checkout.validate(draft, { total: totals.total });

    if (!result.valid) {
      UI.toast(result.message, 'warning');
      goToStep(1);
      showErrors(result.errors);
      return;
    }

    if (totals.isEmpty) {
      UI.toast('Seu carrinho está vazio.', 'warning');
      return;
    }

    state.enviando = true;
    UI.busy(els.checkoutSend, true, 'Preparando pedido…');

    try {
      var placed = window.Checkout.placeOrder(draft);
      state.lastOrderUrl = placed.url;

      if (state.configuracoes.aberto === false) {
        UI.toast('Pedido registrado. A loja está fechada, aguarde a confirmação.', 'warning');
      }

      window.Checkout.openWhatsApp(placed.url);

      window.Cart.clear();
      UI.closeModal(els.modalCheckout);
      UI.busy(els.checkoutSend, false);

      els.successNumber.textContent = '#' + placed.order.numero;
      els.successWa.href = placed.url;
      UI.openModal(els.modalSuccess);
      restoreCustomerForm();
    } catch (error) {
      console.error('[app] falha ao enviar pedido', error);
      UI.toast('Não foi possível gerar o pedido. Tente novamente.', 'error');
    } finally {
      state.enviando = false;
      UI.busy(els.checkoutSend, false);
    }
  }

  /* ------------------------- Dados do cliente ------------------------- */
  function restoreCustomer() {
    var customer = window.Checkout.loadCustomer();
    if (customer.rua) els.coRua.value = customer.rua;
    if (customer.numero) els.coNumero.value = customer.numero;
    if (customer.bairro) els.coBairro.value = customer.bairro;
    if (customer.referencia) els.coReferencia.value = customer.referencia;
    if (customer.pagamento) state.pagamento.tipo = customer.pagamento;
  }

  function restoreCustomerForm() {
    els.pmNote.value = '';
    els.coObs.value = '';
    els.coTroco.value = '';
    state.pagamento = { tipo: '', precisaTroco: false, troco: null };
    if (els.trocoNao) els.trocoNao.checked = true;
    state.step = 1;
    goToStep(1);
    clearErrors();
  }

  function persistAddressDraft() {
    var customer = window.Checkout.loadCustomer();
    customer.rua = els.coRua.value.trim();
    customer.numero = els.coNumero.value.trim();
    customer.bairro = els.coBairro.value.trim();
    customer.referencia = els.coReferencia.value.trim();
    window.Checkout.saveCustomer(customer);
  }

  /* ------------------------------ Eventos ----------------------------- */
  function bindEvents() {
    /* Busca */
    var onSearch = U.debounce(function () {
      state.search = els.search.value;
      els.searchClear.hidden = !state.search.trim();
      renderMenu();
      renderFeatured();
    }, 160);
    els.search.addEventListener('input', onSearch);
    els.search.addEventListener('search', function () {
      state.search = els.search.value;
      els.searchClear.hidden = !state.search.trim();
      renderMenu();
      renderFeatured();
    });
    els.searchClear.addEventListener('click', resetSearch);
    document.getElementById('empty-reset').addEventListener('click', function () {
      resetSearch();
      state.selectedCategory = 'all';
      renderCategories();
      renderMenu();
    });

    /* Categorias */
    els.categories.addEventListener('click', function (event) {
      var chip = event.target.closest('[data-category]');
      if (!chip) return;
      var value = chip.getAttribute('data-category');
      state.selectedCategory = value === 'all' ? 'all' : Number(value);
      if (els.search.value.trim()) {
        els.search.value = '';
        state.search = '';
        els.searchClear.hidden = true;
      }
      renderCategories();
      renderMenu();
      renderFeatured();
    });

    /* Cards do cardápio e destaques */
    [els.menu, els.featuredTrack].forEach(function (container) {
      container.addEventListener('click', function (event) {
        var add = event.target.closest('[data-add]');
        if (add && !add.disabled) {
          event.preventDefault();
          addProductById(add.getAttribute('data-add'));
          return;
        }
        var open = event.target.closest('[data-open]');
        if (open) openProduct(open.getAttribute('data-open'));
      });
    });

    /* Modal do produto */
    els.pmMinus.addEventListener('click', function () { updateProductQuantity(-1); });
    els.pmPlus.addEventListener('click', function () { updateProductQuantity(1); });
    els.pmAdd.addEventListener('click', addCurrentProduct);

    /* Carrinho */
    els.headerCart.addEventListener('click', openCart);
    els.cartBarBtn.addEventListener('click', openCart);
    els.cartItems.addEventListener('click', function (event) {
      var row = event.target.closest('.cart-item');
      if (!row) return;
      var key = row.getAttribute('data-key');
      if (event.target.closest('[data-inc]')) {
        window.Cart.increase(key);
      } else if (event.target.closest('[data-dec]')) {
        var item = window.Cart.items().find(function (entry) { return entry.key === key; });
        var eraUltima = item && item.quantidade <= 1;
        window.Cart.decrease(key);
        if (eraUltima) UI.toast('Produto removido do carrinho', 'info');
      } else if (event.target.closest('[data-remove]')) {
        var nome = row.querySelector('.cart-item__name').textContent;
        window.Cart.remove(key);
        UI.toast(nome + ' removido do carrinho', 'info');
      }
    });
    els.cartClear.addEventListener('click', clearCart);
    els.cartClearIcon.addEventListener('click', clearCart);
    els.cartCheckout.addEventListener('click', openCheckout);

    /* Checkout — pagamento */
    els.paymentOptions.addEventListener('change', function (event) {
      if (event.target.name !== 'pagamento') return;
      state.pagamento.tipo = event.target.value;
      els.paymentOptions.classList.remove('has-error');
      document.getElementById('err-pagamento').textContent = '';
      updatePaymentExtras();
    });

    [els.trocoSim, els.trocoNao].forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.pagamento.precisaTroco = els.trocoSim.checked;
        els.changeValueBox.hidden = !els.trocoSim.checked;
        if (els.trocoSim.checked) {
          var total = window.Cart.snapshot().total;
          if (!els.coTroco.value) els.coTroco.value = (Math.ceil(total * 100) / 100).toFixed(2).replace('.', ',');
          setTimeout(function () { els.coTroco.focus(); }, 50);
        }
        els.changeValueBox.classList.toggle('is-visible', els.trocoSim.checked);
      });
    });

    els.coTroco.addEventListener('blur', function () {
      var valor = U.parseMoney(els.coTroco.value);
      els.coTroco.value = valor > 0 ? valor.toFixed(2).replace('.', ',') : '';
    });

    /* Checkout — navegação */
    els.checkoutNext.addEventListener('click', continuarParaRevisao);
    els.checkoutSend.addEventListener('click', enviarPedido);
    els.checkoutBack.addEventListener('click', function () {
      if (state.step === 2) goToStep(1);
      else UI.closeModal(els.modalCheckout);
    });
    els.checkoutForm.addEventListener('submit', function (event) {
      event.preventDefault();
      continuarParaRevisao();
    });

    /* Persistência leve do endereço */
    [els.coRua, els.coNumero, els.coBairro, els.coReferencia].forEach(function (input) {
      input.addEventListener('blur', persistAddressDraft);
    });

    /* Imagens quebradas caem no placeholder */
    document.addEventListener('error', function (event) {
      var target = event.target;
      if (target && target.tagName === 'IMG' && !target.dataset.fallback) {
        target.dataset.fallback = '1';
        target.src = 'assets/produtos/placeholder.svg';
      }
    }, true);

    /* Sincroniza abas (ex.: admin em outra aba) */
    window.addEventListener('storage', function (event) {
      if (event.key === window.Database.KEY) {
        readData();
        renderStore();
        renderCategories();
        renderMenu();
        renderFeatured();
        renderCartState(window.Cart.snapshot());
      } else if (event.key === 'brasa.cart.v1') {
        window.Cart.init();
      }
    });
  }

  function resetSearch() {
    els.search.value = '';
    state.search = '';
    els.searchClear.hidden = true;
    renderMenu();
    renderFeatured();
    els.search.focus();
  }
})();
