require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const prospectsRoutes = require('./routes/prospects');
const clientsRoutes = require('./routes/clients');
const salesRoutes = require('./routes/sales');
const followupsRoutes = require('./routes/followups');
const reportsRoutes = require('./routes/reports');
const productsRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/prospects', prospectsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/followups', followupsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/products', productsRoutes);

// Fallback for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint no encontrado.' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`===================================================`);
      console.log(` 🍶 CRM La Manuela Mezcal corriendo en: http://localhost:${PORT}`);
      console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`===================================================`);
    });
  } catch (err) {
    console.error(' Error inicializando el servidor:', err);
    process.exit(1);
  }
}

startServer();
