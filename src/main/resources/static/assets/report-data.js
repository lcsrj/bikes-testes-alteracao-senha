const fields = (record, names) => Object.fromEntries(names.map(name => [name, record[name] ?? null]));
const audit = ['dataCriacao', 'dataModificacao', 'criadoPor', 'modificadoPor'];

// Read the complete administrative lists; screen filters and pagination do not apply.
export async function collectReportData(request) {
  const [reports, clients, bikes, users] = await Promise.all([
    request('/relatorios/locacoes'), request('/clientes'), request('/bicicletas'), request('/usuarios')
  ]);
  const rentals = new Array(reports.length);
  let cursor = 0;
  let failed = false;
  async function worker() {
    while (!failed && cursor < reports.length) {
      const index = cursor++;
      try {
        const detail = await request(`/locacoes/${encodeURIComponent(reports[index].locacaoId)}`);
        rentals[index] = fields(detail, ['id', 'clienteId', 'nomeCliente', 'codigoBicicleta', 'modeloBicicleta',
          'dataRetirada', 'dataDevolucaoPrevista', 'dataDevolucao', 'duracaoSegundos', 'status', 'valorHora', 'valor']);
        const ending = String(detail.cartaoFinal ?? '');
        rentals[index].cartaoFinal = /^\d{4}$/.test(ending) ? ending : null;
      } catch (error) { failed = true; throw error; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, reports.length) }, worker));
  return {
    rentals: rentals.sort((a, b) => a.id - b.id),
    clients: clients.map(c => fields(c, ['id', 'nome', 'cpf', 'usuarioId', 'telefone', 'email', ...audit])).sort((a, b) => a.id - b.id),
    bikes: bikes.map(b => fields(b, ['id', 'codigo', 'modelo', 'status', ...audit])).sort((a, b) => a.id - b.id),
    users: users.map(u => fields(u, ['id', 'username', 'role'])).sort((a, b) => a.id - b.id)
  };
}

export function reportDate(value, fallback = '-') {
  if (!value) return fallback;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/);
  return match ? `${match[3]}/${match[2]}/${match[1]}\n${match[4]}:${match[5]}:${match[6] || '00'}` : String(value);
}

export function reportDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${Math.floor(total / 3600)}h ${String(Math.floor(total % 3600 / 60)).padStart(2, '0')}min ${String(total % 60).padStart(2, '0')}s`;
}
