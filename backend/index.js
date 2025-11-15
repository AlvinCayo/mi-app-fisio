// backend/index.js (COMPLETO Y CORREGIDO)

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const passport = require('passport'); 
const GoogleStrategy = require('passport-google-oauth20').Strategy; 

const app = express();
app.use(cors()); 
app.use(express.json());
app.use(passport.initialize()); 

// --- 1. CONFIGURACIÓN DE SERVICIOS ---

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

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
            return done(null, user); // Usuario ya existe
        }

        // 2. Verificar si el email ya existe (cuenta local)
        userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        user = userResult.rows[0];

        if (user) {
            // Email existe, lo vinculamos a Google ID
            userResult = await pool.query(
                'UPDATE usuarios SET google_id = $1 WHERE email = $2 RETURNING *',
                [googleId, email]
            );
            return done(null, userResult.rows[0]);
        }

        // 3. Si no existe, es un usuario 100% nuevo
        // ¡CORREGIDO! Esta query ahora solo inserta los datos de Google
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

// --- 3. MIDDLEWARE DE AUTENTICACIÓN ---

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (!token) {
        return res.status(401).json({ error: 'Acceso denegado: No se proveyó un token.' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (error) {
        res.status(403).json({ error: 'Token inválido.' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado: Requiere permisos de administrador.' });
    }
    next();
};


// --- 4. ENDPOINTS DE AUTENTICACIÓN (PÚBLICOS) ---

// REGISTRO (CORREGIDO CON ARREGLO DE TIMEZONE)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombreCompleto, ci, telefono, email, password } = req.body;
        // ... (Tu validación de campos)

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
        
        // ¡CORREGIDO! La variable 'codigo_expiracion' se eliminó.
        // La base de datos calcula el tiempo con "NOW() + INTERVAL '3 minutes'"
        const newUser = await pool.query(
            `INSERT INTO usuarios (nombre_completo, ci, telefono, email, password_hash, codigo_sms, codigo_expiracion, status, role)
             VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '3 minutes', 'pendiente', 'paciente')
             RETURNING id, email`,
            [nombreCompleto, ci, telefono, email, password_hash, codigo_sms] // <-- Array de parámetros corregido
        );

        // Enviar email de verificación
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Tu código de verificación',
            html: `<h1>Tu código es: ${codigo_sms}</h1>`
        };
        await transporter.sendMail(mailOptions);
        
        res.status(201).json({ 
            message: 'Usuario registrado. Por favor revisa tu email para el código.',
            userId: newUser.rows[0].id 
        });

    } catch (error) {
        console.error(error);
        if (error.code === '23505') { 
            return res.status(400).json({ error: 'El email o CI ya están registrados.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// VERIFICACIÓN DE EMAIL (SIN CAMBIOS)
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { email, codigo_sms } = req.body; 

        const user = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND codigo_sms = $2 AND codigo_expiracion > NOW()',
            [email, codigo_sms]
        );

        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }

        await pool.query(
            'UPDATE usuarios SET esta_verificado = true, codigo_sms = NULL, codigo_expiracion = NULL WHERE email = $1',
            [email]
        );

        res.status(200).json({ message: 'Cuenta verificada con éxito.' }); // Mensaje actualizado

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// REENVIAR CÓDIGO (¡NUEVO Y CORREGIDO CON ARREGLO DE TIMEZONE!)
app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email es requerido.' });
        }

        const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Error al procesar la solicitud.' });
        }
        if (userResult.rows[0].esta_verificado) {
            return res.status(400).json({ error: 'Esta cuenta ya está verificada.' });
        }

        const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();

        // ¡CORREGIDO! La base de datos calcula el tiempo
        await pool.query(
            'UPDATE usuarios SET codigo_sms = $1, codigo_expiracion = NOW() + INTERVAL \'3 minutes\' WHERE email = $2',
            [codigo_sms, email]
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Tu nuevo código de verificación',
            html: `<h1>Tu nuevo código es: ${codigo_sms}</h1>`
        };
        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Se ha enviado un nuevo código a tu email.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// LOGIN (SIN CAMBIOS, tu lógica ya era correcta)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { ci, password } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE ci = $1', [ci]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'CI o contraseña incorrectos.' });
        }
        const user = userResult.rows[0];

        if (!user.password_hash) {
            return res.status(401).json({ error: 'Esta cuenta se registró con Google. Por favor, usa el inicio de sesión de Google.' });
        }
        const passwordValida = await bcrypt.compare(password, user.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'CI o contraseña incorrectos.' });
        }
        if (!user.esta_verificado) {
            return res.status(403).json({ error: 'Tu cuenta no ha sido verificada por email.' });
        }
        if (user.status === 'pendiente') {
            return res.status(403).json({ error: 'Tu cuenta está pendiente de aprobación por un administrador.' });
        }
        if (user.status === 'inactivo') {
            return res.status(403).json({ error: 'Tu cuenta ha sido desactivada.' });
        }

        const token = jwt.sign(
            { userId: user.id, ci: user.ci, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' } 
        );
        res.status(200).json({ message: 'Login exitoso', token: token, role: user.role });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- 5. ENDPOINTS DE RECUPERACIÓN DE CONTRASEÑA ---

// Pedir código (CORREGIDO CON ARREGLO DE TIMEZONE)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);

        if (userResult.rows.length > 0) {
            if (!userResult.rows[0].password_hash) {
                return res.status(200).json({ message: 'Esta cuenta se registró con Google. No se puede resetear la contraseña.' });
            }
            
            const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
            
            // ¡CORREGIDO! La base de datos calcula el tiempo
            await pool.query(
                'UPDATE usuarios SET codigo_sms = $1, codigo_expiracion = NOW() + INTERVAL \'3 minutes\' WHERE email = $2',
                [codigo_sms, email]
            );

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Recuperación de tu contraseña',
                html: `<h1>Tu código para recuperar la contraseña es: ${codigo_sms}</h1>`
            };
            await transporter.sendMail(mailOptions);
        }
        
        res.status(200).json({ message: 'Si existe una cuenta local con este email, se ha enviado un código de recuperación.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Resetear la contraseña (SIN CAMBIOS, tu lógica ya era correcta)
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

// --- 6. ENDPOINTS DE LOGIN CON GOOGLE ---

app.get('/api/auth/google',
    passport.authenticate('google', { 
        scope: ['profile', 'email'],
        session: false 
    })
);

app.get('/api/auth/google/callback', 
    passport.authenticate('google', { 
        session: false, 
        failureRedirect: `${process.env.FRONTEND_URL}/login?error=google-auth-failed` 
    }),
    (req, res) => {
        if (req.user.status === 'pendiente') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?status=pending`);
        }
        if (req.user.status === 'inactivo') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?status=inactive`);
        }

        const token = jwt.sign(
            { userId: req.user.id, ci: req.user.ci, role: req.user.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
);


// --- 7. ENDPOINTS DE ADMINISTRACIÓN (PROTEGIDOS) ---

app.get('/api/admin/pending-users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre_completo, email, ci, telefono FROM usuarios WHERE status = 'pendiente'");
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

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