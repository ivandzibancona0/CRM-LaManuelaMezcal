const express = require('express');
const router = express.Router();
const { queryAll, getQuery, executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/sales - List sales
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT s.*, c.name as client_name, c.company as client_company, u.name as seller_name
      FROM sales s
      JOIN clients c ON s.client_id = c.id
      JOIN users u ON s.user_id = u.id
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      sql += ` WHERE s.user_id = ?`;
      params.push(req.user.id);
    } else if (req.query.seller_id) {
      sql += ` WHERE s.user_id = ?`;
      params.push(req.query.seller_id);
    }

    sql += ` ORDER BY s.sale_date DESC, s.id DESC LIMIT 500`;

    const sales = await queryAll(sql, params);
    res.json(sales);
  } catch (err) {
    console.error('Error al obtener ventas:', err);
    res.status(500).json({ error: 'Error al consultar historial de ventas.' });
  }
});

// POST /api/sales - Register a new sale
router.post('/', async (req, res) => {
  try {
    const { client_id, product, bottles_count, total_amount, payment_status, sale_date, notes } = req.body;

    if (!client_id || !product || !total_amount) {
      return res.status(400).json({ error: 'El cliente, producto y monto total son obligatorios.' });
    }

    // Verify client access
    let checkClientSql = 'SELECT * FROM clients WHERE id = ?';
    const checkClientParams = [client_id];
    if (req.user.role !== 'admin') {
      checkClientSql += ' AND user_id = ?';
      checkClientParams.push(req.user.id);
    }

    const client = await getQuery(checkClientSql, checkClientParams);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado o no asignado a su usuario.' });
    }

    const amount = parseFloat(total_amount);
    const bottles = parseInt(bottles_count) || 1;
    const dateStr = sale_date || new Date().toISOString().split('T')[0];

    const result = await executeQuery(
      `INSERT INTO sales (client_id, user_id, product, bottles_count, total_amount, payment_status, sale_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client_id,
        client.user_id, // Assigned seller of client
        product,
        bottles,
        amount,
        payment_status || 'Pagado',
        dateStr,
        notes || null
      ]
    );

    // Update client total purchases
    await executeQuery(
      `UPDATE clients SET total_purchases = total_purchases + ? WHERE id = ?`,
      [amount, client_id]
    );

    const newSale = await getQuery(
      `SELECT s.*, c.name as client_name, u.name as seller_name FROM sales s JOIN clients c ON s.client_id = c.id JOIN users u ON s.user_id = u.id WHERE s.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: '¡Venta registrada exitosamente!',
      sale: newSale
    });
  } catch (err) {
    console.error('Error al registrar venta:', err);
    res.status(500).json({ error: 'Error al registrar la venta.' });
  }
});

// DELETE /api/sales/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let checkSql = 'SELECT * FROM sales WHERE id = ?';
    const checkParams = [id];

    if (req.user.role !== 'admin') {
      checkSql += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const sale = await getQuery(checkSql, checkParams);
    if (!sale) {
      return res.status(404).json({ error: 'Venta no encontrada o no autorizada.' });
    }

    // Deduct total_purchases from client
    await executeQuery(
      `UPDATE clients SET total_purchases = CASE WHEN total_purchases >= ? THEN total_purchases - ? ELSE 0 END WHERE id = ?`,
      [sale.total_amount, sale.total_amount, sale.client_id]
    );

    await executeQuery('DELETE FROM sales WHERE id = ?', [id]);

    res.json({ message: 'Venta eliminada exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar venta:', err);
    res.status(500).json({ error: 'Error al eliminar la venta.' });
  }
});

module.exports = router;
