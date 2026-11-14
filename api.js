async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
  return data;
}

export const api = {
  me: () => request('/api/me'),
  login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } }),
  signup: (name, email, password) => request('/api/auth/signup', { method: 'POST', body: { name, email, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  bootstrap: () => request('/api/bootstrap'),
  connect: (provider, email, clientName) => request('/api/connections', { method: 'POST', body: { provider, email, clientName } }),
  disconnect: (id) => request(`/api/connections/${id}`, { method: 'DELETE' }),
  conversation: (id) => request(`/api/conversations/${id}`),
  update: (id, patch) => request(`/api/conversations/${id}`, { method: 'PATCH', body: patch }),
  clientAction: (id, action) => request(`/api/conversations/${id}/client-action`, { method: 'POST', body: { action } }),
  summary: (id) => request(`/api/conversations/${id}/summary`),
  draft: (id) => request(`/api/conversations/${id}/draft`, { method: 'POST' }),
  send: (id, body) => request(`/api/conversations/${id}/send`, { method: 'POST', body: { body } }),
  ask: (question, conversationId) => request('/api/ask', { method: 'POST', body: { question, conversationId } }),
  sync: () => request('/api/sync', { method: 'POST' })
};
