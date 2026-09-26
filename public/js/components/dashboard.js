// Dashboard Component
const dashboardComponent = {
  async render() {
    const user = auth.getUser();
    const isAdm = auth.isAdmin();

    let stats = { totalRevenue: 0, totalProspects: 0, totalClients: 0, pendingFollowups: 0 };
    let recentFollowups = [];
    let recentSales = [];
    let productsList = [];

    try {
      if (isAdm) {
        stats = await api.get('/reports/summary');
      } else {
        const [prospects, clients, sales, followups] = await Promise.all([
          api.get('/prospects'),
          api.get('/clients'),
          api.get('/sales'),
          api.get('/followups?status=Pendiente')
        ]);
        const rev = sales.reduce((acc, s) => acc + (parseFloat(s.total_amount) || 0), 0);
        stats = {
          totalRevenue: rev,
          totalProspects: prospects.length,
          totalClients: clients.length,
          pendingFollowups: followups.length
        };
      }

      recentFollowups = await api.get('/followups?status=Pendiente');
      recentSales = await api.get('/sales');
      productsList = await api.get('/products?status=Activo');
    } catch (err) {
      console.error('Error cargando datos de dashboard:', err);
    }

    return `
      <div>
        <!-- Welcome Banner -->
        <div class="glass-card" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(24, 12, 45, 0.9) 0%, rgba(7, 3, 17, 0.95) 100%); border-color: var(--purple-neon);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
            <div>
              <span class="badge ${isAdm ? 'badge-admin' : 'badge-vendedor'}">
                <i class="fa-solid ${isAdm ? 'fa-shield-halved' : 'fa-user-tag'}"></i> ${isAdm ? 'PANEL DE ADMINISTRACIÓN GENERAL' : 'PANEL DE VENDEDOR COMERCIAL'}
              </span>
              <h2 style="font-size: 1.5rem; margin-top: 8px;">¡HOLA, ${user ? user.name.toUpperCase() : 'USUARIO'}! 👋</h2>
              <p style="color: var(--text-secondary); font-size: 0.88rem;">Bienvenido al CRM de La Manuela Mezcal. Aquí tienes el resumen de tu gestión comercial.</p>
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-gold btn-sm" onclick="prospectsComponent.openCreateModal()">
                <i class="fa-solid fa-user-plus"></i> NUEVO PROSPECTO
              </button>
              <button class="btn btn-primary btn-sm" onclick="salesComponent.openCreateModal()">
                <i class="fa-solid fa-cart-plus"></i> REGISTRAR VENTA
              </button>
            </div>
          </div>
        </div>

        <!-- 4 KPI Stat Cards -->
        <div class="dashboard-grid">
          
          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">VENTAS TOTALES</span>
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(212, 175, 55, 0.15); display: flex; align-items: center; justify-content: center; color: var(--accent-gold);">
                <i class="fa-solid fa-sack-dollar fa-lg"></i>
              </div>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-top: 10px;" class="text-gold">
              ${utils.formatCurrency(stats.totalRevenue)}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
              <i class="fa-solid fa-wine-bottle text-gold"></i> Ingreso total acumulado
            </div>
          </div>

          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">PROSPECTOS ACTIVOS</span>
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(157, 78, 221, 0.15); display: flex; align-items: center; justify-content: center; color: var(--purple-neon-bright);">
                <i class="fa-solid fa-user-clock fa-lg"></i>
              </div>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-top: 10px;">
              ${stats.totalProspects}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
              <i class="fa-solid fa-chart-line text-purple"></i> En embudo de ventas
            </div>
          </div>

          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">CLIENTES ACTIVOS</span>
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(0, 245, 212, 0.15); display: flex; align-items: center; justify-content: center; color: var(--success-neon);">
                <i class="fa-solid fa-users fa-lg"></i>
              </div>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-top: 10px;">
              ${stats.totalClients}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
              <i class="fa-solid fa-check-double" style="color: var(--success-neon);"></i> Cuentas cerradas
            </div>
          </div>

          <div class="glass-card">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">SEGUIMIENTOS PENDIENTES</span>
              <div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255, 159, 28, 0.15); display: flex; align-items: center; justify-content: center; color: var(--warning-neon);">
                <i class="fa-solid fa-calendar-check fa-lg"></i>
              </div>
            </div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #fff; margin-top: 10px;">
              ${stats.pendingFollowups}
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px;">
              <i class="fa-solid fa-bell" style="color: var(--warning-neon);"></i> Compromisos por realizar
            </div>
          </div>

        </div>

        <!-- Product Line Highlight -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
          <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 8px; margin: 0;">
            <i class="fa-solid fa-wine-glass text-gold"></i> LÍNEA DE PRODUCTOS DESTACADOS - LA MANUELA MEZCAL
          </h3>
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('products')">
            <i class="fa-solid fa-bottle-droplet"></i> VER CATÁLOGO COMPLETO
          </button>
        </div>
        
        <div class="products-grid" style="margin-bottom: 30px;">
          ${productsList.length === 0 ? `
            <div class="glass-card" style="grid-column: 1 / -1; text-align: center; padding: 20px;">
              <p style="color: var(--text-muted); font-size: 0.88rem;">No hay productos destacados activos en el catálogo.</p>
            </div>
          ` : productsList.slice(0, 4).map(p => `
            <div class="glass-card" style="text-align: center; border-color: ${p.color || 'rgba(212, 175, 55, 0.3)'};">
              <div style="font-size: 2rem; color: ${p.color || '#4cc9f0'}; margin-bottom: 8px;">
                <i class="fa-solid ${p.icon || 'fa-bottle-droplet'}"></i>
              </div>
              <h4 style="font-size: 0.95rem; color: #fff;">${p.name.toUpperCase()}</h4>
              <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${p.description || 'Mezcal de alta calidad'}</p>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-gold); margin-top: 6px;">${utils.formatCurrency(p.price)}</div>
            </div>
          `).join('')}
        </div>

        <!-- Upcoming Followups Table preview -->
        <div class="glass-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
            <h3 style="font-size: 1.05rem; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-clock-rotate-left text-purple"></i> PRÓXIMOS SEGUIMIENTOS AGENDADOS
            </h3>
            <button class="btn btn-secondary btn-sm" onclick="app.navigate('followups')">VER TODOS</button>
          </div>

          ${recentFollowups.length === 0 ? `
            <p style="color: var(--text-muted); font-size: 0.88rem; text-align: center; padding: 20px 0;">
              No tienes seguimientos pendientes por el momento.
            </p>
          ` : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>TIPO</th>
                    <th>RESUMEN / DETALLES</th>
                    <th>CONTACTO / EMPRESA</th>
                    <th>VENDEDOR</th>
                    <th>FECHA AGENDADA</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentFollowups.slice(0, 5).map(f => `
                    <tr>
                      <td><strong><i class="fa-solid fa-calendar-day text-gold"></i> ${f.type}</strong></td>
                      <td>${f.summary}</td>
                      <td>${f.prospect_name || f.client_name || 'Sin contacto'} ${f.prospect_company ? `(${f.prospect_company})` : ''}</td>
                      <td>${f.seller_name}</td>
                      <td>${utils.formatDateTime(f.followup_date)}</td>
                      <td>${utils.getStatusBadge(f.status)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

      </div>
    `;
  }
};
