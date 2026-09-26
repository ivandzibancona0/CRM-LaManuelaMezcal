// Products Component - Catálogo de Mezcales y Productos
const productsComponent = {
  productsList: [],

  async render() {
    const isAdm = auth.isAdmin();

    try {
      this.productsList = await api.get('/products');
    } catch (err) {
      utils.showToast('Error al cargar el catálogo de productos.', 'error');
      this.productsList = [];
    }

    return `
      <div>
        <!-- Header area -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-bottle-droplet text-gold"></i> CATÁLOGO DE PRODUCTOS MEZCALEROS
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              Administración de variedades de mezcal, precios, sabores y cajas surtidas para ventas y prospectos.
            </p>
          </div>

          ${isAdm ? `
            <button class="btn btn-gold" onclick="productsComponent.openCreateModal()">
              <i class="fa-solid fa-plus"></i> AGREGAR NUEVO PRODUCTO
            </button>
          ` : ''}
        </div>

        <!-- Visual Grid Cards -->
        <h3 style="font-size: 1.05rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fa-solid fa-wine-bottle text-purple"></i> VARIEDADES Y PRODUCTOS DESTACADOS
        </h3>

        ${this.productsList.length === 0 ? `
          <div class="glass-card" style="text-align: center; padding: 40px;">
            <p style="color: var(--text-muted);">No hay productos registrados en el catálogo aún.</p>
          </div>
        ` : `
          <div class="products-grid" style="margin-bottom: 30px;">
            ${this.productsList.map(p => `
              <div class="glass-card" style="text-align: center; border-color: ${p.color || 'rgba(212, 175, 55, 0.3)'}; position: relative;">
                <div style="position: absolute; top: 12px; right: 12px;">
                  ${utils.getStatusBadge(p.status)}
                </div>

                <div style="font-size: 2.2rem; color: ${p.color || '#4cc9f0'}; margin-top: 8px; margin-bottom: 10px;">
                  <i class="fa-solid ${p.icon || 'fa-bottle-droplet'}"></i>
                </div>

                <span class="badge" style="background: rgba(157, 78, 221, 0.2); color: var(--purple-neon-bright); font-size: 0.7rem; margin-bottom: 6px;">
                  ${p.category || 'Mezcal'}
                </span>

                <h4 style="font-size: 1.05rem; color: #fff; margin: 4px 0;">${p.name}</h4>
                <p style="font-size: 0.78rem; color: var(--text-secondary); min-height: 34px; margin: 6px 0 12px 0;">
                  ${p.description || 'Mezcal de alta calidad de la casa.'}
                </p>

                <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-gold); margin-bottom: 14px;">
                  ${utils.formatCurrency(p.price)} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 400;">/ unidad</span>
                </div>

                ${isAdm ? `
                  <div style="display: flex; gap: 8px; justify-content: center; margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                    <button class="btn btn-secondary btn-sm" onclick="productsComponent.openEditModal(${p.id})">
                      <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-icon" onclick="productsComponent.deleteProduct(${p.id})" title="Eliminar Producto">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Data Table Detailed View -->
          <div class="glass-card">
            <h3 style="font-size: 1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-list-check text-gold"></i> LISTADO DETALLADO DE PRODUCTOS
            </h3>
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ÍCONO Y NOMBRE</th>
                    <th>CATEGORÍA</th>
                    <th>DESCRIPCIÓN</th>
                    <th>PRECIO UNITARIO</th>
                    <th>ESTADO</th>
                    ${isAdm ? `<th>ACCIONES</th>` : ''}
                  </tr>
                </thead>
                <tbody>
                  ${this.productsList.map(p => `
                    <tr>
                      <td>
                        <strong style="color: ${p.color || '#fff'}; font-size: 0.95rem;">
                          <i class="fa-solid ${p.icon || 'fa-bottle-droplet'}"></i> ${p.name}
                        </strong>
                      </td>
                      <td><span class="badge badge-status">${p.category || 'Mezcal'}</span></td>
                      <td style="max-width: 280px; font-size: 0.82rem; color: var(--text-secondary);">${p.description || '-'}</td>
                      <td><strong class="text-gold" style="font-size: 1rem;">${utils.formatCurrency(p.price)}</strong></td>
                      <td>${utils.getStatusBadge(p.status)}</td>
                      ${isAdm ? `
                        <td>
                          <div style="display: flex; gap: 6px;">
                            <button class="btn btn-secondary btn-sm btn-icon" onclick="productsComponent.openEditModal(${p.id})" title="Editar Producto">
                              <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="btn btn-danger btn-sm btn-icon" onclick="productsComponent.deleteProduct(${p.id})" title="Eliminar Producto">
                              <i class="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      ` : ''}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `}
      </div>
    `;
  },

  openCreateModal() {
    const content = `
      <form onsubmit="productsComponent.handleCreate(event)">
        <div class="form-group">
          <label class="form-label">Nombre del Producto / Mezcal *</label>
          <input type="text" id="p-name" class="form-input" placeholder="Ej. Spicy Piña 750ml" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Categoría *</label>
            <select id="p-category" class="form-select">
              <option value="Espadín">Espadín</option>
              <option value="Infusionado">Infusionado</option>
              <option value="Silvestre">Silvestre</option>
              <option value="Añejo / Reposado">Añejo / Reposado</option>
              <option value="Paquete / Caja">Paquete / Caja</option>
              <option value="Edición Especial">Edición Especial</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Precio Unitario ($ MXN) *</label>
            <input type="number" id="p-price" class="form-input" placeholder="850.00" step="0.01" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Descripción o Perfil de Sabor</label>
          <textarea id="p-description" class="form-textarea" rows="2" placeholder="Ej. Notas de piña asada al leño con picante de habanero suave..."></textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Ícono FontAwesome</label>
            <select id="p-icon" class="form-select">
              <option value="fa-bottle-droplet">🍾 Botella</option>
              <option value="fa-pepper-hot">🌶️ Chile / Spicy</option>
              <option value="fa-martini-glass-citrus">🍉 Sandía / Coctel</option>
              <option value="fa-lemon">🍋 Limón / Cítrico</option>
              <option value="fa-sun">☀️ Mango / Sol</option>
              <option value="fa-box-open">📦 Caja Surtida</option>
              <option value="fa-fire">🔥 Edición Especial</option>
              <option value="fa-wine-glass">🍷 Copa</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Color Distintivo</label>
            <input type="color" id="p-color" class="form-input" value="#4cc9f0" style="padding: 4px; height: 38px;">
          </div>

          <div class="form-group">
            <label class="form-label">Estado</label>
            <select id="p-status" class="form-select">
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-plus-circle"></i> GUARDAR PRODUCTO EN CATÁLOGO
        </button>
      </form>
    `;

    utils.openModal('AGREGAR NUEVO PRODUCTO AL CATÁLOGO', content);
  },

  async handleCreate(event) {
    event.preventDefault();

    const name = document.getElementById('p-name').value;
    const category = document.getElementById('p-category').value;
    const price = document.getElementById('p-price').value;
    const description = document.getElementById('p-description').value;
    const icon = document.getElementById('p-icon').value;
    const color = document.getElementById('p-color').value;
    const status = document.getElementById('p-status').value;

    try {
      await api.post('/products', { name, category, price, description, icon, color, status });
      utils.showToast('Producto agregado al catálogo exitosamente.', 'success');
      utils.closeModal();
      app.renderView('products');
    } catch (err) {
      utils.showToast(err.message || 'Error al guardar producto.', 'error');
    }
  },

  async openEditModal(id) {
    const product = this.productsList.find(p => p.id === id);
    if (!product) return;

    const content = `
      <form onsubmit="productsComponent.handleEdit(event, ${product.id})">
        <div class="form-group">
          <label class="form-label">Nombre del Producto / Mezcal *</label>
          <input type="text" id="p-name-edit" class="form-input" value="${product.name}" required>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Categoría *</label>
            <select id="p-category-edit" class="form-select">
              <option value="Espadín" ${product.category === 'Espadín' ? 'selected' : ''}>Espadín</option>
              <option value="Infusionado" ${product.category === 'Infusionado' ? 'selected' : ''}>Infusionado</option>
              <option value="Silvestre" ${product.category === 'Silvestre' ? 'selected' : ''}>Silvestre</option>
              <option value="Añejo / Reposado" ${product.category === 'Añejo / Reposado' ? 'selected' : ''}>Añejo / Reposado</option>
              <option value="Paquete / Caja" ${product.category === 'Paquete / Caja' ? 'selected' : ''}>Paquete / Caja</option>
              <option value="Edición Especial" ${product.category === 'Edición Especial' ? 'selected' : ''}>Edición Especial</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Precio Unitario ($ MXN) *</label>
            <input type="number" id="p-price-edit" class="form-input" value="${product.price}" step="0.01" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Descripción o Perfil de Sabor</label>
          <textarea id="p-description-edit" class="form-textarea" rows="2">${product.description || ''}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Ícono FontAwesome</label>
            <select id="p-icon-edit" class="form-select">
              <option value="fa-bottle-droplet" ${product.icon === 'fa-bottle-droplet' ? 'selected' : ''}>🍾 Botella</option>
              <option value="fa-pepper-hot" ${product.icon === 'fa-pepper-hot' ? 'selected' : ''}>🌶️ Chile / Spicy</option>
              <option value="fa-martini-glass-citrus" ${product.icon === 'fa-martini-glass-citrus' || product.icon === 'fa-watermelon-slice' ? 'selected' : ''}>🍉 Sandía / Coctel</option>
              <option value="fa-lemon" ${product.icon === 'fa-lemon' ? 'selected' : ''}>🍋 Limón / Cítrico</option>
              <option value="fa-sun" ${product.icon === 'fa-sun' ? 'selected' : ''}>☀️ Mango / Sol</option>
              <option value="fa-box-open" ${product.icon === 'fa-box-open' ? 'selected' : ''}>📦 Caja Surtida</option>
              <option value="fa-fire" ${product.icon === 'fa-fire' ? 'selected' : ''}>🔥 Edición Especial</option>
              <option value="fa-wine-glass" ${product.icon === 'fa-wine-glass' ? 'selected' : ''}>🍷 Copa</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Color Distintivo</label>
            <input type="color" id="p-color-edit" class="form-input" value="${product.color || '#4cc9f0'}" style="padding: 4px; height: 38px;">
          </div>

          <div class="form-group">
            <label class="form-label">Estado</label>
            <select id="p-status-edit" class="form-select">
              <option value="Activo" ${product.status === 'Activo' ? 'selected' : ''}>Activo</option>
              <option value="Inactivo" ${product.status === 'Inactivo' ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>

        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-floppy-disk"></i> ACTUALIZAR PRODUCTO
        </button>
      </form>
    `;

    utils.openModal(`EDITAR PRODUCTO: ${product.name}`, content);
  },

  async handleEdit(event, id) {
    event.preventDefault();

    const name = document.getElementById('p-name-edit').value;
    const category = document.getElementById('p-category-edit').value;
    const price = document.getElementById('p-price-edit').value;
    const description = document.getElementById('p-description-edit').value;
    const icon = document.getElementById('p-icon-edit').value;
    const color = document.getElementById('p-color-edit').value;
    const status = document.getElementById('p-status-edit').value;

    try {
      await api.put(`/products/${id}`, { name, category, price, description, icon, color, status });
      utils.showToast('Producto actualizado exitosamente.', 'success');
      utils.closeModal();
      app.renderView('products');
    } catch (err) {
      utils.showToast(err.message || 'Error al actualizar producto.', 'error');
    }
  },

  async deleteProduct(id) {
    const product = this.productsList.find(p => p.id === id);
    if (!product) return;

    if (!confirm(`¿Estás seguro de que deseas eliminar el producto "${product.name}" del catálogo?`)) {
      return;
    }

    try {
      await api.delete(`/products/${id}`);
      utils.showToast('Producto eliminado exitosamente.', 'success');
      app.renderView('products');
    } catch (err) {
      utils.showToast(err.message || 'Error al eliminar producto.', 'error');
    }
  }
};
