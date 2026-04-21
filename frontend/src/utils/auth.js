/**
 * JWT decode utilities — no library needed, just base64-decode the payload.
 * The token is stored in localStorage as 'token'.
 */

function decodeToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch {
    return null;
  }
}

export function getUserId() {
  return decodeToken()?.sub ?? null;
}

export function getUserRole() {
  return decodeToken()?.role ?? null;
}

export function isAdmin() {
  return getUserRole() === 'MANAGER';
}

export const ROLE_LABELS = {
  UNDERGRADUATE_STUDENT: 'Undergraduate Student',
  INSTRUCTOR: 'Instructor',
  LECTURER: 'Lecturer',
  MANAGER: 'Manager',
  TECHNICIAN: 'Technician',
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || 'Unknown';
}

export function isAuthenticated() {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const payload = decodeToken();
    if (!payload?.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
