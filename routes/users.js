const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { queryAll, getQuery, executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protect all routes in this file for Admins only
router.use(authenticateToken, requireAdmin);

// GET /api/users - List all users
router.get('/', async (req, res) => {
  try {
    const users = await queryAll(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.status, u.created_at,
              (SELECT COUNT(*) FROM prospects p WHERE p.user_id = u.id) as total_prospects,
              (SELECT COUNT(*) FROM clients c WHERE c.user_id = u.id) as total_clients,
              (SELECT COUNT(*) FROM sales s WHERE s.user_id = u.id) as total_sales,
              (SELECT COUNT(*) FROM followups f WHERE f.user_id = u.id) as total_followups
       FROM users u
       ORDER BY u.id DESC`
    );
    res.json(users);
  } catch (err) {
    console.error('Error al obtener usuarios:', err);
    res.status(500).json({ error: 'Error al consultar la lista de usuarios.' });
  }
});

// POST /api/users - Create new user (Seller or Admin)
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo electrónico y contraseña son obligatorios.' });
    }

    const existing = await getQuery('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un usuario registrado con este correo electrónico.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'vendedor';

    const result = await executeQuery(
      `INSERT INTO users (name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, userRole, phone || null, 'active']
    );

    const newUser = await getQuery('SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = ?', [result.insertId]);

    res.status(201).json({
      message: 'Usuario creado exitosamente.',
      user: newUser
    });
  } catch (err) {
    console.error('Error al crear usuario:', err);
    res.status(500).json({ error: 'Error al registrar el usuario en el sistema.' });
  }
});

// PUT /api/users/:id - Update user status or details
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, status, password } = req.body;

    const user = await getQuery('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    let sql = 'UPDATE users SET name = ?, phone = ?, role = ?, status = ?';
    const params = [name, phone || null, role, status || 'active'];

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql += ', password = ?';
      params.push(hashedPassword);
    }

    sql += ' WHERE id = ?';
    params.push(id);

    await executeQuery(sql, params);

    const updatedUser = await getQuery('SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = ?', [id]);
    res.json({ message: 'Usuario actualizado exitosamente.', user: updatedUser });
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    res.status(500).json({ error: 'Error al actualizar información del usuario.' });
  }
});

// DELETE /api/users/:id - Delete user (Protected)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de usuario en sesión.' });
    }

    // Check if the user has historical sales registered
    const salesCountRow = await getQuery('SELECT COUNT(*) as count FROM sales WHERE user_id = ?', [id]);
    if (salesCountRow && salesCountRow.count > 0) {
      return res.status(400).json({
        error: `No se puede borrar este vendedor porque tiene ${salesCountRow.count} venta(s) registrada(s). Para suspender su acceso conservando el historial de ingresos, cambia su estado a "Inactivo".`
      });
    }

    await executeQuery('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'Usuario eliminado exitosamente.' });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

module.exports = router;
