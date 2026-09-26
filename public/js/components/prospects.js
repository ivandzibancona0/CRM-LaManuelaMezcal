// Prospects Component (Kanban & List views)
const prospectsComponent = {
  prospects: [],
  currentView: 'kanban', // 'kanban' or 'list'
  searchTerm: '',
  pageSize: 10,
  stageLimits: {
    Nuevo: 10,
    Contactado: 10,
    Negociacion: 10,
    Cotizacion: 10,
    Ganado: 10
  },
  listLimit: 15,

  async render() {
    try {
      this.prospects = await api.get('/prospects');
    } catch (err) {
      utils.showToast('Error cargando prospectos.', 'error');
      this.prospects = [];
    }

    const isAdm = auth.isAdmin();

    // Attach scroll listeners after DOM rendering
    setTimeout(() => this.attachScrollListeners(), 100);

    return `
      <div>
        <!-- Module Title & Header Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.4rem; display: flex; align-items: center; gap: 10px;">
              <i class="fa-solid fa-filter-circle-dollar text-gold"></i> EMBUDO DE PROSPECTOS (PIPELINE)
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              ${isAdm ? 'Gestión global de prospectos de todos los vendedores.' : 'Gestión y avance de tus prospectos asignados.'}
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <!-- Real-time Search Input -->
            <div style="position: relative; width: 260px;">
              <i class="fa-solid fa-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 0.85rem;"></i>
              <input type="text" id="prospect-search-input" class="form-input" placeholder="Buscar prospecto o empresa..." value="${this.searchTerm}" oninput="prospectsComponent.handleSearch(this.value)" style="padding-left: 35px; height: 38px; font-size: 0.85rem; border-radius: 50px;">
            </div>

            <div class="btn-group" style="background: rgba(255, 255, 255, 0.05); padding: 3px; border-radius: 50px;">
              <button class="btn ${this.currentView === 'kanban' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="prospectsComponent.switchView('kanban')">
                <i class="fa-solid fa-columns"></i> Kanban
              </button>
              <button class="btn ${this.currentView === 'list' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="prospectsComponent.switchView('list')">
                <i class="fa-solid fa-list"></i> Lista
              </button>
            </div>

            <button class="btn btn-gold" onclick="prospectsComponent.openCreateModal()">
              <i class="fa-solid fa-plus"></i> NUEVO PROSPECTO
            </button>
          </div>
        </div>

        <!-- Render Current View -->
        <div id="prospects-view-container">
          ${this.currentView === 'kanban' ? this.renderKanban() : this.renderList()}
        </div>
      </div>
    `;
  },

  handleSearch(query) {
    this.searchTerm = query;
    const container = document.getElementById('prospects-view-container');
    if (container) {
      container.innerHTML = this.currentView === 'kanban' ? this.renderKanban() : this.renderList();
      const input = document.getElementById('prospect-search-input');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
  },

  getFilteredProspects() {
    if (!this.searchTerm.trim()) return this.prospects;
    const q = this.searchTerm.toLowerCase().trim();
    return this.prospects.filter(p => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.company && p.company.toLowerCase().includes(q)) ||
      (p.seller_name && p.seller_name.toLowerCase().includes(q)) ||
      (p.product_interest && p.product_interest.toLowerCase().includes(q))
    );
  },

  loadMoreStage(stageId) {
    if (!this.stageLimits[stageId]) this.stageLimits[stageId] = this.pageSize;
    this.stageLimits[stageId] += this.pageSize;

    const container = document.getElementById('prospects-view-container');
    if (container && this.currentView === 'kanban') {
      container.innerHTML = this.renderKanban();
    }
  },

  loadMoreList() {
    this.listLimit += 15;
    const container = document.getElementById('prospects-view-container');
    if (container && this.currentView === 'list') {
      container.innerHTML = this.renderList();
    }
  },

  attachScrollListeners() {
    const columnBodies = document.querySelectorAll('.kanban-column-body');
    columnBodies.forEach(elem => {
      if (elem.dataset.scrollObserved) return;
      elem.dataset.scrollObserved = 'true';

      elem.addEventListener('scroll', () => {
        const stageId = elem.getAttribute('data-stage');
        // Trigger infinite load when scrolled within 40px of bottom
        if (elem.scrollTop + elem.clientHeight >= elem.scrollHeight - 40) {
          const filtered = this.getFilteredProspects();
          const items = filtered.filter(p => p.status === stageId);
          const currentLimit = this.stageLimits[stageId] || this.pageSize;
          if (items.length > currentLimit) {
            this.loadMoreStage(stageId);
          }
        }
      });
    });
  },

  switchView(viewMode) {
    this.currentView = viewMode;
    app.renderView('prospects');
  },

  renderKanban() {
    const stages = [
      { id: 'Nuevo', name: 'NUEVO', color: '#4cc9f0' },
      { id: 'Contactado', name: 'CONTACTADO', color: '#ff9f1c' },
      { id: 'Negociacion', name: 'NEGOCIACIÓN', color: '#c77dff' },
      { id: 'Cotizacion', name: 'COTIZACIÓN', color: '#d4af37' },
      { id: 'Ganado', name: 'GANADO', color: '#00f5d4' }
    ];

    const filtered = this.getFilteredProspects();
    setTimeout(() => this.attachScrollListeners(), 50);

    return `
      <div class="kanban-board">
        ${stages.map(stage => {
          const items = filtered.filter(p => p.status === stage.id);
          const stageTotal = items.reduce((acc, p) => acc + (parseFloat(p.estimated_value) || 0), 0);

          const currentLimit = this.stageLimits[stage.id] || this.pageSize;
          const visibleItems = items.slice(0, currentLimit);
          const hasMore = items.length > visibleItems.length;
          const remaining = items.length - visibleItems.length;

          return `
            <div class="kanban-column">
              <div class="glass-card" style="padding: 14px; min-height: 500px; height: 100%; border-top: 3px solid ${stage.color}; display: flex; flex-direction: column;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-shrink: 0;">
                  <span style="font-weight: 700; font-size: 0.85rem; color: ${stage.color}; letter-spacing: 0.05em;">
                    ${stage.name} (${visibleItems.length}/${items.length})
                  </span>
                  <span style="font-size: 0.75rem; color: var(--accent-gold); font-weight: 600;">
                    ${utils.formatCurrency(stageTotal)}
                  </span>
                </div>

                <div class="kanban-column-body" data-stage="${stage.id}" style="display: flex; flex-direction: column; gap: 12px; overflow-y: auto; max-height: calc(100vh - 250px); padding-right: 4px; flex-grow: 1;">
                  ${visibleItems.length === 0 ? `
                    <div style="font-size: 0.75rem; color: var(--text-muted); text-align: center; padding: 20px 0; font-style: italic;">
                      Sin prospectos
                    </div>
                  ` : visibleItems.map(p => `
                    <div class="glass-card" style="padding: 12px; background: rgba(10, 5, 22, 0.8); border-color: rgba(157, 78, 221, 0.2);">
                      <div style="font-weight: 700; font-size: 0.92rem; color: #fff; margin-bottom: 4px;">${p.name}</div>
                      ${p.company ? `<div style="font-size: 0.78rem; color: var(--text-secondary);"><i class="fa-solid fa-building"></i> ${p.company}</div>` : ''}
                      
                      <div style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 700; margin: 6px 0;">
                        ${utils.formatCurrency(p.estimated_value)}
                      </div>

                      <div style="font-size: 0.72rem; color: var(--purple-neon-bright); margin-bottom: 8px;">
                        <i class="fa-solid fa-bottle-droplet"></i> Interés: ${p.product_interest || 'Espadín'}
                      </div>

                      <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 10px;">
                        <i class="fa-solid fa-user"></i> Vendedor: ${p.seller_name}
                      </div>

                      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.7rem;" onclick="prospectsComponent.openEditModal(${p.id})">
                          <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        ${p.status !== 'Ganado' ? `
                          <button class="btn btn-gold btn-sm" style="padding: 3px 8px; font-size: 0.7rem;" onclick="prospectsComponent.convertClient(${p.id})">
                            <i class="fa-solid fa-user-check"></i> Convertir
                          </button>
                        ` : ''}
                      </div>
                    </div>
                  `).join('')}

                  ${hasMore ? `
                    <div style="text-align: center; margin: 8px 0; flex-shrink: 0;">
                      <button class="btn btn-secondary btn-sm" style="width: 100%; border: 1px dashed var(--border-gold); font-size: 0.75rem; color: var(--accent-gold); border-radius: var(--radius-pill);" onclick="prospectsComponent.loadMoreStage('${stage.id}')">
                        <i class="fa-solid fa-angles-down text-gold"></i> Cargar más (${remaining} restantes)
                      </button>
                    </div>
                  ` : ''}
                </div>

              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  renderList() {
    const filtered = this.getFilteredProspects();
    const visibleList = filtered.slice(0, this.listLimit);
    const hasMore = filtered.length > visibleList.length;

    return `
      <div class="glass-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>NOMBRE</th>
                <th>EMPRESA</th>
                <th>CONTACTO</th>
                <th>INTERÉS MEZCAL</th>
                <th>VALOR ESTIMADO</th>
                <th>VENDEDOR</th>
                <th>ESTADO</th>
                <th>ACCIONES</th>
              </tr>
            </thead>
            <tbody>
              ${visibleList.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">
                    No se encontraron prospectos que coincidan con la búsqueda.
                  </td>
                </tr>
              ` : visibleList.map(p => `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.company || '-'}</td>
                  <td>
                    ${p.phone ? `<div><i class="fa-solid fa-phone text-gold"></i> ${p.phone}</div>` : ''}
                    ${p.email ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${p.email}</div>` : ''}
                  </td>
                  <td><span class="text-purple"><i class="fa-solid fa-bottle-droplet"></i> ${p.product_interest || 'Espadín'}</span></td>
                  <td><strong class="text-gold">${utils.formatCurrency(p.estimated_value)}</strong></td>
                  <td>${p.seller_name}</td>
                  <td>${utils.getStatusBadge(p.status)}</td>
                  <td>
                    <div style="display: flex; gap: 6px;">
                      <button class="btn btn-secondary btn-sm btn-icon" onclick="prospectsComponent.openEditModal(${p.id})" title="Editar">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                      ${p.status !== 'Ganado' ? `
                        <button class="btn btn-gold btn-sm btn-icon" onclick="prospectsComponent.convertClient(${p.id})" title="Convertir a Cliente">
                          <i class="fa-solid fa-user-check"></i>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          ${hasMore ? `
            <div style="text-align: center; padding: 16px;">
              <button class="btn btn-secondary btn-sm" onclick="prospectsComponent.loadMoreList()" style="border: 1px dashed var(--border-gold); color: var(--accent-gold); border-radius: var(--radius-pill); padding: 8px 20px;">
                <i class="fa-solid fa-angles-down"></i> Cargar más prospectos (${filtered.length - visibleList.length} restantes)
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  },

  async openCreateModal() {
    let sellers = [];
    let products = [];
    try {
      [sellers, products] = await Promise.all([
        auth.isAdmin() ? api.get('/users') : Promise.resolve([]),
        api.get('/products?status=Activo')
      ]);
    } catch (err) {
      console.error('Error cargando datos para prospecto:', err);
    }

    const content = `
      <form onsubmit="prospectsComponent.handleCreate(event)">
        <div class="form-group">
          <label class="form-label">Nombre del Contacto / Negocio *</label>
          <input type="text" id="p-name" class="form-input" placeholder="Ej. Hotel Los Olivos" required>
        </div>

        <div class="form-group">
          <label class="form-label">Empresa / Razón Social</label>
          <input type="text" id="p-company" class="form-input" placeholder="Ej. Los Olivos S.A. de C.V.">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" id="p-phone" class="form-input" placeholder="951-000-0000">
          </div>
          <div class="form-group">
            <label class="form-label">Correo Electrónico</label>
            <input type="email" id="p-email" class="form-input" placeholder="contacto@empresa.com">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Etapa Inicial</label>
            <select id="p-status" class="form-select">
              <option value="Nuevo">Nuevo</option>
              <option value="Contactado">Contactado</option>
              <option value="Negociacion">Negociación</option>
              <option value="Cotizacion">Cotización</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Valor Estimado ($ MXN)</label>
            <input type="number" id="p-value" class="form-input" placeholder="15000" step="0.01">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Producto de Interés</label>
          <select id="p-product" class="form-select">
            ${products.length > 0 ? products.map(p => `
              <option value="${p.name}">${p.name}</option>
            `).join('') : `
              <option value="Mezcal Espadín 750ml">Mezcal Espadín 750ml</option>
              <option value="Spicy Tamarindo 750ml">Spicy Tamarindo 750ml</option>
              <option value="Spicy Sandía 750ml">Spicy Sandía 750ml</option>
              <option value="Spicy Mango 750ml">Spicy Mango 750ml</option>
              <option value="Caja Surtida Mezcal">Caja Surtida Mezcal</option>
            `}
          </select>
        </div>

        ${auth.isAdmin() ? `
          <div class="form-group">
            <label class="form-label">Asignar a Vendedor</label>
            <select id="p-user" class="form-select">
              ${sellers.filter(s => s.role === 'vendedor').map(s => `
                <option value="${s.id}">${s.name}</option>
              `).join('')}
            </select>
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">Notas Adicionales</label>
          <textarea id="p-notes" class="form-textarea" rows="3" placeholder="Detalles de la oportunidad..."></textarea>
        </div>

        <button type="submit" class="btn btn-gold" style="width: 100%; margin-top: 10px;">
          <i class="fa-solid fa-save"></i> GUARDAR PROSPECTO
        </button>
      </form>
    `;

    utils.openModal('Registrar Nuevo Prospecto', content);
  },

  async handleCreate(e) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('p-name').value,
      company: document.getElementById('p-company').value,
      phone: document.getElementById('p-phone').value,
      email: document.getElementById('p-email').value,
      status: document.getElementById('p-status').value,
      estimated_value: document.getElementById('p-value').value,
      product_interest: document.getElementById('p-product').value,
      notes: document.getElementById('p-notes').value,
      user_id: document.getElementById('p-user') ? document.getElementById('p-user').value : undefined
    };

    try {
      await api.post('/prospects', payload);
      utils.showToast('Prospecto guardado exitosamente.', 'success');
      utils.closeModal();
      app.renderView('prospects');
    } catch (err) {
      utils.showToast(err.message || 'Error guardando prospecto.', 'error');
    }
  },

  async openEditModal(id) {
    const p = this.prospects.find(x => x.id === id);
    if (!p) return;

    const content = `
      <form onsubmit="prospectsComponent.handleEdit(event, ${p.id})">
        <div class="form-group">
          <label class="form-label">Nombre del Contacto / Negocio</label>
          <input type="text" id="pe-name" class="form-input" value="${p.name}" required>
        </div>

        <div class="form-group">
          <label class="form-label">Empresa / Razón Social</label>
          <input type="text" id="pe-company" class="form-input" value="${p.company || ''}">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group">
            <label class="form-label">Etapa de Venta</label>
            <select id="pe-status" class="form-select">
              <option value="Nuevo" ${p.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
              <option value="Contactado" ${p.status === 'Contactado' ? 'selected' : ''}>Contactado</option>
              <option value="Negociacion" ${p.status === 'Negociacion' ? 'selected' : ''}>Negociación</option>
              <option value="Cotizacion" ${p.status === 'Cotizacion' ? 'selected' : ''}>Cotización</option>
              <option value="Ganado" ${p.status === 'Ganado' ? 'selected' : ''}>Ganado</option>
              <option value="Perdido" ${p.status === 'Perdido' ? 'selected' : ''}>Perdido</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Valor Estimado ($ MXN)</label>
            <input type="number" id="pe-value" class="form-input" value="${p.estimated_value}" step="0.01">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Notas</label>
          <textarea id="pe-notes" class="form-textarea" rows="3">${p.notes || ''}</textarea>
        </div>

        <button type="submit" class="btn btn-primary" style="width: 100%;">
          <i class="fa-solid fa-sync"></i> ACTUALIZAR PROSPECTO
        </button>
      </form>
    `;

    utils.openModal('Editar Prospecto', content);
  },

  async handleEdit(e, id) {
    e.preventDefault();
    const payload = {
      name: document.getElementById('pe-name').value,
      company: document.getElementById('pe-company').value,
      status: document.getElementById('pe-status').value,
      estimated_value: document.getElementById('pe-value').value,
      notes: document.getElementById('pe-notes').value
    };

    try {
      await api.put(`/prospects/${id}`, payload);
      utils.showToast('Prospecto actualizado.', 'success');
      utils.closeModal();
      app.renderView('prospects');
    } catch (err) {
      utils.showToast(err.message || 'Error al actualizar.', 'error');
    }
  },

  async convertClient(id) {
    if (confirm('¿Deseas convertir este prospecto en un Cliente oficial de La Manuela Mezcal?')) {
      try {
        await api.post(`/prospects/${id}/convert`, {});
        utils.showToast('¡Prospecto convertido a cliente exitosamente!', 'success');
        app.renderView('clients');
      } catch (err) {
        utils.showToast(err.message || 'Error al convertir.', 'error');
      }
    }
  }
};
