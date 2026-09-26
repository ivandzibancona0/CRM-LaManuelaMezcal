// Reports Component (Admin Only - Full CRM CSV & Audit Generator with Infinite Scroll)
const reportsComponent = {
  reportData: null,
  sellers: [],
  selectedSeller: '',
  startDate: '',
  endDate: '',
  pageSize: 10,
  limitSellers: 10,
  limitFollowups: 10,
  limitProspects: 10,
  limitClients: 10,
  limitSales: 10,
  observers: {},

  async render() {
    if (!auth.isAdmin()) {
      return `<div class="glass-card" style="text-align: center; padding: 40px;"><h3 class="text-danger">Acceso Restringido. Módulo solo para Administradores.</h3></div>`;
    }

    this.resetLimits();

    try {
      this.sellers = await api.get('/users');
      await this.fetchReportData();
    } catch (err) {
      console.error(err);
      utils.showToast('Error cargando reportes.', 'error');
    }

    const sellerStats = this.reportData ? (this.reportData.sellerStats || []) : [];
    const followups = this.reportData ? (this.reportData.followups || []) : [];
    const prospects = this.reportData ? (this.reportData.prospects || []) : [];
    const clients = this.reportData ? (this.reportData.clients || []) : [];
    const sales = this.reportData ? (this.reportData.sales || []) : [];

    // Summary calculations
    const grandFollowups = followups.length;
    const grandCompleted = followups.filter(f => f.status === 'Completado').length;
    const grandProspects = prospects.length;
    const grandClients = clients.length;
    const grandSalesTotal = sales.reduce((acc, s) => acc + (parseFloat(s.total_amount) || 0), 0);
    const grandBottles = sales.reduce((acc, s) => acc + (parseInt(s.bottles_count) || 0), 0);

    setTimeout(() => this.attachAllObservers(), 100);

    return `
      <div>
        <!-- Title & CSV Export Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-file-csv text-gold"></i> GENERADOR DE REPORTES Y EXPORTACIÓN CSV
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              Auditoría integral por rango de fechas: Vendedores, Seguimientos, Prospectos, Clientes y Ventas.
            </p>
          </div>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-success" onclick="reportsComponent.downloadCsv('all')">
              <i class="fa-solid fa-download"></i> EXPORTAR CSV CONSOLIDADO
            </button>
            <button class="btn btn-gold" onclick="window.print()">
              <i class="fa-solid fa-print"></i> IMPRIMIR / PDF
            </button>
          </div>
        </div>

        <!-- Filter Control Panel -->
        <div class="glass-card" style="margin-bottom: 24px;">
          <form onsubmit="reportsComponent.applyFilter(event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; align-items: end;">
            
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label"><i class="fa-solid fa-user-tag text-purple"></i> Vendedor</label>
              <select id="rep-seller" class="form-select">
                <option value="">Todos los Vendedores</option>
                ${this.sellers.filter(u => u.role === 'vendedor').map(s => `
                  <option value="${s.id}" ${this.selectedSeller == s.id ? 'selected' : ''}>${s.name}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label"><i class="fa-solid fa-calendar-day text-gold"></i> Fecha Inicio</label>
              <input type="date" id="rep-start" class="form-input" value="${this.startDate}">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label"><i class="fa-solid fa-calendar-day text-gold"></i> Fecha Fin</label>
              <input type="date" id="rep-end" class="form-input" value="${this.endDate}">
            </div>

            <div style="display: flex; gap: 8px;">
              <button type="submit" class="btn btn-primary" style="flex: 1;">
                <i class="fa-solid fa-filter"></i> FILTRAR
              </button>
              <button type="button" class="btn btn-secondary" onclick="reportsComponent.resetFilters()">
                <i class="fa-solid fa-rotate-left"></i> LIMPIAR
              </button>
            </div>

          </form>
        </div>

        <!-- KPI Cards Summary -->
        <div class="dashboard-grid" style="margin-bottom: 24px;">
          
          <div class="glass-card" style="text-align: center;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">SEGUIMIENTOS</div>
            <div style="font-size: 2rem; font-weight: 800; color: #fff; margin-top: 6px;">${grandFollowups}</div>
            <div style="font-size: 0.75rem; color: var(--success-neon); margin-top: 4px;">${grandCompleted} completados</div>
          </div>

          <div class="glass-card" style="text-align: center;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">PROSPECTOS</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--accent-gold); margin-top: 6px;">${grandProspects}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">En seguimiento / pipeline</div>
          </div>

          <div class="glass-card" style="text-align: center;">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">CLIENTES</div>
            <div style="font-size: 2rem; font-weight: 800; color: var(--purple-bright); margin-top: 6px;">${grandClients}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">Cartera activa</div>
          </div>

          <div class="glass-card" style="text-align: center; border-color: var(--success-neon);">
            <div style="font-size: 0.78rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">VENTAS TOTALES</div>
            <div style="font-size: 1.8rem; font-weight: 800; color: var(--success-neon); margin-top: 6px;">$${grandSalesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${grandBottles} botellas vendidas</div>
          </div>

        </div>

        <!-- Tabla 1: Resumen de Vendedores -->
        <div class="glass-card" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 8px; margin: 0;">
              <i class="fa-solid fa-users text-gold"></i> 1. RESUMEN DE VENDEDORES (${sellerStats.length})
            </h3>
            <button class="btn btn-sm btn-secondary" onclick="reportsComponent.downloadCsv('sellers')">
              <i class="fa-solid fa-file-csv"></i> Exportar CSV Vendedores
            </button>
          </div>

          <div class="table-responsive" id="rep-container-sellers" style="max-height: 360px; overflow-y: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
            ${this.renderSellersTableContent()}
          </div>
        </div>

        <!-- Tabla 2: Bitácora de Seguimientos -->
        <div class="glass-card" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 8px; margin: 0;">
              <i class="fa-solid fa-list-check text-purple"></i> 2. BITÁCORA DE SEGUIMIENTOS (${followups.length})
            </h3>
            <button class="btn btn-sm btn-secondary" onclick="reportsComponent.downloadCsv('followups')">
              <i class="fa-solid fa-file-csv"></i> Exportar CSV Seguimientos
            </button>
          </div>

          <div class="table-responsive" id="rep-container-followups" style="max-height: 360px; overflow-y: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
            ${this.renderFollowupsTableContent()}
          </div>
        </div>

        <!-- Tabla 3: Registro de Prospectos -->
        <div class="glass-card" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 8px; margin: 0;">
              <i class="fa-solid fa-bullseye text-gold"></i> 3. REGISTRO DE PROSPECTOS (${prospects.length})
            </h3>
            <button class="btn btn-sm btn-secondary" onclick="reportsComponent.downloadCsv('prospects')">
              <i class="fa-solid fa-file-csv"></i> Exportar CSV Prospectos
            </button>
          </div>

          <div class="table-responsive" id="rep-container-prospects" style="max-height: 360px; overflow-y: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
            ${this.renderProspectsTableContent()}
          </div>
        </div>

        <!-- Tabla 4: Cartera de Clientes -->
        <div class="glass-card" style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 8px; margin: 0;">
              <i class="fa-solid fa-building text-purple"></i> 4. CARTERA DE CLIENTES (${clients.length})
            </h3>
            <button class="btn btn-sm btn-secondary" onclick="reportsComponent.downloadCsv('clients')">
              <i class="fa-solid fa-file-csv"></i> Exportar CSV Clientes
            </button>
          </div>

          <div class="table-responsive" id="rep-container-clients" style="max-height: 360px; overflow-y: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
            ${this.renderClientsTableContent()}
          </div>
        </div>

        <!-- Tabla 5: Registro de Ventas -->
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 8px; margin: 0;">
              <i class="fa-solid fa-receipt text-gold"></i> 5. REGISTRO DE VENTAS (${sales.length})
            </h3>
            <button class="btn btn-sm btn-secondary" onclick="reportsComponent.downloadCsv('sales')">
              <i class="fa-solid fa-file-csv"></i> Exportar CSV Ventas
            </button>
          </div>

          <div class="table-responsive" id="rep-container-sales" style="max-height: 360px; overflow-y: auto; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
            ${this.renderSalesTableContent()}
          </div>
        </div>

      </div>
    `;
  },

  resetLimits() {
    this.limitSellers = this.pageSize;
    this.limitFollowups = this.pageSize;
    this.limitProspects = this.pageSize;
    this.limitClients = this.pageSize;
    this.limitSales = this.pageSize;
  },

  // Table 1 Content: Sellers
  renderSellersTableContent() {
    const sellerStats = this.reportData ? (this.reportData.sellerStats || []) : [];
    if (!sellerStats.length) {
      return `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No se encontraron registros de vendedores para el filtro seleccionado.</p>`;
    }

    const visible = sellerStats.slice(0, this.limitSellers);
    const hasMore = this.limitSellers < sellerStats.length;

    return `
      <table class="data-table">
        <thead style="position: sticky; top: 0; background: rgba(15, 10, 30, 0.95); z-index: 2;">
          <tr>
            <th>VENDEDOR</th>
            <th>EMAIL</th>
            <th>TELEFONO</th>
            <th>SEGUIMIENTOS</th>
            <th>COMPLETADOS</th>
            <th>PROSPECTOS</th>
            <th>CLIENTES</th>
            <th>BOTELLAS</th>
            <th>VENTAS TOTALES</th>
          </tr>
        </thead>
        <tbody id="rep-tbody-sellers">
          ${visible.map(s => `
            <tr>
              <td><strong>${s.seller_name}</strong></td>
              <td><span style="font-size: 0.8rem; color: var(--text-muted);">${s.seller_email}</span></td>
              <td>${s.seller_phone}</td>
              <td><strong>${s.total_followups}</strong></td>
              <td><strong style="color: var(--success-neon);">${s.completed_followups}</strong></td>
              <td>${s.total_prospects}</td>
              <td>${s.total_clients}</td>
              <td>${s.total_bottles}</td>
              <td><strong style="color: var(--success-neon);">$${parseFloat(s.total_sales).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${hasMore ? `
        <div id="rep-sentinel-sellers" style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.8rem;">
          <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 6px;"></i> Cargando más vendedores... (${visible.length} de ${sellerStats.length})
        </div>
      ` : `
        <div style="text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.78rem;">
          <i class="fa-solid fa-circle-check text-gold" style="margin-right: 4px;"></i> Mostrando los ${sellerStats.length} vendedores
        </div>
      `}
    `;
  },

  // Table 2 Content: Followups
  renderFollowupsTableContent() {
    const followups = this.reportData ? (this.reportData.followups || []) : [];
    if (!followups.length) {
      return `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No se encontraron seguimientos para el filtro seleccionado.</p>`;
    }

    const visible = followups.slice(0, this.limitFollowups);
    const hasMore = this.limitFollowups < followups.length;

    return `
      <table class="data-table">
        <thead style="position: sticky; top: 0; background: rgba(15, 10, 30, 0.95); z-index: 2;">
          <tr>
            <th>FECHA</th>
            <th>VENDEDOR</th>
            <th>TIPO</th>
            <th>CONTACTO VINCULADO</th>
            <th>RESUMEN / OBJETIVO</th>
            <th>ESTADO</th>
            <th>RESULTADO</th>
          </tr>
        </thead>
        <tbody id="rep-tbody-followups">
          ${visible.map(l => `
            <tr>
              <td>${utils.formatDateTime(l.followup_date)}</td>
              <td><strong>${l.seller_name}</strong></td>
              <td><span class="badge badge-vendedor">${l.type}</span></td>
              <td>${l.prospect_name || l.client_name || 'Sin vincular'} ${l.prospect_company ? `(${l.prospect_company})` : ''}</td>
              <td><strong>${l.summary}</strong></td>
              <td>${utils.getStatusBadge(l.status)}</td>
              <td><span style="font-size: 0.8rem; color: var(--accent-gold);">${l.result || 'Pendiente de resultado'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${hasMore ? `
        <div id="rep-sentinel-followups" style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.8rem;">
          <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 6px;"></i> Cargando más seguimientos... (${visible.length} de ${followups.length})
        </div>
      ` : `
        <div style="text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.78rem;">
          <i class="fa-solid fa-circle-check text-gold" style="margin-right: 4px;"></i> Mostrando los ${followups.length} seguimientos
        </div>
      `}
    `;
  },

  // Table 3 Content: Prospects
  renderProspectsTableContent() {
    const prospects = this.reportData ? (this.reportData.prospects || []) : [];
    if (!prospects.length) {
      return `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No se encontraron prospectos para el filtro seleccionado.</p>`;
    }

    const visible = prospects.slice(0, this.limitProspects);
    const hasMore = this.limitProspects < prospects.length;

    return `
      <table class="data-table">
        <thead style="position: sticky; top: 0; background: rgba(15, 10, 30, 0.95); z-index: 2;">
          <tr>
            <th>FECHA REGISTRO</th>
            <th>VENDEDOR</th>
            <th>PROSPECTO</th>
            <th>EMPRESA</th>
            <th>EMAIL / TEL.</th>
            <th>ESTADO</th>
            <th>VALOR EST.</th>
            <th>INTERÉS</th>
          </tr>
        </thead>
        <tbody id="rep-tbody-prospects">
          ${visible.map(p => `
            <tr>
              <td>${utils.formatDateTime(p.created_at)}</td>
              <td><strong>${p.seller_name}</strong></td>
              <td><strong>${p.name}</strong></td>
              <td>${p.company || 'N/A'}</td>
              <td><span style="font-size: 0.8rem;">${p.email || 'N/A'}<br>${p.phone || ''}</span></td>
              <td>${utils.getStatusBadge(p.status)}</td>
              <td><strong style="color: var(--accent-gold);">$${parseFloat(p.estimated_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
              <td>${p.product_interest || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${hasMore ? `
        <div id="rep-sentinel-prospects" style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.8rem;">
          <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 6px;"></i> Cargando más prospectos... (${visible.length} de ${prospects.length})
        </div>
      ` : `
        <div style="text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.78rem;">
          <i class="fa-solid fa-circle-check text-gold" style="margin-right: 4px;"></i> Mostrando los ${prospects.length} prospectos
        </div>
      `}
    `;
  },

  // Table 4 Content: Clients
  renderClientsTableContent() {
    const clients = this.reportData ? (this.reportData.clients || []) : [];
    if (!clients.length) {
      return `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No se encontraron clientes para el filtro seleccionado.</p>`;
    }

    const visible = clients.slice(0, this.limitClients);
    const hasMore = this.limitClients < clients.length;

    return `
      <table class="data-table">
        <thead style="position: sticky; top: 0; background: rgba(15, 10, 30, 0.95); z-index: 2;">
          <tr>
            <th>FECHA REGISTRO</th>
            <th>VENDEDOR</th>
            <th>CLIENTE</th>
            <th>EMPRESA</th>
            <th>CONTACTO</th>
            <th>DIRECCIÓN</th>
            <th>COMPRAS TOTALES</th>
            <th>ESTADO</th>
          </tr>
        </thead>
        <tbody id="rep-tbody-clients">
          ${visible.map(c => `
            <tr>
              <td>${utils.formatDateTime(c.created_at)}</td>
              <td><strong>${c.seller_name}</strong></td>
              <td><strong>${c.name}</strong></td>
              <td>${c.company || 'N/A'}</td>
              <td><span style="font-size: 0.8rem;">${c.email || 'N/A'}<br>${c.phone || ''}</span></td>
              <td><span style="font-size: 0.8rem; color: var(--text-muted);">${c.address || 'N/A'}</span></td>
              <td><strong style="color: var(--success-neon);">$${parseFloat(c.total_purchases || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
              <td><span class="badge ${c.status === 'Activo' ? 'badge-ganado' : 'badge-perdido'}">${c.status}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${hasMore ? `
        <div id="rep-sentinel-clients" style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.8rem;">
          <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 6px;"></i> Cargando más clientes... (${visible.length} de ${clients.length})
        </div>
      ` : `
        <div style="text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.78rem;">
          <i class="fa-solid fa-circle-check text-gold" style="margin-right: 4px;"></i> Mostrando los ${clients.length} clientes
        </div>
      `}
    `;
  },

  // Table 5 Content: Sales
  renderSalesTableContent() {
    const sales = this.reportData ? (this.reportData.sales || []) : [];
    if (!sales.length) {
      return `<p style="color: var(--text-muted); text-align: center; padding: 20px;">No se encontraron ventas para el filtro seleccionado.</p>`;
    }

    const visible = sales.slice(0, this.limitSales);
    const hasMore = this.limitSales < sales.length;

    return `
      <table class="data-table">
        <thead style="position: sticky; top: 0; background: rgba(15, 10, 30, 0.95); z-index: 2;">
          <tr>
            <th>FECHA VENTA</th>
            <th>VENDEDOR</th>
            <th>CLIENTE</th>
            <th>PRODUCTO</th>
            <th>BOTELLAS</th>
            <th>MONTO TOTAL</th>
            <th>ESTADO PAGO</th>
            <th>NOTAS</th>
          </tr>
        </thead>
        <tbody id="rep-tbody-sales">
          ${visible.map(s => `
            <tr>
              <td>${s.sale_date}</td>
              <td><strong>${s.seller_name}</strong></td>
              <td><strong>${s.client_name}</strong> ${s.client_company ? `<br><span style="font-size:0.75rem; color:var(--text-muted);">${s.client_company}</span>` : ''}</td>
              <td><span class="badge badge-vendedor">${s.product}</span></td>
              <td><strong>${s.bottles_count}</strong></td>
              <td><strong style="color: var(--success-neon);">$${parseFloat(s.total_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></td>
              <td><span class="badge ${s.payment_status === 'Pagado' ? 'badge-ganado' : 'badge-pendiente'}">${s.payment_status}</span></td>
              <td><span style="font-size: 0.8rem; color: var(--text-muted);">${s.notes || 'N/A'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${hasMore ? `
        <div id="rep-sentinel-sales" style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.8rem;">
          <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 6px;"></i> Cargando más ventas... (${visible.length} de ${sales.length})
        </div>
      ` : `
        <div style="text-align: center; padding: 10px; color: var(--text-muted); font-size: 0.78rem;">
          <i class="fa-solid fa-circle-check text-gold" style="margin-right: 4px;"></i> Mostrando las ${sales.length} ventas
        </div>
      `}
    `;
  },

  // Attach Observers for all 5 tables
  attachAllObservers() {
    this.attachTableObserver('sellers', 'rep-sentinel-sellers', 'rep-container-sellers', 'sellerStats');
    this.attachTableObserver('followups', 'rep-sentinel-followups', 'rep-container-followups', 'followups');
    this.attachTableObserver('prospects', 'rep-sentinel-prospects', 'rep-container-prospects', 'prospects');
    this.attachTableObserver('clients', 'rep-sentinel-clients', 'rep-container-clients', 'clients');
    this.attachTableObserver('sales', 'rep-sentinel-sales', 'rep-container-sales', 'sales');
  },

  attachTableObserver(key, sentinelId, containerId, dataKey) {
    if (this.observers[key]) {
      this.observers[key].disconnect();
    }

    const sentinel = document.getElementById(sentinelId);
    const container = document.getElementById(containerId);
    if (!sentinel || !container) return;

    this.observers[key] = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMoreTable(key, dataKey, containerId);
      }
    }, { root: container, threshold: 0.1 });

    this.observers[key].observe(sentinel);
  },

  loadMoreTable(key, dataKey, containerId) {
    const list = this.reportData ? (this.reportData[dataKey] || []) : [];
    const limitProp = 'limit' + key.charAt(0).toUpperCase() + key.slice(1);

    if (this[limitProp] < list.length) {
      this[limitProp] += this.pageSize;
      const container = document.getElementById(containerId);
      if (container) {
        if (key === 'sellers') container.innerHTML = this.renderSellersTableContent();
        else if (key === 'followups') container.innerHTML = this.renderFollowupsTableContent();
        else if (key === 'prospects') container.innerHTML = this.renderProspectsTableContent();
        else if (key === 'clients') container.innerHTML = this.renderClientsTableContent();
        else if (key === 'sales') container.innerHTML = this.renderSalesTableContent();

        const sentinelId = `rep-sentinel-${key}`;
        setTimeout(() => this.attachTableObserver(key, sentinelId, containerId, dataKey), 50);
      }
    }
  },

  async fetchReportData() {
    let query = '/reports/full?';
    if (this.selectedSeller) query += `seller_id=${this.selectedSeller}&`;
    if (this.startDate) query += `start_date=${this.startDate}&`;
    if (this.endDate) query += `end_date=${this.endDate}&`;

    this.reportData = await api.get(query);
  },

  async applyFilter(e) {
    e.preventDefault();
    this.selectedSeller = document.getElementById('rep-seller').value;
    this.startDate = document.getElementById('rep-start').value;
    this.endDate = document.getElementById('rep-end').value;

    this.resetLimits();
    await this.fetchReportData();
    app.renderView('reports');
    utils.showToast('Filtros de reporte aplicados correctamente.', 'info');
  },

  async resetFilters() {
    this.selectedSeller = '';
    this.startDate = '';
    this.endDate = '';

    this.resetLimits();
    await this.fetchReportData();
    app.renderView('reports');
    utils.showToast('Filtros reiniciados.', 'info');
  },

  async downloadCsv(type = 'all') {
    try {
      const token = localStorage.getItem('la_manuela_crm_token');
      let url = `/api/reports/export/csv?type=${type}&`;
      if (this.selectedSeller) url += `seller_id=${this.selectedSeller}&`;
      if (this.startDate) url += `start_date=${this.startDate}&`;
      if (this.endDate) url += `end_date=${this.endDate}&`;

      utils.showToast('Generando descarga CSV...', 'info');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al generar el archivo CSV.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `reporte_crm_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

      utils.showToast('Archivo CSV descargado con éxito.', 'success');
    } catch (err) {
      console.error('Error descargando CSV:', err);
      utils.showToast('Error al descargar el reporte CSV.', 'error');
    }
  }
};
