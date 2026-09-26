const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { getQuery } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Por favor ingrese su correo electrónico y contraseña.' });
    }

    const user = await getQuery('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas. Correo o contraseña incorrectos.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Esta cuenta de usuario ha sido desactivada. Contacte al administrador.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas. Correo o contraseña incorrectos.' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (err) {
    console.error('Error en /api/auth/login:', err);
    res.status(500).json({ error: 'Error de servidor durante el inicio de sesión.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery('SELECT id, name, email, role, phone, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(444).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Error en /api/auth/me:', err);
    res.status(500).json({ error: 'Error consultando información de usuario.' });
  }
});

module.exports = router;
