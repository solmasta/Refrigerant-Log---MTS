const TOKEN_KEY = 'rl_token';
const USER_KEY = 'rl_user';
const LAST_TECHNICIAN_KEY = 'rl_last_technician';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Remembered on this device so a technician can sign back in with one tap
// instead of retyping their name every time. Not tied to the session --
// survives sign-out, since the whole point is to skip typing next time too.
export function getLastTechnicianName() {
  const raw = localStorage.getItem(LAST_TECHNICIAN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setLastTechnicianName(firstName, lastName) {
  localStorage.setItem(LAST_TECHNICIAN_KEY, JSON.stringify({ firstName, lastName }));
}

export function clearLastTechnicianName() {
  localStorage.removeItem(LAST_TECHNICIAN_KEY);
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

export class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
    this.isNetworkError = true;
  }
}

export class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
    this.isAuthError = true;
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch() itself throwing (not an HTTP error response) means the
    // request never reached the server — no connection, not a bad response.
    throw new NetworkError('No connection to the server');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = isJson && data.error ? data.error : 'Something went wrong';
    if (res.status === 401) {
      clearSession();
      throw new AuthError(message);
    }
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
  updateTechnician: (id, payload) => request(`/technicians/${id}`, { method: 'PATCH', body: payload }),
  deleteTechnician: (id) => request(`/technicians/${id}`, { method: 'DELETE' }),
  createLog: (payload) => request('/logs', { method: 'POST', body: payload }),
  listLogs: (params = {}) => request(`/logs?${new URLSearchParams(params)}`),
  deleteLog: (id) => request(`/logs/${id}`, { method: 'DELETE' }),
  createPurchase: (payload) => request('/purchases', { method: 'POST', body: payload }),
  listPurchases: (params = {}) => request(`/purchases?${new URLSearchParams(params)}`),
  deletePurchase: (id) => request(`/purchases/${id}`, { method: 'DELETE' }),
  adminSummary: () => request('/admin/summary'),
  sendReminders: () => request('/admin/send-reminders', { method: 'POST' }),
  getReminderSettings: () => request('/admin/reminder-settings'),
  updateReminderSettings: (reminderDay) =>
    request('/admin/reminder-settings', { method: 'PUT', body: { reminderDay } }),
  listBackups: () => request('/admin/backups'),
  createBackup: () => request('/admin/backups', { method: 'POST' }),
};

export function exportUrl(kind) {
  const token = getToken();
  return `/api/export/${kind}.csv?token=${encodeURIComponent(token || '')}`;
}

export function backupUrl(filename) {
  const token = getToken();
  return `/api/admin/backups/${encodeURIComponent(filename)}?token=${encodeURIComponent(token || '')}`;
}
