export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
export const cpf = value => String(value ?? '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
export const labels = { ATIVA: 'Em andamento', FINALIZADA: 'Finalizada', LIVRE: 'Disponível', OCUPADA: 'Em uso', MANUTENCAO: 'Manutenção', ADMIN: 'Administrador', CLIENTE: 'Cliente' };
export const badge = value => `<span class="badge ${escape(value?.toLowerCase())}"><span aria-hidden="true"></span>${escape(labels[value] || value)}</span>`;
export function date(value) {
  if (!value) return '—';
  const [day, time] = value.split('T');
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}${time ? ` às ${time.slice(0, 5)}` : ''}`;
}
export function zonedInstant(value, timezone) {
  if (!value) return null;
  const parts = value.match(/\d+/g).map(Number);
  const utc = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3] || 0, parts[4] || 0, parts[5] || 0);
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let result = utc;
  for (let i = 0; i < 3; i++) {
    const p = Object.fromEntries(formatter.formatToParts(result).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]));
    result += utc - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  }
  return result;
}
export function localNow(timezone, offsetMinutes = 0) {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(Date.now() + offsetMinutes * 60000));
  return parts.replace(' ', 'T');
}
export function duration(seconds, includeSeconds = false) {
  if (seconds == null) return 'Em andamento';
  const mins = Math.floor(seconds / 60);
  return `${Math.floor(mins / 60)}h ${mins % 60}min${includeSeconds ? ` ${Math.floor(seconds) % 60}s` : ''}`;
}
const paths = {
  bike: '<circle cx="5.5" cy="16.5" r="4"/><circle cx="18.5" cy="16.5" r="4"/><path d="m5.5 16.5 5-10 8 10h-13l7-7M9 6.5h4m3-3h3l2 6"/>',
  home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
  key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-5-5 3-3m-1 5 3-3"/>',
  users: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-18a4 4 0 0 1 0 8m3 10v-3a7 7 0 0 0-3-6"/>',
  chart: '<path d="M3 3v18h18M8 16v-5m5 5V7m5 9V4"/>',
  account: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-3a8 8 0 0 1 16 0v3"/>',
  out: '<path d="M9 4H3v16h6m7-15 7 7-7 7m-9-7h16"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  tool: '<path d="m14 7 3 3 4-4a7 7 0 0 1-9 9l-7 7-4-4 7-7a7 7 0 0 1 9-9Z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 7 8.5-7"/>',
  lock: '<rect x="4.5" y="10" width="15" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4.5v2.5"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M10.6 5.6A10 10 0 0 1 12 5.5c6.4 0 10 6.5 10 6.5a17 17 0 0 1-2.6 3.4M6.6 6.6C3.7 8.4 2 12 2 12s3.6 6.5 10 6.5a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  bicycle: '<circle cx="5.5" cy="16" r="4"/><circle cx="18.5" cy="16" r="4"/><path d="M5.5 16 9 9h7.5l2 7M9 9l3.5 7h-7m7 0 4-7M8 6h2.5m4-1h2.5l-.5 4"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 9m0-5v5h5M4 13a8 8 0 0 0 14.3 4.3L20 15m0 5v-5h-5"/>'
};
export const icon = name => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.bike}</svg>`;
export const field = (name, label, options = {}) => `<div class="field ${options.wide ? 'wide' : ''}"><label for="${name}">${label}</label>${options.icon ? `<div class="input-icon">${icon(options.icon)}` : ''}<input id="${name}" name="${name}" ${options.attributes || ''} value="${escape(options.value || '')}" ${options.hint ? `aria-describedby="${name}-hint"` : ''} ${options.optional ? '' : 'required'}>${options.icon ? '</div>' : ''}${options.hint ? `<small id="${name}-hint">${options.hint}</small>` : ''}<small class="field-error" id="${name}-error"></small></div>`;
export const password = (name, label, autocomplete = 'current-password', options = {}) => `<div class="field"><label for="${name}">${label}</label><div class="password${options.icons ? ' input-icon' : ''}">${options.icons ? icon('lock') : ''}<input id="${name}" name="${name}" type="password" minlength="6" maxlength="6" required autocomplete="${autocomplete}" ${options.icons ? 'placeholder="••••••"' : ''} aria-describedby="${name}-hint"><button type="button" data-action="password" aria-controls="${name}" aria-label="Mostrar ${label.toLowerCase()}" aria-pressed="false">${options.icons ? `${icon('eye')}${icon('eye-off')}<span data-label>Mostrar</span>` : 'Mostrar'}</button></div><small id="${name}-hint">Exatamente 6 caracteres.</small><small class="field-error" id="${name}-error"></small></div>`;
export const errorArea = () => '<div class="form-error" role="alert" tabindex="-1" hidden></div>';
export function showError(form, error) {
  form.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
  form.querySelectorAll('[aria-invalid]').forEach(e => e.removeAttribute('aria-invalid'));
  let first;
  for (const [name, message] of Object.entries(error.fields || {})) {
    const input = form.elements.namedItem(name);
    if (input) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `${name}-error`);
      const output = document.getElementById(`${name}-error`);
      if (output) output.textContent = message;
      first ||= input;
    }
  }
  const banner = form.querySelector('.form-error');
  banner.hidden = false;
  banner.textContent = error.message;
  (first || banner).focus();
}
let toastTimer;
let toastElement;
export function mountToast() {
  toastElement ||= document.getElementById('toast');
  const topbar = document.querySelector('.workspace .topbar');
  const auth = document.querySelector('.auth-card');
  if (topbar) topbar.after(toastElement);
  else if (auth) auth.prepend(toastElement);
}
export function toast(message) {
  mountToast();
  const element = toastElement;
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove('visible'), 6500);
}
export function empty(title, text, action = '') {
  return `<div class="empty">${icon('bike')}<h3>${title}</h3><p>${text}</p>${action}</div>`;
}
export function table(headers, rows, caption) {
  return `<div class="table-scroll" role="region" aria-label="${caption}" tabindex="0"><table><caption class="sr-only">${caption}</caption><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
export function pager(total, page, size) {
  const pages = Math.max(1, Math.ceil(total / size));
  return `<div class="pagination"><span>${total ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} de ${total}` : '0 resultados'}</span><div><label for="page-size">Por página</label> <select id="page-size" name="size" form="filters">${[10, 20, 50].map(n => `<option ${size === n ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="button quiet small" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Anterior</button><span>${page} / ${pages}</span><button class="button quiet small" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''}>Próxima</button></div></div>`;
}
