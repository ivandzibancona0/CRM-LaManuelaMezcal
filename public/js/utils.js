// UI Utilities & Helper Functions
const utils = {
  formatCurrency(val) {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(num);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    if (isNaN(date.getTime())) return dateTimeStr;
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  getStatusBadge(status) {
    const s = (status || '').toLowerCase();
    let badgeClass = 'badge-status';

    if (s.includes('nuevo')) badgeClass = 'badge-nuevo';
    else if (s.includes('contactado')) badgeClass = 'badge-contactado';
    else if (s.includes('negociacion') || s.includes('negociación')) badgeClass = 'badge-negociacion';
    else if (s.includes('cotizacion') || s.includes('cotización')) badgeClass = 'badge-cotizacion';
    else if (s.includes('ganado') || s.includes('activo')) badgeClass = 'badge-ganado';
    else if (s.includes('perdido') || s.includes('inactivo')) badgeClass = 'badge-perdido';
    else if (s.includes('pendiente')) badgeClass = 'badge-pendiente';
    else if (s.includes('completado') || s.includes('pagado')) badgeClass = 'badge-completado';

    return `<span class="badge ${badgeClass}">${status}</span>`;
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  openModal(title, bodyContent) {
    const root = document.getElementById('modal-root');
    if (!root) return;

    root.innerHTML = `
      <div class="modal-overlay active" id="modal-overlay" onclick="if(event.target === this) utils.closeModal()">
        <div class="modal-container">
          <div class="modal-header">
            <h3 style="color: #fff; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-bottle-droplet text-gold"></i> ${title}
            </h3>
            <button class="modal-close" onclick="utils.closeModal()"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="modal-body">
            ${bodyContent}
          </div>
        </div>
      </div>
    `;
  },

  closeModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
  }
};
