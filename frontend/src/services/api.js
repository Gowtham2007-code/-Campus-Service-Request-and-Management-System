const TOKEN_KEY = 'campus_token';
const USER_KEY = 'campus_user';

// Local: '' → requests use Vite proxy (/api → localhost:5000)
// Production: VITE_API_URL → requests go to Render backend
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (err) {
    return null;
  }
};

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

export const setStoredAuth = (token, user) => {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (err) {
    console.error('Failed to save auth to localStorage:', err);
  }
};

export const clearStoredAuth = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.error('Failed to clear auth from localStorage:', err);
  }
};

export async function request(endpoint, options = {}) {
  const token = getStoredToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    config.body =
      typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  let data = null;
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch (err) {
      data = null;
    }
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      !endpoint.includes('/api/auth/login')
    ) {
      clearStoredAuth();

      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login'
      ) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }

    const errorMessage =
      data?.message || `Request failed with status ${response.status}`;

    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

export const api = {
  get: (url, opts) =>
    request(url, { ...opts, method: 'GET' }),

  post: (url, body, opts) =>
    request(url, { ...opts, method: 'POST', body }),

  put: (url, body, opts) =>
    request(url, { ...opts, method: 'PUT', body }),

  delete: (url, opts) =>
    request(url, { ...opts, method: 'DELETE' }),
};

export default api;