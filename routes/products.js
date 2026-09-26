const express = require('express');
const router = express.Router();
const { queryAll, getQuery, executeQuery } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Protect all routes with authentication
router.use(authenticateToken);

// GET /api/products - Get all products (or filter by status query)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM products';
    const params = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id ASC LIMIT 500';

    const products = await queryAll(sql, params);
    res.json(products);
  } catch (err) {
    console.error('Error al obtener productos:', err);
    res.status(500).json({ error: 'Error al consultar catálogo de productos.' });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await getQuery('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error al obtener producto:', err);
    res.status(500).json({ error: 'Error al consultar producto.' });
  }
});

// POST /api/products - Create new product (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, category, description, price, icon, color, status } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    }

    const prodPrice = parseFloat(price) >= 0 ? parseFloat(price) : 0;
    const prodCategory = category && category.trim() !== '' ? category.trim() : 'Mezcal';
    const prodIcon = icon && icon.trim() !== '' ? icon.trim() : 'fa-bottle-droplet';
    const prodColor = color && color.trim() !== '' ? color.trim() : '#4cc9f0';
    const prodStatus = status === 'Inactivo' ? 'Inactivo' : 'Activo';

    const result = await executeQuery(
      `INSERT INTO products (name, category, description, price, icon, color, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), prodCategory, description ? description.trim() : null, prodPrice, prodIcon, prodColor, prodStatus]
    );

    const newProduct = await getQuery('SELECT * FROM products WHERE id = ?', [result.insertId]);

    res.status(201).json({
      message: 'Producto agregado exitosamente al catálogo.',
      product: newProduct
    });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al agregar nuevo producto al catálogo.' });
  }
});

// PUT /api/products/:id - Update product (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, description, price, icon, color, status } = req.body;

    const existing = await getQuery('SELECT id FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio.' });
    }

    const prodPrice = parseFloat(price) >= 0 ? parseFloat(price) : 0;

    await executeQuery(
      `UPDATE products SET name = ?, category = ?, description = ?, price = ?, icon = ?, color = ?, status = ? WHERE id = ?`,
      [
        name.trim(),
        category ? category.trim() : 'Mezcal',
        description ? description.trim() : null,
        prodPrice,
        icon ? icon.trim() : 'fa-bottle-droplet',
        color ? color.trim() : '#4cc9f0',
        status || 'Activo',
        id
      ]
    );

    const updated = await getQuery('SELECT * FROM products WHERE id = ?', [id]);
    res.json({ message: 'Producto actualizado exitosamente.', product: updated });
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    res.status(500).json({ error: 'Error al actualizar información del producto.' });
  }
});

// DELETE /api/products/:id - Delete product (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getQuery('SELECT id FROM products WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    await executeQuery('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Producto eliminado exitosamente del catálogo.' });
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    res.status(500).json({ error: 'Error al eliminar el producto.' });
  }
});

module.exports = router;
