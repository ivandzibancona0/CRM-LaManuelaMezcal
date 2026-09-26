// Users Component (Admin Only - Manage & Create Users)
const usersComponent = {
  usersList: [],

  async render() {
    if (!auth.isAdmin()) {
      return `<div class="glass-card" style="text-align: center; padding: 40px;"><h3 class="text-danger">Acceso Restringido. Módulo exclusivo para Administradores.</h3></div>`;
    }

    try {
      this.usersList = await api.get('/users');
    } catch (err) {
      utils.showToast('Error al cargar la lista de usuarios.', 'error');
      this.usersList = [];
    }

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-users-gear text-gold"></i> GESTIÓN Y ALTA DE USUARIOS
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              Administración de cuentas de vendedores y administradores del sistema.
            </p>
          </div>

          <button class="btn btn-gold" onclick="usersComponent.openCreateModal()">
            <i class="fa-solid fa-user-plus"></i> CREAR NUEVO USUARIO
          </button>
        </div>

        <div class="glass-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>NOMBRE Y CORREO</th>
                  <th>ROL DE SISTEMA</th>
                  <th>TELÉFONO</th>
                  <th>PROSPECTOS</th>
                  <th>CLIENTES</th>
                  <th>VENTAS</th>
                  <th>SEGUIMIENTOS</th>
                  <th>ESTADO</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                ${this.usersList.map(u => `
                  <tr>
                    <td>
                      <strong>${u.name}</strong>
                      <div style="font-size: 0.78rem; color: var(--text-muted);">${u.email}</div>
                    </td>
                    <td>
                      <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-vendedor'}">
                        <i class="fa-solid ${u.role === 'admin' ? 'fa-shield-halved' : 'fa-user-tag'}"></i>
                        ${u.role === 'admin' ? 'ADMINISTRADOR' : 'VENDEDOR'}
                      </span>
                    </td>
                    <td>${u.phone || '-'}</td>
                    <td><strong>${u.total_prospects || 0}</strong></td>
                    <td><strong>${u.total_clients || 0}</strong></td>
                    <td><strong>${u.total_sales || 0}</strong></td>
                    <td><strong>${u.total_followups || 0}</strong></td>
                    <td>${utils.getStatusBadge(u.status === 'active' ? 'Activo' : 'Inactivo')}</td>
                    <td>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-secondary btn-sm btn-icon" onclick="usersComponent.openEditModal(${u.id})" title="Editar Usuario">
                          <i class="fa-solid fa-pen"></i>
                        </button>
                        ${u.id !== auth.getUser().id ? `
                          <button class="btn btn-danger btn-sm btn-icon" onclick="usersComponent.deleteUser(${u.id})" title="Eliminar Usuario">
                            <i class="fa-solid fa-trash"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  openCreateModal() {
    const content = `
      <form onsubmit="usersComponent.handleCreate(event)">
        <div class="form-group">
          <label class="form-label">Nombre Completo *</label>
          <input type="text" id="u-name" class="form-input" placeholder="Ej. Ana María Martínez" required>
        </div>

        <div class="form-group">
          <label class="form-label">Correo Electrónico *</label>
          <input type="email" id="u-email" class="form-input" placeholder="ana@lamanuelamezcal.com" required>
        </div>

        <div class="form-group">
          <label class="form-label">Contraseña de Acceso *</label>
          <input type="password" id="u-password" class="form-input" placeholder="••••••••" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Rol en el Sistema *</label>
            <select id="u-role" class="form-select" required>
              <option value="vendedor">Vendedor / Ejecutiva</option>
              <option value="admin">Administrador General</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono de Contacto</label>
            <input type="text" id="u-phone" class="form-input" placeholder="951-000-0000">
          </div>
        </div>

        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-user-plus"></i> CREAR CUENTA DE USUARIO
        </button>
      </form>
    `;

    utils.openModal('Crear Nuevo Usuario', content);
  },

  async handleCreate(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('u-name').value,
      email: document.getElementById('u-email').value,
      password: document.getElementById('u-password').value,
      role: document.getElementById('u-role').value,
      phone: document.getElementById('u-phone').value
    };

    try {
      await api.post('/users', payload);
      utils.showToast('¡Cuenta de usuario creada con éxito!', 'success');
      utils.closeModal();
      app.renderView('users');
    } catch (err) {
      utils.showToast(err.message || 'Error creando usuario.', 'error');
    }
  },

  openEditModal(id) {
    const u = this.usersList.find(x => x.id === id);
    if (!u) return;

    const content = `
      <form onsubmit="usersComponent.handleEdit(event, ${u.id})">
        <div class="form-group">
          <label class="form-label">Nombre Completo</label>
          <input type="text" id="ue-name" class="form-input" value="${u.name}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Teléfono</label>
          <input type="text" id="ue-phone" class="form-input" value="${u.phone || ''}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Rol</label>
            <select id="ue-role" class="form-select">
              <option value="vendedor" ${u.role === 'vendedor' ? 'selected' : ''}>Vendedor</option>
              <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrador</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado de la Cuenta</label>
            <select id="ue-status" class="form-select">
              <option value="active" ${u.status === 'active' ? 'selected' : ''}>Activo</option>
              <option value="inactive" ${u.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Nueva Contraseña (Opcional - Dejar en blanco para conservar)</label>
          <input type="password" id="ue-password" class="form-input" placeholder="Nueva contraseña">
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%;">
          <i class="fa-solid fa-sync"></i> ACTUALIZAR CUENTA
        </button>
      </form>
    `;

    utils.openModal(`Editar Usuario: ${u.name}`, content);
  },

  async handleEdit(e, id) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('ue-name').value,
      phone: document.getElementById('ue-phone').value,
      role: document.getElementById('ue-role').value,
      status: document.getElementById('ue-status').value,
      password: document.getElementById('ue-password').value
    };

    try {
      await api.put(`/users/${id}`, payload);
      utils.showToast('Usuario actualizado.', 'success');
      utils.closeModal();
      app.renderView('users');
    } catch (err) {
      utils.showToast(err.message || 'Error al actualizar.', 'error');
    }
  },

  async deleteUser(id) {
    if (confirm('¿Estás seguro de eliminar permanentemente esta cuenta de usuario?')) {
      try {
        await api.delete(`/users/${id}`);
        utils.showToast('Usuario eliminado.', 'success');
        app.renderView('users');
      } catch (err) {
        utils.showToast(err.message || 'Error al eliminar.', 'error');
      }
    }
  }
};
