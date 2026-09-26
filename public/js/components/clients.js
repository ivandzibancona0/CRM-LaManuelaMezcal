// Clients Component
const clientsComponent = {
  clients: [],
  searchTerm: '',
  displayLimit: 12,
  pageSize: 12,
  observer: null,

  async render() {
    this.displayLimit = this.pageSize;
    try {
      this.clients = await api.get('/clients');
    } catch (err) {
      utils.showToast('Error al cargar la lista de clientes.', 'error');
      this.clients = [];
    }

    setTimeout(() => this.attachScrollObserver(), 100);

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-users-between-lines text-gold"></i> CATÁLOGO DE CLIENTES OFICIALES
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              Cuentas comerciales activas y su historial de consumo de mezcal.
            </p>
          </div>

          <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <!-- Buscador en tiempo real -->
            <div style="position: relative; width: 260px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
              <input type="text" id="client-search-input" class="form-input" placeholder="Buscar cliente o empresa..." value="${this.searchTerm}" oninput="clientsComponent.handleSearch(this.value)" style="padding-left: 35px; height: 38px; font-size: 0.85rem; border-radius: 50px;">
            </div>

            <button class="btn btn-gold" onclick="clientsComponent.openCreateModal()">
              <i class="fa-solid fa-user-plus"></i> REGISTRAR CLIENTE
            </button>
          </div>
        </div>

        <div id="clients-grid-container" class="clients-grid">
          ${this.renderGridContent()}
        </div>
      </div>
    `;
  },

  getFilteredClients() {
    if (!this.searchTerm.trim()) return this.clients;
    const q = this.searchTerm.toLowerCase().trim();
    return this.clients.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.company && c.company.toLowerCase().includes(q)) ||
      (c.seller_name && c.seller_name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  },

  handleSearch(query) {
    this.searchTerm = query;
    this.displayLimit = this.pageSize;
    const container = document.getElementById('clients-grid-container');
    if (container) {
      container.innerHTML = this.renderGridContent();
      setTimeout(() => this.attachScrollObserver(), 50);
      const input = document.getElementById('client-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  },

  attachScrollObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const sentinel = document.getElementById('clients-infinite-sentinel');
    if (!sentinel) return;

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore();
      }
    }, { rootMargin: '150px' });

    this.observer.observe(sentinel);
  },

  loadMore() {
    const filtered = this.getFilteredClients();
    if (this.displayLimit < filtered.length) {
      this.displayLimit += this.pageSize;
      const container = document.getElementById('clients-grid-container');
      if (container) {
        container.innerHTML = this.renderGridContent();
        setTimeout(() => this.attachScrollObserver(), 50);
      }
    }
  },

  renderGridContent() {
    const filtered = this.getFilteredClients();
    if (filtered.length === 0) {
      return `
        <div class="glass-card" style="grid-column: 1/-1; text-align: center; padding: 40px 20px;">
          <p style="color: var(--text-muted);">${this.searchTerm ? 'No se encontraron clientes que coincidan con la búsqueda.' : 'No hay clientes registrados aún.'}</p>
        </div>
      `;
    }

    const visibleClients = filtered.slice(0, this.displayLimit);
    const hasMore = this.displayLimit < filtered.length;

    const cardsHtml = visibleClients.map(c => `
      <div class="glass-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <h3 style="font-size: 1.05rem; color: #fff;">${c.name}</h3>
          ${utils.getStatusBadge(c.status)}
        </div>

        ${c.company ? `<div style="font-size: 0.82rem; color: var(--accent-gold); margin-bottom: 12px;"><i class="fa-solid fa-building"></i> ${c.company}</div>` : ''}

        <div style="background: rgba(10, 5, 20, 0.6); padding: 10px 12px; border-radius: var(--radius-md); margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem;">
            <span style="color: var(--text-muted);">Compras Totales:</span>
            <span style="font-weight: 700; color: var(--success-neon);">${utils.formatCurrency(c.total_purchases)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-top: 4px;">
            <span style="color: var(--text-muted);">Vendedor Asignado:</span>
            <span style="color: var(--purple-neon-bright); font-weight: 600;">${c.seller_name}</span>
          </div>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 14px;">
          ${c.phone ? `<div><i class="fa-solid fa-phone text-gold"></i> ${c.phone}</div>` : ''}
          ${c.email ? `<div><i class="fa-solid fa-envelope text-purple"></i> ${c.email}</div>` : ''}
          ${c.address ? `<div style="margin-top: 4px; font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${c.address}</div>` : ''}
        </div>

        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="clientsComponent.viewDetails(${c.id})">
            <i class="fa-solid fa-eye"></i> HISTORIAL
          </button>
          <button class="btn btn-gold btn-sm" style="flex: 1;" onclick="salesComponent.openCreateModal(${c.id})">
            <i class="fa-solid fa-cart-plus"></i> NUEVA VENTA
          </button>
        </div>
      </div>
    `).join('');

    const infiniteScrollFooter = hasMore ? `
      <div id="clients-infinite-sentinel" style="grid-column: 1/-1; text-align: center; padding: 25px 0; color: var(--text-secondary); font-size: 0.85rem;">
        <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 8px;"></i> Cargando más clientes... (${visibleClients.length} de ${filtered.length})
      </div>
    ` : `
      <div style="grid-column: 1/-1; text-align: center; padding: 18px 0; color: var(--text-muted); font-size: 0.8rem;">
        <i class="fa-solid fa-circle-check text-gold" style="margin-right: 6px;"></i> Mostrando todos los ${filtered.length} clientes
      </div>
    `;

    return cardsHtml + infiniteScrollFooter;
  },

  async viewDetails(id) {
    try {
      const data = await api.get(`/clients/${id}`);
      this.activeClientSales = data.sales || [];
      this.modalSalesLimit = 10;

      const renderModalContent = () => {
        const sales = this.activeClientSales;
        const visibleSales = sales.slice(0, this.modalSalesLimit);
        const hasMore = this.modalSalesLimit < sales.length;

        return `
          <div>
            <div style="margin-bottom: 18px; padding-bottom: 12px; border-bottom: 1px solid var(--border-glass);">
              <h4 style="font-size: 1.1rem; color: #fff;">${data.name} ${data.company ? `(${data.company})` : ''}</h4>
              <p style="font-size: 0.82rem; color: var(--accent-gold); margin-top: 4px;">
                <i class="fa-solid fa-location-dot"></i> ${data.address || 'Sin dirección registrada'}
              </p>
            </div>

            <h5 style="font-size: 0.9rem; color: var(--purple-neon-bright); margin-bottom: 10px;">
              <i class="fa-solid fa-receipt"></i> Historial de Compras de Mezcal (${sales.length})
            </h5>

            ${sales.length === 0 ? `
              <p style="font-size: 0.82rem; color: var(--text-muted);">No se han registrado ventas aún para este cliente.</p>
            ` : `
              <div class="table-responsive" id="modal-sales-container" style="max-height: 320px; overflow-y: auto; margin-bottom: 15px; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
                <table class="data-table">
                  <thead style="position: sticky; top: 0; background: rgba(15, 10, 30, 0.95); z-index: 2;">
                    <tr>
                      <th>PRODUCTO</th>
                      <th>CANTIDAD</th>
                      <th>MONTO</th>
                      <th>FECHA</th>
                    </tr>
                  </thead>
                  <tbody id="modal-sales-tbody">
                    ${visibleSales.map(s => `
                      <tr>
                        <td>${s.product}</td>
                        <td>${s.bottles_count} botellas</td>
                        <td><strong class="text-gold">${utils.formatCurrency(s.total_amount)}</strong></td>
                        <td>${utils.formatDate(s.sale_date)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ${hasMore ? `
                  <div id="modal-sales-sentinel" style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.8rem;">
                    <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 6px;"></i> Cargando más compras... (${visibleSales.length} de ${sales.length})
                  </div>
                ` : `
                  <div style="text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.78rem;">
                    <i class="fa-solid fa-circle-check text-gold" style="margin-right: 4px;"></i> Mostrando las ${sales.length} compras
                  </div>
                `}
              </div>
            `}
          </div>
        `;
      };

      utils.openModal(`Detalle del Cliente: ${data.name}`, renderModalContent());

      if (this.activeClientSales.length > 0) {
        setTimeout(() => this.attachModalSalesObserver(), 100);
      }
    } catch (err) {
      utils.showToast(err.message || 'Error al obtener cliente.', 'error');
    }
  },

  attachModalSalesObserver() {
    if (this.modalSalesObserver) {
      this.modalSalesObserver.disconnect();
    }

    const sentinel = document.getElementById('modal-sales-sentinel');
    const container = document.getElementById('modal-sales-container');
    if (!sentinel || !container) return;

    this.modalSalesObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMoreModalSales();
      }
    }, { root: container, threshold: 0.1 });

    this.modalSalesObserver.observe(sentinel);
  },

  loadMoreModalSales() {
    const sales = this.activeClientSales;
    if (this.modalSalesLimit < sales.length) {
      this.modalSalesLimit += 10;
      const visibleSales = sales.slice(0, this.modalSalesLimit);
      const tbody = document.getElementById('modal-sales-tbody');
      if (tbody) {
        tbody.innerHTML = visibleSales.map(s => `
          <tr>
            <td>${s.product}</td>
            <td>${s.bottles_count} botellas</td>
            <td><strong class="text-gold">${utils.formatCurrency(s.total_amount)}</strong></td>
            <td>${utils.formatDate(s.sale_date)}</td>
          </tr>
        `).join('');
      }

      const hasMore = this.modalSalesLimit < sales.length;
      const sentinel = document.getElementById('modal-sales-sentinel');
      if (sentinel) {
        if (hasMore) {
          sentinel.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 6px;"></i> Cargando más compras... (${visibleSales.length} de ${sales.length})`;
          setTimeout(() => this.attachModalSalesObserver(), 50);
        } else {
          sentinel.outerHTML = `
            <div style="text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.78rem;">
              <i class="fa-solid fa-circle-check text-gold" style="margin-right: 4px;"></i> Mostrando las ${sales.length} compras
            </div>
          `;
        }
      }
    }
  },

  openCreateModal() {
    const content = `
      <form onsubmit="clientsComponent.handleCreate(event)">
        <div class="form-group">
          <label class="form-label">Nombre del Cliente / Contacto *</label>
          <input type="text" id="c-name" class="form-input" placeholder="Ej. Restaurante El Agave" required>
        </div>

        <div class="form-group">
          <label class="form-label">Empresa / Razón Social</label>
          <input type="text" id="c-company" class="form-input" placeholder="Ej. Agave CDMX S.A.">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" id="c-phone" class="form-input" placeholder="555-000-0000">
          </div>
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" id="c-email" class="form-input" placeholder="cliente@dominio.com">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Dirección de Entrega / Facturación</label>
          <input type="text" id="c-address" class="form-input" placeholder="Calle, Número, Colonia, Ciudad">
        </div>

        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-save"></i> GUARDAR CLIENTE
        </button>
      </form>
    `;

    utils.openModal('Registrar Nuevo Cliente', content);
  },

  async handleCreate(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('c-name').value,
      company: document.getElementById('c-company').value,
      phone: document.getElementById('c-phone').value,
      email: document.getElementById('c-email').value,
      address: document.getElementById('c-address').value
    };

    try {
      await api.post('/clients', payload);
      utils.showToast('Cliente guardado correctamente.', 'success');
      utils.closeModal();
      app.renderView('clients');
    } catch (err) {
      utils.showToast(err.message || 'Error guardando cliente.', 'error');
    }
  }
};
