const express = require('express');
const router = express.Router();
const { queryAll, getQuery, executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/prospects - List prospects according to role
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT p.*, u.name as seller_name, u.email as seller_email
      FROM prospects p
      JOIN users u ON p.user_id = u.id
    `;
    const params = [];

    // Filter for non-admin sellers
    if (req.user.role !== 'admin') {
      sql += ` WHERE p.user_id = ?`;
      params.push(req.user.id);
    } else if (req.query.seller_id) {
      sql += ` WHERE p.user_id = ?`;
      params.push(req.query.seller_id);
    }

    sql += ` ORDER BY p.id DESC LIMIT 500`;

    const prospects = await queryAll(sql, params);
    res.json(prospects);
  } catch (err) {
    console.error('Error al consultar prospectos:', err);
    res.status(500).json({ error: 'Error al obtener la lista de prospectos.' });
  }
});

// GET /api/prospects/:id - Get single prospect details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let sql = `
      SELECT p.*, u.name as seller_name 
      FROM prospects p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `;
    const params = [id];

    if (req.user.role !== 'admin') {
      sql += ` AND p.user_id = ?`;
      params.push(req.user.id);
    }

    const prospect = await getQuery(sql, params);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospecto no encontrado o no tiene permisos para verlo.' });
    }

    // Get followups for this prospect
    const followups = await queryAll(
      `SELECT f.*, u.name as user_name FROM followups f JOIN users u ON f.user_id = u.id WHERE f.prospect_id = ? ORDER BY f.followup_date DESC`,
      [id]
    );

    res.json({ ...prospect, followups });
  } catch (err) {
    console.error('Error al obtener detalle de prospecto:', err);
    res.status(500).json({ error: 'Error al obtener información del prospecto.' });
  }
});

// POST /api/prospects - Create prospect
router.post('/', async (req, res) => {
  try {
    const { name, company, email, phone, status, estimated_value, product_interest, user_id, notes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre del prospecto es obligatorio.' });
    }

    // Determine assigned seller
    let assignedUserId = req.user.id;
    if (req.user.role === 'admin' && user_id) {
      assignedUserId = user_id;
    }

    const prospectStatus = status || 'Nuevo';
    const val = parseFloat(estimated_value) || 0;

    const result = await executeQuery(
      `INSERT INTO prospects (name, company, email, phone, status, estimated_value, product_interest, user_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        company ? company.trim() : null,
        email ? email.trim() : null,
        phone ? phone.trim() : null,
        prospectStatus,
        val,
        product_interest || 'Espadín',
        assignedUserId,
        notes || null
      ]
    );

    const newProspect = await getQuery(
      `SELECT p.*, u.name as seller_name FROM prospects p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Prospecto registrado exitosamente.',
      prospect: newProspect
    });
  } catch (err) {
    console.error('Error al crear prospecto:', err);
    res.status(500).json({ error: 'Error al guardar el nuevo prospecto.' });
  }
});

// PUT /api/prospects/:id - Update prospect
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, email, phone, status, estimated_value, product_interest, user_id, notes } = req.body;

    // Check ownership if not admin
    let checkSql = 'SELECT * FROM prospects WHERE id = ?';
    const checkParams = [id];
    if (req.user.role !== 'admin') {
      checkSql += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const existing = await getQuery(checkSql, checkParams);
    if (!existing) {
      return res.status(404).json({ error: 'Prospecto no encontrado o no tiene autorización para modificarlo.' });
    }

    let assignedUserId = existing.user_id;
    if (req.user.role === 'admin' && user_id) {
      assignedUserId = user_id;
    }

    await executeQuery(
      `UPDATE prospects 
       SET name = ?, company = ?, email = ?, phone = ?, status = ?, estimated_value = ?, product_interest = ?, user_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || existing.name,
        company !== undefined ? company : existing.company,
        email !== undefined ? email : existing.email,
        phone !== undefined ? phone : existing.phone,
        status || existing.status,
        estimated_value !== undefined ? parseFloat(estimated_value) : existing.estimated_value,
        product_interest || existing.product_interest,
        assignedUserId,
        notes !== undefined ? notes : existing.notes,
        id
      ]
    );

    const updated = await getQuery(
      `SELECT p.*, u.name as seller_name FROM prospects p JOIN users u ON p.user_id = u.id WHERE p.id = ?`,
      [id]
    );

    res.json({ message: 'Prospecto actualizado exitosamente.', prospect: updated });
  } catch (err) {
    console.error('Error al actualizar prospecto:', err);
    res.status(500).json({ error: 'Error al actualizar prospecto.' });
  }
});

// POST /api/prospects/:id/convert - Convert Prospect to Client
router.post('/:id/convert', async (req, res) => {
  try {
    const { id } = req.params;
    const { address } = req.body;

    // Verify prospect exists and belongs to seller if not admin
    let checkSql = 'SELECT * FROM prospects WHERE id = ?';
    const checkParams = [id];
    if (req.user.role !== 'admin') {
      checkSql += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const prospect = await getQuery(checkSql, checkParams);
    if (!prospect) {
      return res.status(404).json({ error: 'Prospecto no encontrado o sin permisos.' });
    }

    // Update prospect status to 'Ganado'
    await executeQuery(`UPDATE prospects SET status = 'Ganado', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);

    // Create client
    const clientRes = await executeQuery(
      `INSERT INTO clients (prospect_id, name, company, email, phone, address, user_id, total_purchases, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prospect.id,
        prospect.name,
        prospect.company,
        prospect.email,
        prospect.phone,
        address || 'Dirección por registrar',
        prospect.user_id,
        prospect.estimated_value || 0,
        'Activo'
      ]
    );

    const newClient = await getQuery(`SELECT * FROM clients WHERE id = ?`, [clientRes.insertId]);

    res.status(201).json({
      message: '¡Prospecto convertido exitosamente a Cliente!',
      client: newClient
    });
  } catch (err) {
    console.error('Error convirtiendo prospecto a cliente:', err);
    res.status(500).json({ error: 'Error al convertir el prospecto a cliente.' });
  }
});

// DELETE /api/prospects/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let sql = 'DELETE FROM prospects WHERE id = ?';
    const params = [id];

    if (req.user.role !== 'admin') {
      sql += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const result = await executeQuery(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Prospecto no encontrado o no tiene permiso.' });
    }

    res.json({ message: 'Prospecto eliminado exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar prospecto:', err);
    res.status(500).json({ error: 'Error al eliminar el prospecto.' });
  }
});

module.exports = router;
