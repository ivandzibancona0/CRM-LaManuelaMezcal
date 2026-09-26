// Main Application Controller & Router
const app = {
  currentView: 'dashboard',

  modules: [
    { id: 'dashboard', label: 'DASHBOARD', icon: 'fa-gauge-high', adminOnly: false },
    { id: 'prospects', label: 'PROSPECTOS', icon: 'fa-filter-circle-dollar', adminOnly: false },
    { id: 'clients', label: 'CLIENTES', icon: 'fa-users', adminOnly: false },
    { id: 'sales', label: 'VENTAS', icon: 'fa-cart-shopping', adminOnly: false },
    { id: 'followups', label: 'SEGUIMIENTOS', icon: 'fa-calendar-check', adminOnly: false },
    { id: 'products', label: 'PRODUCTOS', icon: 'fa-bottle-droplet', adminOnly: false },
    { id: 'reports', label: 'REPORTES', icon: 'fa-chart-pie', adminOnly: true },
    { id: 'users', label: 'USUARIOS', icon: 'fa-users-gear', adminOnly: true }
  ],

  init() {
    this.bindEvents();

    if (auth.isLoggedIn()) {
      this.initAuthenticatedApp();
    } else {
      this.renderLogin();
    }
  },

  bindEvents() {
    // Hamburger menu button toggle
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-backdrop');

    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        drawer.classList.toggle('active');
        backdrop.classList.toggle('active');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        hamburgerBtn.classList.remove('active');
        drawer.classList.remove('active');
        backdrop.classList.remove('active');
      });
    }

    // Handle browser back/forward buttons
    window.addEventListener('hashchange', () => {
      if (auth.isLoggedIn()) {
        const hash = window.location.hash.replace('#', '');
        if (hash) this.navigate(hash);
      }
    });
  },

  initAuthenticatedApp() {
    const user = auth.getUser();
    const isAdm = auth.isAdmin();

    // Show header & mobile bottom bar
    document.getElementById('app-header').style.display = 'block';
    document.getElementById('mobile-bottom-bar').style.display = 'flex';

    // Set User Header Displays
    document.getElementById('user-name-header').textContent = user.name;
    document.getElementById('mobile-user-name').textContent = user.name;
    document.getElementById('mobile-avatar').textContent = user.name.charAt(0).toUpperCase();

    const roleBadgeHtml = `
      <span class="badge ${isAdm ? 'badge-admin' : 'badge-vendedor'}">
        <i class="fa-solid ${isAdm ? 'fa-shield-halved' : 'fa-user-tag'}"></i>
        ${isAdm ? 'ADMIN' : 'VENDEDOR'}
      </span>
    `;

    document.getElementById('user-role-header').innerHTML = roleBadgeHtml;
    document.getElementById('mobile-user-role').innerHTML = roleBadgeHtml;

    // Build Desktop Tab Navigation Bar
    const visibleModules = this.modules.filter(m => !m.adminOnly || isAdm);

    const desktopTabsHtml = visibleModules.map(m => `
      <a href="#${m.id}" class="tab-link ${this.currentView === m.id ? 'active' : ''}" onclick="app.navigate('${m.id}'); return false;">
        <i class="fa-solid ${m.icon}"></i> ${m.label}
      </a>
    `).join('');

    document.getElementById('desktop-nav-tabs').innerHTML = desktopTabsHtml;

    // Build Mobile Drawer Nav List
    const mobileNavHtml = visibleModules.map(m => `
      <li>
        <a href="#${m.id}" class="mobile-nav-link ${this.currentView === m.id ? 'active' : ''}" onclick="app.navigate('${m.id}'); app.closeMobileMenu(); return false;">
          <i class="fa-solid ${m.icon}"></i> ${m.label}
        </a>
      </li>
    `).join('');

    document.getElementById('mobile-nav-list').innerHTML = mobileNavHtml;

    // Build Mobile Bottom Touch Bar (Top 4 key modules)
    const mobileBottomModules = visibleModules.slice(0, 4);
    const bottomBarHtml = mobileBottomModules.map(m => `
      <a href="#${m.id}" class="bottom-tab ${this.currentView === m.id ? 'active' : ''}" onclick="app.navigate('${m.id}'); return false;">
        <i class="fa-solid ${m.icon}"></i>
        <span>${m.label}</span>
      </a>
    `).join('');

    document.getElementById('mobile-bottom-bar').innerHTML = bottomBarHtml;

    // Route to current hash or default to dashboard
    const initialHash = window.location.hash.replace('#', '');
    this.navigate(initialHash || 'dashboard');
  },

  renderLogin() {
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('mobile-bottom-bar').style.display = 'none';
    this.closeMobileMenu();
    document.getElementById('view-container').innerHTML = loginComponent.render();
  },

  navigate(viewId) {
    if (!auth.isLoggedIn()) {
      this.renderLogin();
      return;
    }

    const mod = this.modules.find(m => m.id === viewId);
    if (!mod) viewId = 'dashboard';

    // Security check for admin only routes
    if (mod && mod.adminOnly && !auth.isAdmin()) {
      utils.showToast('Acceso no permitido para tu rol.', 'error');
      viewId = 'dashboard';
    }

    this.currentView = viewId;
    window.location.hash = viewId;

    // Update active states on Desktop Tabs
    document.querySelectorAll('.tab-link').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === `#${viewId}`);
    });

    // Update active states on Mobile Drawer
    document.querySelectorAll('.mobile-nav-link').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === `#${viewId}`);
    });

    // Update active states on Mobile Bottom Bar
    document.querySelectorAll('.bottom-tab').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === `#${viewId}`);
    });

    this.renderView(viewId);
  },

  async renderView(viewId) {
    const container = document.getElementById('view-container');
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <i class="fa-solid fa-spinner fa-spin fa-2x text-purple"></i>
        <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary);">Cargando módulo...</p>
      </div>
    `;

    try {
      let html = '';
      switch (viewId) {
        case 'dashboard':
          html = await dashboardComponent.render();
          break;
        case 'prospects':
          html = await prospectsComponent.render();
          break;
        case 'clients':
          html = await clientsComponent.render();
          break;
        case 'sales':
          html = await salesComponent.render();
          break;
        case 'followups':
          html = await followupsComponent.render();
          break;
        case 'reports':
          html = await reportsComponent.render();
          break;
        case 'products':
          html = await productsComponent.render();
          break;
        case 'users':
          html = await usersComponent.render();
          break;
        default:
          html = await dashboardComponent.render();
      }

      container.innerHTML = html;
    } catch (err) {
      console.error(`Error renderizando vista [${viewId}]:`, err);
      container.innerHTML = `<div class="glass-card" style="text-align: center; padding: 40px;"><p class="text-danger">Error cargando el módulo.</p></div>`;
    }
  },

  closeMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('mobile-backdrop');

    if (hamburgerBtn) hamburgerBtn.classList.remove('active');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
  }
};

// Initialize App on DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
