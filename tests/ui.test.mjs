import test from 'node:test';
import assert from 'node:assert/strict';
import { escape, money, cpf, date, duration, zonedInstant, localNow, badge } from '../src/main/resources/static/assets/ui.js';

test('dados de cadastro não podem inserir HTML na interface', () => {
  assert.equal(escape('<img src=x onerror="x">&\''), '&lt;img src=x onerror=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(escape(null), '');
  assert.ok(!badge('<script>').includes('<script>'));
});

test('valores e CPF usam os formatos brasileiros', () => {
  assert.equal(money(12.5).replaceAll('\u00a0', ' '), 'R$ 12,50');
  assert.equal(cpf('52998224725'), '529.982.247-25');
  assert.equal(duration(3665), '1h 1min');
  assert.equal(duration(null), 'Em andamento');
  assert.equal(duration(0, true), '0h 0min 0s');
  assert.equal(duration(59, true), '0h 0min 59s');
  assert.equal(duration(3665, true), '1h 1min 5s');
});

test('datas locais do servidor não são reinterpretadas pelo fuso do navegador', () => {
  assert.equal(date('2030-12-01T18:15:00'), '01/12/2030 às 18:15');
  assert.equal(date(null), '—');
  assert.equal(zonedInstant('2030-12-01T18:15', 'America/Sao_Paulo'), Date.parse('2030-12-01T21:15:00Z'));
  assert.equal(zonedInstant('2030-12-01T18:15', 'Asia/Tokyo'), Date.parse('2030-12-01T09:15:00Z'));
  assert.match(localNow('America/Sao_Paulo'), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});
