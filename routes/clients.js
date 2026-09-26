const express = require('express');
const router = express.Router();
const { queryAll, getQuery, executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/clients - List clients according to user role
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT c.*, u.name as seller_name, u.email as seller_email,
             (SELECT COUNT(*) FROM sales s WHERE s.client_id = c.id) as sales_count,
             (SELECT COALESCE(SUM(s.total_amount), 0) FROM sales s WHERE s.client_id = c.id) as total_spent
      FROM clients c
      JOIN users u ON c.user_id = u.id
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      sql += ` WHERE c.user_id = ?`;
      params.push(req.user.id);
    } else if (req.query.seller_id) {
      sql += ` WHERE c.user_id = ?`;
      params.push(req.query.seller_id);
    }

    sql += ` ORDER BY c.id DESC LIMIT 500`;

    const clients = await queryAll(sql, params);
    res.json(clients);
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    res.status(500).json({ error: 'Error al consultar catálogo de clientes.' });
  }
});

// GET /api/clients/:id - Get client details with sales history
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let sql = `SELECT c.*, u.name as seller_name FROM clients c JOIN users u ON c.user_id = u.id WHERE c.id = ?`;
    const params = [id];

    if (req.user.role !== 'admin') {
      sql += ` AND c.user_id = ?`;
      params.push(req.user.id);
    }

    const client = await getQuery(sql, params);
    if (!client) {
      return res.status(404).json({ error: 'Cliente no encontrado o no autorizado.' });
    }

    const sales = await queryAll(`SELECT * FROM sales WHERE client_id = ? ORDER BY sale_date DESC`, [id]);
    const followups = await queryAll(`SELECT f.*, u.name as user_name FROM followups f JOIN users u ON f.user_id = u.id WHERE f.client_id = ? ORDER BY f.followup_date DESC`, [id]);

    res.json({ ...client, sales, followups });
  } catch (err) {
    console.error('Error al obtener detalle de cliente:', err);
    res.status(500).json({ error: 'Error al obtener datos del cliente.' });
  }
});

// POST /api/clients - Create client
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, address, user_id, status } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del cliente es obligatorio.' });
    }

    let assignedUserId = req.user.id;
    if (req.user.role === 'admin' && user_id) {
      assignedUserId = user_id;
    }

    const result = await executeQuery(
      `INSERT INTO clients (name, company, email, phone, address, user_id, total_purchases, status)
       VALUES (?, ?, ?, ?, ?, ?, 0.00, ?)`,
      [
        name.trim(),
        company ? company.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        address ? address.trim() : null,
        assignedUserId,
        status || 'Activo'
      ]
    );

    const newClient = await getQuery(`SELECT c.*, u.name as seller_name FROM clients c JOIN users u ON c.user_id = u.id WHERE c.id = ?`, [result.insertId]);

    res.status(201).json({
      message: 'Cliente registrado exitosamente.',
      client: newClient
    });
  } catch (err) {
    console.error('Error al crear cliente:', err);
    res.status(500).json({ error: 'Error al registrar cliente.' });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, address, status, user_id } = req.body;

    let checkSql = 'SELECT * FROM clients WHERE id = ?';
    const checkParams = [id];
    if (req.user.role !== 'admin') {
      checkSql += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const existing = await getQuery(checkSql, checkParams);
    if (!existing) {
      return res.status(404).json({ error: 'Cliente no encontrado o no tiene permisos para actualizarlo.' });
    }

    let assignedUserId = existing.user_id;
    if (req.user.role === 'admin' && user_id) {
      assignedUserId = user_id;
    }

    await executeQuery(
      `UPDATE clients SET name = ?, company = ?, email = ?, phone = ?, address = ?, status = ?, user_id = ? WHERE id = ?`,
      [
        name || existing.name,
        company !== undefined ? company : existing.company,
        email !== undefined ? email : existing.email,
        phone !== undefined ? phone : existing.phone,
        address !== undefined ? address : existing.address,
        status || existing.status,
        assignedUserId,
        id
      ]
    );

    const updated = await getQuery(`SELECT c.*, u.name as seller_name FROM clients c JOIN users u ON c.user_id = u.id WHERE c.id = ?`, [id]);
    res.json({ message: 'Cliente actualizado exitosamente.', client: updated });
  } catch (err) {
    console.error('Error al actualizar cliente:', err);
    res.status(500).json({ error: 'Error al actualizar información del cliente.' });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let sql = 'DELETE FROM clients WHERE id = ?';
    const params = [id];

    if (req.user.role !== 'admin') {
      sql += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const result = await executeQuery(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado o no autorizado.' });
    }

    res.json({ message: 'Cliente eliminado exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    res.status(500).json({ error: 'Error al eliminar cliente.' });
  }
});

module.exports = router;
