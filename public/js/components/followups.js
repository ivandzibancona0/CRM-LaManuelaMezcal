// Follow-ups (Seguimientos) Component
const followupsComponent = {
  followups: [],
  filterStatus: '',
  filterSeller: '',
  searchTerm: '',
  startDate: '',
  endDate: '',
  displayLimit: 15,
  pageSize: 15,
  observer: null,

  async render() {
    this.displayLimit = this.pageSize;
    try {
      this.followups = await api.get('/followups');
      if (auth.isAdmin()) {
        try {
          this.allUsers = await api.get('/users');
        } catch (e) {
          this.allUsers = [];
        }
      }
    } catch (err) {
      utils.showToast('Error cargando seguimientos.', 'error');
      this.followups = [];
    }

    setTimeout(() => this.attachScrollObserver(), 100);

    const sellers = this.getSellersList();
    const hasActiveFilters = this.searchTerm || this.filterSeller || this.filterStatus || this.startDate || this.endDate;

    return `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 20px;">
          <div>
            <h2 style="font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-calendar-days text-gold"></i> AGENDA Y SEGUIMIENTO COMERCIAL
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              Control de llamadas, citas, degustaciones y acuerdos con clientes/prospectos.
            </p>
          </div>

          <button class="btn btn-gold" onclick="followupsComponent.openCreateModal()">
            <i class="fa-solid fa-calendar-plus"></i> AGENDAR SEGUIMIENTO
          </button>
        </div>

        <!-- Barra de Filtros: Buscador, Vendedor, Estado y Rango de Fechas -->
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; background: rgba(255, 255, 255, 0.03); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <!-- Buscador en tiempo real -->
          <div style="position: relative; flex: 1; min-width: 220px;">
            <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
            <input type="text" id="followup-search-input" class="form-input" placeholder="Buscar asunto o contacto..." value="${this.searchTerm}" oninput="followupsComponent.handleSearch(this.value)" style="padding-left: 35px; height: 38px; font-size: 0.85rem; border-radius: 50px;">
          </div>

          <!-- Filtro por Vendedor -->
          <select class="form-select" style="width: auto; padding: 8px 14px; height: 38px; font-size: 0.85rem; background: rgba(212, 175, 55, 0.12); border-color: var(--accent-gold); color: #fff;" onchange="followupsComponent.handleSellerFilter(this.value)">
            <option value="" ${this.filterSeller === '' ? 'selected' : ''}>🧑‍💼 Todos los Vendedores</option>
            ${sellers.map(s => `<option value="${s}" ${this.filterSeller === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>

          <!-- Filtro por Estado -->
          <select class="form-select" style="width: auto; padding: 8px 14px; height: 38px; font-size: 0.85rem;" onchange="followupsComponent.changeFilter(this.value)">
            <option value="" ${this.filterStatus === '' ? 'selected' : ''}>Todos los Estados</option>
            <option value="Pendiente" ${this.filterStatus === 'Pendiente' ? 'selected' : ''}>Pendientes</option>
            <option value="Completado" ${this.filterStatus === 'Completado' ? 'selected' : ''}>Completados</option>
          </select>

          <!-- Filtro Fecha Desde -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;"><i class="fa-solid fa-calendar-days text-gold"></i> Desde:</span>
            <input type="date" id="followup-start-date" class="form-input" value="${this.startDate}" onchange="followupsComponent.handleDateFilter(this.value, followupsComponent.endDate)" style="height: 38px; font-size: 0.82rem; width: 140px; border-radius: var(--radius-sm);">
          </div>

          <!-- Filtro Fecha Hasta -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;"><i class="fa-solid fa-calendar-check text-purple"></i> Hasta:</span>
            <input type="date" id="followup-end-date" class="form-input" value="${this.endDate}" onchange="followupsComponent.handleDateFilter(followupsComponent.startDate, this.value)" style="height: 38px; font-size: 0.82rem; width: 140px; border-radius: var(--radius-sm);">
          </div>

          <!-- Botón de Limpiar Filtros -->
          ${hasActiveFilters ? `
            <button class="btn btn-secondary btn-sm" onclick="followupsComponent.clearFilters()" title="Limpiar todos los filtros" style="height: 38px; padding: 0 14px; border-radius: 50px;">
              <i class="fa-solid fa-filter-circle-xmark"></i> Limpiar
            </button>
          ` : ''}
        </div>

        <div class="glass-card" id="followups-table-container">
          ${this.renderTableContent()}
        </div>
      </div>
    `;
  },

  getSellersList() {
    const set = new Set();
    if (this.allUsers && this.allUsers.length > 0) {
      this.allUsers.forEach(u => {
        if (u.name) set.add(u.name);
      });
    }
    this.followups.forEach(f => {
      if (f.seller_name) set.add(f.seller_name);
    });
    return Array.from(set).sort();
  },

  getFilteredFollowups() {
    return this.followups.filter(f => {
      // 1. Buscador por texto
      if (this.searchTerm.trim()) {
        const q = this.searchTerm.toLowerCase().trim();
        const matches = (f.seller_name && f.seller_name.toLowerCase().includes(q)) ||
                        (f.summary && f.summary.toLowerCase().includes(q)) ||
                        (f.details && f.details.toLowerCase().includes(q)) ||
                        (f.prospect_name && f.prospect_name.toLowerCase().includes(q)) ||
                        (f.client_name && f.client_name.toLowerCase().includes(q)) ||
                        (f.type && f.type.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // 2. Filtro por Vendedor (Opción A)
      if (this.filterSeller) {
        const target = this.filterSeller.toLowerCase().trim();
        const sellerName = (f.seller_name || '').toLowerCase().trim();
        if (!sellerName.includes(target) && !target.includes(sellerName)) {
          return false;
        }
      }

      // 3. Filtro por Estado
      if (this.filterStatus && f.status !== this.filterStatus) {
        return false;
      }

      // 4. Filtro por Rango de Fechas (Desde / Hasta)
      if (f.followup_date) {
        const fDateStr = f.followup_date.split('T')[0].split(' ')[0];
        if (this.startDate && fDateStr < this.startDate) return false;
        if (this.endDate && fDateStr > this.endDate) return false;
      }

      return true;
    });
  },

  handleSearch(query) {
    this.searchTerm = query;
    this.displayLimit = this.pageSize;
    const container = document.getElementById('followups-table-container');
    if (container) {
      container.innerHTML = this.renderTableContent();
      setTimeout(() => this.attachScrollObserver(), 50);
      const input = document.getElementById('followup-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  },

  handleSellerFilter(val) {
    this.filterSeller = val;
    this.displayLimit = this.pageSize;
    app.renderView('followups');
  },

  changeFilter(val) {
    this.filterStatus = val;
    this.displayLimit = this.pageSize;
    app.renderView('followups');
  },

  handleDateFilter(start, end) {
    this.startDate = start;
    this.endDate = end;
    this.displayLimit = this.pageSize;
    app.renderView('followups');
  },

  clearFilters() {
    this.searchTerm = '';
    this.filterSeller = '';
    this.filterStatus = '';
    this.startDate = '';
    this.endDate = '';
    this.displayLimit = this.pageSize;
    app.renderView('followups');
  },

  attachScrollObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }

    const sentinel = document.getElementById('followups-infinite-sentinel');
    if (!sentinel) return;

    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.loadMore();
      }
    }, { rootMargin: '150px' });

    this.observer.observe(sentinel);
  },

  loadMore() {
    const filtered = this.getFilteredFollowups();
    if (this.displayLimit < filtered.length) {
      this.displayLimit += this.pageSize;
      const container = document.getElementById('followups-table-container');
      if (container) {
        container.innerHTML = this.renderTableContent();
        setTimeout(() => this.attachScrollObserver(), 50);
      }
    }
  },

  renderTableContent() {
    const filtered = this.getFilteredFollowups();

    if (filtered.length === 0) {
      return `<p style="color: var(--text-muted); text-align: center; padding: 30px;">${(this.searchTerm || this.filterSeller || this.filterStatus) ? 'No se encontraron seguimientos que coincidan con los filtros seleccionados.' : 'No se han registrado seguimientos aún.'}</p>`;
    }

    const visibleFollowups = filtered.slice(0, this.displayLimit);
    const hasMore = this.displayLimit < filtered.length;

    const tableHtml = `
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr>
              <th>FECHA Y HORA</th>
              <th>TIPO</th>
              <th>RESUMEN Y NOTAS</th>
              <th>CONTACTO ASOCIADO</th>
              <th>VENDEDOR</th>
              <th>ESTADO</th>
              <th>RESULTADO</th>
              <th>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            ${visibleFollowups.map(f => `
              <tr>
                <td><strong>${utils.formatDateTime(f.followup_date)}</strong></td>
                <td><span class="badge badge-vendedor"><i class="fa-solid fa-tag"></i> ${f.type}</span></td>
                <td>
                  <strong>${f.summary}</strong>
                  ${f.details ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">${f.details}</div>` : ''}
                </td>
                <td>
                  ${f.prospect_name ? `<span class="badge badge-nuevo">Prospecto: ${f.prospect_name}</span>` : ''}
                  ${f.client_name ? `<span class="badge badge-ganado">Cliente: ${f.client_name}</span>` : ''}
                </td>
                <td>${f.seller_name}</td>
                <td>${utils.getStatusBadge(f.status)}</td>
                <td><span style="font-size: 0.8rem; color: var(--accent-gold);">${f.result || '-'}</span></td>
                <td>
                  ${f.status === 'Pendiente' ? `
                    <button class="btn btn-primary btn-sm" onclick="followupsComponent.openCompleteModal(${f.id})">
                      <i class="fa-solid fa-check"></i> Completar
                    </button>
                  ` : '<span style="color: var(--success-neon);"><i class="fa-solid fa-circle-check"></i></span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    const footerHtml = hasMore ? `
      <div id="followups-infinite-sentinel" style="text-align: center; padding: 20px 0; color: var(--text-secondary); font-size: 0.85rem;">
        <i class="fa-solid fa-circle-notch fa-spin text-gold" style="margin-right: 8px;"></i> Cargando más seguimientos... (${visibleFollowups.length} de ${filtered.length})
      </div>
    ` : `
      <div style="text-align: center; padding: 15px 0; color: var(--text-muted); font-size: 0.8rem;">
        <i class="fa-solid fa-circle-check text-gold" style="margin-right: 6px;"></i> Mostrando todos los ${filtered.length} seguimientos
      </div>
    `;

    return tableHtml + footerHtml;
  },

  changeFilter(val) {
    this.filterStatus = val;
    app.renderView('followups');
  },

  async openCreateModal() {
    let prospects = [];
    let clients = [];

    try {
      [prospects, clients] = await Promise.all([
        api.get('/prospects'),
        api.get('/clients')
      ]);
    } catch (err) {
      console.error(err);
    }

    const content = `
      <form onsubmit="followupsComponent.handleCreate(event)">
        <div class="form-group">
          <label class="form-label">Tipo de Actividad *</label>
          <select id="f-type" class="form-select" required>
            <option value="Llamada">Llamada Telefónica</option>
            <option value="Cita Presencial">Cita Presencial / Visita</option>
            <option value="Correo Electrónico">Correo Electrónico</option>
            <option value="Muestra / Degustación">Muestra / Cata de Mezcal</option>
            <option value="WhatsApp">Mensaje WhatsApp</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Vinculación (Seleccionar Prospecto o Cliente)</label>
          <select id="f-target" class="form-select">
            <option value="">-- Sin vinculo específico --</option>
            <optgroup label="Prospectos">
              ${prospects.map(p => `<option value="prospect_${p.id}">Prospecto: ${p.name} (${p.company || 'Sin empresa'})</option>`).join('')}
            </optgroup>
            <optgroup label="Clientes">
              ${clients.map(c => `<option value="client_${c.id}">Cliente: ${c.name} (${c.company || 'Sin empresa'})</option>`).join('')}
            </optgroup>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Título / Resumen de la Actividad *</label>
          <input type="text" id="f-summary" class="form-input" placeholder="Ej. Presentación de precios de Spicy Tamarindo" required>
        </div>

        <div class="form-group">
          <label class="form-label">Fecha y Hora Programada *</label>
          <input type="datetime-local" id="f-date" class="form-input" required>
        </div>

        <div class="form-group">
          <label class="form-label">Detalles u Objetivos</label>
          <textarea id="f-details" class="form-textarea" rows="3" placeholder="Puntos clave a tratar en el seguimiento..."></textarea>
        </div>

        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-save"></i> AGENDAR SEGUIMIENTO
        </button>
      </form>
    `;

    utils.openModal('Agendar Nuevo Seguimiento', content);

    // Set default date to now + 2 hours formatted
    const now = new Date();
    now.setHours(now.getHours() + 2);
    const isoDate = now.toISOString().slice(0, 16);
    document.getElementById('f-date').value = isoDate;
  },

  async handleCreate(e) {
    e.preventDefault();
    const targetVal = document.getElementById('f-target').value;
    let prospect_id = null;
    let client_id = null;

    if (targetVal.startsWith('prospect_')) {
      prospect_id = targetVal.replace('prospect_', '');
    } else if (targetVal.startsWith('client_')) {
      client_id = targetVal.replace('client_', '');
    }

    const payload = {
      type: document.getElementById('f-type').value,
      summary: document.getElementById('f-summary').value,
      followup_date: document.getElementById('f-date').value,
      details: document.getElementById('f-details').value,
      prospect_id,
      client_id,
      status: 'Pendiente'
    };

    try {
      await api.post('/followups', payload);
      utils.showToast('Seguimiento agendado con éxito.', 'success');
      utils.closeModal();
      app.renderView('followups');
    } catch (err) {
      utils.showToast(err.message || 'Error registrando seguimiento.', 'error');
    }
  },

  openCompleteModal(id) {
    const content = `
      <form onsubmit="followupsComponent.handleComplete(event, ${id})">
        <div class="form-group">
          <label class="form-label">Resultado u Acuerdos Alcanzados *</label>
          <textarea id="fc-result" class="form-textarea" rows="4" placeholder="Describa la respuesta del cliente, volumen acordado, compromisos..." required></textarea>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%;">
          <i class="fa-solid fa-check-circle"></i> MARCAR COMO COMPLETADO
        </button>
      </form>
    `;

    utils.openModal('Finalizar y Registrar Resultado', content);
  },

  async handleComplete(e, id) {
    e.preventDefault();
    const resultText = document.getElementById('fc-result').value;

    try {
      await api.put(`/followups/${id}`, {
        status: 'Completado',
        result: resultText
      });
      utils.showToast('Seguimiento marcado como completado.', 'success');
      utils.closeModal();
      app.renderView('followups');
    } catch (err) {
      utils.showToast(err.message || 'Error al completar.', 'error');
    }
  }
};
