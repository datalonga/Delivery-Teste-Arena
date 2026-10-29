# 🛵 Brasa Delivery — aplicativo de delivery 100% frontend

Aplicativo completo de delivery (cardápio, carrinho, checkout, pedido enviado pelo WhatsApp
e painel administrativo) construído **apenas** com HTML5, CSS3, JavaScript puro, JSON e
localStorage. Sem backend, sem banco de dados, sem frameworks, sem build.

> **Loja de demonstração:** Brasa Delivery · Picos - PI
> **Painel:** `admin.html` → usuário `admin` · senha `admin123`

---

## 1. Como rodar

### Opção A — duplo clique (file://)

Abra `index.html` no navegador. Funciona direto do disco: quando não é possível ler o
arquivo JSON por `fetch`, o app usa automaticamente a cópia dos dados embutida em
`js/database.js`. **Nunca aparece tela branca.**

### Opção B — servidor estático local

```bash
# dentro da pasta do projeto
python3 -m http.server 8080
# ou: npx serve .
```

Acesse `http://localhost:8080` (loja) e `http://localhost:8080/admin.html` (painel).
Nesse modo o app lê `data/database.json` no primeiro acesso.

### Opção C — hospedagem estática

Envie a pasta inteira para GitHub Pages, Netlify, Vercel, Cloudflare Pages, Hostinger…
Não existe nenhuma etapa de instalação ou compilação.

---

## 2. Estrutura de arquivos

```
delivery/                        ← raiz deste repositório
├── index.html                   # cardápio / app do cliente
├── admin.html                   # painel do lojista (login simulado)
│
├── css/
│   ├── style.css                # design system + app do cliente
│   └── admin.css                # layout do painel administrativo
│
├── js/
│   ├── icons.js                 # sprite de ícones SVG (nenhum emoji na UI)
│   ├── utils.js                 # DOM, formatação BRL, storage, toasts, modais
│   ├── database.js              # camada de dados (JSON + localStorage)
│   ├── cart.js                  # estado e regras do carrinho
│   ├── checkout.js              # validação, pedido e mensagem do WhatsApp
│   ├── app.js                   # aplicação do cliente
│   └── admin.js                 # dashboard, CRUDs, pedidos e configurações
│
├── data/
│   └── database.json            # “banco de dados” simulado (fonte dos dados padrão)
│
└── assets/
    ├── logo.svg                 # identidade visual
    └── produtos/                # fotos (.jpg) e ilustrações (.svg) dos produtos
```

Ordem de carregamento (clássica, sem ES modules — funciona em `file://`):
`icons.js → utils.js → database.js → cart.js → checkout.js → app.js`.

---

## 3. O “banco de dados” simulado

`data/database.json` guarda tudo:

| Chave           | Conteúdo                                                            |
| --------------- | ------------------------------------------------------------------- |
| `configuracoes` | nome, descrição, WhatsApp, cidade, frete, tempo, pedido mínimo, horário, aberto/fechado |
| `categorias`    | id, nome, ícone (emoji), ativa                                       |
| `produtos`      | id, categoriaId, nome, descrição, preço, imagem, disponível, destaque |
| `pedidos`       | histórico salvo pelo app (o JSON começa vazio; são gerados exemplos) |

### Como os dados são carregados (`js/database.js`)

1. Existe versão no `localStorage` (`brasa.db.v1`)? → **usa ela**.
2. Senão, está em `http(s)`? → tenta `fetch('data/database.json')`.
3. Se o fetch falhar ou o app estiver em `file://` → usa `DEFAULT_DATABASE`
   (cópia embutida do JSON, gerada a partir do arquivo).

Qualquer alteração feita no painel é gravada no `localStorage` e passa a valer para
o cliente na hora (inclusive em outra aba, via evento `storage`).

### Chaves usadas no navegador

