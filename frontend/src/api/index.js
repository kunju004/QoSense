const BASE = '/api';

function getToken() {
  return localStorage.getItem('qos_token');
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const authApi = {
  signup: (name, email, password) => request('POST', '/auth/signup', { name, email, password }),
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  logout: () => request('POST', '/auth/logout'),
};

export const runsApi = {
  list: ()        => request('GET', '/runs'),
  get: (id)       => request('GET', `/runs/${id}`),
  create: (body)  => request('POST', '/runs', body),
  end: (id, body) => request('PATCH', `/runs/${id}/end`, body),
  delete: (id)    => request('DELETE', `/runs/${id}`),
};

export const schedulerApi = {
  decide: (body)      => request('POST', '/scheduler/decide', body),
  batchDecide: (body) => request('POST', '/scheduler/batch-decide', body),
};

export const analyticsApi = {
  summary: () => request('GET', '/analytics/summary'),
};
