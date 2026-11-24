import { zonedInstant } from './ui.js';

export const DEMO_STORAGE_KEY = 'bikes.demo.v1';
const timezone = 'America/Sao_Paulo';
const rate = 10;
class DemoError extends Error {
  constructor(status, message, fields = {}) { super(message); this.status = status; this.fields = fields; }
}
const fail = (status, message, fields) => { throw new DemoError(status, message, fields); };
const invalid = (name, message) => fail(422, message, { [name]: message });
const digits = value => String(value ?? '').replace(/\D/g, '');
const publicUser = ({ id, username, role }) => ({ id, username, role });
const nextId = items => Math.max(0, ...items.map(x => x.id)) + 1;
export function validCpf(value) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const check = size => {
    const sum = [...value.slice(0, size)].reduce((n, digit, i) => n + Number(digit) * (size + 1 - i), 0);
    const remainder = (sum * 10) % 11;
    return (remainder === 10 ? 0 : remainder) === Number(value[size]);
  };
  return check(9) && check(10);
}
export function validCard(value) {
  if (!/^\d{13,19}$/.test(value)) return false;
  let sum = 0;
  [...value].reverse().forEach((digit, index) => {
    let n = Number(digit) * (index % 2 ? 2 : 1);
    if (n > 9) n -= 9;
    sum += n;
  });
  return sum % 10 === 0 && !/^(\d)\1+$/.test(value);
}
async function hash(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(`bikes-demo:${value}`));
  return [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
}

