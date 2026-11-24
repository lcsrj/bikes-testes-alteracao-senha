---
version: alpha
name: Bikes
description: Painel de locadora inspirado em bicicletas urbanas verdes e no visual de oficina organizada.
colors:
  primary: "#16734e"
  primary-hover: "#105d3e"
  forest: "#073f32"
  forest-deep: "#06372c"
  mint: "#eaf5ed"
  background: "#f5f7f8"
  surface: "#ffffff"
  text: "#1e2930"
  muted: "#65736d"
  border: "#e4eae7"
  danger: "#b52e37"
  control-border: "#ccd7cf"
  secondary-border: "#cbd8d0"
  focus: "#58a978"
  focus-field: "#16734e29"
  brand-accent: "#a5d7b5"
  brand-lime: "#94c623"
  brand-snow: "#f4f5f5"
  brand-ink: "#102522"
  brand-green: "#2f7d32"
  navigation-text: "#c1dacd"
  navigation-hover: "#ffffff13"
  navigation-active: "#d5efdf1f"
  table-heading: "#f9fbfa"
  table-divider: "#edf0ee"
  table-hover: "#fbfcfb"
  badge-neutral: "#f0f3f2"
  badge-neutral-text: "#56645d"
  available-text: "#24663e"
  active-bg: "#fff4dc"
  active-text: "#996417"
  maintenance-bg: "#fcecf0"
  maintenance-text: "#9c4450"
  administrator-bg: "#edf1fa"
  administrator-text: "#475b8b"
  feature-bg: "#eaf3ec"
  feature-border: "#dde9df"
  notice-bg: "#edf5ef"
  notice-border: "#d0e4d5"
  error-bg: "#fff0f1"
  error-text: "#922c37"
  error-border: "#f0cbd0"
  scrollbar-thumb: "#a4b9ad"
  scrollbar-track: "#f3f6f4"
typography:
  brand-word:
    fontFamily: "'Archivo Black', Manrope, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    lineHeight: 1
    letterSpacing: ".005em"
  sans:
    fontFamily: "Manrope, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "1.6"
  display:
    fontFamily: "Manrope, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "64px"
    fontWeight: 800
    lineHeight: "1.12"
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 800
    lineHeight: "1.3"
    letterSpacing: "-1px"
  title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: "1.4"
    letterSpacing: "-.4px"
  action:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: "1.5"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "1.6"
  metric:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: "1.3"
    letterSpacing: "-1px"
rounded:
  password-action: "4px"
  badge: "5px"
  field: "7px"
  DEFAULT: "8px"
  notice: "10px"
  panel: "14px"
  dialog: "16px"
spacing:
  page: "38px"
  intermediate-page: "28px"
  mobile-page: "18px"
  panel-gap: "24px"
  form-column-gap: "22px"
  action-gap: "10px"
components:
  button:
    typography: "{typography.action}"
    rounded: "{rounded.DEFAULT}"
    padding: "11px 17px"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.action}"
    rounded: "{rounded.DEFAULT}"
    padding: "11px 17px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.forest}"
    rounded: "{rounded.DEFAULT}"
    padding: "11px 17px"
  button-secondary-hover:
    backgroundColor: "{colors.mint}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.DEFAULT}"
    padding: "11px 17px"
  button-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.DEFAULT}"
    padding: "11px 17px"
  button-small:
    padding: "6px 10px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.field}"
    padding: "11px 13px"
  sidebar:
    backgroundColor: "{colors.forest}"
    width: "236px"
  navigation-item:
    textColor: "{colors.navigation-text}"
    rounded: "{rounded.DEFAULT}"
    padding: "12px 15px"
  navigation-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.surface}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
  badge-available:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.available-text}"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  badge-active:
    backgroundColor: "{colors.active-bg}"
    textColor: "{colors.active-text}"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  badge-maintenance:
    backgroundColor: "{colors.maintenance-bg}"
    textColor: "{colors.maintenance-text}"
    rounded: "{rounded.badge}"
    padding: "4px 8px"
  dialog:
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
  notification:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.surface}"
    rounded: "{rounded.DEFAULT}"
    padding: "14px 18px"
---

# Sistema visual Bikes

## Overview

