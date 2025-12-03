export function getToken() {
  try {
    const user = localStorage.getItem('user');
    if (!user) return localStorage.getItem('token');
    const parsed = JSON.parse(user);
    return parsed?.token || localStorage.getItem('token');
  } catch (_e) {
    return localStorage.getItem('token');
  }
}

export async function authFetch(url, options = {}) {
  const isAuthEndpoint = /\/(login|signup)\b/.test(url);
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (!isAuthEndpoint) {
    if (!token) {
      // No token: reject so caller can handle (no redirect)
      console.warn('[authFetch] No token present', { url });
      return Promise.reject(new Error('No auth token'));
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const resp = await fetch(url, { ...options, headers });
  if (resp.status === 401 && !isAuthEndpoint) {
    // Token invalid/expired: reject so caller can handle (no redirect)
    const msg = await resp.text().catch(() => 'Unauthorized');
    console.warn('[authFetch] 401 from API', { url, status: resp.status, body: msg });
    throw new Error('Unauthorized');
  }
  return resp;
}
