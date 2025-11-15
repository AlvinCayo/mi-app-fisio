// backend/index.js

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const passport = require('passport'); // <-- NUEVO
const GoogleStrategy = require('passport-google-oauth20').Strategy; // <-- NUEVO

const app = express();
app.use(cors()); 
app.use(express.json());
app.use(passport.initialize()); // <-- NUEVO

// --- 1. CONFIGURACIÓN DE SERVICIOS ---

// Conexión a la Base de Datos (Neon)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Configuración del Transportador de Email (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- 2. CONFIGURACIÓN DE PASSPORT (LOGIN CON GOOGLE) ---

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const nombreCompleto = profile.displayName;

        // 1. Verificar si el usuario ya existe por Google ID
        let userResult = await pool.query('SELECT * FROM usuarios WHERE google_id = $1', [googleId]);
        let user = userResult.rows[0];

        if (user) {
            // Usuario ya existe y se logueó con Google antes
            return done(null, user);
        }

        // 2. Verificar si el email ya existe (cuenta local)
        userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        user = userResult.rows[0];

        if (user) {
            // Email existe, pero no tiene Google ID. Lo vinculamos.
            // (Ignoramos si tiene contraseña, el login de Google ahora tiene prioridad)
            userResult = await pool.query(
                'UPDATE usuarios SET google_id = $1 WHERE email = $2 RETURNING *',
                [googleId, email]
            );
            return done(null, userResult.rows[0]);
        }

        // 3. Si no existe, es un usuario 100% nuevo
        // Lo creamos como 'pendiente' para que el admin lo apruebe
        const newUserResult = await pool.query(
            `INSERT INTO usuarios (nombre_completo, email, google_id, esta_verificado, role, status)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [nombreCompleto, email, googleId, true, 'paciente', 'pendiente'] // Google ya verificó el email
        );

        return done(null, newUserResult.rows[0]);

    } catch (error) {
        return done(error, null);
    }
  }
));

// --- 3. MIDDLEWARE DE AUTENTICACIÓN (PARA PROTEGER RUTAS) ---

// Middleware para verificar si un usuario está logueado
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado: No se proveyó un token.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Añade los datos del token (userId, role) al objeto req
        next();
    } catch (error) {
        res.status(403).json({ error: 'Token inválido.' });
    }
};

// Middleware para verificar si el usuario es ADMIN
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: Requiere permisos de administrador.' });
    }
    next();
};


// --- 4. ENDPOINTS DE AUTENTICACIÓN (PÚBLICOS) ---

// REGISTRO (MODIFICADO)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombreCompleto, ci, telefono, email, password } = req.body;
        // ... (Tu validación de campos)

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
        const codigo_expiracion = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        // Insertamos al usuario con status 'pendiente' y esta_verificado 'false'
        const newUser = await pool.query(
            `INSERT INTO usuarios (nombre_completo, ci, telefono, email, password_hash, codigo_sms, codigo_expiracion, status, role)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', 'paciente')
             RETURNING id, email`,
            [nombreCompleto, ci, telefono, email, password_hash, codigo_sms, codigo_expiracion]
        );

        // Enviar email de verificación
        const mailOptions = { /* ... (Tu código de mailOptions) ... */ };
        await transporter.sendMail(mailOptions);
        
        res.status(201).json({ 
            message: 'Usuario registrado. Por favor revisa tu email para el código.',
            userId: newUser.rows[0].id 
        });

    } catch (error) { /* ... (Tu manejo de errores) ... */ }
});

// VERIFICACIÓN DE EMAIL (SIN CAMBIOS)
// (El usuario sigue 'pendiente' después de esto)
app.post('/api/auth/verify', async (req, res) => {
    /* ... (Tu código de /api/auth/verify es perfecto, no necesita cambios) ... */
});

// REENVIAR CÓDIGO (SIN CAMBIOS)
app.post('/api/auth/resend-code', async (req, res) => {
    /* ... (Tu código de /api/auth/resend-code es perfecto, no necesita cambios) ... */
});

// LOGIN (MODIFICADO)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { ci, password } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE ci = $1', [ci]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'CI o contraseña incorrectos.' });
        }
        const user = userResult.rows[0];

        // 1. Comprobar si es un usuario de Google sin contraseña
        if (!user.password_hash) {
            return res.status(401).json({ error: 'Esta cuenta se registró con Google. Por favor, usa el inicio de sesión de Google.' });
        }

        // 2. Comprobar contraseña
        const passwordValida = await bcrypt.compare(password, user.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'CI o contraseña incorrectos.' });
        }

        // 3. Comprobar si verificó su email
        if (!user.esta_verificado) {
            return res.status(403).json({ error: 'Tu cuenta no ha sido verificada por email.' });
        }

        // 4. (NUEVO) Comprobar si el admin lo aprobó
        if (user.status === 'pendiente') {
            return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por un administrador.' });
        }
        if (user.status === 'inactivo') {
            return res.status(403).json({ error: 'Tu cuenta ha sido desactivada.' });
        }

        // 5. Crear el Token (ahora incluye el ROL)
        const token = jwt.sign(
            { userId: user.id, ci: user.ci, role: user.role }, // <-- ROL AÑADIDO
            process.env.JWT_SECRET,
            { expiresIn: '8h' } 
        );

        res.status(200).json({ message: 'Login exitoso', token: token, role: user.role });

    } catch (error) { /* ... (Tu manejo de errores) ... */ }
});

// --- 5. ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA (NUEVOS) ---

// Pedir código para recuperar contraseña
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        if (userResult.rows.length > 0) {
            // Solo se puede resetear contraseña de cuentas locales
            if (!userResult.rows[0].password_hash) {
                return res.status(200).json({ message: 'Esta cuenta se registró con Google. No se puede resetear la contraseña.' });
            }
            
            const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
            const codigo_expiracion = new Date(Date.now() + 10 * 60 * 1000); // 10 min

            await pool.query(
                'UPDATE usuarios SET codigo_sms = $1, codigo_expiracion = $2 WHERE email = $3',
                [codigo_sms, codigo_expiracion, email]
            );

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Recuperación de tu contraseña',
                html: `<h1>Tu código para recuperar la contraseña es: ${codigo_sms}</h1>`
            };
            await transporter.sendMail(mailOptions);
        }
        
        // Por seguridad, siempre enviamos esta respuesta, exista o no el email
        res.status(200).json({ message: 'Si existe una cuenta local con este email, se ha enviado un código de recuperación.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Resetear la contraseña con el código
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, codigo_sms, newPassword } = req.body;

        const userResult = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND codigo_sms = $2 AND codigo_expiracion > NOW()',
            [email, codigo_sms]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);

        await pool.query(
            'UPDATE usuarios SET password_hash = $1, codigo_sms = NULL, codigo_expiracion = NULL WHERE email = $2',
            [password_hash, email]
        );

        res.status(200).json({ message: 'Contraseña actualizada con éxito.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- 6. ENDPOINTS DE LOGIN CON GOOGLE (NUEVOS) ---

// 1. Iniciar el flujo de Google (el frontend llamará a esta ruta)
app.get('/api/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'], // Pedimos el perfil y el email
        session: false 
    })
);

// 2. Callback de Google (Google nos redirige aquí)
app.get('/api/auth/google/callback', 
    passport.authenticate('google', { 
        session: false, 
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=google-auth-failed` 
    }),
    (req, res) => {
        // ¡Autenticación exitosa! 'req.user' ahora contiene el usuario de la BD (de nuestra lógica de Passport)
        
        // 1. (NUEVO) Comprobar si el admin lo aprobó
        if (req.user.status === 'pendiente') {
            // Redirigir al frontend con un mensaje de pendiente
            return res.redirect(`${process.env.FRONTEND_URL}/login?status=pending`);
        }
        if (req.user.status === 'inactivo') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?status=inactive`);
        }

        // 2. Crear el Token (ahora incluye el ROL)
        const token = jwt.sign(
            { userId: req.user.id, ci: req.user.ci, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 3. Redirigir al frontend con el token en la URL
        // El frontend tendrá una página especial para "capturar" este token
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
);


// --- 7. ENDPOINTS DE ADMINISTRACIÓN (PROTEGIDOS) ---
// (Para que el fisio pueda "aceptar" o "dar de baja")

// Obtener todos los usuarios pendientes
app.get('/api/admin/pending-users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre_completo, email, ci, telefono FROM usuarios WHERE status = 'pendiente'");
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Aprobar un usuario
app.post('/api/admin/users/:id/approve', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE usuarios SET status = 'activo' WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Usuario aprobado con éxito.', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Dar de baja (desactivar) un usuario
app.post('/api/admin/users/:id/deactivate', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            "UPDATE usuarios SET status = 'inactivo' WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Usuario desactivado con éxito.', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- 8. INICIAR EL SERVIDOR ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});