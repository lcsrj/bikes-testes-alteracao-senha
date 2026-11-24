import { DEMO, REPOSITORY_URL } from './runtime.js';
import { api, ApiError, setToken, hasToken } from './api.js';
import { escape as e, money, cpf, badge, date, duration, icon, field, password, errorArea, showError, toast, mountToast, empty, table, pager, localNow, zonedInstant } from './ui.js';

const root = document.getElementById('app');
const dialog = document.getElementById('dialog');
let account = null;
let config;
let profile = null;
let availableModels = [];
let version = 0;
let pageAbort;
let currentData = [];
let dirty = false;
let committedHash = location.hash;
let allowNavigation = false;
const isAdmin = () => account?.role === 'ADMIN';
const link = (hash, text, type = 'primary', symbol = '') => `<a class="button ${type}" href="#/${hash}">${symbol ? icon(symbol) : ''}${text}</a>`;
const button = (action, text, value = '', type = 'quiet small', disabled = false) => `<button type="button" class="button ${type}" data-action="${action}" data-id="${e(value)}" ${disabled ? 'disabled' : ''}>${text}</button>`;
const title = (heading, subtitle, action = '') => `<div class="page-heading"><div><h1 tabindex="-1">${heading}</h1><p>${subtitle}</p></div>${action}</div>`;
const getRoute = () => {
  const [path, query] = location.hash.replace(/^#\/?/, '').split('?');
  return { path: path || 'inicio', query: new URLSearchParams(query) };
};

function closeDialog() {
  dialog.close();
  dialog.replaceChildren();
}
dialog.addEventListener('close', () => { if (!dialog.open) dialog.replaceChildren(); });

function openDialog(content, focus = 'button') {
  dialog.innerHTML = `<div class="dialog-inner">${button('close-dialog', `${icon('close')}<span class="sr-only">Fechar</span>`, '', 'icon-button dialog-close')}${content}</div>`;
  dialog.showModal();
  requestAnimationFrame(() => dialog.querySelector(focus)?.focus());
}

function confirmNavigation(next) {
  openDialog('<h2 id="dialog-title">Sair sem salvar?</h2><p>Você tem um formulário preenchido. Ao sair, esses dados serão descartados.</p><div class="actions">' + button('close-dialog', 'Continuar preenchendo', '', 'secondary') + button('discard', 'Sair sem salvar', next, 'primary') + '</div>');
}

function shell() {
  const navigation = [ ['inicio', 'home', 'Visão geral'], ...(isAdmin()
    ? [['frota', 'bike', 'Bicicletas'], ['clientes', 'users', 'Clientes'], ['usuarios', 'account', 'Usuários'], ['relatorios', 'chart', 'Locações e relatórios']]
    : [['locacoes', 'key', 'Minhas locações'], ['nova-locacao', 'bike', 'Alugar bicicleta'], ['perfil', 'account', 'Meus dados']]), ['conta', 'account', 'Minha conta'] ];
  root.innerHTML = `<div class="app-shell"><aside class="sidebar" id="navigation"><a class="brand" href="#/inicio" aria-label="Bikes, visão geral">${icon('bike')}<span>bikes<span class="brand-dot">.</span></span></a><span class="sidebar-label">${isAdmin() ? 'ADMINISTRAÇÃO' : 'VAMOS PEDALAR'}</span><nav aria-label="Menu principal">${navigation.map(([path, symbol, label]) => `<a href="#/${path}" data-route="${path}">${icon(symbol)}<span>${label}</span></a>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-note">${icon('bike')}<p>Uma bike.<br>Novos caminhos.</p></div><a class="docs-link" href="${DEMO ? REPOSITORY_URL + '#readme' : './docs-bikes.html'}" target="_blank" rel="noopener">${DEMO ? 'Sobre o projeto ↗' : 'Documentação da API ↗'}</a></div></aside><div class="workspace"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-expanded="false" aria-controls="navigation" aria-label="Abrir menu">${icon('menu')}</button><span class="topbar-context">${DEMO ? 'Bikes · demonstração' : 'Locadora de bicicletas'}</span><div class="account-menu"><div class="avatar" aria-hidden="true">${e(account.username[0].toUpperCase())}</div><div><strong>${e(account.username)}</strong><span>${isAdmin() ? 'Administrador' : 'Cliente'}</span></div><button class="icon-button" data-action="logout" aria-label="Sair da conta" title="Sair da conta">${icon('out')}</button></div></header><main id="main" class="main" tabindex="-1"></main><footer class="footer">bikes · ${isAdmin() ? 'Gestão da locadora' : 'Seu próximo caminho começa aqui'}<span>${DEMO ? 'Dados fictícios · salvos neste navegador · ' : ''}Horários: ${e(config.timezone)}</span></footer></div></div>`;
  syncMenu();
  mountToast();
}

function syncMenu() {
  const sidebar = document.getElementById('navigation');
  if (sidebar) sidebar.inert = matchMedia('(max-width: 760px)').matches && !sidebar.classList.contains('open');
}

function demoAccess() {
  return `<section class="demo-access" aria-label="Acessos de demonstração"><p>Explore com dados fictícios. As mudanças ficam neste navegador.</p><div class="demo-actions">${button('demo-login', 'Entrar como cliente', 'CLIENTE', 'primary full')}${button('demo-login', 'Entrar como administrador', 'ADMIN', 'secondary full')}</div><details><summary>Entrar manualmente</summary><p>Cliente: <strong>cliente@bikes.demo</strong><br>Admin: <strong>admin@bikes.demo</strong><br>Senha inicial dos exemplos: <strong>123456</strong></p></details></section>`;
}

function authScreen(register = false) {
  document.title = `${register ? 'Criar conta' : 'Entrar'} · Bikes`;
  root.innerHTML = `<div class="auth-layout"><section class="auth-story"><a class="brand" href="#/entrar">${icon('bike')}<span>bikes<span class="brand-dot">.</span></span></a><div><h1>Mais leve.<br>Mais livre.<br>De bike.</h1><p>Alugue, acompanhe sua locação e aproveite o trajeto. Tudo em um só lugar.</p><div class="auth-photo"><img src="./assets/city-bike.png" alt="Bicicleta urbana verde com cesta" width="1536" height="1024"><small>Imagem ilustrativa</small></div></div><span class="story-footer">Menos pressa. Mais pedal.</span></section><main id="main" class="auth-main"><div class="auth-card"><h2>${register ? 'Vamos começar?' : 'Bom ter você por aqui.'}</h2><p>${register ? (DEMO ? 'Crie uma conta de demonstração com dados fictícios.' : 'Crie sua conta. Depois, complete seus dados para alugar.') : 'Entre na sua conta e acompanhe tudo por aqui.'}</p>${DEMO && !register ? demoAccess() : ''}<form novalidate id="${register ? 'signup' : 'login'}">${errorArea()}${field('username', 'E-mail', { attributes: 'type="email" autocomplete="username" maxlength="100" placeholder="voce@exemplo.com"' })}${password('password', 'Senha', register ? 'new-password' : 'current-password')}${register ? password('confirmacao', 'Confirmar senha', 'new-password') : ''}<button class="button primary full" type="submit">${register ? 'Criar minha conta' : 'Entrar na conta'}${icon('arrow')}</button></form><p class="auth-switch">${register ? 'Já tem uma conta? <a href="#/entrar">Entrar</a>' : 'Primeira vez aqui? <a href="#/cadastro">Criar conta</a>'}</p><p class="fine-print">Sua sessão termina ao recarregar ou fechar a página.</p>${DEMO ? button('demo-reset', 'Restaurar exemplos da demonstração', '', 'quiet full') : ''}<a class="muted-link" href="${DEMO ? REPOSITORY_URL + '#readme' : './docs-bikes.html'}">${DEMO ? 'Conhecer o projeto no GitHub ↗' : 'Consultar documentação da API ↗'}</a></div></main></div>`;
  attachForms();
  mountToast();
}

async function loadProfile() {
  try { return await api('/clientes/me'); }
  catch (error) { if (error.status === 404) return null; throw error; }
}

async function route() {
  const id = ++version;
  pageAbort?.abort();
  pageAbort = new AbortController();
  const { path } = getRoute();
  dirty = false;
  committedHash = location.hash;
  if (!account || !hasToken()) { authScreen(path === 'cadastro'); return; }
  if (!root.querySelector('.app-shell')) shell();
  root.querySelector('.sidebar').classList.remove('open');
  syncMenu();
  root.querySelector('[data-action="menu"]').setAttribute('aria-expanded', 'false');
  root.querySelectorAll('[data-route]').forEach(a => a.getAttribute('data-route') === path ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  const main = document.getElementById('main');
  main.setAttribute('aria-busy', 'true');
  main.innerHTML = '<div class="loading" role="status"><span class="spinner"></span>Carregando seus dados…</div>';
  try {
    let content;
    if (path === 'inicio') content = await overview();
    else if (path === 'conta') content = accountPage();
    else if (path === 'perfil' && !isAdmin()) { profile = await loadProfile(); content = profilePage(); }
    else if (path === 'nova-locacao' && !isAdmin()) { [profile, availableModels] = await Promise.all([loadProfile(), api('/catalogo/modelos')]); content = rentalForm(); }
    else if (path === 'locacoes' && !isAdmin()) content = await rentalList(false);
    else if (path === 'relatorios' && isAdmin()) content = await rentalList(true);
    else if (path === 'frota' && isAdmin()) content = await fleet();
    else if (path === 'clientes' && isAdmin()) content = await people('clientes');
    else if (path === 'usuarios' && isAdmin()) content = await people('usuarios');
    else content = title('Página indisponível', 'Esse endereço não faz parte da sua área.') + empty('Volte para o início', 'Use o menu para acessar as funcionalidades da sua conta.', link('inicio', 'Ir para visão geral'));
    if (id !== version) return;
    main.innerHTML = content;
    document.title = `${main.querySelector('h1')?.textContent || 'Locadora'} · Bikes`;
    attachForms();
    main.querySelector('h1')?.focus({ preventScroll: true });
  } catch (error) {
    if (id !== version || !account) return;
    if (error.status === 403) {
      try {
        account = await api('/auth/me');
        shell();
      } catch { /* A expiração da sessão é tratada pelo evento global. */ }
    }
    const target = document.getElementById('main');
    if (target) target.innerHTML = title(error.status === 403 ? 'Acesso não permitido' : 'Não foi possível carregar', e(error.message)) + button('retry', 'Tentar novamente', '', 'primary');
  } finally { if (id === version) document.getElementById('main')?.removeAttribute('aria-busy'); }
}

function stats(items) {
  return `<div class="stats">${items.map(([label, value, symbol, hint]) => `<article class="stat"><div><span>${label}</span><span class="stat-icon">${icon(symbol)}</span></div><strong>${value}</strong><small>${hint}</small></article>`).join('')}</div>`;
}

function rentalRows(items, admin = false, report = false) {
  return items.map(r => `<tr><td><strong>#${r.locacaoId || r.id}</strong>${admin && !report ? `<span class="cell-sub">${e(r.nomeCliente)}</span>` : ''}</td>${report ? `<td>${e(r.nomeCliente)}</td>` : ''}<td><strong>${e(r.codigoBicicleta)}</strong></td><td>${date(r.dataRetirada)}</td>${report ? `<td>${r.dataDevolucao ? date(r.dataDevolucao) : 'Pendente'}</td><td>${duration(r.duracaoSegundos, true)}</td>` : ''}<td>${badge(r.status)}</td><td>${r.status === 'FINALIZADA' ? money(r.valor) : 'Em andamento'}</td><td>${button('rental-detail', 'Ver detalhes', r.locacaoId || r.id)}</td></tr>`);
}

async function overview() {
  let rentals, bikes;
  if (isAdmin()) [rentals, bikes] = await Promise.all([api('/relatorios/locacoes'), api('/bicicletas')]);
  else [rentals, profile] = await Promise.all([api('/locacoes/me'), loadProfile()]);
  currentData = rentals;
  const active = rentals.filter(r => r.status === 'ATIVA');
  const finished = rentals.filter(r => r.status === 'FINALIZADA');
  const cards = isAdmin()
    ? [['Total de bicicletas', bikes.length, 'bike', 'Bicicletas na frota'], ['Disponíveis', bikes.filter(b => b.status === 'LIVRE').length, 'check', 'Prontas para sair'], ['Em uso', bikes.filter(b => b.status === 'OCUPADA').length, 'key', 'Bicicletas alugadas'], ['Em manutenção', bikes.filter(b => b.status === 'MANUTENCAO').length, 'tool', 'Aguardando liberação']]
    : [['Minhas locações', rentals.length, 'bike', 'Seu histórico na Bikes'], ['Em andamento', active.length, 'key', 'Locações ativas'], ['Finalizadas', finished.length, 'check', 'Trajetos concluídos'], ['Total das finalizadas', money(finished.reduce((sum, r) => sum + Number(r.valor), 0)), 'chart', 'Valores calculados pela locadora']];
  const recent = [...rentals].sort((a, b) => (b.locacaoId || b.id) - (a.locacaoId || a.id)).slice(0, 5);
  const upcoming = [...active].sort((a, b) => a.dataDevolucaoPrevista.localeCompare(b.dataDevolucaoPrevista)).slice(0, 3);
  return title('Visão geral', isAdmin() ? 'Gerencie sua frota e acompanhe cada locação.' : `Seu próximo caminho começa aqui${profile ? `, ${e(profile.nome.split(' ')[0])}` : ''}.`, isAdmin() ? link('frota', 'Gerenciar bicicletas', 'primary', 'bike') : link('nova-locacao', 'Alugar bicicleta', 'primary', 'plus'))
    + (!isAdmin() && !profile ? `<div class="notice"><div><strong>Só falta completar seus dados.</strong><p>Cadastre seu nome e CPF para fazer sua primeira locação.</p></div>${link('perfil', 'Completar cadastro', 'secondary')}</div>` : '')
    + stats(cards) + `<div class="dashboard-grid"><section class="panel"><div class="panel-heading"><div><h2>Locações recentes</h2><p>${isAdmin() ? 'As últimas movimentações da locadora.' : 'Seus últimos trajetos, em um só lugar.'}</p></div><a href="#/${isAdmin() ? 'relatorios' : 'locacoes'}">Ver todas ${icon('arrow')}</a></div>${recent.length ? table(['Locação', 'Bicicleta', 'Retirada', 'Status', 'Valor', '<span class="sr-only">Ações</span>'], rentalRows(recent, isAdmin()), 'Locações recentes') : empty('Nenhuma locação por aqui', isAdmin() ? 'As locações dos clientes aparecerão aqui.' : 'Que tal começar um novo trajeto?', !isAdmin() ? link('nova-locacao', 'Alugar minha primeira bike') : '')}<div class="panel-foot">${icon('clock')}Dados atualizados ao abrir esta página. ${button('retry', 'Atualizar')}</div></section><aside class="dashboard-aside"><section class="bike-feature"><div><h2>Vamos de bike?</h2><p>${isAdmin() ? 'Uma frota cuidada vai mais longe.' : `${money(config.valorHora)} por hora. Você escolhe o destino.`}</p></div><img src="./assets/city-bike.png" width="1536" height="1024" alt="Bicicleta urbana verde com cesta"><small>Imagem ilustrativa</small></section><section class="panel upcoming"><h2>Próximas devoluções</h2>${upcoming.length ? upcoming.map(r => button('rental-detail', `<span class="upcoming-icon">${icon('bike')}</span><span><strong>${e(r.codigoBicicleta)}</strong><small>${date(r.dataDevolucaoPrevista)}</small></span>${icon('arrow')}`, r.locacaoId || r.id, 'upcoming-row')).join('') : '<p class="muted">Nenhuma devolução pendente.</p>'}</section></aside></div>`;
}

function filters(kind, statuses = []) {
  const q = getRoute().query;
  return `<form novalidate id="filters" class="filters" role="search"><div class="search-field">${icon('search')}<label class="sr-only" for="search">Buscar ${kind}</label><input id="search" name="q" value="${e(q.get('q') || '')}" placeholder="Buscar ${kind}" maxlength="100"><button type="submit" class="button quiet small">Buscar</button></div>${statuses.length ? `<label class="filter-status">Status<select name="status">${[['', 'Todos os status'], ...statuses].map(([value, label]) => `<option value="${value}" ${q.get('status') === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}${q.get('q') || q.get('status') ? button('clear-filters', 'Limpar filtros') : ''}</form>`;
}

function slice(items, search, statusField = 'status') {
  const q = getRoute().query;
  const needle = (q.get('q') || '').toLocaleLowerCase('pt-BR');
  const filtered = items.filter(item => (!q.get('status') || item[statusField] === q.get('status')) && search(item).toLocaleLowerCase('pt-BR').includes(needle));
  const size = [10, 20, 50].includes(Number(q.get('size'))) ? Number(q.get('size')) : 10;
  const page = Math.min(Math.max(1, Number.parseInt(q.get('page')) || 1), Math.max(1, Math.ceil(filtered.length / size)));
  return { rows: filtered.slice((page - 1) * size, page * size), foot: pager(filtered.length, page, size), count: filtered.length };
}

async function rentalList(admin) {
  const rentals = await api(admin ? '/relatorios/locacoes' : '/locacoes/me');
  currentData = rentals;
  const result = slice([...rentals].sort((a, b) => (b.locacaoId || b.id) - (a.locacaoId || a.id)), r => `${r.locacaoId || r.id} ${r.codigoBicicleta} ${r.nomeCliente}`);
  const headers = admin
    ? ['Locação', 'Cliente', 'Bicicleta', 'Retirada', 'Devolução efetiva', 'Duração', 'Status', 'Valor', '<span class="sr-only">Ações</span>']
    : ['Locação', 'Bicicleta', 'Retirada', 'Status', 'Valor', '<span class="sr-only">Ações</span>'];
  return title(admin ? 'Locações e relatórios' : 'Minhas locações', admin ? 'Acompanhe retiradas, devoluções e os valores de cada locação.' : 'Acompanhe seus trajetos e devolva a bicicleta quando terminar.', admin ? button('retry', 'Atualizar relatório', '', 'secondary') : link('nova-locacao', 'Alugar bicicleta', 'primary', 'plus'))
    + `<section class="panel">${filters(admin ? 'cliente, bicicleta ou locação' : 'bicicleta ou locação', [['ATIVA', 'Em andamento'], ['FINALIZADA', 'Finalizada']])}${admin ? '<p class="report-hint">Em telas menores, deslize a tabela para ver todas as colunas.</p>' : ''}${result.rows.length ? table(headers, rentalRows(result.rows, admin, admin), admin ? 'Relatório de locações' : 'Minhas locações') : empty('Nenhuma locação encontrada', 'Tente outra busca ou limpe os filtros.')}${result.foot}</section><p class="page-note">${admin ? 'A duração em andamento mostra o tempo até a última atualização. A devolução fica pendente até a finalização. ' : ''}Os valores das locações em andamento são calculados na devolução. Horários em ${e(config.timezone)}.</p>`;
}

async function fleet() {
  const bikes = await api('/bicicletas');
  currentData = bikes;
  const result = slice(bikes, b => `${b.codigo} ${b.modelo}`);
  return title('Bicicletas', 'Sua frota organizada, do primeiro pedal à manutenção.', button('new-bike', `${icon('plus')}Cadastrar bicicleta`, '', 'primary')) + `<section class="panel">${filters('código ou modelo', [['LIVRE', 'Disponível'], ['OCUPADA', 'Em uso'], ['MANUTENCAO', 'Manutenção']])}${result.rows.length ? table(['Código', 'Modelo', 'Status', 'Cadastro', '<span class="sr-only">Ações</span>'], result.rows.map(b => `<tr><td><strong>${e(b.codigo)}</strong></td><td>${e(b.modelo)}</td><td>${badge(b.status)}</td><td>${date(b.dataCriacao)}</td><td>${button('bike-detail', 'Ver detalhes', b.codigo)}</td></tr>`), 'Bicicletas da frota') : empty('Nenhuma bicicleta encontrada', bikes.length ? 'Tente outro código ou limpe os filtros.' : 'Cadastre sua primeira bicicleta para começar.', !bikes.length ? button('new-bike', 'Cadastrar bicicleta', '', 'primary') : '')}${result.foot}</section>`;
}

async function people(kind) {
  const items = await api(`/${kind}`);
  currentData = items;
  const clients = kind === 'clientes';
  const result = slice(items, x => clients ? `${x.nome} ${x.cpf} ${cpf(x.cpf)} ${x.email || ''}` : `${x.username} ${x.id}`);
  return title(clients ? 'Clientes' : 'Usuários', clients ? 'Consulte os dados dos clientes cadastrados na locadora.' : 'Consulte as contas e os perfis de acesso ao sistema.') + `<section class="panel">${filters(clients ? 'nome, CPF ou e-mail' : 'e-mail ou número da conta')}${result.rows.length ? table(clients ? ['Cliente', 'CPF', 'Contato', 'Cadastro', '<span class="sr-only">Ações</span>'] : ['Conta', 'E-mail', 'Perfil', '<span class="sr-only">Ações</span>'], result.rows.map(x => clients ? `<tr><td><strong>${e(x.nome)}</strong><span class="cell-sub">Cliente #${x.id}</span></td><td>${cpf(x.cpf)}</td><td>${e(x.email || x.telefone || 'Não informado')}</td><td>${date(x.dataCriacao)}</td><td>${button('client-detail', 'Ver dados', x.id)}</td></tr>` : `<tr><td>#${x.id}</td><td><strong>${e(x.username)}</strong></td><td>${badge(x.role)}</td><td>${button('user-detail', 'Ver conta', x.id)}</td></tr>`), clients ? 'Clientes cadastrados' : 'Contas cadastradas') : empty('Nenhum resultado encontrado', 'Os cadastros aparecerão aqui. Você também pode tentar outra busca.')}${result.foot}</section>`;
}

function profilePage() {
  return title('Meus dados', profile ? 'Seu cadastro de cliente na locadora.' : 'Complete seu cadastro para começar a pedalar.') + `<section class="panel form-panel">${profile ? `<div class="section-heading"><h2>Cadastro de cliente</h2>${badge('CLIENTE')}</div>${clientDetails(profile)}<p class="page-note">Se precisar corrigir seus dados, entre em contato com a locadora.</p>` : `<h2>Quem vai pedalar?</h2><p>Seu cadastro fica associado à conta ${e(account.username)}.</p><form novalidate id="profile" class="form-grid">${errorArea()}${field('nome', 'Nome completo', { wide: true, attributes: 'autocomplete="name" minlength="2" maxlength="100"' })}${field('cpf', 'CPF', { attributes: 'inputmode="numeric" autocomplete="off" pattern="[0-9]{11}" maxlength="11"', hint: DEMO ? 'CPF de teste: 39053344705. Informe só os números.' : '11 números, sem pontos e traço.' })}${field('telefone', 'Telefone (opcional)', { optional: true, attributes: 'type="tel" autocomplete="tel" maxlength="20"' })}${field('email', 'E-mail de contato (opcional)', { optional: true, wide: true, attributes: 'type="email" autocomplete="email" maxlength="100"', value: account.username })}<div class="actions wide"><button class="button primary" type="submit">Concluir cadastro${icon('check')}</button></div></form>`}</section>`;
}

function modelOptions() {
  return `<option value="">${availableModels.length ? 'Qualquer modelo disponível' : 'Nenhum modelo disponível no momento'}</option>${availableModels.map(model => `<option value="${e(model.modelo)}">${e(model.modelo)} · ${model.disponiveis} ${model.disponiveis === 1 ? 'disponível' : 'disponíveis'}</option>`).join('')}`;
}

function rentalForm() {
  if (!profile) return title('Alugar bicicleta', 'Antes do primeiro trajeto, precisamos do seu cadastro.') + empty('Só falta completar seus dados', 'Cadastre seu nome e CPF. É rápido e você só precisa fazer uma vez.', link('perfil', 'Completar cadastro'));
  return title('Alugar bicicleta', 'Escolha a previsão de devolução. A gente cuida do próximo passo.') + `<div class="rental-layout"><section class="panel form-panel"><form novalidate id="rental" class="form-grid">${errorArea()}<div class="wide section-heading"><h2>Seu trajeto</h2>${button('refresh-models', 'Atualizar modelos')}</div><div class="field wide"><label for="modeloBicicleta">Modelo da bicicleta</label><select id="modeloBicicleta" name="modeloBicicleta" aria-describedby="modeloBicicleta-hint" ${availableModels.length ? '' : 'disabled'}>${modelOptions()}</select><small id="modeloBicicleta-hint">Escolha um modelo ou deixe o sistema selecionar. Informar um código específico substitui esta escolha.</small><small class="field-error" id="modeloBicicleta-error"></small></div>${field('codigoBicicleta', 'Código da bicicleta (opcional)', { optional: true, attributes: 'maxlength="30" pattern="[A-Za-z0-9_-]{3,30}" autocapitalize="characters"', hint: 'O código está na bicicleta. Deixe em branco para receber uma disponível.' })}${field('dataDevolucaoPrevista', 'Previsão de devolução', { attributes: `type="datetime-local" min="${localNow(config.timezone, 1)}"`, value: localNow(config.timezone, 120), hint: `Horário da locadora: ${e(config.timezone)}.` })}<div class="wide section-heading separated"><div><h2>Dados do cartão</h2><p>Registro acadêmico: nenhum pagamento é processado. Use dados de teste.</p></div></div>${field('cartao.titular', 'Nome no cartão', { wide: true, attributes: 'autocomplete="off" minlength="2" maxlength="100"' })}${field('cartao.numero', 'Número do cartão', { wide: true, attributes: 'inputmode="numeric" autocomplete="off" pattern="[0-9]{13,19}" maxlength="19"', hint: 'Somente números. Para testar: 4111111111111111.' })}${field('cartao.mesValidade', 'Mês de validade', { attributes: 'type="number" min="1" max="12" inputmode="numeric" placeholder="MM"' })}${field('cartao.anoValidade', 'Ano de validade', { attributes: 'type="number" min="2000" max="9999" inputmode="numeric" placeholder="AAAA"' })}${field('cartao.cvv', 'Código de segurança', { attributes: 'type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{3,4}" minlength="3" maxlength="4"', hint: '3 ou 4 números. Não será armazenado.' })}<div class="actions wide"><button type="submit" class="button primary">Confirmar locação${icon('arrow')}</button><a class="button secondary" href="#/locacoes">Cancelar</a></div></form></section><aside class="rental-summary"><div class="bike-feature"><h2>Seu próximo trajeto</h2><img src="./assets/city-bike.png" alt="Bicicleta urbana verde com cesta" width="1536" height="1024"><small>Imagem ilustrativa</small></div><div class="panel"><p class="price-label">Valor da locação</p><p class="price">${money(config.valorHora)}<span>/ hora</span></p><p>Valor proporcional ao tempo de uso, com cobrança mínima de 1 minuto.</p><hr><p>O valor final é calculado na devolução. O sistema guarda apenas os quatro últimos números do cartão.</p></div></aside></div>`;
}

function accountPage() {
  return title('Minha conta', 'Seus dados de acesso e a segurança da sua conta.') + `<div class="account-grid"><section class="panel form-panel"><h2>Dados de acesso</h2><dl><div><dt>E-mail</dt><dd>${e(account.username)}</dd></div><div><dt>Perfil</dt><dd>${badge(account.role)}</dd></div><div><dt>Número da conta</dt><dd>#${account.id}</dd></div></dl><p class="page-note">Sua sessão fica apenas nesta página. Ao recarregar, entre novamente.</p>${DEMO ? button('demo-reset', 'Restaurar exemplos da demonstração', '', 'secondary') : ''}</section><section class="panel form-panel"><h2>Alterar senha</h2><p>Informe a senha atual para confirmar a alteração.</p>${passwordForm(account.id)}</section></div>`;
}

function passwordForm(id) {
  return `<form novalidate id="change-password" data-user="${id}">${errorArea()}${password('senhaAtual', 'Senha atual')}${password('novaSenha', 'Nova senha', 'new-password')}${password('confirmaSenha', 'Confirmar nova senha', 'new-password')}<button class="button primary" type="submit">Salvar nova senha</button></form>`;
}

function details(entries) { return `<dl>${entries.map(([name, value]) => `<div><dt>${name}</dt><dd>${value}</dd></div>`).join('')}</dl>`; }
function auditDetails(item) { return `<details class="audit"><summary>Informações do cadastro</summary>${details([['Criado em', date(item.dataCriacao)], ['Criado por', e(item.criadoPor || '—')], ['Última alteração', date(item.dataModificacao)], ['Alterado por', e(item.modificadoPor || '—')]])}</details>`; }
function clientDetails(item) { return details([['Nome', e(item.nome)], ['CPF', cpf(item.cpf)], ['Telefone', e(item.telefone || 'Não informado')], ['E-mail de contato', e(item.email || 'Não informado')], ['Conta associada', `#${item.usuarioId}`]]) + auditDetails(item); }

async function rentalDetail(id) {
  openDialog('<h2 id="dialog-title">Detalhes da locação</h2><p role="status">Carregando locação…</p>');
  try {
    const item = await api(`/locacoes/${encodeURIComponent(id)}`);
    if (!dialog.open) return;
    dialog.innerHTML = `<div class="dialog-inner">${button('close-dialog', `${icon('close')}<span class="sr-only">Fechar</span>`, '', 'icon-button dialog-close')}<h2 id="dialog-title">${item.status === 'FINALIZADA' ? 'Comprovante · Locação' : 'Locação'} #${item.id}</h2>${badge(item.status)}${details([['Cliente', e(item.nomeCliente)], ['Bicicleta', e(item.codigoBicicleta)], ['Modelo', e(item.modeloBicicleta || 'Não informado')], ['Retirada', date(item.dataRetirada)], ['Devolução prevista', date(item.dataDevolucaoPrevista)], ['Devolução realizada', date(item.dataDevolucao)], ['Tempo de uso', duration(item.duracaoSegundos)], ['Valor por hora contratado', money(item.valorHora)], ['Cartão', `Final ${e(item.cartaoFinal)}`], ['Valor final', item.status === 'FINALIZADA' ? `<strong class="receipt-total">${money(item.valor)}</strong>` : 'Calculado na devolução']])}${item.status === 'ATIVA' ? `<div class="notice compact"><p>O valor final considera o tempo de uso, com mínimo de 1 minuto. A devolução libera a bicicleta ou a envia para manutenção.</p></div><form novalidate id="return" data-rental="${item.id}">${errorArea()}<label class="checkbox"><input type="checkbox" name="manutencao"> A bicicleta precisa de manutenção</label><div class="actions">${button('close-dialog', 'Continuar usando', '', 'secondary')}<button class="button primary" type="submit">Confirmar devolução</button></div></form>` : `<div class="actions">${button('close-dialog', 'Fechar comprovante', '', 'primary')}</div>`}</div>`;
    attachForms(dialog);
    dialog.querySelector('button')?.focus();
  } catch (error) {
    if (dialog.open) dialog.innerHTML = `<div class="dialog-inner"><h2 id="dialog-title">Não foi possível abrir</h2><p role="alert">${e(error.message)}</p>${button('close-dialog', 'Fechar', '', 'primary')}</div>`;
  }
}

async function bikeDetail(code) {
  const item = currentData.find(x => x.codigo === code);
  if (!item) return;
  openDialog(`<h2 id="dialog-title">Bicicleta ${e(item.codigo)}</h2>${badge(item.status)}${details([['Modelo', e(item.modelo)], ['Código', e(item.codigo)]])}${auditDetails(item)}${item.status === 'OCUPADA' ? '<div class="notice compact"><p>A bicicleta está em uso. Finalize a locação para liberá-la ou enviá-la à manutenção.</p></div>' : `<form novalidate id="bike-status" data-code="${e(item.codigo)}">${errorArea()}<div class="field"><label for="status">Situação da bicicleta</label><select id="status" name="status"><option value="LIVRE" ${item.status === 'LIVRE' ? 'selected' : ''}>Disponível para locação</option><option value="MANUTENCAO" ${item.status === 'MANUTENCAO' ? 'selected' : ''}>Em manutenção</option></select></div><button class="button primary" type="submit">Salvar situação</button></form>`}<div class="actions">${button('delete-bike', 'Excluir bicicleta', item.codigo, 'danger', item.status === 'OCUPADA')}</div>`);
  attachForms(dialog);
}

function requestBikeDeletion(code, control) {
  if (dialog.querySelector('.delete-confirm')) return;
  dialog.querySelector('#bike-status')?.setAttribute('inert', '');
  control.hidden = true;
  dialog.querySelector('.dialog-inner').insertAdjacentHTML('beforeend', `<section class="notice compact delete-confirm" aria-labelledby="delete-title"><h3 id="delete-title">Excluir a bicicleta ${e(code)}?</h3><p>Ela sai da frota e do catálogo. As locações já registradas permanecem no histórico, e o código não poderá ser reutilizado.</p>${errorArea()}<div class="actions">${button('cancel-bike-deletion', 'Cancelar exclusão', '', 'secondary')}${button('confirm-bike-deletion', 'Confirmar exclusão', code, 'danger')}</div></section>`);
  dialog.querySelector('[data-action="cancel-bike-deletion"]').focus();
}

function newBike() {
  const models = [...new Set(['Urbana', 'Mountain Bike', 'Elétrica', 'Passeio', 'Dobrável', 'Infantil', ...currentData.map(item => item.modelo).filter(Boolean)])];
  openDialog(`<h2 id="dialog-title">Cadastrar bicicleta</h2><p>A bicicleta será cadastrada como disponível para locação.</p><form novalidate id="bike">${errorArea()}${field('codigo', 'Código', { attributes: 'minlength="3" maxlength="30" pattern="[A-Z0-9_-]{3,30}" autocapitalize="characters"', hint: '3 a 30 caracteres: letras maiúsculas, números, hífen ou sublinhado.' })}${field('modelo', 'Modelo', { attributes: 'minlength="2" maxlength="100" list="modelos-frota" placeholder="Ex.: Urbana, Elétrica ou Mountain Bike"' })}<datalist id="modelos-frota">${models.map(model => `<option value="${e(model)}"></option>`).join('')}</datalist><div class="actions">${button('close-dialog', 'Cancelar', '', 'secondary')}<button class="button primary" type="submit">Cadastrar bicicleta</button></div></form>`, 'input');
  attachForms(dialog);
}

async function personDetail(kind, id) {
  const item = currentData.find(x => x.id === Number(id));
  if (!item) return;
  openDialog(kind === 'clientes'
    ? `<h2 id="dialog-title">Dados do cliente</h2>${clientDetails(item)}`
    : `<h2 id="dialog-title">Conta #${item.id}</h2>${details([['E-mail', e(item.username)], ['Perfil', badge(item.role)]])}<details class="audit"><summary>Alterar senha desta conta</summary><p>A alteração exige a senha atual do usuário.</p>${passwordForm(item.id)}</details>`);
  attachForms(dialog);
}

function validation(message, name) { throw new ApiError(message, 422, { [name]: message }); }

function attachForms(scope = root) {
  scope.querySelectorAll('form:not([data-bound])').forEach(form => {
    form.dataset.bound = 'true';
    form.noValidate = true;
    form.addEventListener('input', event => {
      if (form.id !== 'filters') dirty = true;
      if (form.id === 'rental' && event.target.name === 'codigoBicicleta' && event.target.value.trim()) form.elements.namedItem('modeloBicicleta').value = '';
    });
    form.addEventListener('change', event => {
      if (form.id === 'rental' && event.target.name === 'modeloBicicleta' && event.target.value) form.elements.namedItem('codigoBicicleta').value = '';
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.dataset.busy) return;
      if (form.id === 'filters') { updateFilters(form); return; }
      const submit = form.querySelector('[type="submit"]');
      const original = submit.innerHTML;
      form.dataset.busy = 'true';
      submit.disabled = true;
      submit.textContent = 'Aguarde…';
      form.setAttribute('aria-busy', 'true');
      const values = Object.fromEntries(new FormData(form));
      const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, k.toLowerCase().includes('senha') || k === 'password' ? v : v.trim()]));
      form.querySelector('.form-error').hidden = true;
      try {
        for (const input of form.querySelectorAll('input, select')) {
          if (!input.validity.valid) {
            const message = input.validity.valueMissing ? 'Preencha este campo.'
              : input.validity.typeMismatch ? 'Informe um e-mail válido.'
              : input.validity.tooShort || input.validity.tooLong ? `Confira o tamanho deste campo (${input.minLength} a ${input.maxLength} caracteres).`
              : input.validity.rangeUnderflow || input.validity.rangeOverflow ? 'Informe um valor dentro do intervalo indicado.'
              : 'Confira o formato indicado para este campo.';
            validation(message, input.name);
          }
        }
        if (form.id === 'login' || form.id === 'signup') {
          if (form.id === 'signup') {
            if (values.password !== values.confirmacao) validation('As senhas precisam ser iguais.', 'confirmacao');
            await api('/usuarios', { method: 'POST', body: { username: clean.username, password: values.password } });
            dirty = false;
            try { await signIn(clean.username, values.password); }
            catch (error) { location.hash = '#/entrar'; toast('Conta criada. Entre com seu e-mail e senha para continuar.'); throw error; }
            toast('Conta criada! Complete seus dados para começar.');
            location.hash = '#/perfil';
            await route();
          } else {
            await signIn(clean.username, values.password);
            dirty = false;
            location.hash = '#/inicio';
            await route();
            toast('Você entrou na sua conta. Boa pedalada!');
          }
        } else if (form.id === 'profile') {
          await api('/clientes', { method: 'POST', body: { ...clean, telefone: clean.telefone || null, email: clean.email || null } });
          dirty = false;
          toast('Cadastro concluído. Você já pode alugar uma bicicleta.');
          location.hash = '#/nova-locacao';
        } else if (form.id === 'rental') {
          if (clean.modeloBicicleta && !availableModels.some(model => model.modelo === clean.modeloBicicleta)) validation('Este modelo não está mais disponível. Escolha outro modelo ou atualize novamente.', 'modeloBicicleta');
          if (zonedInstant(clean.dataDevolucaoPrevista, config.timezone) <= Date.now()) validation('Escolha uma previsão de devolução futura no horário da locadora.', 'dataDevolucaoPrevista');
          const item = await api('/locacoes', { method: 'POST', body: { codigoBicicleta: clean.codigoBicicleta || null, modeloBicicleta: clean.modeloBicicleta || null, dataDevolucaoPrevista: `${clean.dataDevolucaoPrevista}:00`, cartao: { titular: clean['cartao.titular'], numero: clean['cartao.numero'], cvv: clean['cartao.cvv'], mesValidade: Number(clean['cartao.mesValidade']), anoValidade: Number(clean['cartao.anoValidade']) } } });
          dirty = false;
          form.reset();
          toast(`Locação #${item.id} confirmada. Boa pedalada!`);
          location.hash = '#/locacoes';
          await route();
          await rentalDetail(item.id);
        } else if (form.id === 'return') {
          const item = await api(`/locacoes/${form.dataset.rental}/devolucao`, { method: 'POST', body: { manutencao: Boolean(values.manutencao) } });
          dirty = false;
          closeDialog();
          toast('Bicicleta devolvida. Confira seu comprovante.');
          await route();
          await rentalDetail(item.id);
        } else if (form.id === 'bike') {
          await api('/bicicletas', { method: 'POST', body: clean });
          dirty = false;
          closeDialog(); toast('Bicicleta cadastrada. Pronta para o próximo trajeto!'); await route();
        } else if (form.id === 'bike-status') {
          await api(`/bicicletas/${encodeURIComponent(form.dataset.code)}/status`, { method: 'PATCH', body: clean });
          dirty = false;
          closeDialog(); toast('Situação da bicicleta atualizada.'); await route();
        } else if (form.id === 'change-password') {
          if (values.novaSenha !== values.confirmaSenha) validation('A confirmação precisa ser igual à nova senha.', 'confirmaSenha');
          await api(`/usuarios/${form.dataset.user}`, { method: 'PATCH', body: values });
          dirty = false;
          form.reset();
          toast('Senha alterada com sucesso.');
          if (dialog.open) closeDialog();
        }
      } catch (error) { if (form.isConnected) showError(form, error); }
      finally { delete form.dataset.busy; submit.disabled = false; submit.innerHTML = original; form.removeAttribute('aria-busy'); }
    });
  });
  scope.querySelectorAll('#filters select, #page-size').forEach(select => select.addEventListener('change', () => updateFilters(document.getElementById('filters'))));
}