| Chave                   | O que guarda                                          |
| ----------------------- | ----------------------------------------------------- |
| `brasa.db.v1`           | produtos, categorias, configurações e pedidos         |
| `brasa.cart.v1`         | itens do carrinho (sobrevive ao F5)                   |
| `brasa.customer.v1`     | endereço e forma de pagamento do último pedido        |
| `brasa.customer.change` | valor de troco usado anteriormente                    |
| `brasa.admin.session`   | sessão do painel (`sessionStorage`, cai ao fechar a aba) |

> **Sincronizar JSON ↔ app:** no painel, `Configurações → Exportar dados` baixa um
> JSON pronto. Para trocar os dados padrão de fábrica, substitua `data/database.json`
> e rode o painel novamente com “Restaurar dados de demonstração”. A cópia embutida em
> `js/database.js` (`DEFAULT_DATABASE`) deve ser atualizada junto quando você quiser que
> o modo `file://` também reflita a mudança.

---

## 4. Fluxo do cliente (`index.html`)

```
abrir app → cardápio → busca/categoria → produto (modal)
   → adicionar ao carrinho → barra flutuante → carrinho
   → finalizar pedido → endereço → pagamento → observações
   → revisão → enviar pelo WhatsApp → tela de sucesso
```

- **Busca** instantânea (nome + descrição, ignora acentos e maiúsculas) com estado vazio.
- **Categorias** em scroll horizontal no celular, destaque no item ativo.
- **Destaques** (“Mais pedidos”) aparecem antes das seções do cardápio.
- **Produto indisponível**: continua visível, apagado, com selo “Indisponível” e botão bloqueado.
- **Carrinho** persistente, com observação por item, +/−, remoção e “Limpar carrinho”.
- **Frete fixo** e **pedido mínimo** vindos das configurações; o checkout bloqueia abaixo do mínimo.
- **Pagamento**: Pix (aviso de confirmação), Dinheiro (com troco calculado) e Cartão na entrega.
- **Pedido** é salvo no histórico antes de abrir o WhatsApp — o lojista vê no painel.
- **Mensagem do WhatsApp**: montada no navegador e aberta via `https://wa.me/<número>?text=...`
  (o número vem **somente** das configurações).

Exemplo de mensagem gerada:

```
🛵 *NOVO PEDIDO #1005*
_Brasa Delivery · Picos - PI_

━━━━━━━━━━━━━━━━━━
📦 *ITENS DO PEDIDO*

2x Duplo Bacon — R$ 55,80
1x Refrigerante Cola 350ml — R$ 6,00

━━━━━━━━━━━━━━━━━━
💰 *RESUMO*

Subtotal: R$ 61,80
Frete: R$ 5,00
*TOTAL: R$ 66,80*
...
```

---

## 5. Painel do lojista (`admin.html`)

Login simulado (sem servidor): **admin / admin123**. Não é segurança real — é apenas
uma simulação de sessão em `sessionStorage`.

| Tela              | O que faz                                                                 |
| ----------------- | ------------------------------------------------------------------------- |
| **Dashboard**     | Faturamento e pedidos de hoje, produtos ativos, categorias, gráfico dos últimos 7 dias, pedidos recentes e atalhos |
| **Pedidos**       | Lista com filtro por status (novo → entregue/cancelado), detalhe completo e troca de status |
| **Produtos**      | Busca, tabela no desktop/cards no celular, criar, editar, ativar/desativar, destacar e excluir |
| **Categorias**    | Criar, editar, ativar/desativar e excluir (bloqueia exclusão de categoria com produtos) |
| **Configurações** | Nome, descrição, WhatsApp, cidade, frete, tempo, pedido mínimo, horário, abrir/fechar a loja, exportar/importar JSON, limpar pedidos e **restaurar dados de demonstração** |

---

## 6. Personalização

### Trocar produtos e fotos
Substitua os arquivos em `assets/produtos/` mantendo o caminho no JSON, ou edite o
caminho da imagem no formulário de produto. Se a imagem não existir, entra
automaticamente `assets/produtos/placeholder.svg`.

