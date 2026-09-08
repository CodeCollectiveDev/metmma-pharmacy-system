const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

/**
 * Shared fetch wrapper — attaches JWT and normalizes errors.
 */
export async function apiRequest(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });
  } catch {
    const error = new Error('Unable to reach the server. Please try again later.');
    error.status = 0;
    throw error;
  }

  let body = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    body = await response.json();
  }

  if (!response.ok) {
    const message =
      body?.message ||
      body?.error ||
      (response.status === 401
        ? 'You are not authenticated. Please log in again.'
        : response.status === 403
          ? 'You do not have permission to view this resource.'
          : 'Something went wrong. Please try again.');

    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

export function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    searchParams.set(key, String(value));
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}