function updateFilters(form) {
  const query = new URLSearchParams();
  for (const [key, value] of new FormData(form)) if (String(value).trim()) query.set(key, String(value).trim());
  location.hash = `#/${getRoute().path}?${query}`;
}

async function signIn(username, password) {
  const result = await api('/auth/login', { method: 'POST', body: { username, password } });
  setToken(result.accessToken);
  try { account = await api('/auth/me'); }
  catch (error) { setToken(null); throw error; }
}

document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); document.getElementById('main')?.focus(); return; }
  const page = event.target.closest('[data-page]');
  if (page && !page.disabled) {
    const { path, query } = getRoute(); query.set('page', page.dataset.page); location.hash = `#/${path}?${query}`; return;
  }
  const control = event.target.closest('[data-action]');
  if (!control) return;
  const action = control.dataset.action;
  if (action !== 'password' && (root.querySelector('[data-busy]') || dialog.querySelector('[data-busy]'))) return;
  if (action === 'password') {
    const input = document.getElementById(control.getAttribute('aria-controls'));
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password'; control.textContent = visible ? 'Ocultar' : 'Mostrar';
    control.setAttribute('aria-pressed', String(visible));
    control.setAttribute('aria-label', `${visible ? 'Ocultar' : 'Mostrar'} ${input.labels[0].textContent.toLowerCase()}`);
  } else if (action === 'menu') {
    const open = document.getElementById('navigation').classList.toggle('open');
    control.setAttribute('aria-expanded', String(open));
    syncMenu();
    if (open) document.querySelector('#navigation nav a')?.focus();
  } else if (action === 'close-dialog') {
    if (dialog.querySelector('[data-busy]')) return;
    if (dialog.querySelector('form') && dirty) {
      const form = dialog.querySelector('form');
      if (!dialog.querySelector('.discard-warning')) {
        form.insertAdjacentHTML('beforebegin', `<div class="notice compact discard-warning"><p>Fechar descarta os dados preenchidos neste formulário.</p>${button('discard-dialog', 'Descartar e fechar', '', 'secondary')}</div>`);
        dialog.querySelector('.discard-warning button').focus();
      }
    } else closeDialog();
  } else if (action === 'discard-dialog') { dirty = false; closeDialog(); }
  else if (action === 'discard') { dirty = false; allowNavigation = true; const next = control.dataset.id; closeDialog(); if (next === 'logout') logout(); else { location.hash = next; if (next === committedHash) route(); } }
  else if (action === 'logout') { if (dirty) confirmNavigation('logout'); else logout(); }
  else if (action === 'retry') route();
  else if (action === 'clear-filters') { location.hash = `#/${getRoute().path}`; }
  else if (DEMO && action === 'demo-login') {
    if (control.disabled) return;
    const choices = [...document.querySelectorAll('[data-action="demo-login"]')];
    choices.forEach(choice => { choice.disabled = true; });
    try {
      const result = await api('/demo/acesso', { method: 'POST', body: { role: control.dataset.id } });
      setToken(result.accessToken);
      account = await api('/auth/me');
      dirty = false;
      location.hash = '#/inicio';
      await route();
      toast('Perfil aberto. Explore a demonstração da locadora.');
    } catch (error) {
      const form = document.getElementById('login');
      if (form) showError(form, error);
    } finally { choices.forEach(choice => { choice.disabled = false; }); }
  } else if (DEMO && action === 'demo-reset') {
    openDialog(`<h2 id="dialog-title">Restaurar a demonstração?</h2><p>Os exemplos originais serão restaurados. Os cadastros e as alterações que você fez neste navegador serão removidos, e sua sessão será encerrada.</p>${errorArea()}<div class="actions">${button('close-dialog', 'Manter meus dados', '', 'secondary')}${button('confirm-demo-reset', 'Restaurar demonstração', '', 'primary')}</div>`);
  } else if (DEMO && action === 'confirm-demo-reset') {
    control.disabled = true;
    try {
      await api('/demo/reset', { method: 'POST' });
      logout(); toast('Exemplos restaurados. Escolha um perfil para explorar.');
    } catch (error) {
      const output = dialog.querySelector('.form-error');
      output.textContent = error.message; output.hidden = false; output.focus();
    } finally { control.disabled = false; }
  }
  else if (action === 'refresh-models') {
    control.disabled = true;
    const form = document.getElementById('rental');
    try {
      const select = form.elements.namedItem('modeloBicicleta');
      const previous = select.value;
      availableModels = await api('/catalogo/modelos');
      const matching = availableModels.find(model => model.modelo.toLocaleLowerCase('pt-BR') === previous.toLocaleLowerCase('pt-BR'));
      select.innerHTML = modelOptions(); select.disabled = availableModels.length === 0 && !previous;
      if (matching) select.value = matching.modelo;
      else if (previous) {
        select.insertAdjacentHTML('beforeend', `<option value="${e(previous)}">${e(previous)} · indisponível</option>`);
        select.value = previous;
      }
      toast(previous && !matching ? 'O modelo escolhido ficou indisponível. Escolha outro modelo ou atualize novamente.' : availableModels.length ? 'Modelos disponíveis atualizados.' : 'Nenhum modelo livre no momento. Tente novamente mais tarde.');
    } catch (error) { if (form.isConnected) showError(form, error); }
    finally { control.disabled = false; }
  }
  else if (action === 'delete-bike') requestBikeDeletion(control.dataset.id, control);
  else if (action === 'cancel-bike-deletion') {
    dialog.querySelector('.delete-confirm')?.remove();
    dialog.querySelector('#bike-status')?.removeAttribute('inert');
    const trigger = dialog.querySelector('[data-action="delete-bike"]');
    trigger.hidden = false; trigger.focus();
  }
  else if (action === 'confirm-bike-deletion') {
    const section = control.closest('.delete-confirm');
    section.dataset.busy = 'true'; control.disabled = true;
    try {
      await api(`/bicicletas/${encodeURIComponent(control.dataset.id)}`, { method: 'DELETE' });
      dirty = false; closeDialog(); await route(); toast('Bicicleta excluída da frota. O histórico foi preservado.');
    } catch (error) {
      if (section.isConnected) { const output = section.querySelector('.form-error'); output.hidden = false; output.textContent = error.message; output.focus(); }
    } finally { delete section.dataset.busy; control.disabled = false; }
  }
  else if (action === 'new-bike') newBike();
  else if (action === 'bike-detail') bikeDetail(control.dataset.id);
  else if (action === 'rental-detail') rentalDetail(control.dataset.id);
  else if (action === 'client-detail') personDetail('clientes', control.dataset.id);
  else if (action === 'user-detail') personDetail('usuarios', control.dataset.id);
});