O painel segue o conceito visual aprovado: menu lateral verde floresta, área de trabalho clara, indicadores discretos e bicicleta urbana como imagem de apoio. A referência é uma locadora de bairro organizada, com navegação familiar e linguagem direta. A expressão fica na marca, no verde e na imagem; tabelas e formulários priorizam a leitura.

O produto usa português brasileiro, reais e CPF porque esses formatos fazem parte do domínio do projeto. A interface é de operação, com uma tela de acesso mais expressiva. Não usa gráficos decorativos, indicadores fictícios nem publicidade. Os tokens operacionais implementados em `src/main/resources/static/assets/styles.css` e a identidade compartilhada em `src/main/resources/static/assets/brand.css` são as fontes de execução; este documento registra as decisões e deve ser atualizado junto com eles. A marca interna reutiliza a identidade já aprovada no acesso, sem criar uma nova linguagem visual.

## Colors

Verdes profundos sustentam a marca; superfícies claras mantêm a leitura das operações. Os valores do frontmatter registram a paleta compartilhada.

### Primary

- **Verde de ação:** `primary` nas ações e links; `primary-hover` na resposta ao apontador.
- **Verde floresta:** `forest` no menu, na área narrativa de acesso e nas notificações; `forest-deep` participa da sombra do menu móvel.
- **Menta:** `mint` em avatares, ícones de indicadores e respostas de ações secundárias; `brand-accent` no marcador de navegação e em elementos de apoio do menu.
- **Identidade compartilhada:** `brand-lime` no símbolo e `brand-snow` na palavra BIKES da variante clara; `brand-green` no símbolo e `brand-ink` na palavra da variante escura. Os quatro valores vêm das variáveis `--brand-*` de `:root` em `assets/brand.css`. Em `assets/login.css`, os aliases locais `--lime`, `--snow` e `--text` reutilizam, respectivamente, `--brand-lime`, `--brand-snow` e `--brand-ink`. As cores operacionais continuam próprias de `assets/styles.css`.

### Secondary

- **Estados operacionais:** disponibilidade, finalização e perfil de cliente usam `available-text` sobre menta; locação ativa e bicicleta ocupada usam `active-text`/`active-bg`; manutenção usa `maintenance-text`/`maintenance-bg`.
- **Perfil administrativo:** `administrator-text`/`administrator-bg` diferenciam o papel do usuário.
- **Erro:** `danger` identifica campos inválidos; erros de formulário usam `error-text`, `error-bg` e `error-border`.

### Neutral

- **Área de trabalho:** `background` atrás de `surface`; `text` para conteúdo principal, `muted` para apoio e `border` para separação de painéis.
- **Controles e tabelas:** bordas próprias de campos e botões secundários; cabeçalho, separador e passagem do apontador têm tons claros próprios. A barra de rolagem usa `scrollbar-thumb` sobre `scrollbar-track`.
- **Apoio:** a imagem ilustrativa usa `feature-bg`/`feature-border`; avisos usam `notice-bg`/`notice-border`. Badges sem estado conhecido usam a dupla neutra.

**The Estado com texto Rule.** Toda situação traz um nome legível; cor e ponto são reforços visuais.

O foco usa contorno verde de 3px; campos usam a versão translúcida `focus-field`. O tema é claro, inclusive quando o sistema operacional usa tema escuro.

## Typography

Manrope variável, armazenada localmente com licença OFL, atende títulos operacionais, corpo e controles. O fallback de sistema preserva a leitura sem fonte carregada. A palavra BIKES usa Archivo Black local, declarada em `assets/brand.css` a partir de `assets/fonts/archivo-black.ttf`, com fallback `var(--font)` e síntese de fonte desativada. A chamada expressiva do acesso também usa Archivo Black, conforme `assets/login.css`; isso não altera a tipografia dos controles ou do painel.

- **Display:** chamada da tela de acesso; o tamanho cai para 58px e 48px nos intervalos intermediários e a chamada é ocultada no celular.
- **Headline:** título de página; passa a 27px no celular, mantendo peso 800.
- **Title:** títulos de painéis; peso 700, com variantes locais no acesso, apoio e diálogo.
- **Body:** base de 14px; tabelas e descrições operacionais usam 12px, apoio compacto usa 10–11px.
- **Action / Label:** ações em peso 700; rótulos de campo em 12px. Navegação usa 12px e peso 600.
- **Metric:** indicadores em 34px e peso 700; passam a 29px em telas menores e 26px no intervalo mais estreito. Números de indicadores e tabelas são tabulares.

