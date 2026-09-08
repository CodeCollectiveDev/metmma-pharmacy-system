import { apiRequest } from './api';

/**
 * Authenticate against the backend and persist session.
 */
export async function login(username, password) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (data.token) {
    localStorage.setItem('token', data.token);
  }
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
    if (data.user.role) {
      localStorage.setItem('role', String(data.user.role).toLowerCase());
    }
  }

  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('role');
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredRole() {
  return (localStorage.getItem('role') || '').toLowerCase();
}

/** Roles allowed to access Sales History on the frontend (mirrors backend). */
export const SALES_HISTORY_ROLES = [
  'admin',
  'store_manager',
  'pharmacist',
  'cashier'
];

export function canAccessSalesHistory(role = getStoredRole()) {
  return SALES_HISTORY_ROLES.includes(String(role || '').toLowerCase());
}
