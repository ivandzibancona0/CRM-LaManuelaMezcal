// HTTP Fetch API Wrapper with JWT Authentication
const api = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('la_manuela_crm_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (token && !endpoint.includes('/auth/login')) {
            utils.showToast('Sesión caducada o no autorizada.', 'error');
            auth.logout();
            return null;
          }
        }
        throw new Error(data.error || 'Error en la solicitud al servidor.');
      }

      return data;
    } catch (err) {
      console.error(`Error de API [${endpoint}]:`, err);
      throw err;
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};
