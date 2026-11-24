import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { startDemoServer } from './static-server.mjs';

const output = resolve('target/demo-e2e');
await mkdir(output, { recursive: true });
const { server, url } = await startDemoServer();
const browser = await chromium.launch({ headless: true });
const checks = [];
const errors = [];
let page;
const check = (name, value = true) => { assert.ok(value, name); checks.push(name); console.log(`OK ${name}`); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'Asia/Tokyo' });
  context.setDefaultTimeout(15000);
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on('request', request => { if (request.url().includes('/api/v1')) errors.push(`Dependência de servidor: ${request.url()}`); });
  const heading = text => page.getByRole('heading', { name: text, exact: true });
  async function navigate(path, title) { await page.goto(`${url}#/${path}`); await heading(title).waitFor(); }
  async function enter(role) {
    await page.getByRole('button', { name: `Entrar como ${role}`, exact: true }).click();
    await heading('Visão geral').waitFor();
  }
  async function logout() { await page.getByRole('button', { name: 'Sair da conta', exact: true }).click(); await heading('Bom ter você por aqui.').waitFor(); }
  await page.goto(url);
  await page.getByRole('button', { name: 'Entrar como cliente', exact: true }).waitFor();
  await page.screenshot({ path: join(output, 'demo-login-desktop.png'), fullPage: true });
  check('Demonstração abre no subdiretório do repositório sem Java ou MySQL');
  await enter('cliente');
  check('Cliente vê seus próprios dados e locações', await page.getByText('Seu próximo caminho começa aqui, Lara.', { exact: true }).isVisible());
  await navigate('nova-locacao', 'Alugar bicicleta');
  await page.locator('#modeloBicicleta').selectOption('Elétrica City');
  await page.locator('#codigoBicicleta').fill('BIKE-004');
  check('Informar código substitui o modelo selecionado', await page.locator('#modeloBicicleta').inputValue() === '');
  await page.locator('#modeloBicicleta').selectOption('Elétrica City');
  check('Cliente escolhe entre modelos e a escolha limpa o código manual', await page.locator('#codigoBicicleta').inputValue() === '' && await page.locator('#modeloBicicleta option').count() > 2);
  await page.screenshot({ path: join(output, 'escolha-modelo-desktop.png'), fullPage: true });
  await page.locator('[name="cartao.titular"]').fill('Cliente de Exemplo');
  await page.locator('[name="cartao.numero"]').fill('4111111111111111');
  await page.locator('[name="cartao.mesValidade"]').fill('12');
  await page.locator('[name="cartao.anoValidade"]').fill(String(new Date().getFullYear() + 2));
  await page.locator('[name="cartao.cvv"]').fill('123');
  await page.evaluate(async () => {
    const { demoApi } = await import(new URL('./assets/demo.js', document.baseURI));
    const session = await demoApi('/demo/acesso', { method: 'POST', body: { role: 'ADMIN' } });
    await demoApi('/bicicletas', { method: 'POST', token: session.accessToken, body: { codigo: 'REFRESH-001', modelo: 'Modelo temporário' } });
  });
  await page.getByRole('button', { name: 'Atualizar modelos', exact: true }).click();
  await page.locator('#modeloBicicleta option[value="Modelo temporário"]').waitFor({ state: 'attached' });
  await page.locator('#modeloBicicleta').selectOption('Modelo temporário');
  await page.evaluate(async () => {
    const { demoApi } = await import(new URL('./assets/demo.js', document.baseURI));
    const session = await demoApi('/demo/acesso', { method: 'POST', body: { role: 'ADMIN' } });
    await demoApi('/bicicletas/REFRESH-001', { method: 'DELETE', token: session.accessToken });
  });
  await page.getByRole('button', { name: 'Atualizar modelos', exact: true }).click();
  await page.locator('#modeloBicicleta option').filter({ hasText: 'Modelo temporário · indisponível' }).waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'Confirmar locação', exact: true }).click();
  await page.locator('#modeloBicicleta[aria-invalid="true"]').waitFor();
  check('Atualizar preserva o cartão e não troca um modelo indisponível por outro automaticamente',
    await page.locator('#modeloBicicleta').inputValue() === 'Modelo temporário'
    && await page.locator('[name="cartao.numero"]').inputValue() === '4111111111111111');
  await page.locator('#modeloBicicleta').selectOption('Elétrica City');
  await page.getByRole('button', { name: 'Confirmar locação', exact: true }).click();
  await page.locator('dialog').getByRole('heading', { name: 'Locação #9', exact: true }).waitFor();
  await page.locator('dialog').getByText('Elétrica City', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Continuar usando', exact: true }).click();
  check('Locação atualiza o histórico e a disponibilidade');
  const row = page.getByRole('row').filter({ has: page.getByText('#9', { exact: true }) });
  await row.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await page.locator('[name="manutencao"]').check();
  await page.getByRole('button', { name: 'Confirmar devolução', exact: true }).click();
  await page.locator('.receipt-total').waitFor();
  await page.getByRole('button', { name: 'Fechar comprovante', exact: true }).click();
  check('Devolução calcula valor e envia a bicicleta para manutenção');
  await navigate('inicio', 'Visão geral');
  await page.screenshot({ path: join(output, 'demo-cliente-desktop.png'), fullPage: true });
  await logout(); await enter('administrador');
  await navigate('frota', 'Bicicletas');
  const bike = page.getByRole('row').filter({ has: page.getByText('BIKE-003', { exact: true }) });
  await bike.getByText('Manutenção', { exact: true }).waitFor();
  await bike.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await page.locator('#status').selectOption('LIVRE');
  await page.getByRole('button', { name: 'Salvar situação', exact: true }).click();
  await bike.getByText('Disponível', { exact: true }).waitFor();
  check('Administrador consulta e altera a mesma bicicleta do cliente');
  await bike.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await page.locator('#status').selectOption('MANUTENCAO');
  await page.getByRole('button', { name: 'Excluir bicicleta', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar exclusão', exact: true }).click();
  check('Cancelar exclusão preserva as alterações do formulário', await page.locator('#status').inputValue() === 'MANUTENCAO');
  await page.getByRole('button', { name: 'Excluir bicicleta', exact: true }).click();
  await page.screenshot({ path: join(output, 'excluir-bicicleta-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
  check('Confirmação de exclusão cabe no celular', await page.locator('dialog').evaluate(el => el.scrollWidth <= el.clientWidth));
  await page.screenshot({ path: join(output, 'excluir-bicicleta-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Confirmar exclusão', exact: true }).click();
  await page.locator('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('cell', { name: 'BIKE-004', exact: true }).waitFor();
  check('Administrador exclui bicicleta da frota', await page.getByText('BIKE-003', { exact: true }).count() === 0);
  await page.getByRole('row').filter({ has: page.getByText('BIKE-001', { exact: true }) }).getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  check('Bicicleta em uso não pode ser excluída', await page.getByRole('button', { name: 'Excluir bicicleta', exact: true }).isDisabled());
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Cadastrar bicicleta', exact: true }).first().click();
  await page.locator('#codigo').fill('DEMO-009'); await page.locator('#modelo').fill('Urbana de apresentação');
  await page.locator('dialog').getByRole('button', { name: 'Cadastrar bicicleta', exact: true }).click();
  await page.getByText('DEMO-009', { exact: true }).waitFor();
  await page.reload(); await heading('Bom ter você por aqui.').waitFor(); await enter('administrador');
  await navigate('frota', 'Bicicletas');
  await page.getByText('DEMO-009', { exact: true }).waitFor();
  check('Cadastros persistem depois de recarregar, com nova sessão');
  await navigate('clientes', 'Clientes');
  await page.getByRole('button', { name: 'Ver dados', exact: true }).first().click();
  await page.locator('dialog').getByText('529.982.247-25', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await navigate('usuarios', 'Usuários');
  await page.getByRole('row').filter({ has: page.getByText('admin@bikes.demo', { exact: true }) }).getByRole('button', { name: 'Ver conta', exact: true }).click();
  await page.keyboard.press('Escape');
  check('Consultas de clientes e usuários abrem os detalhes');
  await navigate('relatorios', 'Locações e relatórios');
  check('Exclusão preserva a bicicleta no histórico de locações', await page.getByText('BIKE-003', { exact: true }).count() > 0);
  for (const name of ['Cliente', 'Bicicleta', 'Retirada', 'Devolução efetiva', 'Duração', 'Status']) {
    await page.getByRole('columnheader', { name, exact: true }).waitFor();
  }
  const returnedRow = page.getByRole('row').filter({ has: page.getByText('#9', { exact: true }) });
  check('Relatório mostra cliente, devolução e duração sem abrir detalhes',
    await returnedRow.locator('td').nth(1).innerText() === 'Lara Martins'
    && /\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/.test(await returnedRow.locator('td').nth(4).innerText())
    && /^\d+h \d+min \d+s$/.test(await returnedRow.locator('td').nth(5).innerText()));
  const activeRow = page.getByRole('row').filter({ has: page.getByText('#7', { exact: true }) });
  check('Locação ativa apresenta devolução pendente e tempo decorrido',
    await activeRow.locator('td').nth(4).innerText() === 'Pendente'
    && /^1h 3\dmin \d+s$/.test(await activeRow.locator('td').nth(5).innerText()));
  await page.getByRole('button', { name: 'Atualizar relatório', exact: true }).click();
  await page.getByRole('columnheader', { name: 'Devolução efetiva', exact: true }).waitFor();
  await page.screenshot({ path: join(output, 'relatorio-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
  const reportRegion = page.getByRole('region', { name: 'Relatório de locações', exact: true });
  await reportRegion.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  check('Colunas do relatório podem ser consultadas no celular',
    await reportRegion.evaluate(el => el.scrollLeft > 0)
    && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const returnColumn = await page.getByRole('columnheader', { name: 'Devolução efetiva', exact: true }).evaluate(el => el.offsetLeft);
  await reportRegion.evaluate((el, offset) => { el.scrollLeft = offset; }, returnColumn);
  await page.screenshot({ path: join(output, 'relatorio-mobile.png'), fullPage: true });
  await reportRegion.evaluate(el => { el.scrollLeft = 0; });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('select[name="status"]').selectOption('FINALIZADA');
  await page.getByRole('cell', { name: 'Em andamento', exact: true }).first().waitFor({ state: 'hidden' });
  check('Relatório integra a devolução e filtra o status', await page.locator('tbody tr').count() === 7);
  await navigate('conta', 'Minha conta');
  await page.locator('#senhaAtual').fill('123456'); await page.locator('#novaSenha').fill('654321'); await page.locator('#confirmaSenha').fill('654321');
  await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Senha alterada' }).waitFor();
  await logout();
  await page.locator('#username').fill('admin@bikes.demo'); await page.locator('#password').fill('654321');
  await page.getByRole('button', { name: 'Entrar na conta', exact: true }).click(); await heading('Visão geral').waitFor();
  check('Senha alterada funciona no login manual');
  await page.screenshot({ path: join(output, 'demo-admin-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(250);
  await page.screenshot({ path: join(output, 'demo-admin-mobile.png'), fullPage: true });
  check('Layout móvel sem rolagem horizontal da página', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click(); await heading('Minha conta').waitFor();
  await page.getByRole('button', { name: 'Restaurar exemplos da demonstração', exact: true }).click();
  await page.getByRole('button', { name: 'Restaurar demonstração', exact: true }).click();
  await heading('Bom ter você por aqui.').waitFor();
  await enter('administrador');
  await navigate('frota', 'Bicicletas');
  check('Restaurar exemplos remove os cadastros de teste', await page.getByText('DEMO-009', { exact: true }).count() === 0);
  await logout();
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click(); await heading('Vamos começar?').waitFor();
  await page.locator('#username').fill('visitante@example.test'); await page.locator('#password').fill('123456'); await page.locator('#confirmacao').fill('123456');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click(); await heading('Meus dados').waitFor();
  await page.locator('#nome').fill('Visitante da apresentação'); await page.locator('#cpf').fill('39053344705');
  await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click(); await heading('Alugar bicicleta').waitFor();
  check('Cadastro e perfil novos funcionam também no celular');
  await page.screenshot({ path: join(output, 'demo-cadastro-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click(); await heading('Bom ter você por aqui.').waitFor();
  await page.screenshot({ path: join(output, 'demo-login-mobile.png'), fullPage: true });
  check('Sem requisições de API, recursos ausentes ou erros de JavaScript', errors.length === 0);
  await writeFile(join(output, 'results.json'), JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
  if (page) await writeFile(join(output, 'failure.txt'), await page.locator('body').innerText());
  throw error;
} finally { await browser.close(); await new Promise(done => server.close(done)); }
