import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoService, DEMO_STORAGE_KEY, validCpf, validCard } from '../src/main/resources/static/assets/demo.js';

function fixture() {
  let time = Date.parse('2030-01-01T15:00:00Z');
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const call = createDemoService({ storage, now: () => time });
  return { call, storage, advance: seconds => { time += seconds * 1000; } };
}
const login = async (call, username = 'cliente@bikes.demo', password = '123456') => (await call('/auth/login', { method: 'POST', body: { username, password } })).accessToken;
const rental = codigoBicicleta => ({ codigoBicicleta, dataDevolucaoPrevista: '2030-01-01T18:00:00', cartao: { titular: 'Cliente de Exemplo', numero: '4111111111111111', cvv: '123', mesValidade: 12, anoValidade: 2031 } });

test('exemplos abrem por perfil e mantêm consultas próprias', async () => {
  const { call, advance } = fixture();
  const token = await login(call);
  assert.equal((await call('/auth/me', { token })).role, 'CLIENTE');
  const client = await call('/clientes/me', { token });
  const own = await call('/locacoes/me', { token });
  assert.ok(own.every(r => r.clienteId === client.id));
  await assert.rejects(call('/usuarios', { token }), { status: 403 });
  await assert.rejects(call('/locacoes/8', { token }), { status: 403 });
  const admin = await login(call, 'admin@bikes.demo');
  assert.equal((await call('/bicicletas', { token: admin })).length, 8);
  assert.equal((await call('/relatorios/locacoes', { token: admin })).length, 8);
  advance(3601);
  await assert.rejects(call('/auth/me', { token }), { status: 401 });
});

test('cadastro valida CPF, vínculo único e e-mail duplicado', async () => {
  const { call } = fixture();
  const user = { username: 'novo@example.test', password: '123456', role: 'ADMIN' };
  assert.equal((await call('/usuarios', { method: 'POST', body: user })).role, 'CLIENTE');
  await assert.rejects(call('/usuarios', { method: 'POST', body: user }), { status: 409 });
  const token = await login(call, user.username);
  await assert.rejects(call('/clientes', { method: 'POST', token, body: { nome: 'Novo Cliente', cpf: '11111111111' } }), { status: 422 });
  await assert.rejects(call('/clientes', { method: 'POST', token, body: { nome: 'Novo Cliente', cpf: '52998224725' } }), { status: 409 });
  const profile = await call('/clientes', { method: 'POST', token, body: { nome: 'Novo Cliente', cpf: '39053344705' } });
  assert.equal(profile.usuarioId, (await call('/auth/me', { token })).id);
  assert.equal(profile.criadoPor, user.username);
  await assert.rejects(call('/clientes', { method: 'POST', token, body: profile }), { status: 409 });
});

test('locação, devolução, tarifa mínima e manutenção compartilham a mesma base', async () => {
  const { call, advance, storage } = fixture();
  const token = await login(call);
  const admin = await login(call, 'admin@bikes.demo');
  const results = await Promise.allSettled([0, 1].map(() => call('/locacoes', { method: 'POST', token, body: rental('BIKE-003') })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  const item = results.find(r => r.status === 'fulfilled').value;
  advance(12);
  const returned = await call(`/locacoes/${item.id}/devolucao`, { method: 'POST', token, body: { manutencao: true } });
  assert.equal(returned.valor, 0.17);
  assert.equal(returned.duracaoSegundos, 12);
  assert.equal((await call('/bicicletas/BIKE-003', { token: admin })).status, 'MANUTENCAO');
  await call('/bicicletas/BIKE-003/status', { method: 'PATCH', token: admin, body: { status: 'LIVRE' } });
  assert.equal((await call('/bicicletas/BIKE-003', { token: admin })).status, 'LIVRE');
  await assert.rejects(call(`/locacoes/${item.id}/devolucao`, { method: 'POST', token, body: { manutencao: false } }), { status: 409 });
  assert.ok(!storage.getItem(DEMO_STORAGE_KEY).includes('4111111111111111'));
  assert.ok(!storage.getItem(DEMO_STORAGE_KEY).includes('"cvv"'));
});

test('cartão e previsão inválidos não ocupam uma bicicleta', async () => {
  const { call } = fixture();
  const token = await login(call), admin = await login(call, 'admin@bikes.demo');
  const body = rental('BIKE-004');
  body.cartao.numero = '4111111111111112';
  await assert.rejects(call('/locacoes', { method: 'POST', token, body }), { status: 422 });
  body.cartao.numero = '4111111111111111'; body.dataDevolucaoPrevista = '2029-01-01T12:00:00';
  await assert.rejects(call('/locacoes', { method: 'POST', token, body }), { status: 422 });
  assert.equal((await call('/bicicletas/BIKE-004', { token: admin })).status, 'LIVRE');
  assert.ok(validCpf('52998224725'));
  assert.ok(!validCpf('52998224724'));
  assert.ok(validCard('4111111111111111'));
  assert.ok(!validCard('0000000000000000'));
});

test('senha alterada persiste sem gravar credenciais em texto puro', async () => {
  const { call, storage } = fixture();
  const token = await login(call);
  await assert.rejects(call('/usuarios/101', { method: 'PATCH', token, body: { senhaAtual: '000000', novaSenha: '654321', confirmaSenha: '654321' } }), { status: 422 });
  await call('/usuarios/101', { method: 'PATCH', token, body: { senhaAtual: '123456', novaSenha: '654321', confirmaSenha: '654321' } });
  const reloaded = createDemoService({ storage });
  await assert.rejects(login(reloaded), { status: 401 });
  await assert.rejects(reloaded('/auth/me', { token }), { status: 401 });
  assert.ok(await login(reloaded, 'cliente@bikes.demo', '654321'));
  const users = JSON.parse(storage.getItem(DEMO_STORAGE_KEY)).users;
  assert.ok(users.every(u => !('password' in u) && u.passwordHash.length === 64));
  await reloaded('/demo/reset', { method: 'POST' });
  assert.ok(await login(reloaded));
});