Textos extensos e identificadores quebram nas áreas de detalhe; tabelas mantêm colunas legíveis e rolagem horizontal própria. Títulos e ações usam caixa de frase; a marca e os rótulos de seção do menu conservam sua expressão própria. O sistema não possui outros idiomas.

## Layout

Menu fixo de 236px, reduzido a 210px até 1200px. Área principal de até 1600px, com 38px de margem interna; essa margem passa a 28px até 1200px e a 26px verticais/18px laterais até 760px. O cabeçalho mede 85px no computador e 68px no celular, onde permanece visível ao rolar.

O painel reúne tabela e coluna de apoio de 290px, ajustada a 250px até 1200px e a 330px a partir de 1600px. Até 1000px, o apoio passa para baixo e indicadores passam de quatro para duas colunas. Formulários têm duas colunas com intervalo de 22px e passam a uma até 760px. Conta e locação também empilham as áreas até 1000px. Até 390px, o apoio e o resumo da locação passam a uma coluna.

Até 760px, o menu vira navegação recolhível sob o cabeçalho, preservando opções e ordem. A tela de acesso deixa de ter duas metades e mantém a marca sobre o formulário. Relatórios possuem busca, filtro de status quando aplicável e paginação de 10, 20 ou 50 registros. As tabelas largas rolam na própria região.

## Elevation & Depth

Painéis usam bordas, sem sombra. Sombra é reservada ao diálogo e ao menu sobreposto no celular. Notificações são faixas sem sombra no fluxo do layout.

- **Diálogo:** `0 18px 64px #082d2826`, sem borda; fundo escurecido `#09261d80` com desfoque de 3px separa a confirmação do restante da tarefa.
- **Menu móvel:** `10px 0 35px #06372c20`, apenas na navegação recolhível.
- **Navegação selecionada:** linha interna `inset 1px 0 0 #a5d7b5`, acompanhando o fundo tonal e o texto branco.

**The Painel plano Rule.** Painéis operacionais mantêm borda e fundo claro; a profundidade pertence às camadas sobrepostas.

## Shapes

Botões, busca, navegação e notificações têm raio de 8px; campos e selects usam 7px. Badges usam 5px; a ação de revelar senha usa 4px. Avisos e blocos de ícone dos indicadores usam 10px. Painéis e moldura da fotografia usam 14px; diálogos usam 16px. Avatares, etapas e pontos de estado são circulares. Ícones SVG usam traço de 1,7px e, normalmente, 21px de tamanho.

## Components

Os construtores compartilhados ficam em `assets/ui.js`; as telas os compõem em `assets/app.js`.

### Buttons

Primários verdes, secundários brancos com borda e ações discretas transparentes. A passagem do apontador escurece o primário e colore de menta os demais. A altura é mínima, de 42px, com padding de 11px/17px; a variante pequena usa mínimo de 36px e padding de 6px/10px. Esses mínimos permitem crescimento de texto, por isso não são alturas fixas no frontmatter. Desabilitados mantêm a forma e usam opacidade de 0,5. Foco visível tem contorno com afastamento de 4px.

### Inputs / Fields

Campos exibem rótulo, instrução e erro associado, borda de controle e fundo branco. Altura mínima de 44px; selects de filtro usam mínimo de 42px. O foco muda borda e contorno; erro muda a borda e mostra mensagem textual. Formulários desabilitam o envio durante a solicitação.

### Cards / Containers

Painéis brancos com borda, sem sombra. Cabeçalhos de painel usam padding de 23px/24px/19px; formulários têm 28px no computador e 22px no celular. Indicadores combinam rótulo, número tabular e bloco de ícone em menta. A imagem da bicicleta aparece sobre uma superfície verde clara e é identificada como ilustrativa.

### Chips

Badges compactos combinam nome do estado e ponto da mesma cor, com padding de 4px/8px e texto de 10px em peso 700. Não são controles de seleção.

### Navigation

