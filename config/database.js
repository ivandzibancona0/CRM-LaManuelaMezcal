const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let mysqlPool = null;

// Configuración de variables de entorno para MySQL
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'crm_la_manuela';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);

async function initDatabase() {
  console.log(`🔌 Conectando a servidor MySQL en ${DB_HOST}:${DB_PORT}...`);
  
  try {
    // 1. Asegurar la creación de la base de datos si no existe
    const tempConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD
    });
    
    await tempConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await tempConn.end();

    // 2. Inicializar el Connection Pool
    mysqlPool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      decimalNumbers: true
    });

    // Test de conexión
    await mysqlPool.query('SELECT 1');
    console.log(`✅ Conectado exitosamente a la base de datos MySQL: '${DB_NAME}'`);

    // 3. Crear tablas e inicializar datos semilla
    await createTablesMysql();
    await seedInitialData();
  } catch (err) {
    console.error('❌ Error crítico al inicializar la base de datos MySQL:', err.message);
    throw err;
  }
}

async function createTablesMysql() {
  const mysqlStatements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role ENUM('admin', 'vendedor') NOT NULL DEFAULT 'vendedor',
      phone VARCHAR(30) DEFAULT NULL,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS prospects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      company VARCHAR(100) DEFAULT NULL,
      email VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(30) DEFAULT NULL,
      status ENUM('Nuevo', 'Contactado', 'Negociacion', 'Cotizacion', 'Ganado', 'Perdido') NOT NULL DEFAULT 'Nuevo',
      estimated_value DECIMAL(10,2) DEFAULT 0.00,
      product_interest VARCHAR(100) DEFAULT 'Espadín',
      user_id INT NOT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prospect_id INT DEFAULT NULL,
      name VARCHAR(100) NOT NULL,
      company VARCHAR(100) DEFAULT NULL,
      email VARCHAR(100) DEFAULT NULL,
      phone VARCHAR(30) DEFAULT NULL,
      address VARCHAR(255) DEFAULT NULL,
      user_id INT NOT NULL,
      total_purchases DECIMAL(10,2) DEFAULT 0.00,
      status ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      client_id INT NOT NULL,
      user_id INT NOT NULL,
      product VARCHAR(100) NOT NULL,
      bottles_count INT NOT NULL DEFAULT 1,
      total_amount DECIMAL(10,2) NOT NULL,
      payment_status ENUM('Pagado', 'Pendiente') NOT NULL DEFAULT 'Pagado',
      sale_date DATE NOT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS followups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prospect_id INT DEFAULT NULL,
      client_id INT DEFAULT NULL,
      user_id INT NOT NULL,
      type ENUM('Llamada', 'Cita Presencial', 'Correo Electrónico', 'Muestra / Degustación', 'WhatsApp') NOT NULL DEFAULT 'Llamada',
      summary VARCHAR(255) NOT NULL,
      details TEXT DEFAULT NULL,
      followup_date DATETIME NOT NULL,
      status ENUM('Pendiente', 'Completado', 'Cancelado') NOT NULL DEFAULT 'Pendiente',
      result TEXT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`,

    `CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) DEFAULT 'Mezcal',
      description TEXT DEFAULT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      icon VARCHAR(50) DEFAULT 'fa-bottle-droplet',
      color VARCHAR(30) DEFAULT '#4cc9f0',
      status ENUM('Activo', 'Inactivo') NOT NULL DEFAULT 'Activo',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  ];

  for (const sql of mysqlStatements) {
    await runQuery(sql);
  }
}

