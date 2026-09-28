// Shared API utility
const BASE = 'http://localhost:4000/api';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  query:        (prompt) => apiFetch('/query', { method: 'POST', body: JSON.stringify({ prompt }) }),
  models:       ()       => apiFetch('/models'),
  history:      (limit = 50, offset = 0) => apiFetch(`/history?limit=${limit}&offset=${offset}`),
  record:       (id)     => apiFetch(`/history/${id}`),
  stats:        ()       => apiFetch('/stats'),
  health:       ()       => apiFetch('/health'),
  billing:      ()       => apiFetch('/billing'),
  wallet:       ()       => apiFetch('/billing/wallet'),
  transactions: (limit = 50) => apiFetch(`/billing/transactions?limit=${limit}`),
  topup:        (amount, note) => apiFetch('/billing/topup', { method: 'POST', body: JSON.stringify({ amount, note }) }),
};
