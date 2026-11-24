import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { createServer } from 'node:net';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';

// O teste inicia sua própria aplicação com H2 descartável, sem acessar o MySQL.
const output = resolve('target/ui-e2e');
await mkdir(output, { recursive: true });
const seed = join(output, 'usuarios.sql');
await writeFile(seed, await readFile('src/test/resources/sql/usuarios/usuarios-insert.sql'));
const reservation = createServer();
await new Promise(done => reservation.listen(0, '127.0.0.1', done));
const port = reservation.address().port;
await new Promise(done => reservation.close(done));
const base = `http://127.0.0.1:${port}`;
const java = process.env.JAVA_HOME ? join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'java.exe' : 'java') : 'java';
const server = spawn(java, ['-jar', 'target/bikes-0.0.1-SNAPSHOT.jar', `--server.port=${port}`,
  '--spring.datasource.url=jdbc:h2:mem:bikes-ui;DB_CLOSE_DELAY=-1', '--spring.datasource.driver-class-name=org.h2.Driver',
  '--spring.datasource.username=sa', '--spring.datasource.password=', '--spring.jpa.hibernate.ddl-auto=create-drop',
  '--spring.jpa.show-sql=false', '--spring.sql.init.mode=always', '--spring.jpa.defer-datasource-initialization=true',
  `--spring.sql.init.data-locations=${pathToFileURL(seed)}`], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const log = createWriteStream(join(output, 'server.log'));
server.stdout.pipe(log); server.stderr.pipe(log);
let browser;
const checks = [];
const check = (name, condition = true) => { assert.ok(condition, name); checks.push(name); console.log(`OK ${name}`); };
async function waitForServer() {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (server.exitCode != null) throw new Error(`Servidor encerrou: veja ${output}/server.log`);
    try { if ((await fetch(`${base}/api/v1/configuracao`)).ok) return; } catch { /* Aguarda a inicialização. */ }
    await new Promise(done => setTimeout(done, 500));
  }
  throw new Error('Tempo de inicialização excedido.');
}
try {
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'Asia/Tokyo' });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const heading = text => page.getByRole('heading', { name: text, exact: true });
  async function navigate(path, text) {
    await page.goto(`${base}/#/${path}`);
    // goto do mesmo documento mantém a sessão porque muda somente o hash.
    await heading(text).waitFor();
  }
  async function login(username, password = '123456') {
    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Entrar na conta', exact: true }).click();
    await heading('Visão geral').waitFor();
  }
  async function logout() {
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await heading('Bom ter você por aqui.').waitFor();
  }
  await page.goto(base);
  await page.getByRole('button', { name: 'Entrar na conta', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Entrar na conta', exact: true }).click();
  await page.locator('#username[aria-invalid="true"]').waitFor();
  check('Validação local com foco no primeiro campo', await page.locator('#username').evaluate(el => el === document.activeElement));
  await page.screenshot({ path: join(output, 'login-desktop.png'), fullPage: true });
  await login('jose@gmail.com');
  await navigate('frota', 'Bicicletas');
  await page.getByRole('button', { name: 'Cadastrar bicicleta', exact: true }).first().click();
  await page.locator('#codigo').fill('BIKE-001');
  await page.locator('#modelo').fill('Urbana aro 26');
  await page.locator('dialog').getByRole('button', { name: 'Cadastrar bicicleta', exact: true }).click();
  await page.locator('table').getByText('BIKE-001', { exact: true }).waitFor();
  check('Administrador cadastra bicicleta pela interface');
  // Retorno 409 preserva os dados no mesmo diálogo.
  await page.getByRole('button', { name: 'Cadastrar bicicleta', exact: true }).first().click();
  await page.locator('#codigo').fill('BIKE-001'); await page.locator('#modelo').fill('Modelo repetido');
  await page.locator('dialog').getByRole('button', { name: 'Cadastrar bicicleta', exact: true }).click();
  await page.locator('dialog .form-error:not([hidden])').waitFor();
  check('Conflito 409 preserva formulário', await page.locator('#modelo').inputValue() === 'Modelo repetido');
  await page.locator('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click();
  await logout();
  await page.getByRole('link', { name: 'Criar conta', exact: true }).click();
  await heading('Vamos começar?').waitFor();
  const email = 'pedalante@example.test';
  await page.locator('#username').fill(email); await page.locator('#password').fill('123456');
  await page.locator('#confirmacao').fill('123456');
  await page.getByRole('button', { name: 'Criar minha conta', exact: true }).click();
  await heading('Meus dados').waitFor();
  await page.locator('#nome').fill('Ana Pedalante'); await page.locator('#cpf').fill('52998224725');
  await page.getByRole('button', { name: 'Concluir cadastro', exact: true }).click();
  await heading('Alugar bicicleta').waitFor();
  check('Cadastro de conta e cliente com telefone opcional vazio');
  await page.screenshot({path:join(output, 'locacao-formulario.png'),fullPage:true});
  check('Menu do cliente não oferece acesso administrativo', await page.getByRole('link', { name: 'Usuários', exact: true }).count() === 0);
  await page.locator('[name="cartao.titular"]').fill('Ana Pedalante');
  await page.locator('[name="cartao.numero"]').fill('4111111111111111');
  await page.locator('[name="cartao.mesValidade"]').fill('12');
  await page.locator('[name="cartao.anoValidade"]').fill(String(new Date().getFullYear() + 2));
  await page.locator('[name="cartao.cvv"]').fill('123');
  await page.getByRole('button', { name: 'Confirmar locação', exact: true }).click();
  await page.locator('dialog').getByRole('heading', { name: 'Locação #1', exact: true }).waitFor();
  check('Locação automática real com navegador em outro fuso');
  await page.locator('dialog').getByRole('button', { name: 'Continuar usando', exact: true }).click();
  await navigate('inicio', 'Visão geral');
  await page.screenshot({ path: join(output, 'cliente-desktop.png'), fullPage: true });
  await navigate('locacoes', 'Minhas locações');
  await page.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await page.locator('[name="manutencao"]').check();
  await page.getByRole('button', { name: 'Confirmar devolução', exact: true }).click();
  await page.locator('.receipt-total').waitFor();
  await page.screenshot({path:join(output, 'devolucao-comprovante.png'),fullPage:true});
  check('Devolução encaminha bicicleta para manutenção e exibe comprovante');
  await page.getByRole('button', { name: 'Fechar comprovante', exact: true }).click();
  await navigate('perfil', 'Meus dados');
  check('Cliente consulta CPF associado à própria conta', await page.locator('dd').filter({ hasText: '529.982.247-25' }).count() === 1);
  await navigate('conta', 'Minha conta');
  await page.locator('#senhaAtual').fill('123456'); await page.locator('#novaSenha').fill('654321');
  await page.locator('#confirmaSenha').fill('654321');
  await page.getByRole('button', { name: 'Salvar nova senha', exact: true }).click();
  await page.getByRole('status').filter({ hasText: 'Senha alterada' }).waitFor();
  await logout();
  await page.locator('#username').fill(email);
  await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
  check('Evento de navegação atrasado não interrompe o próximo login', await page.locator('dialog').evaluate(el => !el.open));
  await login(email, '654321');
  check('Senha alterada autentica no próximo acesso');
  await page.reload(); await heading('Bom ter você por aqui.').waitFor();
  check('Recarregar exige login e não persiste token', await page.evaluate(() => localStorage.length === 0 && sessionStorage.length === 0));
  await login('jose@gmail.com');
  await navigate('frota', 'Bicicletas');
  await page.getByRole('button', { name: 'Ver detalhes', exact: true }).click();
  await page.locator('dialog #status').selectOption('LIVRE');
  await page.getByRole('button', { name: 'Salvar situação', exact: true }).click();
  await page.locator('table .livre').waitFor();
  check('Administrador libera bicicleta da manutenção');
  await navigate('clientes', 'Clientes');
  await page.locator('#search').fill('sem-resultado'); await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await heading('Nenhum resultado encontrado').waitFor();
  await page.getByRole('button', { name: 'Limpar filtros', exact: true }).click();
  await page.getByText('Ana Pedalante', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Ver dados', exact: true }).click();
  await page.locator('dialog').getByText('529.982.247-25', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  check('Busca, lista vazia e consulta administrativa de cliente');
  await navigate('usuarios', 'Usuários');
  await page.getByRole('row').filter({ has: page.getByText('jose@gmail.com', { exact: true }) }).getByRole('button', { name: 'Ver conta', exact: true }).click();
  await page.locator('dialog').getByRole('heading', { name: 'Conta #100' }).waitFor();
  await page.keyboard.press('Escape');
  check('Diálogo abre pelo acionador e fecha por Escape');
  await navigate('relatorios', 'Locações e relatórios');
  await page.locator('select[name="status"]').selectOption('FINALIZADA');
  await page.locator('table').getByText('Finalizada', { exact: true }).waitFor();
  await page.locator('#page-size').selectOption('20');
  await page.waitForURL('**size=20*');
  check('Relatório filtra status e preserva tamanho de página na URL');
  await page.route('**/api/v1/clientes', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Indisponível para teste.' }) }));
  await page.getByRole('button', { name: 'Baixar PDF completo', exact: true }).click();
  await page.locator('#toast').filter({ hasText: 'Não foi possível gerar o PDF.' }).waitFor();
  await page.unroute('**/api/v1/clientes');
  const pdfDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar PDF completo', exact: true }).click();
  await (await pdfDownload).saveAs(join(output, 'relatorio-api.pdf'));
  check('Administrador exporta PDF com dados da API e recupera falha de consulta');
  await navigate('inicio', 'Visão geral');
  await page.screenshot({ path: join(output, 'admin-desktop.png'), fullPage: true });
  // Falhas de consulta, 403 e sessão expirada ficam restritas ao transporte neste teste.
  await page.route('**/api/v1/clientes', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Indisponível para teste.' }) }));
  await navigate('clientes', 'Não foi possível carregar');
  await page.unroute('**/api/v1/clientes');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await heading('Clientes').waitFor();
  check('Falha de consulta permite recuperar sem recarregar a sessão');
  await page.setViewportSize({ width: 390, height: 844 });
  await navigate('inicio', 'Visão geral');
  await page.waitForTimeout(250);
  await writeFile(join(output, 'mobile-geometry.json'), JSON.stringify(await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).map(el => ({tag:el.tagName,cls:el.className,right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width}))})), null, 2));
  await page.screenshot({ path: join(output, 'admin-mobile.png'), fullPage: true });
  check('Celular sem rolagem horizontal da página', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await page.getByRole('link', { name: 'Bicicletas', exact: true }).click();
  await heading('Bicicletas').waitFor();
  await page.waitForTimeout(250);
  await page.screenshot({ path: join(output, 'frota-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Cadastrar bicicleta', exact: true }).first().click();
  await page.locator('#codigo').fill('BIKE-002'); await page.locator('#modelo').fill('Modelo rascunho');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Descartar e fechar', exact: true }).click();
  check('Formulário alterado pede confirmação de descarte no celular');
  await page.route('**/api/v1/usuarios', route => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Acesso não permitido' }) }));
  await navigate('usuarios', 'Acesso não permitido');
  await page.unroute('**/api/v1/usuarios');
  check('Recusa 403 tem mensagem específica');
  await page.route('**/api/v1/relatorios/locacoes', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Sessão encerrada' }) }));
  await page.goto(`${base}/#/relatorios`);
  await heading('Bom ter você por aqui.').waitFor();
  check('Sessão expirada limpa painel e exige novo login');
  await page.screenshot({ path: join(output, 'login-mobile.png'), fullPage: true });
  check('JavaScript sem exceções durante os fluxos', errors.length === 0);
  await writeFile(join(output, 'results.json'), JSON.stringify({ checks, errors, screenshots: ['login-desktop.png', 'cliente-desktop.png', 'admin-desktop.png', 'admin-mobile.png', 'frota-mobile.png', 'login-mobile.png', 'locacao-formulario.png', 'devolucao-comprovante.png'] }, null, 2));
} finally {
  await browser?.close();
  if (server.exitCode == null) {
    const closed = once(server, 'close');
    server.kill();
    const deadline = setTimeout(() => server.kill('SIGKILL'), 5000);
    await closed;
    clearTimeout(deadline);
  }
  log.end();
}
