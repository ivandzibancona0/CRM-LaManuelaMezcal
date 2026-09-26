const express = require('express');
const router = express.Router();
const { queryAll, getQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All report routes require Admin authentication
router.use(authenticateToken, requireAdmin);

// Helper function to escape CSV values
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// Helper to build CSV string from rows and headers
function buildCsvSection(title, headers, rows) {
  let csv = `=== ${title} ===\r\n`;
  csv += headers.map(h => escapeCsv(h)).join(',') + '\r\n';
  rows.forEach(row => {
    csv += row.map(v => escapeCsv(v)).join(',') + '\r\n';
  });
  csv += '\r\n';
  return csv;
}

// GET /api/reports/full - Detailed report data for all CRM sections (Vendedores, Seguimientos, Prospectos, Clientes, Ventas)
router.get('/full', async (req, res) => {
  try {
    const { seller_id, start_date, end_date } = req.query;

    const hasDateFilter = Boolean(start_date && end_date);
    const startDateTime = start_date ? `${start_date} 00:00:00` : null;
    const endDateTime = end_date ? `${end_date} 23:59:59` : null;

    // 1. Sellers list and seller stats
    let sellersSql = `SELECT id, name, email, phone, status FROM users WHERE role = 'vendedor'`;
    const sellersParams = [];
    if (seller_id) {
      sellersSql += ` AND id = ?`;
      sellersParams.push(seller_id);
    }
    const sellers = await queryAll(sellersSql, sellersParams);

    // Get stats for each seller
    const sellerStats = await Promise.all(sellers.map(async (seller) => {
      // Followups stats
      let fSql = `SELECT 
                    COUNT(id) as total_followups,
                    SUM(CASE WHEN status = 'Completado' THEN 1 ELSE 0 END) as completed_followups,
                    SUM(CASE WHEN status = 'Pendiente' THEN 1 ELSE 0 END) as pending_followups
                  FROM followups WHERE user_id = ?`;
      const fParams = [seller.id];
      if (hasDateFilter) {
        fSql += ` AND followup_date BETWEEN ? AND ?`;
        fParams.push(startDateTime, endDateTime);
      }
      const fRes = await getQuery(fSql, fParams);

      // Prospects count
      let pSql = `SELECT COUNT(id) as total_prospects FROM prospects WHERE user_id = ?`;
      const pParams = [seller.id];
      if (hasDateFilter) {
        pSql += ` AND created_at BETWEEN ? AND ?`;
        pParams.push(startDateTime, endDateTime);
      }
      const pRes = await getQuery(pSql, pParams);

      // Clients count
      let cSql = `SELECT COUNT(id) as total_clients FROM clients WHERE user_id = ?`;
      const cParams = [seller.id];
      if (hasDateFilter) {
        cSql += ` AND created_at BETWEEN ? AND ?`;
        cParams.push(startDateTime, endDateTime);
      }
      const cRes = await getQuery(cSql, cParams);

      // Sales stats
      let sSql = `SELECT COALESCE(SUM(total_amount), 0) as total_sales, COALESCE(SUM(bottles_count), 0) as total_bottles FROM sales WHERE user_id = ?`;
      const sParams = [seller.id];
      if (hasDateFilter) {
        sSql += ` AND sale_date BETWEEN ? AND ?`;
        sParams.push(start_date, end_date);
      }
      const sRes = await getQuery(sSql, sParams);

      return {
        seller_id: seller.id,
        seller_name: seller.name,
        seller_email: seller.email,
        seller_phone: seller.phone || 'N/A',
        total_followups: fRes ? fRes.total_followups || 0 : 0,
        completed_followups: fRes ? fRes.completed_followups || 0 : 0,
        pending_followups: fRes ? fRes.pending_followups || 0 : 0,
        total_prospects: pRes ? pRes.total_prospects || 0 : 0,
        total_clients: cRes ? cRes.total_clients || 0 : 0,
        total_sales: sRes ? sRes.total_sales || 0 : 0,
        total_bottles: sRes ? sRes.total_bottles || 0 : 0
      };
    }));

    // 2. Follow-ups activity list
    let followupsSql = `
      SELECT f.*, u.name as seller_name,
             p.name as prospect_name, p.company as prospect_company,
             c.name as client_name, c.company as client_company
      FROM followups f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN prospects p ON f.prospect_id = p.id
      LEFT JOIN clients c ON f.client_id = c.id
      WHERE 1=1
    `;
    const followupsParams = [];
    if (hasDateFilter) {
      followupsSql += ` AND f.followup_date BETWEEN ? AND ?`;
      followupsParams.push(startDateTime, endDateTime);
    }
    if (seller_id) {
      followupsSql += ` AND f.user_id = ?`;
      followupsParams.push(seller_id);
    }
    followupsSql += ` ORDER BY f.followup_date DESC`;
    const followups = await queryAll(followupsSql, followupsParams);

    // 3. Prospects list
    let prospectsSql = `
      SELECT p.*, u.name as seller_name
      FROM prospects p
      JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const prospectsParams = [];
    if (hasDateFilter) {
      prospectsSql += ` AND p.created_at BETWEEN ? AND ?`;
      prospectsParams.push(startDateTime, endDateTime);
    }
    if (seller_id) {
      prospectsSql += ` AND p.user_id = ?`;
      prospectsParams.push(seller_id);
    }
    prospectsSql += ` ORDER BY p.created_at DESC`;
    const prospects = await queryAll(prospectsSql, prospectsParams);

    // 4. Clients list
    let clientsSql = `
      SELECT c.*, u.name as seller_name
      FROM clients c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const clientsParams = [];
    if (hasDateFilter) {
      clientsSql += ` AND c.created_at BETWEEN ? AND ?`;
      clientsParams.push(startDateTime, endDateTime);
    }
    if (seller_id) {
      clientsSql += ` AND c.user_id = ?`;
      clientsParams.push(seller_id);
    }
    clientsSql += ` ORDER BY c.created_at DESC`;
    const clients = await queryAll(clientsSql, clientsParams);

    // 5. Sales list
    let salesSql = `
      SELECT s.*, u.name as seller_name, c.name as client_name, c.company as client_company
      FROM sales s
      JOIN users u ON s.user_id = u.id
      JOIN clients c ON s.client_id = c.id
      WHERE 1=1
    `;
    const salesParams = [];
    if (hasDateFilter) {
      salesSql += ` AND s.sale_date BETWEEN ? AND ?`;
      salesParams.push(start_date, end_date);
    }
    if (seller_id) {
      salesSql += ` AND s.user_id = ?`;
      salesParams.push(seller_id);
    }
    salesSql += ` ORDER BY s.sale_date DESC`;
    const sales = await queryAll(salesSql, salesParams);

    res.json({
      generated_at: new Date().toISOString(),
      filters: { seller_id: seller_id || 'Todos', start_date: start_date || 'Todos', end_date: end_date || 'Todos' },
      sellerStats,
      followups,
      prospects,
      clients,
      sales
    });
  } catch (err) {
    console.error('Error al generar reporte completo CRM:', err);
    res.status(500).json({ error: 'Error al generar reporte completo CRM.' });
  }
});

// GET /api/reports/followups - Backward compatibility endpoint
router.get('/followups', async (req, res) => {
  req.url = '/full';
  return router.handle(req, res);
});

// GET /api/reports/export/csv - Export CSV route with UTF-8 BOM
router.get('/export/csv', async (req, res) => {
  try {
    const { seller_id, start_date, end_date, type = 'all' } = req.query;

    const hasDateFilter = Boolean(start_date && end_date);
    const startDateTime = start_date ? `${start_date} 00:00:00` : null;
    const endDateTime = end_date ? `${end_date} 23:59:59` : null;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Microsoft Excel encoding compatibility

    csvContent += `REPORTE CRM LA MANUELA MEZCAL\r\n`;
    csvContent += `Fecha de Generacion,${new Date().toLocaleString()}\r\n`;
    csvContent += `Rango de Fechas,${start_date || 'Sin filtro'} a ${end_date || 'Sin filtro'}\r\n`;
    csvContent += `Vendedor ID,${seller_id || 'Todos'}\r\n\r\n`;

    // 1. Sellers Summary
    if (type === 'all' || type === 'sellers') {
      let sellersSql = `SELECT id, name, email, phone FROM users WHERE role = 'vendedor'`;
      const sellersParams = [];
      if (seller_id) {
        sellersSql += ` AND id = ?`;
        sellersParams.push(seller_id);
      }
      const sellers = await queryAll(sellersSql, sellersParams);

      const sellerRows = await Promise.all(sellers.map(async s => {
        let fSql = `SELECT COUNT(id) as tot, SUM(CASE WHEN status = 'Completado' THEN 1 ELSE 0 END) as comp FROM followups WHERE user_id = ?`;
        const fParams = [s.id];
        if (hasDateFilter) { fSql += ` AND followup_date BETWEEN ? AND ?`; fParams.push(startDateTime, endDateTime); }
        const fRes = await getQuery(fSql, fParams);

        let pSql = `SELECT COUNT(id) as tot FROM prospects WHERE user_id = ?`;
        const pParams = [s.id];
        if (hasDateFilter) { pSql += ` AND created_at BETWEEN ? AND ?`; pParams.push(startDateTime, endDateTime); }
        const pRes = await getQuery(pSql, pParams);

        let cSql = `SELECT COUNT(id) as tot FROM clients WHERE user_id = ?`;
        const cParams = [s.id];
        if (hasDateFilter) { cSql += ` AND created_at BETWEEN ? AND ?`; cParams.push(startDateTime, endDateTime); }
        const cRes = await getQuery(cSql, cParams);

        let sSql = `SELECT COALESCE(SUM(total_amount),0) as tot, COALESCE(SUM(bottles_count),0) as bot FROM sales WHERE user_id = ?`;
        const sParams = [s.id];
        if (hasDateFilter) { sSql += ` AND sale_date BETWEEN ? AND ?`; sParams.push(start_date, end_date); }
        const sRes = await getQuery(sSql, sParams);

        return [
          s.name,
          s.email,
          s.phone || 'N/A',
          fRes ? fRes.tot || 0 : 0,
          fRes ? fRes.comp || 0 : 0,
          pRes ? pRes.tot || 0 : 0,
          cRes ? cRes.tot || 0 : 0,
          `$${(sRes ? sRes.tot || 0 : 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
          sRes ? sRes.bot || 0 : 0
        ];
      }));

      csvContent += buildCsvSection(
        'RESUMEN DE VENDEDORES',
        ['VENDEDOR', 'EMAIL', 'TELEFONO', 'SEGUIMIENTOS', 'COMPLETADOS', 'PROSPECTOS', 'CLIENTES', 'VENTAS TOTALES', 'BOTELLAS VENDIDAS'],
        sellerRows
      );
    }

    // 2. Follow-ups
    if (type === 'all' || type === 'followups') {
      let fSql = `
        SELECT f.followup_date, u.name as seller_name, f.type, f.summary, f.details, f.status, f.result,
               p.name as prospect_name, c.name as client_name
        FROM followups f
        JOIN users u ON f.user_id = u.id
        LEFT JOIN prospects p ON f.prospect_id = p.id
        LEFT JOIN clients c ON f.client_id = c.id
        WHERE 1=1
      `;
      const fParams = [];
      if (hasDateFilter) { fSql += ` AND f.followup_date BETWEEN ? AND ?`; fParams.push(startDateTime, endDateTime); }
      if (seller_id) { fSql += ` AND f.user_id = ?`; fParams.push(seller_id); }
      fSql += ` ORDER BY f.followup_date DESC`;
      const followups = await queryAll(fSql, fParams);

      const followupRows = followups.map(f => [
        f.followup_date,
        f.seller_name,
        f.type,
        f.prospect_name || f.client_name || 'N/A',
        f.summary,
        f.details || '',
        f.status,
        f.result || ''
      ]);

      csvContent += buildCsvSection(
        'BITACORA DE SEGUIMIENTOS',
        ['FECHA', 'VENDEDOR', 'TIPO', 'CONTACTO', 'RESUMEN', 'DETALLES', 'ESTADO', 'RESULTADO'],
        followupRows
      );
    }

    // 3. Prospects
    if (type === 'all' || type === 'prospects') {
      let pSql = `SELECT p.*, u.name as seller_name FROM prospects p JOIN users u ON p.user_id = u.id WHERE 1=1`;
      const pParams = [];
      if (hasDateFilter) { pSql += ` AND p.created_at BETWEEN ? AND ?`; pParams.push(startDateTime, endDateTime); }
      if (seller_id) { pSql += ` AND p.user_id = ?`; pParams.push(seller_id); }
      pSql += ` ORDER BY p.created_at DESC`;
      const prospects = await queryAll(pSql, pParams);

      const prospectRows = prospects.map(p => [
        p.created_at,
        p.seller_name,
        p.name,
        p.company || 'N/A',
        p.email || 'N/A',
        p.phone || 'N/A',
        p.status,
        `$${(p.estimated_value || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        p.product_interest || '',
        p.notes || ''
      ]);

      csvContent += buildCsvSection(
        'PROSPECTOS',
        ['FECHA REGISTRO', 'VENDEDOR', 'NOMBRE', 'EMPRESA', 'EMAIL', 'TELEFONO', 'ESTADO', 'VALOR ESTIMADO', 'INTERES DE PRODUCTO', 'NOTAS'],
        prospectRows
      );
    }

    // 4. Clients
    if (type === 'all' || type === 'clients') {
      let cSql = `SELECT c.*, u.name as seller_name FROM clients c JOIN users u ON c.user_id = u.id WHERE 1=1`;
      const cParams = [];
      if (hasDateFilter) { cSql += ` AND c.created_at BETWEEN ? AND ?`; cParams.push(startDateTime, endDateTime); }
      if (seller_id) { cSql += ` AND c.user_id = ?`; cParams.push(seller_id); }
      cSql += ` ORDER BY c.created_at DESC`;
      const clients = await queryAll(cSql, cParams);

      const clientRows = clients.map(c => [
        c.created_at,
        c.seller_name,
        c.name,
        c.company || 'N/A',
        c.email || 'N/A',
        c.phone || 'N/A',
        c.address || 'N/A',
        `$${(c.total_purchases || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        c.status
      ]);

      csvContent += buildCsvSection(
        'CLIENTES',
        ['FECHA REGISTRO', 'VENDEDOR', 'CLIENTE', 'EMPRESA', 'EMAIL', 'TELEFONO', 'DIRECCION', 'COMPRAS TOTALES', 'ESTADO'],
        clientRows
      );
    }

    // 5. Sales
    if (type === 'all' || type === 'sales') {
      let sSql = `
        SELECT s.*, u.name as seller_name, c.name as client_name, c.company as client_company
        FROM sales s
        JOIN users u ON s.user_id = u.id
        JOIN clients c ON s.client_id = c.id
        WHERE 1=1
      `;
      const sParams = [];
      if (hasDateFilter) { sSql += ` AND s.sale_date BETWEEN ? AND ?`; sParams.push(start_date, end_date); }
      if (seller_id) { sSql += ` AND s.user_id = ?`; sParams.push(seller_id); }
      sSql += ` ORDER BY s.sale_date DESC`;
      const sales = await queryAll(sSql, sParams);

      const saleRows = sales.map(s => [
        s.sale_date,
        s.seller_name,
        s.client_name,
        s.client_company || 'N/A',
        s.product,
        s.bottles_count,
        `$${(s.total_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        s.payment_status,
        s.notes || ''
      ]);

      csvContent += buildCsvSection(
        'VENTAS',
        ['FECHA VENTA', 'VENDEDOR', 'CLIENTE', 'EMPRESA', 'PRODUCTO', 'BOTELLAS', 'MONTO TOTAL', 'ESTADO PAGO', 'NOTAS'],
        saleRows
      );
    }

    const filename = `reporte_crm_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (err) {
    console.error('Error al exportar reporte CSV:', err);
    res.status(500).json({ error: 'Error al exportar reporte en formato CSV.' });
  }
});

// GET /api/reports/sales - Sales breakdown report
router.get('/sales', async (req, res) => {
  try {
    const salesByProduct = await queryAll(
      `SELECT product, SUM(bottles_count) as total_bottles, SUM(total_amount) as total_revenue
       FROM sales
       GROUP BY product
       ORDER BY total_revenue DESC`
    );

    const salesBySeller = await queryAll(
      `SELECT u.name as seller_name, COUNT(s.id) as total_sales_count, SUM(s.total_amount) as total_revenue
       FROM users u
       JOIN sales s ON s.user_id = u.id
       GROUP BY u.id, u.name
       ORDER BY total_revenue DESC`
    );

    res.json({
      salesByProduct,
      salesBySeller
    });
  } catch (err) {
    console.error('Error al obtener reporte de ventas:', err);
    res.status(500).json({ error: 'Error al generar reporte de ventas.' });
  }
});

// GET /api/reports/summary - High level CRM metrics
router.get('/summary', async (req, res) => {
  try {
    const totalSalesRow = await getQuery(`SELECT COALESCE(SUM(total_amount), 0) as total FROM sales`);
    const totalProspectsRow = await getQuery(`SELECT COUNT(*) as count FROM prospects`);
    const totalClientsRow = await getQuery(`SELECT COUNT(*) as count FROM clients`);
    const pendingFollowupsRow = await getQuery(`SELECT COUNT(*) as count FROM followups WHERE status = 'Pendiente'`);
    const completedFollowupsRow = await getQuery(`SELECT COUNT(*) as count FROM followups WHERE status = 'Completado'`);

    res.json({
      totalRevenue: totalSalesRow ? totalSalesRow.total : 0,
      totalProspects: totalProspectsRow ? totalProspectsRow.count : 0,
      totalClients: totalClientsRow ? totalClientsRow.count : 0,
      pendingFollowups: pendingFollowupsRow ? pendingFollowupsRow.count : 0,
      completedFollowups: completedFollowupsRow ? completedFollowupsRow.count : 0
    });
  } catch (err) {
    console.error('Error en resumen de reportes:', err);
    res.status(500).json({ error: 'Error al consultar resumen general.' });
  }
});

module.exports = router;

