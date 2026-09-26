// Sales Component
const salesComponent = {
  sales: [],
  searchTerm: '',
  startDate: '',
  endDate: '',
  displayLimit: 15,
  pageSize: 15,
  observer: null,

  async render() {
    this.displayLimit = this.pageSize;
    try {
      this.sales = await api.get('/sales');
    } catch (err) {
      utils.showToast('Error cargando ventas.', 'error');
      this.sales = [];
    }

    const hasActiveFilters = this.searchTerm || this.startDate || this.endDate;
    setTimeout(() => this.attachScrollObserver(), 100);

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-cart-shopping text-gold"></i> REGISTRO DE VENTAS DE MEZCAL
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              Historial de pedidos cerrados y facturación por variedades.
            </p>
          </div>

          <button class="btn btn-gold" onclick="salesComponent.openCreateModal()">
            <i class="fa-solid fa-cart-plus"></i> REGISTRAR NUEVA VENTA
          </button>
        </div>

        <!-- Barra de Filtros: Búsqueda y Rango de Fechas -->
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; background: rgba(255, 255, 255, 0.03); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <!-- Buscador de texto -->
          <div style="position: relative; flex: 1; min-width: 240px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
            <input type="text" id="sales-search-input" class="form-input" placeholder="Buscar por cliente, empresa o producto..." value="${this.searchTerm}" oninput="salesComponent.handleSearch(this.value)" style="padding-left: 35px; height: 38px; font-size: 0.85rem; border-radius: 50px;">
          </div>

          <!-- Rango de Fechas -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;"><i class="fa-solid fa-calendar-days text-gold"></i> Desde:</span>
            <input type="date" id="sales-start-date" class="form-input" value="${this.startDate}" onchange="salesComponent.handleDateFilter(this.value, salesComponent.endDate)" style="height: 38px; font-size: 0.82rem; width: 140px; border-radius: var(--radius-sm);">
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;"><i class="fa-solid fa-calendar-check text-purple"></i> Hasta:</span>
            <input type="date" id="sales-end-date" class="form-input" value="${this.endDate}" onchange="salesComponent.handleDateFilter(salesComponent.startDate, this.value)" style="height: 38px; font-size: 0.82rem; width: 140px; border-radius: var(--radius-sm);">
          </div>

          <!-- Botón de Limpiar Filtros -->
          ${hasActiveFilters ? `
            <button class="btn btn-secondary btn-sm" onclick="salesComponent.clearFilters()" title="Limpiar todos los filtros" style="height: 38px; padding: 0 14px; border-radius: 50px;">
              <i class="fa-solid fa-filter-circle-xmark"></i> Limpiar
            </button>
          ` : ''}
        </div>

        <div class="glass-card" id="sales-table-container">
          ${this.renderTableContent()}
        </div>
      </div>
    `;
  },

  getFilteredSales() {
    return this.sales.filter(s => {
      // 1. Filtrado por texto (Cliente, Empresa, Producto, Vendedor)
      if (this.searchTerm.trim()) {
        const q = this.searchTerm.toLowerCase().trim();
        const matchesText = (s.client_name && s.client_name.toLowerCase().includes(q)) ||
                            (s.client_company && s.client_company.toLowerCase().includes(q)) ||
                            (s.product && s.product.toLowerCase().includes(q)) ||
                            (s.seller_name && s.seller_name.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      // 2. Filtrado por rango de fecha (Desde / Hasta)
      if (s.sale_date) {
        const saleDateStr = s.sale_date.split('T')[0];
        if (this.startDate && saleDateStr < this.startDate) return false;
        if (this.endDate && saleDateStr > this.endDate) return false;
      }

      return true;
    });
  },

  handleSearch(query) {
    this.searchTerm = query;
    this.displayLimit = this.pageSize;
    const container = document.getElementById('sales-table-container');
    if (container) {
      container.innerHTML = this.renderTableContent();
      setTimeout(() => this.attachScrollObserver(), 50);
      const input = document.getElementById('sales-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  },

  handleDateFilter(start, end) {
    this.startDate = start;
    this.endDate = end;
    this.displayLimit = this.pageSize;
    app.renderView('sales');
  },

  clearFilters() {
    this.searchTerm = '';
    this.startDate = '';
    this.endDate = '';
    this.displayLimit = this.pageSize;
    app.renderView('sales');
  },

  attachScrollObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const sentinel = document.getElementById('sales-infinite-sentinel');
    if (!sentinel) return;

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore();
      }
    }, { rootMargin: '150px' });

    this.observer.observe(sentinel);
  },

  loadMore() {
    const filtered = this.getFilteredSales();
    if (this.displayLimit < filtered.length) {
      this.displayLimit += this.pageSize;
      const container = document.getElementById('sales-table-container');
      if (container) {
        container.innerHTML = this.renderTableContent();
        setTimeout(() => this.attachScrollObserver(), 50);
      }
    }
  },

  renderTableContent() {
    const filtered = this.getFilteredSales();

    if (filtered.length === 0) {
      return `<p style="color: var(--text-muted); text-align: center; padding: 30px;">${(this.searchTerm || this.startDate || this.endDate) ? 'No se encontraron ventas que coincidan con los filtros seleccionados.' : 'No se han registrado ventas aún.'}</p>`;
    }

    const visibleSales = filtered.slice(0, this.displayLimit);
    const hasMore = this.displayLimit < filtered.length;

    const tableHtml = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>FECHA</th>
              <th>CLIENTE / EMPRESA</th>
              <th>VARIEDAD DE MEZCAL</th>
              <th>BOTELLAS</th>
              <th>MONTO TOTAL</th>
              <th>ESTADO PAGO</th>
              <th>VENDEDOR</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            ${visibleSales.map(s => `
              <tr>
                <td>${utils.formatDate(s.sale_date)}</td>
                <td><strong>${s.client_name}</strong> ${s.client_company ? `(${s.client_company})` : ''}</td>
                <td><span class="text-purple"><i class="fa-solid fa-wine-bottle"></i> ${s.product}</span></td>
                <td><strong>${s.bottles_count}</strong> pzas</td>
                <td><strong class="text-gold" style="font-size: 1rem;">${utils.formatCurrency(s.total_amount)}</strong></td>
                <td>${utils.getStatusBadge(s.payment_status)}</td>
                <td>${s.seller_name}</td>
                <td>
                  <button class="btn btn-danger btn-sm btn-icon" onclick="salesComponent.deleteSale(${s.id})" title="Eliminar Venta">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const footerHtml = hasMore ? `
      <div id="sales-infinite-sentinel" style="text-align: center; padding: 20px 0; color: var(--text-secondary); font-size: 0.85rem;">
        <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 8px;"></i> Cargando más ventas... (${visibleSales.length} de ${filtered.length})
      </div>
    ` : `
      <div style="text-align: center; padding: 15px 0; color: var(--text-muted); font-size: 0.8rem;">
        <i class="fa-solid fa-circle-check text-gold" style="margin-right: 6px;"></i> Mostrando las ${filtered.length} ventas
      </div>
    `;

    return tableHtml + footerHtml;
  },

  async openCreateModal(preselectedClientId = null) {
    let clients = [];
    let products = [];
    try {
      [clients, products] = await Promise.all([
        api.get('/clients'),
        api.get('/products?status=Activo')
      ]);
    } catch (err) {
      utils.showToast('Error cargando datos para el registro de venta.', 'error');
    }

    if (clients.length === 0) {
      utils.showToast('Debes tener al menos un cliente registrado para realizar una venta.', 'error');
      clientsComponent.openCreateModal();
      return;
    }

    const content = `
      <form onsubmit="salesComponent.handleCreate(event)">
        <div class="form-group">
          <label class="form-label">Seleccionar Cliente *</label>
          <select id="s-client" class="form-select" required>
            ${clients.map(c => `
              <option value="${c.id}" ${c.id === preselectedClientId ? 'selected' : ''}>${c.name} ${c.company ? `(${c.company})` : ''}</option>
            `).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Variedad / Producto de Mezcal *</label>
          <select id="s-product" class="form-select" required>
            ${products.length > 0 ? products.map(p => `
              <option value="${p.name}">${p.name} ($${p.price} c/u)</option>
            `).join('') : `
              <option value="Mezcal Espadín 750ml">Mezcal Espadín 750ml</option>
              <option value="Spicy Tamarindo 750ml">Spicy Tamarindo 750ml</option>
              <option value="Spicy Sandía 750ml">Spicy Sandía 750ml</option>
              <option value="Spicy Mango 750ml">Spicy Mango 750ml</option>
              <option value="Caja Surtida Mezcal">Caja Surtida Mezcal</option>
            `}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Número de Botellas *</label>
            <input type="number" id="s-bottles" class="form-input" min="1" value="12" required>
          </div>
          <div class="form-group">
            <label class="form-label">Monto Total ($ MXN) *</label>
            <input type="number" id="s-amount" class="form-input" placeholder="9000" step="0.01" required>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Estado del Pago</label>
            <select id="s-payment" class="form-select">
              <option value="Pagado">Pagado</option>
              <option value="Pendiente">Pendiente por Cobrar</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha de Venta</label>
            <input type="date" id="s-date" class="form-input" value="${new Date().toISOString().split('T')[0]}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notas u Observaciones</label>
          <textarea id="s-notes" class="form-textarea" rows="2" placeholder="Condiciones de pago, facturación..."></textarea>
        </div>

        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-check"></i> GUARDAR VENTA
        </button>
      </form>
    `;

    utils.openModal('Registrar Nueva Venta', content);
  },

  async handleCreate(e) {
    e.preventDefault();
    const payload = {
      client_id: document.getElementById('s-client').value,
      product: document.getElementById('s-product').value,
      bottles_count: document.getElementById('s-bottles').value,
      total_amount: document.getElementById('s-amount').value,
      payment_status: document.getElementById('s-payment').value,
      sale_date: document.getElementById('s-date').value,
      notes: document.getElementById('s-notes').value
    };

    try {
      await api.post('/sales', payload);
      utils.showToast('¡Venta registrada exitosamente!', 'success');
      utils.closeModal();
      app.renderView('sales');
    } catch (err) {
      utils.showToast(err.message || 'Error registrando venta.', 'error');
    }
  },

  async deleteSale(id) {
    if (confirm('¿Estás seguro de eliminar este registro de venta?')) {
      try {
        await api.delete(`/sales/${id}`);
        utils.showToast('Venta eliminada.', 'success');
        app.renderView('sales');
      } catch (err) {
        utils.showToast(err.message || 'Error al eliminar venta.', 'error');
      }
    }
  }
};
