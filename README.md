# 🍾 CRM La Manuela Mezcal — Sistema Mezcalero Comercial

![Versión](https://img.shields.io/badge/versión-1.0.0-gold.svg)
![Stack](https://img.shields.io/badge/stack-Node.js%20%7C%20Express%20%7C%20VanillaJS-purple.svg)
![Base de Datos](https://img.shields.io/badge/base_de_datos-MySQL%208.0-blue.svg)
![Licencia](https://img.shields.io/badge/licencia-MIT-green.svg)

Un **Sistema CRM Web Integral** de diseño premium (*Glassmorphic & Neon*) concebido para la administración comercial, embudo de prospección, cartera de clientes, agenda de seguimientos y facturación de **La Manuela Mezcal**.

---

## 🌟 Características Principales y Módulos

### 📊 1. Dashboard General (Métricas Comercial)
* **Panel de Control KPI**: Visualización en tiempo real de ventas totales (\$ MXN), botellas vendidas, prospectos ganados y seguimientos pendientes.
* **Top Productos**: Variedades de mezcal con mayor volumen de facturación.
* **Alertas de Seguimiento**: Accesos directos a las tareas del día.

### 🎯 2. Embudo de Prospectos (Pipeline)
* **Vistas Kanban y Lista**: Gestión visual de oportunidades comerciales por etapas (*Nuevo, Contactado, Negociación, Cotización, Ganado, Perdido*).
* **Buscador en Tiempo Real**: Filtrado dinámico por nombre de prospecto, empresa o producto de interés.

### 👥 3. Catálogo de Clientes Oficiales
* **Tarjetas Adaptativas**: Fichas comerciales de clientes activos con su acumulado histórico de consumo.
* **Scroll Infinito (Infinite Scroll)**: Carga progresiva de tarjetas mediante `IntersectionObserver` que evita el consumo excesivo de memoria en el navegador.
* **Historial de Compras por Cliente**: Ventana modal con detalle completo de compras y desplazador infinito interno.

### 🛒 4. Registro de Ventas de Mezcal
* **Control de Pedidos**: Registro de pedidos cerrados por variedad, botellas y estado de pago (*Pagado / Pendiente*).
* **Barra de Doble Filtro**: Búsqueda en tiempo real por cliente/empresa/producto y filtrado opcional por **rango de fechas** (`Desde` / `Hasta`).
* **Optimización de Rendimiento**: Tabla optimizada con **Scroll Infinito**.

### 📅 5. Agenda y Seguimiento Comercial
* **Bitácora de Actividades**: Registro de llamadas, citas presenciales, degustaciones/catas, correos y mensajes de WhatsApp.
* **Filtros Avanzados**: Filtrado por vendedor (ej. *Sofía Ramírez*), estado (*Pendientes / Completados*) y rango de fechas.
* **Navegación Fluida**: Renderizado optimizado por lotes mediante Scroll Infinito.

### 🍾 6. Catálogo de Productos Mezcaleros
* **Gestión de Variedades**: Precios, descripciones y presentaciones (*Espadín, Spicy Tamarindo, Spicy Sandía, Spicy Mango, Cajas Surtidas*).

### 📄 7. Generador de Reportes y Exportación CSV
* **Auditoría Integral (5 Tablas Independientes)**:
  1. *Resumen de Vendedores*
  2. *Bitácora de Seguimientos*
  3. *Registro de Prospectos*
  4. *Cartera de Clientes*
  5. *Registro de Ventas*
* **Scroll Infinito Multitabla**: Cada una de las 5 tablas cuenta con su propio scroll interno de carga por bloques y encabezado fijo (`sticky header`).
* **Exportación CSV Compatible con Excel**: Generación de archivos CSV formateados con codificación `UTF-8 BOM` para apertura correcta en Microsoft Excel.

### 👥 8. Gestión de Usuarios y Seguridad Contable
* **Control de Roles**: Permisos diferenciados para **Administradores** y **Vendedores**.
* **Protección de Auditoría (Anti-Borrado Accidental)**: El sistema impide la eliminación física de vendedores que tengan ventas históricas registradas, recomendando cambiar su estado a `Inactivo` para preservar los estados financieros.

---

## 🛠️ Arquitectura Técnica y Tecnologías

* **Backend**: Node.js v18+ / v20+ con Express.js REST API.
* **Autenticación**: JSON Web Tokens (JWT) con cifrado de contraseñas mediante `bcryptjs`.
* **Base de Datos**: Conexión por Pool a **MySQL 8.0+ / MariaDB** (`mysql2/promise`) con creación automática de base de datos, tablas y datos de prueba.
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 Custom Properties (*Glassmorphism Design System*), FontAwesome 6.
* **Optimización DOM**: Carga diferida reactiva con `IntersectionObserver` (Scroll Infinito) en todas las vistas con alto volumen de registros.

---

## 🚀 Guía de Instalación y Uso Rápido (Local)

### 1. Requisitos Previos
* Tener instalado **Node.js** (versión 18.0 o superior), **npm** y un servidor **MySQL 8.0** o Docker.

### 2. Clonar / Descargar el Proyecto
```bash
git clone https://github.com/tu-usuario/crm-la-manuela-mezcal.git
cd "CRM La Manuela Mezcal"
```

### 3. Instalar Dependencias
```bash
npm install
```

### 4. Configurar Variables de Entorno
Copia el archivo `.env.example` como `.env` y configura tus credenciales de MySQL:
```bash
cp .env.example .env
```

### 5. Iniciar la Aplicación
```bash
npm start
```
> La aplicación creará automáticamente la base de datos MySQL y sembrará los datos de prueba iniciales.

### 6. Abrir en el Navegador
Navega a: **`http://localhost:3000`**

---

## 🔑 Cuentas de Acceso de Demostración

| Rol | Correo Electrónico | Contraseña | Descripción |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@lamanuelamezcal.com` | `admin123` | Acceso global a reportes, usuarios, catálogo y todas las ventas |
| **Vendedor (Oaxaca)** | `vendedor@lamanuelamezcal.com` | `vendedor123` | Carlos Mendoza — Vendedor región Oaxaca |
| **Vendedora (CDMX)** | `sofia@lamanuelamezcal.com` | `vendedor123` | Sofía Ramírez — Vendedora región CDMX |

---

## ⚙️ Variables de Entorno (`.env`)

```env
PORT=3000
JWT_SECRET=tu_clave_secreta_super_segura_2026
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=crm_la_manuela
```

---

## 📂 Estructura del Proyecto

```
CRM La Manuela Mezcal/
├── config/
│   └── database.js          # Conexión MySQL Pool, creación de tablas y seed inicial
├── database/
│   └── schema.sql           # Esquema DDL de base de datos MySQL
├── middleware/
│   └── auth.js              # Middleware de verificación JWT y Roles
├── routes/
│   ├── auth.js              # Rutas de Login y Perfil
│   ├── clients.js           # Rutas API de Clientes
│   ├── followups.js         # Rutas API de Seguimientos
│   ├── products.js          # Rutas API de Catálogo
│   ├── prospects.js         # Rutas API de Prospectos
│   ├── reports.js           # Rutas API de Reportes y CSV
│   ├── sales.js             # Rutas API de Ventas
│   └── users.js             # Rutas API de Usuarios
├── public/
│   ├── css/                 # Hojas de estilo (desktop, mobile, variables)
│   ├── js/
│   │   ├── app.js           # Router SPA y controlador principal
│   │   ├── api.js           # Cliente HTTP Fetch con JWT
│   │   ├── utils.js         # Modales interactivos, Toasts y formatos
│   │   └── components/      # Componentes UI encapsulados
│   └── index.html           # Plantilla principal SPA
├── .env.example             # Plantilla de variables de entorno para MySQL
├── server.js                # Servidor principal Express
├── README.md                # Documento principal
├── MANUAL_DE_USUARIO.md     # Manual operativo de usuario
├── MANUAL_TECNICO.md        # Manual técnico y API REST
└── MANUAL_DESPLIEGUE_VPS.md # Manual de despliegue en servidor VPS
```

---

## 📚 Documentación y Manuales

* [📖 Manual de Usuario](file:///c:/Users/ivand/Documents/Aplicaci%C3%B3n%20CRM%20-%20La%20Manuela%20Mezcal/CRM%20La%20Manuela%20Mezcal/MANUAL_DE_USUARIO.md): Guía de uso de módulos e interfaces para administradores y vendedores.
* [🛠️ Manual Técnico](file:///c:/Users/ivand/Documents/Aplicaci%C3%B3n%20CRM%20-%20La%20Manuela%20Mezcal/CRM%20La%20Manuela%20Mezcal/MANUAL_TECNICO.md): Arquitectura de software, modelo de datos y catálogo completo de endpoints de la API REST.
* [🚀 Manual de Despliegue en Servidor VPS](file:///c:/Users/ivand/Documents/Aplicaci%C3%B3n%20CRM%20-%20La%20Manuela%20Mezcal/CRM%20La%20Manuela%20Mezcal/MANUAL_DESPLIEGUE_VPS.md): Guía paso a paso de puesta en producción con Nginx, PM2, MySQL 8.0, SSL Let's Encrypt y respaldos automatizados.

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Desarrollado para el control comercial y operativo de **La Manuela Mezcal**.
