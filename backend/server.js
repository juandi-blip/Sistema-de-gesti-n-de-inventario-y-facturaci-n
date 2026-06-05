// ==========================================================================
//   VULCAN FORGE — BACKEND
//   Arrancar: cd backend && npm install && node server.js
// ==========================================================================

'use strict';

require('dotenv').config();

const express   = require('express');
const jwt       = require('jsonwebtoken');
const bcrypt    = require('bcryptjs');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');

// ==========================================================================
//   CONFIGURACIÓN DESDE VARIABLES DE ENTORNO
// ==========================================================================
const NODE_ENV      = process.env.NODE_ENV || 'development';
const PORT          = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN   = process.env.CORS_ORIGIN || `http://localhost:${PORT}`;
const JWT_EXPIRES   = process.env.JWT_EXPIRES_IN || '8h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const DB_FILE       = path.join(__dirname, 'vulcan-data.json');

// --- JWT_SECRET: obligatorio en producción; fallback inseguro solo en desarrollo ---
let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    if (NODE_ENV === 'production') {
        console.error('[FATAL] JWT_SECRET no está definido. Agrega JWT_SECRET al archivo .env');
        process.exit(1);
    }
    JWT_SECRET = crypto.randomBytes(48).toString('hex');
    console.warn('[WARN]  JWT_SECRET no configurado — generado aleatoriamente para esta sesión.');
    console.warn('        Los tokens anteriores quedarán inválidos al reiniciar.');
    console.warn('        Crea backend/.env con JWT_SECRET para persistencia entre reinicios.\n');
}

// ==========================================================================
//   APLICACIÓN EXPRESS
// ==========================================================================
const app = express();

// --- Headers de seguridad (helmet) ---
// CSP deshabilitado para compatibilidad con el frontend que usa inline scripts/styles.
// En producción configura CSP con nonces o hashes en lugar de unsafe-inline.
app.use(helmet({
    contentSecurityPolicy:    false,
    crossOriginEmbedderPolicy: false,
}));

// --- CORS ---
const corsOptions = {
    origin: (origin, callback) => {
        // Permitir: origen configurado, peticiones sin origen (curl, Postman),
        // y en desarrollo también el origen 'null' (protocolo file://)
        const isDev     = NODE_ENV !== 'production';
        const noOrigin  = !origin;
        const allowed   = origin === CORS_ORIGIN;
        const fileProto = isDev && origin === 'null';

        if (noOrigin || allowed || fileProto) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: origen no permitido — ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};
app.use(cors(corsOptions));

// --- Body parsing (límite reducido, solo JSON) ---
app.use(express.json({ limit: '2mb' }));

// ==========================================================================
//   RATE LIMITING
// ==========================================================================

// Login: máximo 8 intentos fallidos por IP cada 15 minutos
const loginLimiter = rateLimit({
    windowMs:              15 * 60 * 1000,
    max:                   8,
    skipSuccessfulRequests: true,   // solo cuenta intentos fallidos
    standardHeaders:       true,
    legacyHeaders:         false,
    message: { error: 'Demasiados intentos de inicio de sesión. Espera 15 minutos.' },
    keyGenerator: (req) => req.ip || 'unknown',
});

// API general: máximo 120 peticiones por minuto por IP
const apiLimiter = rateLimit({
    windowMs:      60 * 1000,
    max:           120,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: 'Demasiadas solicitudes. Reduce la frecuencia e intenta de nuevo.' },
    keyGenerator: (req) => req.ip || 'unknown',
});

app.use('/api', apiLimiter);

// ==========================================================================
//   JSON FILE STORE
// ==========================================================================
function loadDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch {
        return { users: [], data: {} };
    }
}

function saveDB(db) {
    // Escritura atómica: escribe en archivo temporal y renombra
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tmp, DB_FILE);
}

// --- Semilla de usuarios (solo en el primer arranque) ---
if (!fs.existsSync(DB_FILE)) {
    const adminPwd     = process.env.SEED_ADMIN_PASSWORD;
    const warehousePwd = process.env.SEED_WAREHOUSE_PASSWORD;
    const cashierPwd   = process.env.SEED_CASHIER_PASSWORD;

    if (!adminPwd || !warehousePwd || !cashierPwd) {
        console.error('[ERROR] Define SEED_ADMIN_PASSWORD, SEED_WAREHOUSE_PASSWORD y SEED_CASHIER_PASSWORD en .env antes del primer arranque.');
        process.exit(1);
    }

    const db = {
        users: [
            { id: 1, username: 'admin',     password: bcrypt.hashSync(adminPwd,     BCRYPT_ROUNDS), role: 'admin',     name: 'Administrador Master' },
            { id: 2, username: 'warehouse', password: bcrypt.hashSync(warehousePwd, BCRYPT_ROUNDS), role: 'warehouse', name: 'Jefe de Depósito'       },
            { id: 3, username: 'cashier',   password: bcrypt.hashSync(cashierPwd,   BCRYPT_ROUNDS), role: 'cashier',   name: 'Operador de Caja'       },
        ],
        data: {},
    };
    saveDB(db);
    console.log('✓ Base de datos inicializada con los usuarios configurados en .env\n');
}