A navegação selecionada combina destaque lateral, fundo e `aria-current`. Tabelas usam cabeçalhos semânticos e região de rolagem acessível. Carregamento mostra indicador e texto; ausência de dados explica o próximo passo; falhas permitem nova tentativa.

### Marca

`logo('light'|'dark')`, em `src/main/resources/static/assets/app.js`, é o construtor canônico: combina o mesmo `logoMark` SVG vetorial em linha com a palavra BIKES em Archivo Black. O símbolo geométrico conserva seus três paths e `viewBox="4 4 92 34"`; não é o ícone de bicicleta dos controles nem uma imagem raster. `src/main/resources/static/assets/brand.css`, carregado por `src/main/resources/static/index.html` antes dos estilos operacionais e do acesso, concentra fonte, cores, proporções e variantes.

A variante clara usa símbolo de 92 × 34 unidades e palavra de 41 unidades, inclinada em −12° e expandida horizontalmente em 1,14. Na lateral, a unidade de escala é `--hs: .58px`, reduzida a `.52px` até 1200px. A variante escura usa símbolo de 68 × 25 unidades, palavra de 33 unidades e a mesma inclinação, sem expansão horizontal. Até 760px, ela aparece no cabeçalho claro com `--ls: .5px`, mantendo o link de visão geral e seu nome acessível. O erro de inicialização também usa a variante escura. No acesso e cadastro, os mesmos construtores conservam as escalas responsivas existentes de `assets/login.css`.

### Dialogs / Feedback

Selects e seletores de data são nativos: o navegador controla o popup e a interação de teclado. O horário informado é sempre o da locadora, identificado no campo. Diálogos usam o elemento nativo `dialog` com nome acessível, Escape, contenção de foco e retorno ao acionador. Notificações usam uma região de status no fluxo do layout, abaixo do cabeçalho ou acima do formulário de acesso, sem cobrir ações. Alterações não salvas exigem confirmação antes de sair.

Botões transitam fundo e borda em 150ms; o menu móvel desliza em 180ms. O indicador de carregamento gira em 800ms. `prefers-reduced-motion` reduz animações e transições a 0,01ms e uma iteração. A notificação permanece por 6500ms. A imagem da bicicleta é ilustrativa, não representa o cadastro individual da frota. Valores vêm da API, com `Intl.NumberFormat` em BRL, sem números demonstrativos na aplicação normal.

## Do's and Don'ts

### Do:

- **Do** usar os componentes e tokens compartilhados e manter os mesmos nomes para as mesmas ações.
- **Do** reutilizar `logo('light'|'dark')` e `assets/brand.css` em novos pontos de identidade, preservando símbolo, palavra, proporções e contraste da variante.
- **Do** explicar erros preservando o formulário e apresentar o estado por texto além da cor.
- **Do** manter notificações no fluxo e tabelas largas em sua própria região de rolagem.
- **Do** associar informações financeiras e pessoais às permissões reais do servidor.

### Don't:

- **Don't** inventar controles para operações ausentes na API, indicadores fictícios ou gráficos decorativos.
- **Don't** usar a imagem ilustrativa como evidência de estoque ou modelo disponível.
- **Don't** cobrir ações com notificações ou aplicar sombra aos painéis operacionais.

## Demonstração para apresentação

A versão de GitHub Pages preserva o mesmo sistema visual. O acesso rápido usa botões canônicos primário e secundário em uma superfície menta, com identificação textual de dados fictícios. Cabeçalho e rodapé continuam identificando a demonstração durante o uso. Os exemplos preenchem indicadores e tabelas a partir da base local; os valores acompanham as ações realizadas. No celular, o cabeçalho de acesso ocupa apenas a altura da marca.

## Escolha de modelo e exclusão da frota

O catálogo usa select nativo com nome e quantidade disponível. Atualizar preserva a escolha e os demais campos; um modelo que ficou indisponível permanece identificado até uma nova escolha explícita. O cadastro administrativo oferece sugestões por datalist nativo. A ação de exclusão usa a variante de botão com texto e borda da cor `danger`, mantendo a superfície branca. A confirmação usa o diálogo existente e separa cancelar de confirmar; o formulário inerte mantém opacidade de 0,5 e seus valores são preservados ao cancelar.