As fotos usadas hoje são recortes 1:1 (1024×1024). Bebidas e sobremesas usam
ilustrações SVG no mesmo enquadramento escuro — trocar por foto é só apontar o
`imagem` do produto para um `.jpg`.

### Trocar as cores
Tudo está em variáveis no topo de `css/style.css`:

```css
:root {
  --primary: #e63946;
  --primary-dark: #c92f3b;
  --background: #f7f7f7;
  --surface: #ffffff;
  --text: #1f1f1f;
  --muted: #777777;
  --border: #e7e7e7;
  --success: #2e9d50;
  --danger: #d93636;
}
```

### Trocar o número do WhatsApp
Painel → Configurações → *WhatsApp (com DDI e DDD)*. Ou direto em
`data/database.json` → `configuracoes.telefoneWhatsApp`.

---

## 7. Decisões técnicas

- **Sem dependências:** nenhuma biblioteca, nenhum CDN, nenhum build. ~2,5 MB no total
  (a maior parte são as fotos dos produtos).
- **Scripts clássicos (IIFE)** em vez de ES modules, para funcionar aberto como arquivo local.
- **Fallback de dados em camadas** (`localStorage` → `fetch` → dados embutidos) — requisito
  para nunca quebrar em `file://`.
- **SPA em HTML único para o cliente** e painel separado, compartilhando o mesmo design
  system (`style.css`) e as mesmas camadas de dados/utilidades.
- **Acessibilidade:** `button` de verdade, `aria-label`, `role="dialog"` + `aria-modal`,
  foco preso nos modais, fechamento com `ESC`, foco visível, `aria-live` nos toasts,
  textos alternativos nas imagens e respeito a `prefers-reduced-motion`.
- **Segurança básica:** todo conteúdo dinâmico passa por `escapeHtml`, nenhum uso de
  `eval`, nenhuma injeção de HTML com dados digitados pelo usuário.
- **Performance:** imagens com `loading="lazy"` e dimensões declaradas, CSS nativo,
  animações apenas em `transform`/`opacity`.
- **Dinheiro:** `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.

---

## 8. Testes executados

O fluxo completo foi validado de ponta a ponta em ambiente automatizado (DOM real):

**Cliente (53 verificações de fluxo + 10 de casos-limite):** renderização do cardápio, busca por nome/descrição sem
case, estado vazio, filtros por categoria, abertura do produto, quantidade, observação,
adição ao carrinho, barra flutuante, contador, subtotal/frete/total, incremento,
decremento, remoção, persistência do carrinho, checkout com validação de endereço,
troco insuficiente bloqueado, aviso do Pix, revisão, envio, URL do `wa.me`, conteúdo da
mensagem, salvar pedido, limpar carrinho e tela de sucesso.

**Painel (53 verificações):** login inválido/válido, sessão, dashboard e estatísticas,
gráfico de 7 dias, filtros e detalhe de pedidos, troca de status, CRUD de produtos
(criar/editar/ativar/destacar/excluir + validações), CRUD de categorias (incluindo
bloqueio de exclusão em uso), configurações (frete, WhatsApp, nome), exportação e
restauração dos dados de demonstração.

---

## 9. Limitações conhecidas (por ser 100% frontend)

- Não há autenticação real, estoque nem concorrência: os dados vivem **neste navegador**.
- Pedidos só chegam ao lojista pelo WhatsApp (e no histórico local do painel).
- Se o navegador bloquear pop-ups, o modal de sucesso oferece o botão
  **“Abrir WhatsApp novamente”**.
- Importar um JSON substitui **todos** os dados atuais (produtos, categorias,
  configurações e pedidos) — use o “Exportar” antes, como backup.

---

Feito com HTML, CSS, JavaScript, JSON, localStorage e SVG. Sem backend. 🍔
