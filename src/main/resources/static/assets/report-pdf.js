import { reportDate, reportDuration } from './report-data.js';

const forest = [7, 63, 50];
const ink = [30, 41, 48];
const muted = [76, 94, 84];
const text = value => String(value ?? '-').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '');
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
const status = value => ({ ATIVA: 'Em andamento', FINALIZADA: 'Finalizada', LIVRE: 'Disponível', OCUPADA: 'Em uso', MANUTENCAO: 'Manutenção', ADMIN: 'Administrador', CLIENTE: 'Cliente' })[value] || text(value);
const audit = row => `Criado: ${reportDate(row.dataCriacao).replace('\n', ' ')}\nPor: ${text(row.criadoPor)}\nAlterado: ${reportDate(row.dataModificacao).replace('\n', ' ')}\nPor: ${text(row.modificadoPor)}`;

export function renderReport(doc, autoTable, data, { timezone, generatedAt = new Date(), demo = false }) {
  doc.setProperties({ title: 'Bikes - Relatório administrativo completo', author: 'Bikes', subject: 'Locações, devoluções, clientes, frota e usuários' });
  const margin = 14;
  const width = doc.internal.pageSize.getWidth() - 2 * margin;
  const generated = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: timezone }).format(generatedAt);
  function heading(label, note) {
    doc.setFont('Manrope', 'bold').setFontSize(19).setTextColor(...forest);
    doc.text(label, margin, 34);
    doc.setFont('Manrope', 'normal').setFontSize(9).setTextColor(...muted);
    doc.text(doc.splitTextToSize(note, width), margin, 42);
  }
  function section(label, note, headers, rows, widths) {
    doc.addPage();
    heading(label, note);
    autoTable(doc, {
      startY: 54, margin: { top: 28, bottom: 18, left: margin, right: margin },
      head: [headers], body: rows.length ? rows : [[{ content: 'Nenhum registro nesta categoria.', colSpan: headers.length }]],
      styles: { font: 'Manrope', fontSize: 8.5, cellPadding: 3, textColor: ink, overflow: 'linebreak', valign: 'top', lineColor: [228, 234, 231], lineWidth: 0.1 },
      headStyles: { fillColor: forest, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])),
      rowPageBreak: 'avoid', showHead: 'everyPage'
    });
  }
  heading('Relatório administrativo completo', 'Locações e devoluções, cadastros de clientes, frota atual e contas de acesso.');
  doc.setFontSize(10).setTextColor(...ink);
  doc.text(`Gerado em ${generated} | Fuso: ${timezone}`, margin, 58);
  if (demo) doc.text('DEMONSTRAÇÃO - dados fictícios deste navegador.', margin, 67);
  const active = data.rentals.filter(r => r.status === 'ATIVA');
  const finished = data.rentals.filter(r => r.status === 'FINALIZADA');
  autoTable(doc, {
    startY: 80, margin: { left: margin, right: margin }, theme: 'plain',
    styles: { font: 'Manrope', fontSize: 12, cellPadding: 5, textColor: ink },
    body: [
      ['Locações registradas', String(data.rentals.length)],
      ['Em andamento / finalizadas', `${active.length} / ${finished.length}`],
      ['Total calculado das finalizadas', money(finished.reduce((sum, r) => sum + Number(r.valor || 0), 0))],
      ['Clientes / bicicletas na frota / usuários', `${data.clients.length} / ${data.bikes.length} / ${data.users.length}`]
    ], columnStyles: { 0: { cellWidth: 125 } }
  });
  doc.setFontSize(10).setTextColor(...muted);
  doc.text([
    'Inclui todos os registros disponíveis ao administrador, independentemente dos filtros e da página da tela.',
    'As consultas são realizadas durante a geração; alterações simultâneas podem ocorrer entre as consultas.',
    'Locações ativas: duração consultada na geração e valor definido na devolução. Não representa cobrança confirmada.',
    'Cartões: somente os quatro últimos dígitos. Senhas, resumos de senha, tokens e códigos de segurança são omitidos.',
    'Bicicletas excluídas permanecem no histórico de locações e não integram a relação da frota atual.'
  ], margin, 150, { lineHeightFactor: 1.9 });
  section('Locações e devoluções', `Histórico completo: ${data.rentals.length} registros. Horários em ${timezone}.`,
    ['Locação / cliente', 'Bicicleta / modelo', 'Retirada', 'Devolução prevista', 'Devolução efetiva', 'Duração', 'Status', 'Valores / cartão'],
    data.rentals.map(r => [
      `#${r.id}\n${text(r.nomeCliente)}\nCliente #${r.clienteId}`, `${text(r.codigoBicicleta)}\n${text(r.modeloBicicleta)}`,
      reportDate(r.dataRetirada), reportDate(r.dataDevolucaoPrevista), reportDate(r.dataDevolucao, 'Pendente'),
      reportDuration(r.duracaoSegundos), status(r.status),
      `${r.status === 'FINALIZADA' ? money(r.valor) : 'A calcular'}\nTarifa: ${money(r.valorHora)}/h\nCartão final: ${text(r.cartaoFinal)}`
    ]), [44, 37, 30, 30, 30, 29, 29, 40]);
  section('Clientes', `Cadastros completos e auditoria: ${data.clients.length} registros.`,
    ['ID / nome', 'CPF / usuário', 'Contato', 'Auditoria'], data.clients.map(c => [
      `#${c.id}\n${text(c.nome)}`, `${text(c.cpf)}\nUsuário #${c.usuarioId}`, `E-mail: ${text(c.email)}\nTelefone: ${text(c.telefone)}`, audit(c)
    ]), [65, 45, 72, 87]);
  section('Frota atual', `Bicicletas não excluídas: ${data.bikes.length} registros. O histórico de uso está nas locações.`,
    ['ID / código', 'Modelo', 'Status', 'Auditoria'], data.bikes.map(b => [
      `#${b.id}\n${text(b.codigo)}`, text(b.modelo), status(b.status), audit(b)
    ]), [45, 65, 45, 114]);
  section('Contas de acesso', `Usuários cadastrados: ${data.users.length} registros. Credenciais não fazem parte do relatório.`,
    ['ID', 'E-mail de acesso', 'Perfil'], data.users.map(u => [text(u.id), text(u.username), status(u.role)]), [25, 170, 74]);
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('Manrope', 'bold').setFontSize(11).setTextColor(...forest);
    doc.text('bikes.', margin, 16);
    doc.setFont('Manrope', 'normal').setFontSize(8).setTextColor(...muted);
    doc.text(demo ? 'Relatório administrativo | Demonstração' : 'Relatório administrativo', margin + 22, 16);
    doc.setDrawColor(228, 234, 231).line(margin, 21, margin + width, 21);
    doc.text(`Gerado em ${generated} | ${timezone}`, margin, 201);
    doc.text(`Página ${i} de ${pages}`, margin + width, 201, { align: 'right' });
  }
  return doc;
}

let resources;
async function loadResources() {
  if (!resources) resources = (async () => {
    await import('./vendor/jspdf.min.js');
    await import('./vendor/jspdf-autotable.min.js');
    const fonts = await Promise.all(['regular', 'bold'].map(async weight => {
      const response = await fetch(new URL(`./fonts/manrope-${weight}.ttf`, import.meta.url));
      if (!response.ok) throw new Error('Não foi possível carregar a fonte do relatório. Tente novamente.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(binary);
    }));
    return fonts;
  })().catch(error => { resources = null; throw error; });
  return resources;
}

export async function createReportPdf(data, options) {
  const fonts = await loadResources();
  const doc = new globalThis.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  ['normal', 'bold'].forEach((style, i) => {
    const file = `Manrope-${style}.ttf`;
    doc.addFileToVFS(file, fonts[i]);
    doc.addFont(file, 'Manrope', style);
  });
  return renderReport(doc, globalThis.autoTable, data, options);
}
