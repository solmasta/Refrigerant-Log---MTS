const TOKEN_KEY = 'rl_token';
const USER_KEY = 'rl_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson && data.error ? data.error : 'Something went wrong';
    if (res.status === 401) clearSession();
    throw new Error(message);
  }
  return data;
}

export const api = {
  technicianLogin: (firstName, lastName) =>
    request('/auth/technician-login', { method: 'POST', body: { firstName, lastName }, auth: false }),
  adminLogin: (password) =>
    request('/auth/admin-login', { method: 'POST', body: { password }, auth: false }),
  adminChangePassword: (currentPassword, newPassword) =>
    request('/auth/admin-change-password', { method: 'POST', body: { currentPassword, newPassword } }),
  me: () => request('/me'),
  referenceData: () => request('/reference-data', { auth: false }),
  technicians: () => request('/technicians'),
  createLog: (payload) => request('/logs', { method: 'POST', body: payload }),
  listLogs: (params = {}) => request(`/logs?${new URLSearchParams(params)}`),
  deleteLog: (id) => request(`/logs/${id}`, { method: 'DELETE' }),
  createPurchase: (payload) => request('/purchases', { method: 'POST', body: payload }),
  listPurchases: (params = {}) => request(`/purchases?${new URLSearchParams(params)}`),
  deletePurchase: (id) => request(`/purchases/${id}`, { method: 'DELETE' }),
  adminSummary: () => request('/admin/summary'),
};

export function exportUrl(kind) {
  const token = getToken();
  return `/api/export/${kind}.csv?token=${encodeURIComponent(token || '')}`;
}
