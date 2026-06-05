# Vulcan Forge

> **Core Logística de Depósito & Suministro Industrial**
> Sistema de gestión de inventario, facturación y logística WMS con análisis ABC para ferreterías industriales.

![Status](https://img.shields.io/badge/status-demo-orange)
![Node](https://img.shields.io/badge/node-%3E%3D16-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Descripción

Vulcan Forge es un sistema de gestión integral para ferreterías industriales que combina:

- **Dashboard operativo** con métricas en tiempo real (ingresos, stock, alertas).
- **Depósito central** con catálogo técnico (SKU, lote, fechas de fabricación y reinspección).
- **Terminal de suministro** para facturación instantánea con descuentos e impuestos.
- **Optimización WMS (Pareto/ABC)** que sugiere reubicación de productos por rotación.
- **Preparación de pedidos (picking)** con recorridos de bodega optimizados.
- **Parámetros técnicos** configurables (moneda, IVA, datos de la empresa).

El frontend funciona de forma independiente con `localStorage`. Si el backend está disponible, los datos se sincronizan con autenticación JWT real.

---

## Stack tecnológico

### Frontend
- HTML5 + CSS3 (sin frameworks)
- JavaScript ES6+ vanilla
- `localStorage` como persistencia local (fallback)

### Backend
- **Node.js** + **Express**
- **JWT** (`jsonwebtoken`) para autenticación
- **bcryptjs** para hash de contraseñas
- **helmet** para headers de seguridad
- **express-rate-limit** para mitigación de fuerza bruta
- **dotenv** para configuración por entorno
- Persistencia: archivo JSON con escritura atómica (`tmp + rename`)

---

## Estructura del proyecto

```
.
├── index.html              # Aplicación principal (SPA)
├── login.html              # Pantalla de login
├── app.js                  # Lógica del frontend
├── auth.js                 # Autenticación, sesión y permisos por rol
├── styles.css              # Estilos del sistema
├── login.css               # Estilos del login
├── .gitignore
├── LICENSE
├── README.md
└── backend/
    ├── server.js           # API REST con Express
    ├── package.json
    ├── .gitignore
    ├── .env.example        # Plantilla de variables de entorno
    └── vulcan-data.json    # (autogenerado) DB local — NO versionado
```

---

## Instalación y arranque

### 1. Clonar el repositorio

```bash
git clone https://github.com/juandi-blip/Sistema-de-gesti-n-de-inventario-y-facturaci-n.git
cd Sistema-de-gesti-n-de-inventario-y-facturaci-n
```

### 2. Configurar el backend

```bash
cd backend
npm install
cp .env.example .env
```

Edita `backend/.env` y completa los valores reales:

```env
PORT=3001
NODE_ENV=development

# Genera uno con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=tu-secreto-de-96-caracteres-aqui
JWT_EXPIRES_IN=8h

BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:3001

SEED_ADMIN_PASSWORD=cambia-esta-clave
SEED_WAREHOUSE_PASSWORD=cambia-esta-clave
SEED_CASHIER_PASSWORD=cambia-esta-clave
```

### 3. Arrancar el servidor

```bash
cd backend
node server.js
```

Verás:

```
🔥  VULCAN FORGE — Backend [🔧 desarrollo]
    URL:            http://localhost:3001
    Token expira:   8h
    Bcrypt rounds:  12
    CORS origen:    http://localhost:3001
    DB:             backend/vulcan-data.json
```

### 4. Abrir la app

Navega a: **http://localhost:3001**

El backend sirve el frontend como archivos estáticos, así que todo corre desde un único puerto.

---

## Credenciales de demostración

Los usuarios se crean **en el primer arranque** con las contraseñas definidas en `.env`:

| Usuario    | Rol        | Permisos                                              |
|------------|------------|-------------------------------------------------------|
| `admin`    | admin      | Acceso total: dashboard, inventario, facturación, WMS, picking, configuración |
| `warehouse`| warehouse  | Depósito y logística: dashboard, inventario, WMS, picking |
| `cashier`  | cashier    | Punto de venta: dashboard, facturación                |

### Modo sin backend (fallback)

Si abres `index.html` directamente con `file://` y el backend no responde en 2 segundos, el login acepta estas credenciales hardcodeadas en `auth.js` (solo para evaluación local sin levantar el servidor):

| Usuario    | Contraseña    |
|------------|---------------|
| `admin`    | `admin123`    |
| `warehouse`| `warehouse123`|
| `cashier`  | `cashier123`  |

> ⚠️ **No uses estas credenciales en producción.** Son únicamente para evaluación del frontend sin backend.

---

## API REST

Todas las rutas (excepto `/api/auth/login`) requieren header `Authorization: Bearer <token>`.

| Método | Endpoint              | Auth | Rol     | Descripción                       |
|--------|-----------------------|------|---------|-----------------------------------|
| POST   | `/api/auth/login`     | No   | -       | Login → devuelve JWT              |
| GET    | `/api/auth/verify`    | Sí   | -       | Valida token actual               |
| GET    | `/api/products`       | Sí   | -       | Lista de productos                |
| PUT    | `/api/products`       | Sí   | -       | Reemplaza lista de productos      |
| GET    | `/api/invoices`       | Sí   | -       | Lista de facturas                 |
| PUT    | `/api/invoices`       | Sí   | -       | Reemplaza lista de facturas       |
| GET    | `/api/picking`        | Sí   | -       | Listas de picking                 |
| PUT    | `/api/picking`        | Sí   | -       | Reemplaza listas de picking       |
| GET    | `/api/settings`       | Sí   | -       | Configuración del sistema         |
| PUT    | `/api/settings`       | Sí   | -       | Actualiza configuración           |
| DELETE | `/api/reset`          | Sí   | admin   | Restablece datos a estado inicial |

### Rate limiting

- **Login**: máximo 8 intentos fallidos por IP cada 15 minutos.
- **API general**: máximo 120 peticiones por minuto por IP.

---

## Seguridad implementada

- ✅ Contraseñas hasheadas con **bcrypt** (12 rondas por defecto).
- ✅ Tokens **JWT** con expiración configurable y algoritmo `HS256` fijado.
- ✅ **Helmet** añade headers HTTP de seguridad.
- ✅ **CORS** configurable con whitelist de origen.
- ✅ **Rate limiting** en login y API.
- ✅ **Validación de entrada** con tipos y longitudes controladas.
- ✅ **Mensaje único** en login fallido (previene enumeración de usuarios).
- ✅ **Hash dummy** en login para mitigar ataques de timing.
- ✅ **`dotfiles: 'deny'`** en servidor estático (no se sirve `.env`).
- ✅ **Escritura atómica** de la base de datos (evita corrupción).
- ✅ Manejador de errores **sin filtrar stack traces** en producción.

---

## Roles y permisos

| Módulo     | admin | warehouse | cashier |
|------------|:-----:|:---------:|:-------:|
| Dashboard  | ✅    | ✅        | ✅      |
| Depósito   | ✅    | ✅        | ❌      |
| Facturación| ✅    | ❌        | ✅      |
| Logística  | ✅    | ✅        | ❌      |
| Picking    | ✅    | ✅        | ❌      |
| Configuración | ✅ | ❌        | ❌      |

---

## Roadmap

- [ ] Migrar persistencia JSON → **SQLite** o **PostgreSQL**.
- [ ] Tests unitarios (Jest) y E2E (Playwright).
- [ ] Docker Compose para levantar el stack completo.
- [ ] HTTPS y cookies `httpOnly` para tokens (en lugar de `localStorage`).
- [ ] Recuperación de contraseña por email.
- [ ] Auditoría de cambios (bitácora de operaciones).
- [ ] API REST documentada con **OpenAPI/Swagger**.

---

## Licencia

Este proyecto está bajo la licencia **MIT**. Ver [`LICENSE`](LICENSE) para más detalles.

---

## Autores

- **juandi-blip** — [github.com/juandi-blip](https://github.com/juandi-blip)
- **Leif Guy Florez** — [github.com/leifguy21-cpu](https://github.com/leifguy21-cpu)
