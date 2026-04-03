# SGS - Sistema de Gestión de Supermercado 🛒

Sistema integral profesional (Full-Stack) diseñado para la administración de supermercados, tiendas de conveniencia y minimarkets. Permite gestionar inventarios, procesar ventas, generar reportes analíticos y auditar la seguridad del sistema en tiempo real.

## 🚀 Tecnologías (Stack MERN)
* **Frontend:** React (Vite), React Router v7, Chart.js, jsPDF, Axios.
* **Backend:** Node.js, Express.js.
* **Base de Datos:** MongoDB.
* **Seguridad:** JWT (JSON Web Tokens), bcryptjs, Helmet, express-rate-limit, express-mongo-sanitize, xss-clean.

## 🛡️ Características de Seguridad Estructural
Este sistema fue auditado y reforzado para entornos de producción comercial:
1. **Autenticación Robusta:** Las cookies viajan encriptadas con los flags `httpOnly` y `sameSite`.
2. **Rate Limiting:** Protección activa contra ataques de fuerza bruta al endpoint de login (máximo 10 intentos por IP en 15 minutos).
3. **Role-Based Access Control (RBAC):** Permisos granulares y dinámicos para `admin`, `manager`, y `cashier` en la base de datos (Ej: Cajeros no pueden crear usuarios).
4. **Sanitización de Inputs:** Prevención algorítmica contra ataques XSS e inyecciones NoSQL.
5. **Auditoría Completa:** Registro inmutable de cada acción (Login, Crear Producto, Ventas, etc.) que ocurre dentro del sistema.

---

## ⚙️ Manual de Instalación y Despliegue

### Requisitos Previos
* [Node.js](https://nodejs.org/) (v16 o superior)
* [MongoDB](https://www.mongodb.com/) (Instalado de forma local o un clúster en MongoDB Atlas)

### 1. Clonar el repositorio
Extraiga el contenido del ZIP o clone el repositorio en la computadora destino.

### 2. Configurar el Servidor (Backend)
1. Abra una terminal y navegue a la carpeta del servidor:
   ```bash
   cd backend
   ```
2. Instale las dependencias de producción:
   ```bash
   npm install
   ```
3. Copie el archivo de ejemplo de variables de entorno y renómbrelo a `.env`:
   ```bash
   cp .env.example .env
   ```
4. Edite el nuevo archivo `.env` rellenando la ruta de su base de datos MongoDB y el secreto JWT.
5. Inicie el servidor:
   * Para desarrollo: `npm run dev`
   * Para producción: `npm start` (Asegúrese de configurar `NODE_ENV=production`)

### 3. Configurar la Interfaz (Frontend)
1. Abra otra terminal y navegue a la carpeta del cliente:
   ```bash
   cd client
   ```
2. Instale las dependencias:
   ```bash
   npm install
   ```
3. Construya la versión optimizada para producción:
   ```bash
   npm run build
   ```
4. Para visualizar el proyecto en modo de desarrollo local:
   ```bash
   npm run dev
   ```

---

## 🔑 Credenciales por Defecto (Primer Uso)
Al arrancar el sistema con una base de datos limpia, por defecto es necesario registrar al primer usuario con privilegios de Administrador directamente desde la API o utilizando el script/endpoint de inicialización incluido en el código.

*(Nota al comprador: Asegúrese de cambiar las credenciales predeterminadas de inmediato en el módulo de Administración una vez que haya accedido al sistema).*

---

## 📄 Módulos Principales
* **Panel de Control (Dashboard):** Visión general de ingresos, productos bajos en stock y gráficas de ventas.
* **Inventario:** CRUD completo de catálogo de productos.
* **Ventas (TPV):** Terminal de Punto de Venta ágil para cajeros, genera tickets de venta.
* **Reportes:** Motor de análisis de negocio con gráficas dinámicas y exportación a PDF/Excel.
* **Administración:** Gestión de cuentas y asignación de roles y permisos.
* **Auditoría:** Log inmutable de incidentes y uso del sistema.

## 📞 Soporte
Ante cualquier duda de implementación, despliegue en la nube (AWS, Render, Vercel) o requerimiento de módulos a medida, consulte con el proveedor que le entregó este código fuente.
