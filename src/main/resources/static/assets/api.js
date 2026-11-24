let token = null;

export class ApiError extends Error {
  constructor(message, status = 0, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function setToken(value) { token = value; }
export function hasToken() { return Boolean(token); }

export async function api(path, { method = 'GET', body, signal } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`/api/v1${path}`, {
      method, credentials: 'omit', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, controller.signal]) : controller.signal,
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401 && token) {
        token = null;
        window.dispatchEvent(new Event('session-expired'));
      }
      throw new ApiError(data?.message || 'Não foi possível concluir a solicitação.', response.status, data?.errors);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    throw new ApiError(method === 'GET'
      ? 'A conexão não respondeu. Confira sua internet e tente novamente.'
      : 'A confirmação não chegou. Consulte os dados antes de tentar novamente: a operação pode ter sido concluída.');
  } finally { clearTimeout(timeout); }
}
