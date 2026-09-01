import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

function getCookie(name) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const row = document.cookie.split('; ').find(item => item.startsWith(encodedName) || item.startsWith(`${name}=`));
  if (!row) return '';
  const value = row.slice(row.indexOf('=') + 1);
  try { return decodeURIComponent(value); } catch { return value; }
}

api.interceptors.request.use(config => {
  const token = getCookie('XSRF-TOKEN');
  if (token && ['post', 'put', 'patch', 'delete'].includes(String(config.method).toLowerCase())) {
    config.headers = config.headers || {};
    config.headers['X-XSRF-TOKEN'] = token;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    const isAdminRequest = url.includes('/admin/') || url === '/admin/check' || url === '/admin/logout';

    if (status === 401 && isAdminRequest && window.location.pathname !== '/admin/login') {
      window.location.assign('/admin/login');
    }
    return Promise.reject(error);
  }
);

export default api;
