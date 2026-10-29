/* =========================================================================
   admin.js — painel do lojista (login simulado, CRUD, pedidos e ajustes)
   Tudo persiste no localStorage através da camada Database.
   ========================================================================= */
(function () {
  'use strict';

  var U = window.Utils;
  var UI = window.UI;
  var icon = window.Icons.svg;

  /* Credenciais de demonstração — não há segurança real neste projeto. */
  var CREDENTIALS = { usuario: 'admin', senha: 'admin123' };
  var SESSION_KEY = 'brasa.admin.session';
  var CART_KEY = 'brasa.cart.v1';

  var VIEW_META = {
    dashboard: { titulo: 'Dashboard', sub: 'Visão geral da loja' },
    pedidos: { titulo: 'Pedidos', sub: 'Acompanhe e atualize os pedidos' },
    produtos: { titulo: 'Produtos', sub: 'Gerencie os itens do cardápio' },
    categorias: { titulo: 'Categorias', sub: 'Organize as seções do cardápio' },
    configuracoes: { titulo: 'Configurações', sub: 'Dados da loja, frete e backup' }
  };

  var PAYMENT_LABEL = { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão na entrega' };
  var WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  var EMOJI_SUGGESTIONS = ['🍔', '🍕', '🍟', '🥤', '🍰', '🌮', '🍣', '🥗', '🍗', '🍺', '☕', '🧁'];

  var state = {
    view: 'dashboard',
    ordersFilter: 'todos',
    productSearch: '',
    editingProduct: null,
    editingCategory: null,
    currentOrder: null
  };

  var els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.Icons.mount();
    cacheElements();
    bindLogin();

    window.Database.init().then(function () {
      document.title = 'Painel — ' + window.Database.getSettings().nomeLoja;
      fillStoreNames();
      buildEmojiPicks();
      if (hasSession()) enterApp();
      else showLogin();
    });
  }

  function cacheElements() {
    els.loginScreen = document.getElementById('login-screen');
    els.loginForm = document.getElementById('login-form');
    els.loginUser = document.getElementById('login-user');
    els.loginPass = document.getElementById('login-pass');
    els.loginError = document.getElementById('login-error');
    els.loginStoreName = document.getElementById('login-store-name');

    els.app = document.getElementById('admin-app');
    els.viewTitle = document.getElementById('view-title');
    els.viewSub = document.getElementById('view-sub');
    els.ordersBadge = document.getElementById('nav-orders-badge');

    els.statRevenue = document.getElementById('stat-revenue');
    els.statRevenueHint = document.getElementById('stat-revenue-hint');
    els.statOrdersToday = document.getElementById('stat-orders-today');
    els.statOrdersHint = document.getElementById('stat-orders-hint');
    els.statProducts = document.getElementById('stat-products');
    els.statProductsHint = document.getElementById('stat-products-hint');
    els.statCategories = document.getElementById('stat-categories');
    els.statCategoriesHint = document.getElementById('stat-categories-hint');
    els.chart = document.getElementById('chart');
    els.chartTotal = document.getElementById('chart-total');
    els.recentOrders = document.getElementById('recent-orders');

    els.orderFilters = document.getElementById('order-filters');
    els.ordersList = document.getElementById('orders-list');

    els.productSearch = document.getElementById('product-search');
    els.productsTbody = document.getElementById('products-tbody');
    els.productsCards = document.getElementById('products-cards');

    els.categoriesGrid = document.getElementById('categories-grid');

    els.settingsForm = document.getElementById('settings-form');
    els.setAbertoLabel = document.getElementById('set-aberto-label');
    els.setNome = document.getElementById('set-nome');
    els.setCidade = document.getElementById('set-cidade');
    els.setDescricao = document.getElementById('set-descricao');
    els.setWhats = document.getElementById('set-whats');
    els.setHorario = document.getElementById('set-horario');
    els.setFrete = document.getElementById('set-frete');
    els.setTempo = document.getElementById('set-tempo');
    els.setMinimo = document.getElementById('set-minimo');
    els.setAberto = document.getElementById('set-aberto');

    els.modalProductForm = document.getElementById('modal-product-form');
    els.productForm = document.getElementById('product-form');
    els.pfTitle = document.getElementById('pf-title');
    els.pfId = document.getElementById('pf-id');
    els.pfNome = document.getElementById('pf-nome');
    els.pfDescricao = document.getElementById('pf-descricao');
    els.pfPreco = document.getElementById('pf-preco');
    els.pfCategoria = document.getElementById('pf-categoria');
    els.pfImagem = document.getElementById('pf-imagem');
    els.pfPreview = document.getElementById('pf-preview-img');
    els.pfDisponivel = document.getElementById('pf-disponivel');
    els.pfDestaque = document.getElementById('pf-destaque');

    els.modalCategoryForm = document.getElementById('modal-category-form');
    els.categoryForm = document.getElementById('category-form');
    els.cfTitle = document.getElementById('cf-title');
    els.cfId = document.getElementById('cf-id');
    els.cfNome = document.getElementById('cf-nome');
    els.cfIcone = document.getElementById('cf-icone');
    els.cfAtiva = document.getElementById('cf-ativa');
    els.emojiPicks = document.getElementById('emoji-picks');

    els.modalOrder = document.getElementById('modal-order');
    els.odTitle = document.getElementById('od-title');
    els.odSub = document.getElementById('od-sub');
    els.odStatus = document.getElementById('od-status');
    els.orderDetail = document.getElementById('order-detail');
  }

  /* ------------------------------- Sessão ------------------------------- */
  function hasSession() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch (err) {
      return false;
    }
  }

  function saveSession() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (err) { /* ignore */ }
  }

  function clearSession() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch (err) { /* ignore */ }
  }

  function showLogin() {
    els.app.hidden = true;
    els.loginScreen.hidden = false;
    document.getElementById('login-user').value = CREDENTIALS.usuario;
    document.getElementById('login-pass').value = CREDENTIALS.senha;
    setTimeout(function () { els.loginUser.focus(); }, 100);
  }

  function enterApp() {
    els.loginScreen.hidden = true;
    els.app.hidden = false;
    renderAll();
    var initial = (location.hash || '').replace('#', '');
    navigate(VIEW_META[initial] ? initial : 'dashboard');
  }

  function bindLogin() {
    els.loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var usuario = els.loginUser.value.trim();
      var senha = els.loginPass.value;
      els.loginError.hidden = true;

      if (!usuario || !senha) {
        els.loginError.textContent = 'Informe usuário e senha.';
        els.loginError.hidden = false;
        return;
      }

      if (usuario.toLowerCase() !== CREDENTIALS.usuario || senha !== CREDENTIALS.senha) {
        els.loginError.textContent = 'Usuário ou senha inválidos. Use admin / admin123.';
        els.loginError.hidden = false;
        return;
      }

      saveSession();
      enterApp();
      UI.toast('Bem-vindo de volta!', 'success');
    });

    document.getElementById('logout-side').addEventListener('click', logout);
    document.getElementById('logout-top').addEventListener('click', logout);
  }

  function logout() {
    UI.confirm({
      title: 'Sair do painel?',
      message: 'Você precisará informar usuário e senha para entrar novamente.',
      confirmText: 'Sair',
      cancelText: 'Ficar'
    }).then(function (confirmed) {
      if (!confirmed) return;
      clearSession();
      showLogin();
      UI.toast('Sessão encerrada', 'info');
    });
  }

  function fillStoreNames() {
    var config = window.Database.getSettings();
    U.$$('[data-store]').forEach(function (node) {
      node.textContent = config[node.getAttribute('data-store')] || '';
    });
    if (els.loginStoreName) els.loginStoreName.textContent = config.nomeLoja;
  }

  /* --------------------------- Navegação -------------------------------- */
  function navigate(view) {
    if (!VIEW_META[view]) view = 'dashboard';
    state.view = view;
    els.viewTitle.textContent = VIEW_META[view].titulo;
    els.viewSub.textContent = VIEW_META[view].sub;

    Object.keys(VIEW_META).forEach(function (key) {
      var section = document.getElementById('view-' + key);
      if (section) section.hidden = key !== view;
    });

    U.$$('[data-view]').forEach(function (button) {
      button.classList.toggle('is-active', button.getAttribute('data-view') === view);
      if (button.classList.contains('nav-item')) button.setAttribute('aria-current', button.getAttribute('data-view') === view ? 'page' : 'false');
    });

    if (view === 'dashboard') renderDashboard();
    if (view === 'pedidos') renderOrders();
    if (view === 'produtos') renderProducts();
    if (view === 'categorias') renderCategories();
    if (view === 'configuracoes') renderSettingsForm();

    try { history.replaceState(null, '', '#' + view); } catch (err) { /* ignore */ }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderAll() {
    renderDashboard();
    renderOrders();
    renderProducts();
    renderCategories();
    renderSettingsForm();
    fillStoreNames();
  }

  /* ----------------------------- Dashboard ------------------------------ */
  function isToday(date) {
    return U.isSameDay(date, new Date());
  }

  function renderDashboard() {
    var orders = window.Database.getOrders();
    var products = window.Database.getProducts();
    var categories = window.Database.getCategories(true);

    var validOrders = orders.filter(function (order) { return order.status !== 'cancelado'; });
    var todayOrders = validOrders.filter(function (order) { return isToday(new Date(order.criadoEm)); });
    var revenueToday = todayOrders.reduce(function (sum, order) { return sum + Number(order.total || 0); }, 0);
    var activeProducts = products.filter(function (product) { return product.disponivel; });
    var activeCategories = categories.filter(function (category) { return category.ativa; });

    els.statRevenue.textContent = U.money(revenueToday);
    els.statRevenueHint.textContent = todayOrders.length
      ? U.plural(todayOrders.length, 'pedido hoje', 'pedidos hoje')
      : 'Nenhum pedido ainda hoje';

    els.statOrdersToday.textContent = String(todayOrders.length);
    els.statOrdersHint.textContent = 'de ' + U.plural(orders.length, 'pedido no total', 'pedidos no total');

    els.statProducts.textContent = String(activeProducts.length);
    els.statProductsHint.textContent = products.length === activeProducts.length
      ? U.plural(products.length, 'produto no cardápio', 'produtos no cardápio')
      : (products.length - activeProducts.length) + ' indisponível(is)';

    els.statCategories.textContent = String(categories.length);
    els.statCategoriesHint.textContent = activeCategories.length + ' ativa(s) no cardápio';

    els.ordersBadge.hidden = true;
    var novos = orders.filter(function (order) { return order.status === 'novo'; }).length;
    if (novos) {
      els.ordersBadge.hidden = false;
      els.ordersBadge.textContent = novos > 9 ? '9+' : String(novos);
    }

    renderChart(validOrders);
    renderRecentOrders(orders.slice(0, 5));
  }

  function renderChart(orders) {
    var days = [];
    var total = 0;
    for (var i = 6; i >= 0; i--) {
      var date = new Date();
      date.setDate(date.getDate() - i);
      var sum = orders.reduce(function (acc, order) {
        var created = new Date(order.criadoEm);
        return U.isSameDay(created, date) ? acc + Number(order.total || 0) : acc;
      }, 0);
      total += sum;
      days.push({ date: date, total: sum, isToday: i === 0 });
    }

    els.chartTotal.textContent = U.money(total) + ' no período';

    var max = days.reduce(function (acc, day) { return Math.max(acc, day.total); }, 0);

    if (!max) {
      els.chart.innerHTML = '<div class="chart-empty">Nenhum faturamento registrado nos últimos 7 dias.</div>';
      return;
    }

    var maxBar = 126;
    els.chart.innerHTML = days.map(function (day) {
      var height = max ? Math.max(4, Math.round((day.total / max) * maxBar)) : 4;
      var classes = ['chart__col'];
      if (!day.total) classes.push('chart__col--empty');
      if (day.isToday) classes.push('chart__col--today');
      return (
        '<div class="' + classes.join(' ') + '" title="' + WEEKDAYS[day.date.getDay()] + ': ' + U.money(day.total) + '">' +
          '<span class="chart__value">' + (day.total ? U.money(day.total).replace('R$', '').trim() : '—') + '</span>' +
          '<div class="chart__bar" style="height:' + height + 'px"></div>' +
          '<span class="chart__label">' + (day.isToday ? 'hoje' : WEEKDAYS[day.date.getDay()]) + '</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderRecentOrders(orders) {
    if (!orders.length) {
      els.recentOrders.innerHTML = '<div class="empty-inline">Ainda não existem pedidos.<br>Os pedidos enviados pelo cardápio aparecem aqui.</div>';
      return;
    }

    els.recentOrders.innerHTML = orders.map(function (order) {
      var status = window.Database.getStatus(order.status);
      return (
        '<button type="button" class="recent-order" data-order="' + order.id + '">' +
          '<span class="recent-order__top">#' + order.numero + '<span>' + U.dayLabel(order.criadoEm) + '</span></span>' +
          '<span class="recent-order__total">' + U.money(order.total) + '</span>' +
          '<span class="recent-order__bottom">' +
            '<span>' + order.itens.length + ' item(s) · ' + U.escapeHtml(order.endereco ? order.endereco.bairro : '') + '</span>' +
            '<span class="pill pill--' + status.tone + '">' + status.label + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join('');
  }

  /* ------------------------------ Pedidos ------------------------------- */
  function statusPill(statusId) {
    var status = window.Database.getStatus(statusId);
    return '<span class="pill pill--' + status.tone + '">' + status.label + '</span>';
  }

  function paymentText(payment) {
    if (!payment || !payment.tipo) return 'Não informado';
    var label = PAYMENT_LABEL[payment.tipo] || payment.tipo;
    if (payment.tipo === 'dinheiro') {
      return payment.troco ? label + ' · troco para ' + U.money(payment.troco) : label + ' · sem troco';
    }
    return label;
  }

  function renderOrders() {
    var orders = window.Database.getOrders();
    var statuses = window.Database.STATUS;

    var counts = { todos: orders.length };
    statuses.forEach(function (status) { counts[status.id] = 0; });
    orders.forEach(function (order) { counts[order.status] = (counts[order.status] || 0) + 1; });

    var chips = ['<button type="button" class="filter-chip' + (state.ordersFilter === 'todos' ? ' is-active' : '') +
      '" data-filter="todos">Todos (' + counts.todos + ')</button>'];
    statuses.forEach(function (status) {
      chips.push('<button type="button" class="filter-chip' + (state.ordersFilter === status.id ? ' is-active' : '') +
        '" data-filter="' + status.id + '">' + status.label + ' (' + (counts[status.id] || 0) + ')</button>');
    });
    els.orderFilters.innerHTML = chips.join('');

    var filtered = state.ordersFilter === 'todos'
      ? orders
      : orders.filter(function (order) { return order.status === state.ordersFilter; });

    if (!filtered.length) {
      els.ordersList.innerHTML =
        '<div class="empty-inline">Ainda não existem pedidos com este status.<br>Os pedidos enviados pelo WhatsApp ficam salvos aqui.</div>';
      return;
    }

    els.ordersList.innerHTML = filtered.map(function (order) {
      var itens = order.itens.map(function (item) { return item.quantidade + 'x ' + item.nome; }).join(' · ');
      var endereco = order.endereco || {};
      return (
        '<button type="button" class="order-card" data-order="' + order.id + '">' +
          '<span class="order-card__head">' +
            '<span class="order-card__number">#' + order.numero + '</span>' +
            '<span class="order-card__time">' + U.dayLabel(order.criadoEm) + '</span>' +
            statusPill(order.status) +
          '</span>' +
          '<span class="order-card__total">' + U.money(order.total) + '</span>' +
          '<span class="order-card__items">' + U.escapeHtml(itens) + '</span>' +
          '<span class="order-card__foot">' +
            '<span class="order-card__address">' + icon('map-pin') + U.escapeHtml(endereco.rua + ', ' + endereco.numero + ' · ' + endereco.bairro) + '</span>' +
            '<span class="order-card__go">Detalhes ' + icon('chevron-right') + '</span>' +
          '</span>' +
        '</button>'
      );
    }).join('');
  }

  function openOrder(orderId) {
    var order = window.Database.getOrders().find(function (item) { return item.id === Number(orderId); });
    if (!order) return;
    state.currentOrder = order;

    els.odTitle.textContent = 'Pedido #' + order.numero;
    els.odSub.textContent = U.fullDateLabel(order.criadoEm);

    var itensHtml = order.itens.map(function (item) {
      return (
        '<div class="order-item">' +
          '<span class="order-item__qty">' + item.quantidade + 'x</span>' +
          '<span class="order-item__name">' + U.escapeHtml(item.nome) +
            (item.observacao ? '<small>Obs: ' + U.escapeHtml(item.observacao) + '</small>' : '') +
          '</span>' +
          '<span class="order-item__value">' + U.money(item.preco * item.quantidade) + '</span>' +
        '</div>'
      );
    }).join('');

    var endereco = order.endereco || {};
    var enderecoTexto = [endereco.rua + ', ' + endereco.numero, endereco.bairro + (endereco.referencia ? '\nReferência: ' + endereco.referencia : '')].join('\n');

    els.orderDetail.innerHTML =
      '<div class="order-detail__status">' +
        '<span class="pill pill--' + window.Database.getStatus(order.status).tone + '">' + window.Database.getStatus(order.status).label + '</span>' +
        '<strong style="font-size:19px;letter-spacing:-.03em">' + U.money(order.total) + '</strong>' +
      '</div>' +
      '<section class="order-detail__block">' +
        '<h3>Itens</h3>' +
        '<div class="order-items">' + itensHtml + '</div>' +
      '</section>' +
      '<section class="order-detail__block summary">' +
        '<div class="summary__row"><dt>Subtotal</dt><dd>' + U.money(order.subtotal) + '</dd></div>' +
        '<div class="summary__row"><dt>Frete</dt><dd>' + U.money(order.frete) + '</dd></div>' +
        '<div class="summary__row summary__row--total"><dt>Total</dt><dd>' + U.money(order.total) + '</dd></div>' +
      '</section>' +
      '<section class="order-detail__block">' +
        '<h3>Endereço de entrega</h3>' +
        '<p>' + U.escapeHtml(enderecoTexto) + '</p>' +
      '</section>' +
      '<section class="order-detail__block">' +
        '<h3>Pagamento</h3>' +
        '<p>' + U.escapeHtml(paymentText(order.pagamento)) + '</p>' +
      '</section>' +
      (order.observacao
        ? '<section class="order-detail__block"><h3>Observação</h3><p>' + U.escapeHtml(order.observacao) + '</p></section>'
        : '') +
      (order.demo
        ? '<section class="order-detail__block"><p class="muted" style="font-size:12px">Pedido de demonstração criado junto com os dados de exemplo.</p></section>'
        : '');

    els.odStatus.innerHTML = window.Database.STATUS.map(function (status) {
      return '<option value="' + status.id + '"' + (status.id === order.status ? ' selected' : '') + '>' + status.label + '</option>';
    }).join('');

    UI.openModal(els.modalOrder);
  }

  function saveOrderStatus() {
    if (!state.currentOrder) return;
    var novo = els.odStatus.value;
    window.Database.updateOrderStatus(state.currentOrder.id, novo);
    UI.closeModal(els.modalOrder);
    UI.toast('Status atualizado para “' + window.Database.getStatus(novo).label + '”', 'success');
    renderDashboard();
    renderOrders();
  }

  /* ------------------------------ Produtos ------------------------------ */
  function filteredProducts() {
    var term = U.normalize(state.productSearch);
    return window.Database.getProducts().filter(function (produto) {
      return !term || U.normalize(produto.nome).indexOf(term) > -1 ||
        U.normalize(produto.descricao).indexOf(term) > -1;
    });
  }

  function categoryName(categoryId) {
    var category = window.Database.getCategories(true).find(function (item) { return item.id === categoryId; });
    return category ? category.icone + ' ' + category.nome : 'Sem categoria';
  }

  function productActions(produto) {
    return (
      '<button type="button" class="mini-btn" data-action="edit" data-id="' + produto.id + '" aria-label="Editar ' + U.escapeHtml(produto.nome) + '" title="Editar">' + icon('pen') + '</button>' +
      '<button type="button" class="mini-btn' + (produto.disponivel ? ' mini-btn--active' : '') + '" data-action="toggle" data-id="' + produto.id + '" aria-label="' +
        (produto.disponivel ? 'Marcar como indisponível' : 'Marcar como disponível') + '" title="Disponível/Indisponível">' + icon('eye') + '</button>' +
      '<button type="button" class="mini-btn' + (produto.destaque ? ' mini-btn--active' : '') + '" data-action="feature" data-id="' + produto.id + '" aria-label="' +
        (produto.destaque ? 'Remover destaque' : 'Destacar em mais pedidos') + '" title="Destaque">' + icon(produto.destaque ? 'star-filled' : 'star') + '</button>' +
      '<button type="button" class="mini-btn mini-btn--danger" data-action="delete" data-id="' + produto.id + '" aria-label="Excluir ' + U.escapeHtml(produto.nome) + '" title="Excluir">' + icon('trash') + '</button>'
    );
  }

  function renderProducts() {
    var produtos = filteredProducts();

    if (!produtos.length) {
      els.productsTbody.innerHTML = '<tr><td colspan="5"><div class="empty-inline">Nenhum produto encontrado.</div></td></tr>';
      els.productsCards.innerHTML = '<div class="empty-inline">Nenhum produto encontrado.</div>';
      return;
    }

    els.productsTbody.innerHTML = produtos.map(function (produto) {
      return (
        '<tr>' +
          '<td>' +
            '<div class="cell-product">' +
              '<img src="' + U.escapeHtml(produto.imagem) + '" alt="" loading="lazy" width="42" height="42">' +
              '<div><strong>' + U.escapeHtml(produto.nome) + '</strong>' +
                '<small>' + (produto.destaque ? '★ Destaque' : U.escapeHtml(produto.descricao || '').slice(0, 40)) + '</small>' +
              '</div>' +
            '</div>' +
          '</td>' +
          '<td>' + U.escapeHtml(categoryName(produto.categoriaId)) + '</td>' +
          '<td class="ta-right cell-price">' + U.money(produto.preco) + '</td>' +
          '<td>' + (produto.disponivel
            ? '<span class="pill pill--success">Ativo</span>'
            : '<span class="pill pill--muted">Indisponível</span>') + '</td>' +
          '<td class="ta-right"><div class="cell-actions">' + productActions(produto) + '</div></td>' +
        '</tr>'
      );
    }).join('');

    els.productsCards.innerHTML = produtos.map(function (produto) {
      return (
        '<article class="admin-card">' +
          '<div class="admin-card__top">' +
            '<img class="admin-card__thumb" src="' + U.escapeHtml(produto.imagem) + '" alt="" loading="lazy" width="54" height="54">' +
            '<div class="admin-card__info">' +
              '<p class="admin-card__name">' + U.escapeHtml(produto.nome) + '</p>' +
              '<p class="admin-card__meta">' + U.escapeHtml(categoryName(produto.categoriaId)) + '</p>' +
              '<p class="admin-card__meta">' +
                (produto.disponivel ? '<span class="pill pill--success">Ativo</span>' : '<span class="pill pill--muted">Indisponível</span>') +
                (produto.destaque ? '<span class="pill pill--primary">Destaque</span>' : '') +
              '</p>' +
            '</div>' +
            '<span class="admin-card__price">' + U.money(produto.preco) + '</span>' +
          '</div>' +
          '<div class="admin-card__actions">' + productActions(produto) + '</div>' +
        '</article>'
      );
    }).join('');
  }

  function fillCategorySelect(selectedId) {
    var categorias = window.Database.getCategories(true);
    els.pfCategoria.innerHTML = categorias.map(function (categoria) {
      return '<option value="' + categoria.id + '"' + (categoria.id === selectedId ? ' selected' : '') + '>' +
        U.escapeHtml(categoria.icone + ' ' + categoria.nome) + (categoria.ativa ? '' : ' (inativa)') + '</option>';
    }).join('');
  }

  function updatePreview() {
    var caminho = els.pfImagem.value.trim() || 'assets/produtos/placeholder.svg';
    els.pfPreview.dataset.fallback = '';
    els.pfPreview.src = caminho;
  }

  function openProductForm(produtoId) {
    var produto = produtoId
      ? window.Database.getProducts().find(function (item) { return item.id === Number(produtoId); })
      : null;

    state.editingProduct = produto || null;
    els.pfTitle.textContent = produto ? 'Editar produto' : 'Novo produto';
    els.pfId.value = produto ? produto.id : '';
    els.pfNome.value = produto ? produto.nome : '';
    els.pfDescricao.value = produto ? produto.descricao : '';
    els.pfPreco.value = produto ? String(produto.preco).replace('.', ',') : '';
    els.pfImagem.value = produto ? produto.imagem : '';
    els.pfDisponivel.checked = produto ? produto.disponivel : true;
    els.pfDestaque.checked = produto ? produto.destaque : false;
    fillCategorySelect(produto ? produto.categoriaId : null);
    updatePreview();
    clearFormErrors();

    UI.openModal(els.modalProductForm);
    setTimeout(function () { els.pfNome.focus(); }, 120);
  }

  function clearFormErrors() {
    U.$$('#product-form .field__error, #category-form .field__error').forEach(function (node) { node.textContent = ''; });
    U.$$('#product-form .has-error, #category-form .has-error').forEach(function (node) { node.classList.remove('has-error'); });
  }

  function saveProduct() {
    var nome = els.pfNome.value.trim();
    var preco = U.parseMoney(els.pfPreco.value);
    var categoriaId = Number(els.pfCategoria.value);
    var erros = {};

    if (nome.length < 2) erros['pf-nome'] = 'Informe o nome do produto.';
    if (!preco || preco <= 0) erros['pf-preco'] = 'Informe um preço maior que zero.';
    if (!categoriaId) erros['pf-categoria'] = 'Escolha uma categoria.';

    if (Object.keys(erros).length) {
      Object.keys(erros).forEach(function (key) {
        var node = document.getElementById('err-' + key);
        if (node) node.textContent = erros[key];
      });
      if (erros['pf-nome']) els.pfNome.classList.add('has-error');
      if (erros['pf-preco']) els.pfPreco.classList.add('has-error');
      UI.toast('Revise os campos destacados.', 'warning');
      return;
    }

    var dados = {
      nome: nome,
      descricao: els.pfDescricao.value.trim(),
      preco: U.round2(preco),
      categoriaId: categoriaId,
      imagem: els.pfImagem.value.trim() || 'assets/produtos/placeholder.svg',
      disponivel: els.pfDisponivel.checked,
      destaque: els.pfDestaque.checked
    };

    var editando = Boolean(state.editingProduct);

    window.Database.patch(function (db) {
      if (editando) {
        var alvo = db.produtos.find(function (item) { return item.id === state.editingProduct.id; });
        if (alvo) Object.assign(alvo, dados);
      } else {
        db.produtos.push(Object.assign({ id: window.Database.nextProductId() }, dados));
      }
    });

    UI.closeModal(els.modalProductForm);
    UI.toast(editando ? 'Produto atualizado' : 'Produto criado com sucesso', 'success');
    renderProducts();
    renderDashboard();
  }

  function toggleProduct(produtoId, campo) {
    window.Database.patch(function (db) {
      var alvo = db.produtos.find(function (item) { return item.id === Number(produtoId); });
      if (alvo) alvo[campo] = !alvo[campo];
    });
    var produto = window.Database.getProductById(produtoId);
    if (produto) {
      if (campo === 'disponivel') {
        UI.toast(produto.disponivel ? produto.nome + ' está disponível' : produto.nome + ' marcado como indisponível', 'info');
      } else {
        UI.toast(produto.destaque ? produto.nome + ' agora é destaque' : produto.nome + ' removido dos destaques', 'info');
      }
    }
    renderProducts();
    renderDashboard();
  }

  function deleteProduct(produtoId) {
    var produto = window.Database.getProductById(produtoId);
    if (!produto) return;

    UI.confirm({
      title: 'Excluir produto?',
      message: '“' + produto.nome + '” será removido do cardápio. Essa ação não pode ser desfeita.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      danger: true,
      icon: 'trash'
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.Database.patch(function (db) {
        db.produtos = db.produtos.filter(function (item) { return item.id !== Number(produtoId); });
      });
      UI.toast('Produto excluído', 'info');
      renderProducts();
      renderDashboard();
    });
  }

  /* ----------------------------- Categorias ----------------------------- */
  function renderCategories() {
    var categorias = window.Database.getCategories(true);
    var produtos = window.Database.getProducts();

    if (!categorias.length) {
      els.categoriesGrid.innerHTML = '<div class="empty-inline">Nenhuma categoria cadastrada. Crie a primeira para organizar o cardápio.</div>';
      return;
    }

    els.categoriesGrid.innerHTML = categorias.map(function (categoria) {
      var total = produtos.filter(function (produto) { return produto.categoriaId === categoria.id; }).length;
      return (
        '<article class="category-card">' +
          '<span class="category-card__icon" aria-hidden="true">' + U.escapeHtml(categoria.icone) + '</span>' +
          '<div class="category-card__info">' +
            '<p class="category-card__name">' + U.escapeHtml(categoria.nome) + '</p>' +
            '<p class="category-card__meta">' +
              '<span>' + U.plural(total, 'produto', 'produtos') + '</span>' +
              (categoria.ativa ? '<span class="pill pill--success">Ativa</span>' : '<span class="pill pill--muted">Inativa</span>') +
            '</p>' +
          '</div>' +
          '<div class="category-card__actions">' +
            '<button type="button" class="mini-btn' + (categoria.ativa ? ' mini-btn--active' : '') + '" data-cat-action="toggle" data-id="' + categoria.id + '" aria-label="Ativar ou desativar ' + U.escapeHtml(categoria.nome) + '" title="Ativar/desativar">' + icon('eye') + '</button>' +
            '<button type="button" class="mini-btn" data-cat-action="edit" data-id="' + categoria.id + '" aria-label="Editar ' + U.escapeHtml(categoria.nome) + '" title="Editar">' + icon('pen') + '</button>' +
            '<button type="button" class="mini-btn mini-btn--danger" data-cat-action="delete" data-id="' + categoria.id + '" aria-label="Excluir ' + U.escapeHtml(categoria.nome) + '" title="Excluir">' + icon('trash') + '</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function buildEmojiPicks() {
    els.emojiPicks.innerHTML = EMOJI_SUGGESTIONS.map(function (emoji) {
      return '<button type="button" class="emoji-pick" data-emoji="' + emoji + '" aria-label="Usar ícone ' + emoji + '">' + emoji + '</button>';
    }).join('');
  }

  function openCategoryForm(categoriaId) {
    var categoria = categoriaId
      ? window.Database.getCategories(true).find(function (item) { return item.id === Number(categoriaId); })
      : null;

    state.editingCategory = categoria || null;
    els.cfTitle.textContent = categoria ? 'Editar categoria' : 'Nova categoria';
    els.cfId.value = categoria ? categoria.id : '';
    els.cfNome.value = categoria ? categoria.nome : '';
    els.cfIcone.value = categoria ? categoria.icone : '🍔';
    els.cfAtiva.checked = categoria ? categoria.ativa : true;
    clearFormErrors();

    UI.openModal(els.modalCategoryForm);
    setTimeout(function () { els.cfNome.focus(); }, 120);
  }

  function saveCategory() {
    var nome = els.cfNome.value.trim();
    var icone = els.cfIcone.value.trim() || '🍽️';

    if (nome.length < 2) {
      document.getElementById('err-cf-nome').textContent = 'Informe o nome da categoria.';
      els.cfNome.classList.add('has-error');
      UI.toast('Informe o nome da categoria.', 'warning');
      return;
    }

    var editando = Boolean(state.editingCategory);

    window.Database.patch(function (db) {
      if (editando) {
        var alvo = db.categorias.find(function (item) { return item.id === state.editingCategory.id; });
        if (alvo) {
          alvo.nome = nome;
          alvo.icone = icone;
          alvo.ativa = els.cfAtiva.checked;
        }
      } else {
        db.categorias.push({
          id: window.Database.nextCategoryId(),
          nome: nome,
          icone: icone,
          ativa: els.cfAtiva.checked
        });
      }
    });

    UI.closeModal(els.modalCategoryForm);
    UI.toast(editando ? 'Categoria atualizada' : 'Categoria criada', 'success');
    renderCategories();
    renderProducts();
    renderDashboard();
  }

  function toggleCategory(categoriaId) {
    window.Database.patch(function (db) {
      var alvo = db.categorias.find(function (item) { return item.id === Number(categoriaId); });
      if (alvo) alvo.ativa = !alvo.ativa;
    });
    renderCategories();
    renderDashboard();
    UI.toast('Categoria atualizada', 'info');
  }

  function deleteCategory(categoriaId) {
    var categoria = window.Database.getCategories(true).find(function (item) { return item.id === Number(categoriaId); });
    if (!categoria) return;

    var vinculados = window.Database.getProducts().filter(function (produto) {
      return produto.categoriaId === categoria.id;
    }).length;

    if (vinculados) {
      UI.confirm({
        title: 'Categoria em uso',
        message: '“' + categoria.nome + '” possui ' + U.plural(vinculados, 'produto', 'produtos') +
          '. Mova ou exclua esses produtos antes de remover a categoria.',
        confirmText: 'Entendi',
        cancelText: 'Fechar',
        icon: 'alert'
      });
      return;
    }

    UI.confirm({
      title: 'Excluir categoria?',
      message: '“' + categoria.nome + '” será removida do cardápio.',
      confirmText: 'Excluir',
      cancelText: 'Cancelar',
      danger: true,
      icon: 'trash'
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.Database.patch(function (db) {
        db.categorias = db.categorias.filter(function (item) { return item.id !== Number(categoriaId); });
      });
      UI.toast('Categoria excluída', 'info');
      renderCategories();
      renderProducts();
      renderDashboard();
    });
  }

  /* --------------------------- Configurações ---------------------------- */
  function renderSettingsForm() {
    var config = window.Database.getSettings();
    els.setNome.value = config.nomeLoja;
    els.setCidade.value = config.cidade;
    els.setDescricao.value = config.descricao;
    els.setWhats.value = config.telefoneWhatsApp;
    els.setHorario.value = config.horario || '';
    els.setFrete.value = Number(config.frete).toFixed(2).replace('.', ',');
    els.setTempo.value = config.tempoEntrega;
    els.setMinimo.value = Number(config.pedidoMinimo).toFixed(2).replace('.', ',');
    els.setAberto.checked = config.aberto !== false;
    els.setAbertoLabel.textContent = config.aberto !== false ? 'Loja aberta' : 'Loja fechada';
  }

  function saveSettings() {
    var nome = els.setNome.value.trim();
    var whatsDigits = els.setWhats.value.replace(/\D/g, '');

    if (nome.length < 2) {
      UI.toast('Informe o nome da loja.', 'warning');
      els.setNome.focus();
      return;
    }
    if (whatsDigits.length < 10) {
      UI.toast('Informe o WhatsApp com DDI e DDD (ex.: 5589999999999).', 'warning');
      els.setWhats.focus();
      return;
    }

    window.Database.patch(function (db) {
      db.configuracoes.nomeLoja = nome;
      db.configuracoes.cidade = els.setCidade.value.trim();
      db.configuracoes.descricao = els.setDescricao.value.trim();
      db.configuracoes.telefoneWhatsApp = whatsDigits;
      db.configuracoes.horario = els.setHorario.value.trim();
      db.configuracoes.frete = Math.max(0, U.round2(U.parseMoney(els.setFrete.value)));
      db.configuracoes.tempoEntrega = els.setTempo.value.trim() || '30-50 min';
      db.configuracoes.pedidoMinimo = Math.max(0, U.round2(U.parseMoney(els.setMinimo.value)));
      db.configuracoes.aberto = els.setAberto.checked;
    });

    els.setWhats.value = whatsDigits;
    els.setAbertoLabel.textContent = els.setAberto.checked ? 'Loja aberta' : 'Loja fechada';
    fillStoreNames();
    renderDashboard();
    UI.toast('Configurações salvas', 'success');
  }

  /* ------------------------------ Dados --------------------------------- */
  function exportData() {
    var json = window.Database.exportJSON();
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'brasa-delivery-dados.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    UI.toast('Backup exportado', 'success');
  }

  function importData(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        window.Database.importJSON(String(reader.result));
        renderAll();
        UI.toast('Dados importados com sucesso', 'success');
      } catch (error) {
        UI.toast(error.message || 'Arquivo inválido.', 'error');
      }
    };
    reader.onerror = function () { UI.toast('Não foi possível ler o arquivo.', 'error'); };
    reader.readAsText(file);
  }

  function clearOrders() {
    UI.confirm({
      title: 'Limpar histórico de pedidos?',
      message: 'Todos os pedidos salvos neste navegador serão removidos. Produtos e configurações continuam iguais.',
      confirmText: 'Limpar pedidos',
      cancelText: 'Cancelar',
      danger: true,
      icon: 'trash'
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.Database.clearOrders();
      renderDashboard();
      renderOrders();
      UI.toast('Histórico de pedidos limpo', 'info');
    });
  }

  function resetDemo() {
    UI.confirm({
      title: 'Restaurar dados de demonstração?',
      message: 'Suas alterações em produtos, categorias, configurações e pedidos serão apagadas e o cardápio original será restaurado.',
      confirmText: 'Restaurar',
      cancelText: 'Cancelar',
      danger: true,
      icon: 'refresh'
    }).then(function (confirmed) {
      if (!confirmed) return;
      window.Database.reset();
      U.storage.remove(CART_KEY);
      renderAll();
      UI.toast('Dados de demonstração restaurados', 'success');
    });
  }

  /* ------------------------------ Eventos -------------------------------- */
  document.addEventListener('DOMContentLoaded', bindEvents);

  function bindEvents() {
    // Navegação
    document.addEventListener('click', function (event) {
      var nav = event.target.closest('[data-view]');
      if (nav && !nav.disabled) {
        navigate(nav.getAttribute('data-view'));
        return;
      }
      var goto = event.target.closest('[data-goto]');
      if (goto) {
        navigate(goto.getAttribute('data-goto'));
        return;
      }
      var orderBtn = event.target.closest('[data-order]');
      if (orderBtn) {
        openOrder(orderBtn.getAttribute('data-order'));
        return;
      }
      var filter = event.target.closest('[data-filter]');
      if (filter) {
        state.ordersFilter = filter.getAttribute('data-filter');
        renderOrders();
        return;
      }
      var productAction = event.target.closest('[data-action]');
      if (productAction) {
        var id = productAction.getAttribute('data-id');
        var action = productAction.getAttribute('data-action');
        if (action === 'edit') openProductForm(id);
        else if (action === 'toggle') toggleProduct(id, 'disponivel');
        else if (action === 'feature') toggleProduct(id, 'destaque');
        else if (action === 'delete') deleteProduct(id);
        return;
      }
      var catAction = event.target.closest('[data-cat-action]');
      if (catAction) {
        var catId = catAction.getAttribute('data-id');
        var catActionName = catAction.getAttribute('data-cat-action');
        if (catActionName === 'edit') openCategoryForm(catId);
        else if (catActionName === 'toggle') toggleCategory(catId);
        else if (catActionName === 'delete') deleteCategory(catId);
        return;
      }
      var emoji = event.target.closest('[data-emoji]');
      if (emoji) {
        els.cfIcone.value = emoji.getAttribute('data-emoji');
        return;
      }
    });

    // Produtos
    document.getElementById('new-product').addEventListener('click', function () { openProductForm(null); });
    document.getElementById('quick-new-product').addEventListener('click', function () { openProductForm(null); });
    document.getElementById('save-product').addEventListener('click', saveProduct);
    els.productForm.addEventListener('submit', function (event) {
      event.preventDefault();
      saveProduct();
    });
    els.productSearch.addEventListener('input', U.debounce(function () {
      state.productSearch = els.productSearch.value;
      renderProducts();
    }, 150));
    els.pfImagem.addEventListener('input', U.debounce(updatePreview, 300));
    [els.pfNome, els.pfPreco].forEach(function (input) {
      input.addEventListener('input', function () {
        input.classList.remove('has-error');
        var node = document.getElementById('err-pf-' + (input === els.pfNome ? 'nome' : 'preco'));
        if (node) node.textContent = '';
      });
    });

    // Categorias
    document.getElementById('new-category').addEventListener('click', function () { openCategoryForm(null); });
    document.getElementById('save-category').addEventListener('click', saveCategory);
    els.categoryForm.addEventListener('submit', function (event) {
      event.preventDefault();
      saveCategory();
    });
    els.cfNome.addEventListener('input', function () {
      els.cfNome.classList.remove('has-error');
      document.getElementById('err-cf-nome').textContent = '';
    });

    // Pedidos
    document.getElementById('save-status').addEventListener('click', saveOrderStatus);

    // Configurações
    els.settingsForm.addEventListener('submit', function (event) {
      event.preventDefault();
      saveSettings();
    });
    els.setAberto.addEventListener('change', function () {
      els.setAbertoLabel.textContent = els.setAberto.checked ? 'Loja aberta' : 'Loja fechada';
    });

    // Dados
    document.getElementById('export-data').addEventListener('click', exportData);
    document.getElementById('import-file').addEventListener('change', function (event) {
      importData(event.target.files && event.target.files[0]);
      event.target.value = '';
    });
    document.getElementById('clear-orders').addEventListener('click', clearOrders);
    document.getElementById('reset-demo').addEventListener('click', resetDemo);

    // Imagem quebrada → placeholder
    document.addEventListener('error', function (event) {
      var target = event.target;
      if (target && target.tagName === 'IMG' && !target.dataset.fallback) {
        target.dataset.fallback = '1';
        target.src = 'assets/produtos/placeholder.svg';
      }
    }, true);

    // Atualiza dados quando outra aba altera o banco
    window.addEventListener('storage', function (event) {
      if (event.key === window.Database.KEY && hasSession()) {
        renderAll();
      }
    });

    // Hash na URL
    window.addEventListener('hashchange', function () {
      var view = (location.hash || '').replace('#', '');
      if (VIEW_META[view] && hasSession()) navigate(view);
    });
  }
})();