export function createDemoService({ storage, now = () => Date.now(), uuid = () => globalThis.crypto.randomUUID() } = {}) {
  let memory = null;
  let pending = Promise.resolve();
  const sessions = new Map();
  const local = (offsetMinutes = 0) => new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(new Date(now() + offsetMinutes * 60000)).replace(' ', 'T');
  const audit = username => ({ dataCriacao: local(), dataModificacao: local(), criadoPor: username, modificadoPor: username });
  const save = state => {
    try { storage?.setItem(DEMO_STORAGE_KEY, JSON.stringify(state)); }
    catch { fail(409, 'Não foi possível salvar a demonstração. Confira o espaço disponível no navegador.'); }
    memory = state;
  };
  async function seed() {
    const passwordHash = await hash('123456');
    const users = [
      { id: 100, username: 'admin@bikes.demo', role: 'ADMIN', passwordHash },
      { id: 101, username: 'cliente@bikes.demo', role: 'CLIENTE', passwordHash },
      { id: 102, username: 'rafael@bikes.demo', role: 'CLIENTE', passwordHash },
      { id: 103, username: 'beatriz@bikes.demo', role: 'CLIENTE', passwordHash }
    ];
    const clients = [
      { id: 1, nome: 'Lara Martins', cpf: '52998224725', usuarioId: 101 },
      { id: 2, nome: 'Rafael Costa', cpf: '11144477735', usuarioId: 102 },
      { id: 3, nome: 'Beatriz Lima', cpf: '12345678909', usuarioId: 103 }
    ].map(c => ({ ...c, email: users.find(u => u.id === c.usuarioId).username, telefone: null, ...audit('admin@bikes.demo') }));
    const models = ['Urbana aro 26', 'Urbana aro 29', 'Elétrica City', 'Mountain Bike aro 29', 'Urbana com cesta', 'Passeio aro 26', 'Mountain Bike aro 27', 'Elétrica Compacta'];
    const bikes = models.map((modelo, i) => ({ id: i + 1, codigo: `BIKE-${String(i + 1).padStart(3, '0')}`, modelo, status: i < 2 ? 'OCUPADA' : i === 7 ? 'MANUTENCAO' : 'LIVRE', ...audit('admin@bikes.demo') }));
    const rentals = Array.from({ length: 6 }, (_, i) => {
      const client = clients[i % 3];
      const minutes = (i + 1) * 35;
      return { id: i + 1, clienteId: client.id, nomeCliente: client.nome, codigoBicicleta: bikes[i % 7].codigo,
        dataRetirada: local(-1440 * (6 - i) - minutes), dataDevolucaoPrevista: local(-1440 * (6 - i) + 30), dataDevolucao: local(-1440 * (6 - i)),
        duracaoSegundos: minutes * 60, status: 'FINALIZADA', valorHora: rate, valor: Math.round(minutes / 60 * rate * 100) / 100, cartaoFinal: '1111' };
    });
    for (let i = 0; i < 2; i++) rentals.push({ id: i + 7, clienteId: clients[i].id, nomeCliente: clients[i].nome,
      codigoBicicleta: bikes[i].codigo, dataRetirada: local(i ? -45 : -90), dataDevolucaoPrevista: local(i ? 60 : 120),
      dataDevolucao: null, duracaoSegundos: null, status: 'ATIVA', valorHora: rate, valor: null, cartaoFinal: '1111' });
    const state = { version: 1, users, clients, bikes, rentals };
    save(state);
    return state;
  }
  async function read() {
    let raw;
    try { raw = storage?.getItem(DEMO_STORAGE_KEY); } catch { /* Usa memória quando o navegador bloqueia o armazenamento. */ }
    if (raw) {
      try {
        const state = JSON.parse(raw);
        if (state.version === 1 && ['users', 'clients', 'bikes', 'rentals'].every(k => Array.isArray(state[k]))) return state;
      } catch { /* Uma base de exemplo inválida é reconstruída. */ }
    }
    return memory ? structuredClone(memory) : seed();
  }
  const requireUser = (state, token) => {
    const session = sessions.get(token);
    const user = session && session.expires > now() && state.users.find(u => u.id === session.userId);
    if (!user) fail(401, 'Sua sessão terminou. Entre novamente.');
    return user;
  };
  const only = (user, role) => { if (user.role !== role) fail(403, 'Acesso não permitido para este perfil.'); };
  const find = (items, predicate, name) => items.find(predicate) || fail(404, `${name} não encontrado.`);
  async function handle(path, { method = 'GET', body = {}, token } = {}) {
    if (path === '/configuracao') return { valorHora: rate, timezone };
    if (path === '/demo/reset' && method === 'POST') { sessions.clear(); await seed(); return null; }
    const state = await read();
    if (path === '/demo/acesso' && method === 'POST') {
      if (!['CLIENTE', 'ADMIN'].includes(body.role)) invalid('role', 'Escolha um perfil da demonstração.');
      const userId = body.role === 'ADMIN' ? 100 : 101;
      find(state.users, u => u.id === userId, 'Conta de exemplo');
      const accessToken = `demo-${uuid()}`;
      sessions.set(accessToken, { userId, expires: now() + 3600000 });
      return { accessToken, tokenType: 'Bearer', expiresIn: 3600 };
    }
    if (path === '/auth/login' && method === 'POST') {
      const user = state.users.find(u => u.username.toLowerCase() === String(body.username).toLowerCase());
      if (!user || user.passwordHash !== await hash(body.password)) fail(401, 'E-mail ou senha incorretos.');
      const accessToken = `demo-${uuid()}`;
      sessions.set(accessToken, { userId: user.id, expires: now() + 3600000 });
      return { accessToken, tokenType: 'Bearer', expiresIn: 3600 };
    }
    if (path === '/usuarios' && method === 'POST') {
      const username = String(body.username || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username) || username.length > 100) invalid('username', 'Informe um e-mail válido.');
      if (typeof body.password !== 'string' || body.password.length !== 6) invalid('password', 'A senha precisa ter 6 caracteres.');
      if (state.users.some(u => u.username === username)) fail(409, 'Este e-mail já possui uma conta.');
      const user = { id: nextId(state.users), username, role: 'CLIENTE', passwordHash: await hash(body.password) };
      state.users.push(user); save(state); return publicUser(user);
    }
    const user = requireUser(state, token);
    if (path === '/auth/me') return publicUser(user);
    if (path === '/usuarios' && method === 'GET') { only(user, 'ADMIN'); return state.users.map(publicUser); }
    const userId = path.match(/^\/usuarios\/(\d+)$/)?.[1];
    if (userId) {
      if (user.role !== 'ADMIN' && user.id !== Number(userId)) fail(403, 'Consulte apenas sua própria conta.');
      const target = find(state.users, u => u.id === Number(userId), 'Usuário');
      if (method === 'GET') return publicUser(target);
      if (method === 'PATCH') {
        if (target.passwordHash !== await hash(body.senhaAtual)) invalid('senhaAtual', 'A senha atual está incorreta.');
        if (typeof body.novaSenha !== 'string' || body.novaSenha.length !== 6) invalid('novaSenha', 'A nova senha precisa ter 6 caracteres.');
        if (body.novaSenha !== body.confirmaSenha) invalid('confirmaSenha', 'A confirmação precisa ser igual à nova senha.');
        target.passwordHash = await hash(body.novaSenha); save(state); return null;
      }
    }
    if (path === '/clientes/me') return find(state.clients, c => c.usuarioId === user.id, 'Cadastro de cliente');
    if (path === '/clientes' && method === 'GET') { only(user, 'ADMIN'); return state.clients; }
    if (path === '/clientes' && method === 'POST') {
      only(user, 'CLIENTE');
      if (state.clients.some(c => c.usuarioId === user.id)) fail(409, 'Esta conta já possui cadastro de cliente.');
      if (typeof body.nome !== 'string' || body.nome.trim().length < 2 || body.nome.length > 100) invalid('nome', 'Informe seu nome completo, entre 2 e 100 caracteres.');
      if (!validCpf(body.cpf || '')) invalid('cpf', 'Informe um CPF válido com 11 números.');
      if (state.clients.some(c => c.cpf === body.cpf)) fail(409, 'Este CPF já está cadastrado.');
      if (body.telefone && !/^[0-9+() -]{8,20}$/.test(body.telefone)) invalid('telefone', 'Confira o formato do telefone.');
      if (body.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 100)) invalid('email', 'Informe um e-mail válido.');
      const client = { id: nextId(state.clients), nome: body.nome.trim(), cpf: body.cpf, usuarioId: user.id, telefone: body.telefone || null, email: body.email || null, ...audit(user.username) };
      state.clients.push(client); save(state); return client;
    }
    const clientId = path.match(/^\/clientes\/(\d+)$/)?.[1];
    if (clientId) { only(user, 'ADMIN'); return find(state.clients, c => c.id === Number(clientId), 'Cliente'); }
    if (path.startsWith('/bicicletas')) {
      only(user, 'ADMIN');
      if (path === '/bicicletas' && method === 'GET') return state.bikes;
      if (path === '/bicicletas' && method === 'POST') {
        const codigo = String(body.codigo || '').trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) invalid('codigo', 'Informe um código com 3 a 30 caracteres válidos.');
        if (typeof body.modelo !== 'string' || body.modelo.trim().length < 2 || body.modelo.length > 100) invalid('modelo', 'Informe um modelo com 2 a 100 caracteres.');
        if (state.bikes.some(b => b.codigo === codigo)) fail(409, 'Este código de bicicleta já está cadastrado.');
        const bike = { id: nextId(state.bikes), codigo, modelo: body.modelo.trim(), status: 'LIVRE', ...audit(user.username) };
        state.bikes.push(bike); save(state); return bike;
      }
      const match = path.match(/^\/bicicletas\/([^/]+)(\/status)?$/);
      if (match) {
        const bike = find(state.bikes, b => b.codigo === decodeURIComponent(match[1]), 'Bicicleta');
        if (method === 'GET' && !match[2]) return bike;
        if (method === 'PATCH' && match[2]) {
          if (bike.status === 'OCUPADA') fail(409, 'Esta bicicleta está em uso. Registre a devolução antes de mudar sua situação.');
          if (!['LIVRE', 'MANUTENCAO'].includes(body.status)) invalid('status', 'Escolha disponível ou manutenção.');
          Object.assign(bike, { status: body.status, dataModificacao: local(), modificadoPor: user.username }); save(state); return bike;
        }
      }
    }
    if (path === '/locacoes/me') { only(user, 'CLIENTE'); const client = state.clients.find(c => c.usuarioId === user.id); return state.rentals.filter(r => r.clienteId === client?.id); }
    if (path.startsWith('/relatorios/locacoes')) {
      only(user, 'ADMIN');
      const status = new URL(path, 'https://bikes.demo').searchParams.get('status');
      return state.rentals.filter(r => !status || r.status === status).map(r => ({ ...r, locacaoId: r.id }));
    }
    if (path === '/locacoes' && method === 'POST') {
      only(user, 'CLIENTE');
      const client = state.clients.find(c => c.usuarioId === user.id);
      if (!client) fail(409, 'Complete seu cadastro de cliente antes de alugar.');
      if (typeof body.dataDevolucaoPrevista !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(body.dataDevolucaoPrevista)) invalid('dataDevolucaoPrevista', 'Informe uma data de devolução válida.');
      const predicted = zonedInstant(body.dataDevolucaoPrevista, timezone);
      if (!Number.isFinite(predicted) || predicted <= now()) invalid('dataDevolucaoPrevista', 'Escolha uma previsão de devolução futura.');
      const card = body.cartao || {};
      if (typeof card.titular !== 'string' || card.titular.trim().length < 2 || card.titular.length > 100) invalid('cartao.titular', 'Informe o nome no cartão.');
      if (!validCard(card.numero || '')) invalid('cartao.numero', 'Informe um número de cartão válido.');
      if (!/^\d{3,4}$/.test(card.cvv || '')) invalid('cartao.cvv', 'Informe 3 ou 4 números.');
      const current = local();
      const month = Number(card.mesValidade), year = Number(card.anoValidade);
      if (!Number.isInteger(month) || month < 1 || month > 12) invalid('cartao.mesValidade', 'Informe um mês entre 1 e 12.');
      if (!Number.isInteger(year) || year < 2000 || year > 9999 || year * 100 + month < Number(current.slice(0, 4)) * 100 + Number(current.slice(5, 7))) invalid('cartao.anoValidade', 'Informe uma validade futura para o cartão.');
      const codigo = String(body.codigoBicicleta || '').trim().toUpperCase();
      if (codigo && !/^[A-Z0-9_-]{3,30}$/.test(codigo)) invalid('codigoBicicleta', 'Confira o código da bicicleta.');
      const bike = codigo ? find(state.bikes, b => b.codigo === codigo, 'Bicicleta') : state.bikes.find(b => b.status === 'LIVRE');
      if (!bike || bike.status !== 'LIVRE') fail(409, 'Nenhuma bicicleta disponível para esta solicitação. Escolha outra bicicleta.');
      const rental = { id: nextId(state.rentals), clienteId: client.id, nomeCliente: client.nome, codigoBicicleta: bike.codigo,
        dataRetirada: current, dataDevolucaoPrevista: body.dataDevolucaoPrevista, dataDevolucao: null, duracaoSegundos: null,
        status: 'ATIVA', valorHora: rate, valor: null, cartaoFinal: digits(card.numero).slice(-4) };
      bike.status = 'OCUPADA'; bike.dataModificacao = current; bike.modificadoPor = user.username;
      state.rentals.push(rental); save(state); return rental;
    }
    const rentalPath = path.match(/^\/locacoes\/(\d+)(\/devolucao)?$/);
    if (rentalPath) {
      const rental = find(state.rentals, r => r.id === Number(rentalPath[1]), 'Locação');
      if (user.role !== 'ADMIN' && !state.clients.some(c => c.id === rental.clienteId && c.usuarioId === user.id)) fail(403, 'Você pode consultar somente suas próprias locações.');
      if (!rentalPath[2] && method === 'GET') return rental;
      if (rentalPath[2] && method === 'POST') {
        if (rental.status !== 'ATIVA') fail(409, 'Esta bicicleta já foi devolvida.');
        if (typeof body.manutencao !== 'boolean') invalid('manutencao', 'Informe se a bicicleta precisa de manutenção.');
        const seconds = Math.max(0, Math.floor((now() - zonedInstant(rental.dataRetirada, timezone)) / 1000));
        Object.assign(rental, { status: 'FINALIZADA', dataDevolucao: local(), duracaoSegundos: seconds, valor: Math.round(Math.max(seconds, 60) / 3600 * rental.valorHora * 100) / 100 });
        const bike = find(state.bikes, b => b.codigo === rental.codigoBicicleta, 'Bicicleta');
        Object.assign(bike, { status: body.manutencao ? 'MANUTENCAO' : 'LIVRE', dataModificacao: local(), modificadoPor: user.username });
        save(state); return rental;
      }
    }
    fail(404, 'Esta operação não faz parte da demonstração.');
  }
  return (path, options) => {
    const result = pending.then(() => handle(path, options)).then(value => structuredClone(value));
    pending = result.catch(() => {});
    return result;
  };
}

let service;
export function demoApi(path, options) {
  if (!service) {
    let storage;
    try { storage = globalThis.localStorage; } catch { /* Modo privado pode bloquear o acesso. */ }
    service = createDemoService({ storage });
  }
  return service(path, options);
}
