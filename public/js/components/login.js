// Login View Component
const loginComponent = {
  render() {
    return `
      <div style="min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 20px 10px;">
        <div class="glass-card" style="width: 100%; max-width: 440px; border-color: var(--purple-neon); box-shadow: 0 15px 45px rgba(157, 78, 221, 0.25);">
          
          <div style="text-align: center; margin-bottom: 26px;">
            <img src="https://lamanuelamezcal.com/imagenes/logos/logos%20web%20la%20manuela-06.png" alt="La Manuela Mezcal" style="height: 65px; margin: 0 auto 15px auto;">
            <h2 style="font-size: 1.3rem; letter-spacing: 0.08em; color: #fff;">INICIAR SESIÓN</h2>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">Sistema CRM – La Manuela Mezcal</p>
          </div>

          <form id="login-form" onsubmit="loginComponent.handleSubmit(event)">
            <div class="form-group">
              <label class="form-label" for="email"><i class="fa-solid fa-envelope text-gold"></i> Correo Electrónico</label>
              <input type="email" id="email" class="form-input" placeholder="correo@lamanuelamezcal.com" required autocomplete="email">
            </div>

            <div class="form-group">
              <label class="form-label" for="password"><i class="fa-solid fa-lock text-gold"></i> Contraseña</label>
              <input type="password" id="password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px; padding: 12px;">
              <i class="fa-solid fa-right-to-bracket"></i> INGRESAR AL SISTEMA
            </button>
          </form>

        </div>
      </div>
    `;
  },

  fillDemo(email, password) {
    document.getElementById('email').value = email;
    document.getElementById('password').value = password;
    document.getElementById('login-form').dispatchEvent(new Event('submit'));
  },

  async handleSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      await auth.login(email, password);
    } catch (err) {
      utils.showToast(err.message || 'Error al iniciar sesión.', 'error');
    }
  }
};
