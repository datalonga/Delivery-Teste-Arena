/* =========================================================================
   checkout.js — validação, criação do pedido e envio para o WhatsApp
   Nenhum backend: a mensagem é montada no navegador e aberta via wa.me.
   ========================================================================= */
(function () {
  'use strict';

  var U = window.Utils;
  var CUSTOMER_KEY = 'brasa.customer.v1';

  var PAYMENTS = [
    {
      id: 'pix',
      label: 'Pix',
      icon: 'pix',
      hint: 'O pagamento será confirmado após o envio do pedido.',
      note: 'O pagamento será confirmado após o envio do pedido.'
    },
    {
      id: 'dinheiro',
      label: 'Dinheiro',
      icon: 'cash',
      hint: 'Informe se precisa de troco.',
      note: ''
    },
    {
      id: 'cartao',
      label: 'Cartão na entrega',
      icon: 'card',
      hint: 'O entregador leva a maquininha.',
      note: 'O pagamento é feito na entrega, com a maquininha do entregador.'
    }
  ];

  function paymentMeta(tipo) {
    return PAYMENTS.find(function (payment) { return payment.id === tipo; }) || PAYMENTS[0];
  }

  function paymentLabel(pagamento) {
    if (!pagamento || !pagamento.tipo) return 'Não informado';
    var meta = paymentMeta(pagamento.tipo);
    if (pagamento.tipo === 'dinheiro') {
      if (pagamento.troco) return 'Dinheiro (troco para ' + U.money(pagamento.troco) + ')';
      return 'Dinheiro (sem troco)';
    }
    return meta.label;
  }

  /* ------------------------------ Dados do cliente --------------------- */
  function loadCustomer() {
    var saved = U.storage.get(CUSTOMER_KEY, null);
    return saved && typeof saved === 'object' ? saved : {};
  }

  function saveCustomer(customer) {
    U.storage.set(CUSTOMER_KEY, customer);
  }

  /* ------------------------------ Validação ---------------------------- */
  /**
   * @param {{endereco: object, pagamento: object}} draft
   * @param {{total: number}} totals
   * @returns {{valid: boolean, errors: object, message: string}}
   */
  function validate(draft, totals) {
    var errors = {};
    var endereco = draft.endereco || {};
    var pagamento = draft.pagamento || {};
    var total = totals && totals.total ? totals.total : 0;

    var rua = String(endereco.rua || '').trim();
    var numero = String(endereco.numero || '').trim();
    var bairro = String(endereco.bairro || '').trim();

    if (rua.length < 3) errors.rua = 'Informe o nome da rua.';
    if (!numero) errors.numero = 'Informe o número da casa.';
    else if (numero.length > 12) errors.numero = 'Número muito longo.';
    if (bairro.length < 2) errors.bairro = 'Informe o bairro.';

    var tipos = PAYMENTS.map(function (payment) { return payment.id; });
    if (!pagamento.tipo || tipos.indexOf(pagamento.tipo) === -1) {
      errors.pagamento = 'Escolha uma forma de pagamento.';
    }

    if (pagamento.tipo === 'dinheiro' && pagamento.precisaTroco) {
      var troco = Number(pagamento.troco);
      if (!pagamento.troco || isNaN(troco) || troco <= 0) {
        errors.troco = 'Informe o valor para troco.';
      } else if (troco < total) {
        errors.troco = 'O troco precisa ser de no mínimo ' + U.money(total) + '.';
      }
    }

    var keys = Object.keys(errors);
    return {
      valid: keys.length === 0,
      errors: errors,
      message: keys.length ? errors[keys[0]] : ''
    };
  }

  /* --------------------------- Criação do pedido ----------------------- */
  function createOrder(draft) {
    var snapshot = window.Cart.snapshot();
    var settings = window.Database.getSettings();
    var numero = window.Database.nextOrderNumber();
    var endereco = draft.endereco || {};
    var pagamento = draft.pagamento || {};

    var order = {
      id: numero,
      numero: numero,
      criadoEm: new Date().toISOString(),
      status: 'novo',
      itens: snapshot.items.map(function (item) {
        return {
          produtoId: item.produtoId,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantidade,
          observacao: item.observacao || ''
        };
      }),
      subtotal: snapshot.subtotal,
      frete: snapshot.shipping,
      total: snapshot.total,
      endereco: {
        rua: String(endereco.rua || '').trim(),
        numero: String(endereco.numero || '').trim(),
        bairro: String(endereco.bairro || '').trim(),
        referencia: String(endereco.referencia || '').trim()
      },
      pagamento: {
        tipo: pagamento.tipo,
        troco: pagamento.tipo === 'dinheiro' && pagamento.precisaTroco ? U.round2(pagamento.troco) : null
      },
      observacao: String(draft.observacao || '').trim().slice(0, 300),
      configuracao: {
        loja: settings.nomeLoja,
        cidade: settings.cidade
      }
    };

    window.Database.addOrder(order);
    saveCustomer({
      rua: order.endereco.rua,
      numero: order.endereco.numero,
      bairro: order.endereco.bairro,
      referencia: order.endereco.referencia,
      pagamento: order.pagamento.tipo,
      ultimoPedido: order.numero
    });

    return order;
  }

  /* ------------------------- Mensagem do WhatsApp ---------------------- */
  var LINE = '━━━━━━━━━━━━━━━━━━';

  function buildMessage(order) {
    var settings = order.configuracao || window.Database.getSettings();
    var lines = [];
    var push = function (text) { lines.push(text == null ? '' : text); };

    push('🛵 *NOVO PEDIDO #' + order.numero + '*');
    push('_' + settings.loja + ' · ' + settings.cidade + '_');
    push('');
    push(LINE);
    push('📦 *ITENS DO PEDIDO*');
    push('');

    order.itens.forEach(function (item) {
      push(item.quantidade + 'x ' + item.nome + ' — ' + U.money(item.preco * item.quantidade));
      if (item.observacao) push('   ↳ Obs: ' + item.observacao);
    });

    push('');
    push(LINE);
    push('💰 *RESUMO*');
    push('');
    push('Subtotal: ' + U.money(order.subtotal));
    push('Frete: ' + U.money(order.frete));
    push('*TOTAL: ' + U.money(order.total) + '*');

    push('');
    push(LINE);
    push('📍 *ENDEREÇO DE ENTREGA*');
    push('');
    push(order.endereco.rua + ', ' + order.endereco.numero);
    push('Bairro: ' + order.endereco.bairro);
    if (order.endereco.referencia) {
      push('');
      push('📌 *Referência:*');
      push(order.endereco.referencia);
    }

    push('');
    push(LINE);
    push('💳 *PAGAMENTO*');
    push('');
    push(paymentLabel(order.pagamento));

    if (order.observacao) {
      push('');
      push(LINE);
      push('📝 *OBSERVAÇÃO*');
      push('');
      push(order.observacao);
    }

    push('');
    push(LINE);
    push('');
    push('Obrigado pelo pedido! ❤️');

    return lines.join('\n');
  }

  function whatsappUrl(order) {
    var settings = window.Database.getSettings();
    var phone = U.phoneDigits(settings.telefoneWhatsApp);
    return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(buildMessage(order));
  }

  /** Abre o WhatsApp em nova aba. Retorna a URL gerada. */
  function openWhatsApp(url) {
    var link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return url;
  }

  /** Cria o pedido, salva no histórico e devolve a URL do WhatsApp. */
  function placeOrder(draft) {
    var order = createOrder(draft);
    var url = whatsappUrl(order);
    return { order: order, url: url };
  }

  window.Checkout = {
    PAYMENTS: PAYMENTS,
    CUSTOMER_KEY: CUSTOMER_KEY,
    paymentMeta: paymentMeta,
    paymentLabel: paymentLabel,
    loadCustomer: loadCustomer,
    saveCustomer: saveCustomer,
    validate: validate,
    createOrder: createOrder,
    placeOrder: placeOrder,
    buildMessage: buildMessage,
    whatsappUrl: whatsappUrl,
    openWhatsApp: openWhatsApp
  };
})();