// Helpers de datos por clave
function getKey(key, fallback = null) {
    return loadDB().data[key] ?? fallback;
}

function setKey(key, value) {
    const db = loadDB();
    db.data[key] = value;
    saveDB(db);
}

function deleteKeys(keys) {
    const db = loadDB();
    keys.forEach(k => delete db.data[k]);
    saveDB(db);
}

// ==========================================================================
//   MIDDLEWARE DE AUTENTICACIÓN JWT
// ==========================================================================
function auth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Autenticación requerida' });
    }

    const token = authHeader.slice(7); // quitar "Bearer "
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Sesión expirada. Vuelve a iniciar sesión.' });
        }
        // No revelar detalles del error de verificación
        return res.status(401).json({ error: 'Token inválido' });
    }
}

// Requiere rol específico (usa después de `auth`)
function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            return res.status(403).json({ error: 'No tienes permisos para esta acción' });
        }
        next();
    };
}

// ==========================================================================
//   RUTAS — AUTENTICACIÓN
// ==========================================================================
app.post('/api/auth/login', loginLimiter, (req, res) => {
    const { username, password } = req.body || {};

    // Validación de entrada: sanear y limitar longitud
    if (
        typeof username !== 'string' || username.trim().length < 1 || username.trim().length > 64 ||
        typeof password !== 'string' || password.length < 1       || password.length > 128
    ) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const db   = loadDB();
    const user = db.users.find(u => u.username === username.trim());

    // Siempre ejecutar bcrypt para evitar timing attacks cuando el usuario no existe
    const dummyHash = '$2a$12$invalidsaltinvalidsaltinvalidsaltinvalidsalt';
    const hashToCompare = user ? user.password : dummyHash;
    const passwordMatch = bcrypt.compareSync(password, hashToCompare);

    if (!user || !passwordMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES, algorithm: 'HS256' }
    );

    res.json({
        token,
        expiresIn: JWT_EXPIRES,
        user: { username: user.username, role: user.role, name: user.name },
    });
});

app.get('/api/auth/verify', auth, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ==========================================================================
//   RUTAS — DATOS (requieren JWT válido)
// ==========================================================================

// --- Productos ---
app.get('/api/products', auth, (_req, res) => res.json(getKey('products', [])));
app.put('/api/products', auth, (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
    setKey('products', req.body);
    res.json({ ok: true, count: req.body.length });
});

// --- Facturas ---
app.get('/api/invoices', auth, (_req, res) => res.json(getKey('invoices', [])));
app.put('/api/invoices', auth, (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
    setKey('invoices', req.body);
    res.json({ ok: true, count: req.body.length });
});

// --- Picking ---
app.get('/api/picking', auth, (_req, res) => res.json(getKey('picking', [])));
app.put('/api/picking', auth, (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Se espera un array' });
    setKey('picking', req.body);
    res.json({ ok: true, count: req.body.length });
});

// --- Configuración ---
app.get('/api/settings', auth, (_req, res) => res.json(getKey('settings', null)));
app.put('/api/settings', auth, (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))
        return res.status(400).json({ error: 'Se espera un objeto de configuración' });
    setKey('settings', req.body);
    res.json({ ok: true });
});

// --- Reset (solo admin) ---
app.delete('/api/reset', auth, requireRole('admin'), (_req, res) => {
    deleteKeys(['products', 'invoices', 'picking', 'settings']);
    res.json({ ok: true });
});

// ==========================================================================
//   ARCHIVOS ESTÁTICOS — FRONTEND
// ==========================================================================
app.use(express.static(path.join(__dirname, '..'), {
    // No exponer .env ni archivos de configuración
    dotfiles: 'deny',
}));

// SPA fallback: cualquier ruta que no sea /api/* devuelve login.html
// para que el router del frontend maneje la navegación
app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// ==========================================================================
//   MANEJADOR DE ERRORES GLOBAL
//   No filtrar stack traces ni detalles internos en producción
// ==========================================================================
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
    const isDev = NODE_ENV !== 'production';
    console.error('[ERROR]', err.message);

    if (err.message?.startsWith('CORS:')) {
        return res.status(403).json({ error: err.message });
    }

    res.status(err.status || 500).json({
        error: isDev ? err.message : 'Error interno del servidor',
        ...(isDev && { stack: err.stack }),
    });
});

// ==========================================================================
//   ARRANCAR SERVIDOR
// ==========================================================================
app.listen(PORT, () => {
    const env = NODE_ENV === 'production' ? '🚀 PRODUCCIÓN' : '🔧 desarrollo';
    console.log(`\n🔥  VULCAN FORGE — Backend [${env}]`);
    console.log(`    URL:            http://localhost:${PORT}`);
    console.log(`    Token expira:   ${JWT_EXPIRES}`);
    console.log(`    Bcrypt rounds:  ${BCRYPT_ROUNDS}`);
    console.log(`    CORS origen:    ${CORS_ORIGIN}`);
    console.log(`    DB:             backend/vulcan-data.json\n`);
});
