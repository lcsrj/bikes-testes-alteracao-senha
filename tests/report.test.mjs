import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectReportData, reportDate, reportDuration } from '../src/main/resources/static/assets/report-data.js';

test('Relatório consulta todas as categorias e detalhes, limita concorrência e omite credenciais', async () => {
  let active = 0, maximum = 0;
  const calls = [];
  const data = await collectReportData(async path => {
    calls.push(path);
    if (path === '/relatorios/locacoes') return Array.from({ length: 31 }, (_, i) => ({ locacaoId: i + 1 }));
    if (path === '/clientes') return [{ id: 2, nome: 'João', cpf: '12345678909', telefone: '49999999999', email: 'joao@example.com', usuarioId: 4, criadoPor: 'admin', password: 'secret' }];
    if (path === '/bicicletas') return [{ id: 3, codigo: 'BIKE-3', modelo: 'Elétrica', status: 'LIVRE' }];
    if (path === '/usuarios') return [{ id: 4, username: 'joao@example.com', role: 'CLIENTE', password: 'secret', passwordHash: 'hash' }];
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    const id = Number(path.split('/').at(-1));
    return { id, cartaoFinal: id === 1 ? '4111111111111111' : '1111', cvv: '123', cartao: { numero: '4111111111111111' }, valorHora: 10 };
  });
  assert.equal(data.rentals.length, 31);
  assert.equal(data.rentals.at(-1).id, 31);
  assert.equal(data.rentals[0].cartaoFinal, null);
  assert.equal(data.rentals[1].cartaoFinal, '1111');
  assert.equal(data.clients[0].email, 'joao@example.com');
  assert.equal(data.clients[0].criadoPor, 'admin');
  assert.equal(maximum, 3);
  assert.equal(calls.length, 35);
  assert.doesNotMatch(JSON.stringify(data), /secret|password|hash|4111111111111111|cvv/);
});

test('Uma categoria ou detalhe indisponível impede exportação parcial', async () => {
  for (const failed of ['/clientes', '/locacoes/1']) {
    await assert.rejects(collectReportData(async path => {
      if (path === failed) throw new Error('Sem acesso');
      if (path === '/relatorios/locacoes') return [{ locacaoId: 1 }];
      return [];
    }), /Sem acesso/);
  }
});

test('Base vazia é válida e datas locais não dependem do fuso do computador', async () => {
  const data = await collectReportData(async () => []);
  assert.deepEqual(data, { rentals: [], clients: [], bikes: [], users: [] });
  assert.equal(reportDate('2026-11-24T23:05:09'), '24/11/2026\n23:05:09');
  assert.equal(reportDate(null, 'Pendente'), 'Pendente');
  assert.equal(reportDuration(90061), '25h 01min 01s');
});