function logout(expired = false) {
  ++version; account = null; profile = null; availableModels = []; currentData = []; setToken(null); dirty = false;
  if (dialog.open) closeDialog();
  root.replaceChildren();
  location.hash = '#/entrar';
  committedHash = location.hash;
  authScreen();
  toast(expired ? 'Sua sessão terminou. Entre novamente para continuar.' : 'Você saiu da sua conta. Até a próxima pedalada!');
}

dialog.addEventListener('cancel', event => {
  if (dialog.querySelector('[data-busy]')) { event.preventDefault(); return; }
  if (dirty && dialog.querySelector('form')) { event.preventDefault(); dialog.querySelector('[data-action="close-dialog"]').click(); }
});
matchMedia('(max-width: 760px)').addEventListener('change', syncMenu);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.getElementById('navigation')?.classList.contains('open')) {
    document.getElementById('navigation').classList.remove('open');
    const toggle = document.querySelector('[data-action="menu"]');
    toggle.setAttribute('aria-expanded', 'false');
    syncMenu(); toggle.focus();
  }
});
window.addEventListener('session-expired', () => logout(true));
window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
window.addEventListener('hashchange', () => {
  if (location.hash === committedHash) { allowNavigation = false; return; }
  if (root.querySelector('[data-busy]') || dialog.querySelector('[data-busy]')) {
    history.replaceState(null, '', committedHash || '#/inicio');
    toast('Aguarde a confirmação da operação antes de sair.'); return;
  }
  if (dirty && !allowNavigation) {
    const next = location.hash;
    history.replaceState(null, '', committedHash || '#/inicio');
    confirmNavigation(next); return;
  }
  allowNavigation = false;
  route();
});

try { config = await api('/configuracao'); await route(); }
catch (error) {
  root.innerHTML = `<main id="main" class="startup-error"><a class="brand" href="./">${icon('bike')}bikes.</a><h1>Não conseguimos conectar à locadora.</h1><p>${e(error.message)}</p><a class="button primary" href="./">Tentar novamente</a></main>`;
}