async function seedInitialData() {
  await seedProductsIfEmpty();

  const usersCountRow = await getQuery('SELECT COUNT(*) as count FROM users');
  if (usersCountRow && usersCountRow.count > 0) {
    return; // Ya existen datos
  }

  console.log('🌱 Inicializando datos semilla de demostración en MySQL...');

  const hashedAdminPassword = await bcrypt.hash('admin123', 10);
  const hashedSeller1Password = await bcrypt.hash('vendedor123', 10);
  const hashedSeller2Password = await bcrypt.hash('vendedor123', 10);

  // 1. Usuarios
  const adminRes = await executeQuery(
    `INSERT INTO users (name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['Administrador General', 'admin@lamanuelamezcal.com', hashedAdminPassword, 'admin', '951-555-0100', 'active']
  );

  const seller1Res = await executeQuery(
    `INSERT INTO users (name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['Carlos Mendoza (Vendedor Oaxaca)', 'vendedor@lamanuelamezcal.com', hashedSeller1Password, 'vendedor', '951-555-0101', 'active']
  );

  const seller2Res = await executeQuery(
    `INSERT INTO users (name, email, password, role, phone, status) VALUES (?, ?, ?, ?, ?, ?)`,
    ['Sofía Ramírez (Vendedora CDMX)', 'sofia@lamanuelamezcal.com', hashedSeller2Password, 'vendedor', '555-555-0202', 'active']
  );

  const seller1Id = seller1Res.insertId;
  const seller2Id = seller2Res.insertId;

  // 2. Prospectos
  const p1 = await executeQuery(
    `INSERT INTO prospects (name, company, email, phone, status, estimated_value, product_interest, user_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Hotel Boutique Los Olivos', 'Los Olivos S.A.', 'compras@losolivosoaxaca.com', '951-234-5678', 'Negociacion', 28500.00, 'Spicy Tamarindo y Espadín', seller1Id, 'Interesados en adquirir 50 botellas para la barra principal.']
  );

  const p2 = await executeQuery(
    `INSERT INTO prospects (name, company, email, phone, status, estimated_value, product_interest, user_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Restaurante El Agave Sagrado', 'Agave Sagrado CDMX', 'gerencia@agavesagrado.com', '555-987-6543', 'Cotizacion', 42000.00, 'Spicy Mango y Sandia', seller2Id, 'Población objetivo alta. Solicitaron cotización por cajas mixtas.']
  );

  await executeQuery(
    `INSERT INTO prospects (name, company, email, phone, status, estimated_value, product_interest, user_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Bar Mezcalería La Clandestina', 'Clandestina Bar', 'contacto@laclandestinabar.mx', '951-111-2233', 'Nuevo', 15000.00, 'Mezcal Espadín 750ml', seller1Id, 'Contacto inicial realizado en expo artesanal.']
  );

  const p4 = await executeQuery(
    `INSERT INTO prospects (name, company, email, phone, status, estimated_value, product_interest, user_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Distribuidora de Licores del Sur', 'Dilisur S.A. de C.V.', 'ventas@dilisur.com', '951-888-9900', 'Ganado', 95000.00, 'Caja Surtida Mezcal', seller1Id, 'Convertido exitosamente a cliente mayorista.']
  );

  // 3. Clientes
  const c1 = await executeQuery(
    `INSERT INTO clients (prospect_id, name, company, email, phone, address, user_id, total_purchases, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p4.insertId, 'Distribuidora de Licores del Sur', 'Dilisur S.A. de C.V.', 'ventas@dilisur.com', '951-888-9900', 'Av. Hidalgo #402, Col. Centro, Oaxaca', seller1Id, 95000.00, 'Activo']
  );

  const c2 = await executeQuery(
    `INSERT INTO clients (prospect_id, name, company, email, phone, address, user_id, total_purchases, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [null, 'Grupo Gastronómico Polanco', 'Gastronomía Polanco', 'compras@grupopolanco.mx', '555-333-4455', 'Av. Masaryk 120, Polanco, CDMX', seller2Id, 128000.00, 'Activo']
  );

  // 4. Ventas
  await executeQuery(
    `INSERT INTO sales (client_id, user_id, product, bottles_count, total_amount, payment_status, sale_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [c1.insertId, seller1Id, 'Mezcal Espadín 750ml', 60, 45000.00, 'Pagado', '2026-07-15', 'Primer pedido mayorista entregado.']
  );

  await executeQuery(
    `INSERT INTO sales (client_id, user_id, product, bottles_count, total_amount, payment_status, sale_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [c1.insertId, seller1Id, 'Spicy Tamarindo 750ml', 50, 50000.00, 'Pagado', '2026-08-01', 'Reordenamiento de cajas de tamarindo.']
  );

  await executeQuery(
    `INSERT INTO sales (client_id, user_id, product, bottles_count, total_amount, payment_status, sale_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [c2.insertId, seller2Id, 'Caja Surtida Mezcal', 100, 128000.00, 'Pagado', '2026-07-28', 'Suministro para 3 restaurantes del grupo.']
  );

  // 5. Seguimientos
  await executeQuery(
    `INSERT INTO followups (prospect_id, client_id, user_id, type, summary, details, followup_date, status, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [p1.insertId, null, seller1Id, 'Cita Presencial', 'Presentación de catálogo y cata de Spicy Tamarindo', 'Se visitó al gerente de compras en el hotel. Quedó fascinado con el perfil de mezcal spicy tamarindo.', '2026-08-05 11:00:00', 'Completado', 'Solicitó cotización por 50 botellas.']
  );

  await executeQuery(
    `INSERT INTO followups (prospect_id, client_id, user_id, type, summary, details, followup_date, status, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [p1.insertId, null, seller1Id, 'Llamada', 'Seguimiento a cotización enviada', 'Llamar para resolver dudas sobre condiciones de crédito a 30 días.', '2026-08-10 16:30:00', 'Pendiente', null]
  );

  await executeQuery(
    `INSERT INTO followups (prospect_id, client_id, user_id, type, summary, details, followup_date, status, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [p2.insertId, null, seller2Id, 'Correo Electrónico', 'Envío de ficha técnica y muestra de Spicy Mango', 'Se enviaron muestras por paquetería express para el sommelier.', '2026-08-04 10:00:00', 'Completado', 'Confirmaron recepción de muestras.']
  );

  await executeQuery(
    `INSERT INTO followups (prospect_id, client_id, user_id, type, summary, details, followup_date, status, result)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [null, c2.insertId, seller2Id, 'Muestra / Degustación', 'Visita de fidelización y evaluación de consumo', 'Revisión de inventario para pedido de fin de mes.', '2026-08-12 12:00:00', 'Pendiente', null]
  );

  console.log('✅ Base de datos MySQL inicializada y poblada con datos de demostración.');
}

async function seedProductsIfEmpty() {
  try {
    const row = await getQuery('SELECT COUNT(*) as count FROM products');
    if (row && row.count > 0) return;

    console.log('🌱 Inicializando catálogo de productos base en MySQL...');
    const initialProducts = [
      ['Mezcal Espadín 750ml', 'Espadín', 'Artesanal 100% Agave de Oaxaca 750ml', 750.00, 'fa-bottle-droplet', '#4cc9f0', 'Activo'],
      ['Spicy Tamarindo 750ml', 'Infusionado', 'Mezcal infusionado con chile y tamarindo', 850.00, 'fa-pepper-hot', '#d4af37', 'Activo'],
      ['Spicy Sandía 750ml', 'Infusionado', 'Sabor fresco y especiado con sandía natural', 850.00, 'fa-martini-glass-citrus', '#ff007f', 'Activo'],
      ['Spicy Mango 750ml', 'Infusionado', 'Perfil frutal tropical y toque picante dulce', 850.00, 'fa-sun', '#ff9f1c', 'Activo'],
      ['Caja Surtida Mezcal', 'Paquete / Caja', 'Selección mixta de variedades artesanales de la casa', 4800.00, 'fa-box-open', '#9d4edd', 'Activo']
    ];

    for (const p of initialProducts) {
      await executeQuery(
        `INSERT INTO products (name, category, description, price, icon, color, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        p
      );
    }
  } catch (err) {
    console.error('Error al inicializar productos semilla:', err.message);
  }
}

// Helpers unificados de ejecución de consultas sobre MySQL
async function queryAll(sql, params = []) {
  if (!mysqlPool) throw new Error('Base de datos MySQL no inicializada');
  const [rows] = await mysqlPool.query(sql, params);
  return rows;
}

async function getQuery(sql, params = []) {
  if (!mysqlPool) throw new Error('Base de datos MySQL no inicializada');
  const [rows] = await mysqlPool.query(sql, params);
  return rows[0] || null;
}

async function runQuery(sql, params = []) {
  if (!mysqlPool) throw new Error('Base de datos MySQL no inicializada');
  return mysqlPool.query(sql, params);
}

async function executeQuery(sql, params = []) {
  if (!mysqlPool) throw new Error('Base de datos MySQL no inicializada');
  const [result] = await mysqlPool.query(sql, params);
  return {
    insertId: result.insertId,
    affectedRows: result.affectedRows
  };
}

module.exports = {
  initDatabase,
  queryAll,
  getQuery,
  runQuery,
  executeQuery,
  getDriver: () => 'mysql'
};
