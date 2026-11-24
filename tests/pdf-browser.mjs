import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { startDemoServer } from './static-server.mjs';

const output = resolve('target/pdf-e2e');
await mkdir(output, { recursive: true });
const { server, url } = await startDemoServer();
const browser = await chromium.launch({ headless: true });
const checks = [], errors = [];
let page;
const check = (name, value = true) => { assert.ok(value, name); checks.push(name); console.log(`OK ${name}`); };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'Asia/Tokyo' });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button', { name: 'Entrar como cliente', exact: true }).click();
  await page.getByRole('heading', { name: 'Visão geral', exact: true }).waitFor();
  await page.goto(`${url}#/relatorios`);
  await page.getByRole('heading', { name: 'Página indisponível' }).waitFor();
  check('Cliente não tem acesso à exportação', await page.getByRole('button', { name: 'Baixar PDF completo' }).count() === 0);
  const forbidden = await page.evaluate(async () => {
    const { api } = await import('./assets/api.js');
    const { collectReportData } = await import('./assets/report-data.js');
    try { await collectReportData(api); return false; } catch (error) { return error.status === 403; }
  });
  check('Consulta direta como cliente também é recusada', forbidden);
  await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
  await page.getByRole('button', { name: 'Entrar como administrador', exact: true }).click();
  await page.getByRole('heading', { name: 'Visão geral', exact: true }).waitFor();
  await page.goto(`${url}#/relatorios?q=nenhum-resultado&status=ATIVA&page=3`);
  const downloadButton = page.getByRole('button', { name: 'Baixar PDF completo', exact: true });
  await downloadButton.waitFor();
  await page.screenshot({ path: join(output, 'relatorio-desktop.png'), fullPage: true });
  let prematureDownloads = 0;
  const countDownload = () => prematureDownloads++;
  page.on('download', countDownload);
  await page.route('**/fonts/manrope-regular.ttf', route => route.fulfill({ status: 503, body: 'Indisponível' }));
  await downloadButton.click();
  await page.locator('#toast').filter({ hasText: 'Não foi possível gerar o PDF.' }).waitFor();
  await downloadButton.waitFor();
  check('Falha de recurso não gera arquivo parcial e libera nova tentativa', prematureDownloads === 0 && await downloadButton.isEnabled());
  page.off('download', countDownload);
  await page.unroute('**/fonts/manrope-regular.ttf');
  const download = page.waitForEvent('download');
  await downloadButton.click();
  const file = await download;
  await file.saveAs(join(output, 'relatorio-completo.pdf'));
  await downloadButton.waitFor({ state: 'visible' });
  check('PDF baixa mesmo com filtro sem resultados', (await readFile(join(output, 'relatorio-completo.pdf'))).subarray(0, 5).toString() === '%PDF-');
  check('Arquivo possui nome e extensão de PDF', /^bikes-relatorio-completo-\d{4}-\d{2}-\d{2}\.pdf$/.test(file.suggestedFilename()));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.sidebar').getBoundingClientRect().right <= 1);
  await page.screenshot({ path: join(output, 'relatorio-mobile.png'), fullPage: true });
  check('Ações cabem no celular', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const mobileDownload = page.waitForEvent('download');
  await downloadButton.click();
  await (await mobileDownload).saveAs(join(output, 'relatorio-mobile.pdf'));
  check('Download funciona no celular');

  // Exercise the same renderer with an empty database and a long, multipage history.
  const saveRendered = async (name, empty) => {
    const next = page.waitForEvent('download');
    await page.evaluate(async ({ name, empty }) => {
      const { api } = await import('./assets/api.js');
      const { collectReportData } = await import('./assets/report-data.js');
      const { createReportPdf } = await import('./assets/report-pdf.js');
      const source = await collectReportData(api);
      const data = empty ? { rentals: [], clients: [], bikes: [], users: [] } : { ...source, rentals: Array.from({ length: 65 }, (_, i) => ({ ...source.rentals[i % source.rentals.length], id: 1000 + i, nomeCliente: 'João Antônio da Conceição - cliente com nome extenso para verificar quebra de linha', modeloBicicleta: 'Elétrica City com assistência para percursos urbanos e trilhas leves' })) };
      (await createReportPdf(data, { timezone: 'America/Sao_Paulo', demo: true })).save(name);
    }, { name, empty });
    await (await next).saveAs(join(output, name));
  };
  await saveRendered('multipagina.pdf', false);
  await saveRendered('vazio.pdf', true);
  check('Renderização aceita histórico extenso e base vazia');
  check('Nenhum erro JavaScript no fluxo', errors.length === 0);
  await writeFile(join(output, 'checks.json'), JSON.stringify({ checks, errors }, null, 2));
} catch (error) {
  if (page) await writeFile(join(output, 'failure.txt'), await page.locator('body').innerText());
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
