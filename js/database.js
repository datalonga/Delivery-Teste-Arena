/* =========================================================================
   database.js — camada de dados do aplicativo
   -------------------------------------------------------------------------
   Funciona 100% no navegador:
   1. se existir uma versão salva no localStorage, ela é usada;
   2. senão, tenta ler data/database.json (quando hospedado em http/https);
   3. se o arquivo não puder ser lido (ex.: aberto via file://), usa a cópia
      embutida em DEFAULT_DATABASE — o app nunca fica em branco.

   API pública:
     Database.init()            -> Promise<db>
     Database.get()             -> objeto completo (referência viva)
     Database.getSettings()
     Database.getCategories()   -> apenas ativas
     Database.getProducts()     -> todos
     Database.getOrders()
     Database.save()            -> grava no localStorage e notifica inscritos
     Database.reset()           -> restaura os dados de demonstração
     Database.subscribe(fn)
   ========================================================================= */
(function () {
  'use strict';

  var DB_KEY = 'brasa.db.v1';
  var STATUS_LIST = [
    { id: 'novo', label: 'Novo', tone: 'info' },
    { id: 'confirmado', label: 'Confirmado', tone: 'info' },
    { id: 'em_preparo', label: 'Em preparo', tone: 'warning' },
    { id: 'saiu_entrega', label: 'Saiu para entrega', tone: 'primary' },
    { id: 'entregue', label: 'Entregue', tone: 'success' },
    { id: 'cancelado', label: 'Cancelado', tone: 'danger' }
  ];

  /* Dados padrão — gerados a partir de data/database.json (mantidos em sincronia). */
  var DEFAULT_DATABASE = {
    "versao": 1,
    "configuracoes": {
      "nomeLoja": "Brasa Delivery",
      "descricao": "Hambúrguer artesanal, pizza e sobremesas na sua porta",
      "telefoneWhatsApp": "5589999999999",
      "cidade": "Picos - PI",
      "frete": 5.0,
      "tempoEntrega": "30-50 min",
      "pedidoMinimo": 15.0,
      "aberto": true,
      "horario": "Terça a domingo · 18h às 23h30"
    },
    "categorias": [
      {
        "id": 1,
        "nome": "Hambúrgueres",
        "icone": "🍔",
        "ativa": true
      },
      {
        "id": 2,
        "nome": "Combos",
        "icone": "🍟",
        "ativa": true
      },
      {
        "id": 3,
        "nome": "Pizzas",
        "icone": "🍕",
        "ativa": true
      },
      {
        "id": 4,
        "nome": "Bebidas",
        "icone": "🥤",
        "ativa": true
      },
      {
        "id": 5,
        "nome": "Sobremesas",
        "icone": "🍰",
        "ativa": true
      }
    ],
    "produtos": [
      {
        "id": 1,
        "categoriaId": 1,
        "nome": "X-Burger Clássico",
        "descricao": "Pão brioche, hambúrguer artesanal de 160g, queijo cheddar, alface, tomate e molho da casa.",
        "preco": 18.9,
        "imagem": "assets/produtos/x-burger.jpg",
        "disponivel": true,
        "destaque": true
      },
      {
        "id": 2,
        "categoriaId": 1,
        "nome": "Duplo Bacon",
        "descricao": "Dois hambúrgueres de 160g, fatias de bacon crocante, cheddar duplo e molho barbecue.",
        "preco": 27.9,
        "imagem": "assets/produtos/duplo-bacon.jpg",
        "disponivel": true,
        "destaque": true
      },
      {
        "id": 3,
        "categoriaId": 1,
        "nome": "Smash Cheddar",
        "descricao": "Dois smash burgers de 90g com bordas crocantes, cheddar derretido, cebola caramelizada e pão de batata.",
        "preco": 23.5,
        "imagem": "assets/produtos/smash-cheddar.jpg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 4,
        "categoriaId": 1,
        "nome": "Veggie Burger",
        "descricao": "Hambúrguer de grão-de-bico, rúcula, tomate, queijo vegano e maionese de ervas no pão integral.",
        "preco": 24.9,
        "imagem": "assets/produtos/veggie-burger.jpg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 5,
        "categoriaId": 2,
        "nome": "Combo Clássico",
        "descricao": "X-Burger Clássico + batata frita média + refrigerante lata 350ml.",
        "preco": 32.9,
        "imagem": "assets/produtos/combo-classico.jpg",
        "disponivel": true,
        "destaque": true
      },
      {
        "id": 6,
        "categoriaId": 2,
        "nome": "Combo Duplo Bacon",
        "descricao": "Duplo Bacon + batata frita grande + refrigerante lata 350ml.",
        "preco": 42.9,
        "imagem": "assets/produtos/combo-duplo.jpg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 7,
        "categoriaId": 2,
        "nome": "Combo Família",
        "descricao": "3 hambúrgueres artesanais, batata grande, anéis de cebola e 2 refrigerantes lata.",
        "preco": 89.9,
        "imagem": "assets/produtos/combo-familia.jpg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 8,
        "categoriaId": 3,
        "nome": "Pizza de Calabresa G",
        "descricao": "Molho de tomate, mussarela, calabresa fatiada, cebola e orégano. 8 fatias.",
        "preco": 49.9,
        "imagem": "assets/produtos/pizza-calabresa.jpg",
        "disponivel": true,
        "destaque": true
      },
      {
        "id": 9,
        "categoriaId": 3,
        "nome": "Pizza Marguerita G",
        "descricao": "Molho de tomate, mussarela de búfala, manjericão fresco e azeite. 8 fatias.",
        "preco": 45.9,
        "imagem": "assets/produtos/pizza-marguerita.jpg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 10,
        "categoriaId": 3,
        "nome": "Pizza Frango c/ Catupiry G",
        "descricao": "Frango desfiado, catupiry cremoso, mussarela e orégano. 8 fatias.",
        "preco": 52.9,
        "imagem": "assets/produtos/pizza-frango-catupiry.jpg",
        "disponivel": false,
        "destaque": false
      },
      {
        "id": 11,
        "categoriaId": 4,
        "nome": "Refrigerante Cola 350ml",
        "descricao": "Lata gelada de 350ml. Escolha a versão normal ou zero no campo de observação.",
        "preco": 6.0,
        "imagem": "assets/produtos/refrigerante-cola.svg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 12,
        "categoriaId": 4,
        "nome": "Guaraná 350ml",
        "descricao": "Guaraná gelado em lata de 350ml, o clássico que combina com tudo.",
        "preco": 5.5,
        "imagem": "assets/produtos/guarana.svg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 13,
        "categoriaId": 4,
        "nome": "Suco de Laranja 500ml",
        "descricao": "Suco natural, feito na hora, com gelo. Sem açúcar adicionado.",
        "preco": 9.9,
        "imagem": "assets/produtos/suco-laranja.svg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 14,
        "categoriaId": 4,
        "nome": "Água Mineral 500ml",
        "descricao": "Água mineral sem gás, garrafa de 500ml, bem gelada.",
        "preco": 3.5,
        "imagem": "assets/produtos/agua-mineral.svg",
        "disponivel": true,
        "destaque": false
      },
      {
        "id": 15,
        "categoriaId": 5,
        "nome": "Petit Gâteau",
        "descricao": "Bolo de chocolate quente com recheio cremoso, sorvete de baunilha e frutas vermelhas.",
        "preco": 16.9,
        "imagem": "assets/produtos/petit-gateau.svg",
        "disponivel": true,
        "destaque": true
      },
      {
        "id": 16,
        "categoriaId": 5,
        "nome": "Brownie com Sorvete",
        "descricao": "Brownie de chocolate 70% servido quente com sorvete de creme e calda de chocolate.",
        "preco": 15.9,
        "imagem": "assets/produtos/brownie.svg",
        "disponivel": true,
        "destaque": false
      }
    ],
    "pedidos": []
  };

  var state = null;
  var listeners = [];
  var initializing = null;
  var { storage } = window.Utils;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function toNumber(value, fallback) {
    var parsed = typeof value === 'number' ? value : parseFloat(String(value || '').replace(',', '.'));
    return isNaN(parsed) ? fallback : parsed;
  }

  function toBool(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  /** Garante que o objeto carregado tenha o formato esperado. */
  function normalize(db) {
    var data = db && typeof db === 'object' ? clone(db) : clone(DEFAULT_DATABASE);
    var defaults = clone(DEFAULT_DATABASE);

    data.configuracoes = Object.assign({}, defaults.configuracoes, data.configuracoes || {});
    data.configuracoes.frete = toNumber(data.configuracoes.frete, 0);
    data.configuracoes.pedidoMinimo = toNumber(data.configuracoes.pedidoMinimo, 0);
    data.configuracoes.telefoneWhatsApp = String(data.configuracoes.telefoneWhatsApp || '').replace(/\D/g, '');
    data.configuracoes.aberto = toBool(data.configuracoes.aberto, true);

    data.categorias = Array.isArray(data.categorias) ? data.categorias : [];
    data.categorias = data.categorias.map(function (categoria, index) {
      return {
        id: toNumber(categoria.id, index + 1),
        nome: String(categoria.nome || 'Categoria ' + (index + 1)),
        icone: String(categoria.icone || '🍽️'),
        ativa: toBool(categoria.ativa, true)
      };
    });

    data.produtos = Array.isArray(data.produtos) ? data.produtos : [];
    data.produtos = data.produtos.map(function (produto, index) {
      return {
        id: toNumber(produto.id, index + 1),
        categoriaId: toNumber(produto.categoriaId, data.categorias[0] ? data.categorias[0].id : 1),
        nome: String(produto.nome || 'Produto ' + (index + 1)),
        descricao: String(produto.descricao || ''),
        preco: toNumber(produto.preco, 0),
        imagem: String(produto.imagem || 'assets/produtos/placeholder.svg'),
        disponivel: toBool(produto.disponivel, true),
        destaque: toBool(produto.destaque, false)
      };
    });

    data.pedidos = Array.isArray(data.pedidos) ? data.pedidos : [];
    return data;
  }

  /* ------------------------ Pedidos de demonstração -------------------- */
  function demoOrder(productById, config) {
    return function (numero, status, minutosAtras, itens, endereco, pagamento, observacao) {
      var subtotal = 0;
      var linhas = itens.map(function (item) {
        var produto = productById[item.id];
        if (!produto) return null;
        subtotal += produto.preco * item.qtd;
        return {
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: item.qtd,
          observacao: item.obs || ''
        };
      }).filter(Boolean);
      subtotal = Math.round(subtotal * 100) / 100;
      var frete = config.frete;
      return {
        id: numero,
        numero: numero,
        criadoEm: new Date(Date.now() - minutosAtras * 60000).toISOString(),
        status: status,
        itens: linhas,
        subtotal: subtotal,
        frete: frete,
        total: Math.round((subtotal + frete) * 100) / 100,
        endereco: endereco,
        pagamento: pagamento,
        observacao: observacao || '',
        demo: true
      };
    };
  }

  /** Cria pedidos de exemplo para o painel administrativo não começar vazio. */
  function seedDemoOrders(db) {
    var byId = {};
    db.produtos.forEach(function (produto) { byId[produto.id] = produto; });
    var make = demoOrder(byId, db.configuracoes);

    return [
      make(1004, 'novo', 12,
        [{ id: 1, qtd: 1 }, { id: 13, qtd: 1 }],
        { rua: 'Rua das Flores', numero: '120', bairro: 'Centro', referencia: 'Próximo à praça' },
        { tipo: 'pix', troco: null },
        ''),
      make(1003, 'em_preparo', 42,
        [{ id: 2, qtd: 2, obs: 'Sem cebola' }, { id: 11, qtd: 1 }],
        { rua: 'Av. Getúlio Vargas', numero: '455', bairro: 'São José', referencia: 'Portão azul' },
        { tipo: 'dinheiro', troco: 100 },
        'Chamar no portão, por favor.'),
      make(1002, 'saiu_entrega', 78,
        [{ id: 5, qtd: 1 }, { id: 15, qtd: 1 }],
        { rua: 'Rua Projetada', numero: '32', bairro: 'Boa Vista', referencia: '' },
        { tipo: 'cartao', troco: null },
        ''),
      make(1001, 'entregue', 26 * 60,
        [{ id: 8, qtd: 1 }, { id: 12, qtd: 2 }],
        { rua: 'Travessa do Sol', numero: '88', bairro: 'Centro', referencia: 'Ao lado da farmácia' },
        { tipo: 'dinheiro', troco: null },
        'Entregar na portaria.')
    ];
  }

  function nextOrderNumber(orders) {
    return orders.reduce(function (max, order) {
      return Math.max(max, Number(order.numero) || 0);
    }, 1000) + 1;
  }

  /* ------------------------------ Leitura ----------------------------- */
  function readJsonFile() {
    var isHttp = /^https?:$/.test(window.location.protocol);
    if (!isHttp || typeof fetch !== 'function') return Promise.resolve(null);
    return fetch('data/database.json', { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : null; })
      .catch(function () { return null; });
  }

  function persist() {
    storage.set(DB_KEY, state);
  }

  function notify() {
    listeners.forEach(function (listener) {
      try { listener(state); } catch (err) { console.error('[database] listener falhou', err); }
    });
  }

  /* ------------------------------- API -------------------------------- */
  var Database = {
    KEY: DB_KEY,
    STATUS: STATUS_LIST,
    ready: null,

    init: function () {
      if (initializing) return initializing;
      initializing = new Promise(function (resolve) {
        var stored = storage.get(DB_KEY, null);

        if (stored && Array.isArray(stored.produtos)) {
          state = normalize(stored);
          resolve(state);
          return;
        }

        readJsonFile().then(function (file) {
          var base = file && Array.isArray(file.produtos) ? file : clone(DEFAULT_DATABASE);
          state = normalize(base);
          if (!state.pedidos.length) state.pedidos = seedDemoOrders(state);
          persist();
          resolve(state);
        });
      });
      Database.ready = initializing;
      return initializing;
    },

    get: function () {
      if (!state) state = normalize(clone(DEFAULT_DATABASE));
      return state;
    },

    getSettings: function () {
      return Database.get().configuracoes;
    },

    getCategories: function (includeInactive) {
      return Database.get().categorias.filter(function (categoria) {
        return includeInactive || categoria.ativa;
      });
    },

    getProducts: function () {
      return Database.get().produtos;
    },

    getProductById: function (id) {
      return Database.get().produtos.find(function (produto) { return produto.id === Number(id); }) || null;
    },

    getOrders: function () {
      return Database.get().pedidos.slice().sort(function (a, b) {
        return new Date(b.criadoEm) - new Date(a.criadoEm);
      });
    },

    getStatus: function (statusId) {
      return STATUS_LIST.find(function (status) { return status.id === statusId; }) || STATUS_LIST[0];
    },

    nextProductId: function () {
      return Database.get().produtos.reduce(function (max, produto) { return Math.max(max, produto.id); }, 0) + 1;
    },

    nextCategoryId: function () {
      return Database.get().categorias.reduce(function (max, categoria) { return Math.max(max, categoria.id); }, 0) + 1;
    },

    nextOrderNumber: function () {
      return nextOrderNumber(Database.get().pedidos);
    },

    addOrder: function (order) {
      Database.get().pedidos.push(order);
      persist();
      notify();
      return order;
    },

    updateOrderStatus: function (orderId, statusId) {
      var order = Database.get().pedidos.find(function (item) { return item.id === Number(orderId); });
      if (!order) return false;
      order.status = statusId;
      persist();
      notify();
      return true;
    },

    clearOrders: function () {
      Database.get().pedidos = [];
      persist();
      notify();
    },

    /** Atualiza um trecho do banco e persiste. */
    patch: function (mutator) {
      mutator(Database.get());
      persist();
      notify();
    },

    save: function () {
      persist();
      notify();
      return state;
    },

    /** Restaura o estado inicial de demonstração. */
    reset: function () {
      storage.remove(DB_KEY);
      state = normalize(clone(DEFAULT_DATABASE));
      state.pedidos = seedDemoOrders(state);
      persist();
      notify();
      return state;
    },

    subscribe: function (listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function () {
        listeners = listeners.filter(function (item) { return item !== listener; });
      };
    },

    /** Backup em JSON (usado pelo painel administrativo). */
    exportJSON: function () {
      return JSON.stringify(Database.get(), null, 2);
    },

    /** Importa um JSON previamente exportado. */
    importJSON: function (raw) {
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.produtos)) {
        throw new Error('Arquivo inválido: envie um JSON exportado por este painel.');
      }
      state = normalize(parsed);
      persist();
      notify();
      return state;
    },

    defaults: function () {
      return clone(DEFAULT_DATABASE);
    }
  };

  window.Database = Database;
})();
