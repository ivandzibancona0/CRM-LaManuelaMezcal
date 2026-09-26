// Authentication & Session Manager
const auth = {
  TOKEN_KEY: 'la_manuela_crm_token',
  USER_KEY: 'la_manuela_crm_user',

  getUser() {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  isAdmin() {
    const user = this.getUser();
    return user && user.role === 'admin';
  },

  async login(email, password) {
    const data = await api.post('/auth/login', { email, password });
    if (data && data.token) {
      localStorage.setItem(this.TOKEN_KEY, data.token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
      utils.showToast(`¡Bienvenido/a ${data.user.name}!`, 'success');
      app.initAuthenticatedApp();
      return true;
    }
    return false;
  },

  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    utils.showToast('Sesión cerrada correctamente.', 'success');
    app.renderLogin();
  }
};
