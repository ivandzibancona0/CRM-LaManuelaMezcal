const express = require('express');
const router = express.Router();
const { queryAll, getQuery, executeQuery } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// GET /api/followups - List follow-ups
router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT f.*, u.name as seller_name,
             p.name as prospect_name, p.company as prospect_company,
             c.name as client_name, c.company as client_company
      FROM followups f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN prospects p ON f.prospect_id = p.id
      LEFT JOIN clients c ON f.client_id = c.id
    `;
    const params = [];

    if (req.user.role !== 'admin') {
      sql += ` WHERE f.user_id = ?`;
      params.push(req.user.id);
    } else if (req.query.seller_id) {
      sql += ` WHERE f.user_id = ?`;
      params.push(req.query.seller_id);
    }

    if (req.query.status) {
      sql += params.length ? ` AND f.status = ?` : ` WHERE f.status = ?`;
      params.push(req.query.status);
    }

    sql += ` ORDER BY f.followup_date ASC LIMIT 500`;

    const followups = await queryAll(sql, params);
    res.json(followups);
  } catch (err) {
    console.error('Error al consultar seguimientos:', err);
    res.status(500).json({ error: 'Error al obtener la lista de seguimientos.' });
  }
});

// POST /api/followups - Create a new follow-up activity
router.post('/', async (req, res) => {
  try {
    const { prospect_id, client_id, type, summary, details, followup_date, status, result, user_id } = req.body;

    if (!summary || !followup_date) {
      return res.status(400).json({ error: 'El resumen y la fecha del seguimiento son obligatorios.' });
    }

    let assignedUserId = req.user.id;
    if (req.user.role === 'admin' && user_id) {
      assignedUserId = user_id;
    }

    const insertResult = await executeQuery(
      `INSERT INTO followups (prospect_id, client_id, user_id, type, summary, details, followup_date, status, result)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prospect_id || null,
        client_id || null,
        assignedUserId,
        type || 'Llamada',
        summary.trim(),
        details ? details.trim() : null,
        followup_date,
        status || 'Pendiente',
        result ? result.trim() : null
      ]
    );

    const newFollowup = await getQuery(
      `SELECT f.*, u.name as seller_name FROM followups f JOIN users u ON f.user_id = u.id WHERE f.id = ?`,
      [insertResult.insertId]
    );

    res.status(201).json({
      message: 'Seguimiento agendado/registrado exitosamente.',
      followup: newFollowup
    });
  } catch (err) {
    console.error('Error al registrar seguimiento:', err);
    res.status(500).json({ error: 'Error al registrar el seguimiento.' });
  }
});

// PUT /api/followups/:id - Update status or result of a follow-up
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, result, details, followup_date, type, summary } = req.body;

    let checkSql = 'SELECT * FROM followups WHERE id = ?';
    const checkParams = [id];
    if (req.user.role !== 'admin') {
      checkSql += ' AND user_id = ?';
      checkParams.push(req.user.id);
    }

    const existing = await getQuery(checkSql, checkParams);
    if (!existing) {
      return res.status(404).json({ error: 'Seguimiento no encontrado o no tiene permisos para modificarlo.' });
    }

    await executeQuery(
      `UPDATE followups 
       SET status = ?, result = ?, details = ?, followup_date = ?, type = ?, summary = ?
       WHERE id = ?`,
      [
        status || existing.status,
        result !== undefined ? result : existing.result,
        details !== undefined ? details : existing.details,
        followup_date || existing.followup_date,
        type || existing.type,
        summary || existing.summary,
        id
      ]
    );

    const updated = await getQuery(
      `SELECT f.*, u.name as seller_name FROM followups f JOIN users u ON f.user_id = u.id WHERE f.id = ?`,
      [id]
    );

    res.json({ message: 'Seguimiento actualizado exitosamente.', followup: updated });
  } catch (err) {
    console.error('Error al actualizar seguimiento:', err);
    res.status(500).json({ error: 'Error al actualizar el seguimiento.' });
  }
});

// DELETE /api/followups/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let sql = 'DELETE FROM followups WHERE id = ?';
    const params = [id];

    if (req.user.role !== 'admin') {
      sql += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const result = await executeQuery(sql, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Seguimiento no encontrado o no autorizado.' });
    }

    res.json({ message: 'Seguimiento eliminado exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar seguimiento:', err);
    res.status(500).json({ error: 'Error al eliminar el seguimiento.' });
  }
});

module.exports = router;
