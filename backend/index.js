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
const multer = require('multer'); // Para subida de archivos
const path = require('path');     // Para rutas de archivos
const fs = require('fs');         // Para borrar archivos

const app = express();
app.use(cors()); 
app.use(express.json());
app.use(passport.initialize()); 

// --- 0. CONFIGURACIÓN DE ALMACENAMIENTO DE ARCHIVOS CON MULTER ---

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir); // Archivos se guardarán en la carpeta 'uploads'
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Servir archivos estáticos desde la carpeta 'uploads'
app.use('/uploads', express.static(uploadsDir));


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
        // (Asumimos que 'ci' y 'telefono' pueden ser NULL en tu BD)
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

// --- 3. MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN ---

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

// Asumiendo que 'admin' también puede gestionar ejercicios
const isPhysioOrAdmin = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'fisioterapeuta') {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado: Requiere permisos de fisioterapeuta o administrador.' });
    }
};

const isPatient = (req, res, next) => {
    if (req.user.role === 'paciente') {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado: Requiere permisos de paciente.' });
    }
};


// --- 4. ENDPOINTS DE AUTENTICACIÓN (PÚBLICOS) ---

// REGISTRO
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombreCompleto, ci, telefono, email, password } = req.body;
        if (!nombreCompleto || !ci || !telefono || !email || !password) {
             return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
        
        const newUser = await pool.query(
            `INSERT INTO usuarios (nombre_completo, ci, telefono, email, password_hash, codigo_sms, codigo_expiracion, status, role)
             VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '3 minutes', 'pendiente', 'paciente')
             RETURNING id, email`,
            [nombreCompleto, ci, telefono, email, password_hash, codigo_sms]
        );
        
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

// VERIFICACIÓN DE EMAIL
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
        res.status(200).json({ message: 'Cuenta verificada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// REENVIAR CÓDIGO
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


// LOGIN
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

// Pedir código
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userResult.rows.length > 0) {
            if (!userResult.rows[0].password_hash) {
                return res.status(200).json({ message: 'Esta cuenta se registró con Google. No se puede resetear la contraseña.' });
            }
            const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
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

// Resetear la contraseña
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


// --- 7. ENDPOINTS DE ADMINISTRACIÓN (PROTEGIDOS CON isAdmin) ---

app.get('/api/admin/pending-users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre_completo, email, ci, telefono FROM usuarios WHERE status = 'pendiente'");
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// --- ¡CORRECCIÓN APLICADA AQUÍ! ---
// Obtener pacientes (ACTIVOS e INACTIVOS)
app.get('/api/admin/active-users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query(
            "SELECT id, nombre_completo, email, ci, telefono, status FROM usuarios WHERE role = 'paciente' AND (status = 'activo' OR status = 'inactivo')"
        );
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
// --- FIN DE LA CORRECCIÓN ---

// --- ¡NUEVO ENDPOINT! ---
// Obtener solo pacientes ACTIVOS (para asignar rutinas)
app.get('/api/admin/assignable-patients', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query(
            "SELECT id, nombre_completo, email, rutina_asignada_id FROM usuarios WHERE role = 'paciente' AND status = 'activo'"
        );
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Aprueba a un usuario (lo pone como 'activo')
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

// Desactiva a un usuario (lo pone como 'inactivo')
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


// --- 8. ENDPOINTS DE GESTIÓN DE EJERCICIOS (PROTEGIDOS CON isPhysioOrAdmin) ---

// Crear Ejercicio
app.post('/api/admin/exercises', [verifyToken, isPhysioOrAdmin, upload.single('media')], async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const url_media = req.file ? `/uploads/${req.file.filename}` : null;

        if (!nombre) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'El nombre del ejercicio es obligatorio.' });
        }
        
        const newExercise = await pool.query(
            `INSERT INTO ejercicios (nombre, descripcion, url_media) VALUES ($1, $2, $3) RETURNING *`,
            [nombre, descripcion, url_media]
        );
        res.status(201).json({ message: 'Ejercicio creado con éxito.', exercise: newExercise.rows[0] });

    } catch (error) {
        console.error(error);
        if (req.file) fs.unlinkSync(req.file.path);
        if (error.code === '23505') { 
            return res.status(400).json({ error: 'Ya existe un ejercicio con ese nombre.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al crear ejercicio.' });
    }
});

// Obtener todos los Ejercicios
app.get('/api/admin/exercises', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const exercises = await pool.query('SELECT * FROM ejercicios ORDER BY nombre');
        res.status(200).json(exercises.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener ejercicios.' });
    }
});

// Obtener Ejercicio por ID
app.get('/api/admin/exercises/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const exercise = await pool.query('SELECT * FROM ejercicios WHERE id = $1', [id]);
        if (exercise.rows.length === 0) {
            return res.status(404).json({ error: 'Ejercicio no encontrado.' });
        }
        res.status(200).json(exercise.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener ejercicio.' });
    }
});

// Actualizar Ejercicio
app.put('/api/admin/exercises/:id', [verifyToken, isPhysioOrAdmin, upload.single('media')], async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, removeMedia } = req.body;
        let url_media = req.file ? `/uploads/${req.file.filename}` : null;

        if (!nombre) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'El nombre del ejercicio es obligatorio.' });
        }

        const oldExerciseResult = await pool.query('SELECT url_media FROM ejercicios WHERE id = $1', [id]);
        if (oldExerciseResult.rows.length === 0) {
             if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Ejercicio no encontrado.' });
        }
        const oldUrlMedia = oldExerciseResult.rows[0].url_media;

        if (url_media) { // Si se subió un archivo nuevo
            if (oldUrlMedia) { // Borrar el viejo
                const oldPath = path.join(uploadsDir, path.basename(oldUrlMedia));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        } else if (removeMedia === 'true') { // Si se marcó "Quitar Tutorial"
             if (oldUrlMedia) {
                const oldPath = path.join(uploadsDir, path.basename(oldUrlMedia));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            url_media = null;
        } else { // Si no se subió nada y no se marcó quitar, mantener el viejo
            url_media = oldUrlMedia;
        }
        
        const updatedExercise = await pool.query(
            `UPDATE ejercicios SET nombre = $1, descripcion = $2, url_media = $3 WHERE id = $4 RETURNING *`,
            [nombre, descripcion, url_media, id]
        );
        
        res.status(200).json({ message: 'Ejercicio actualizado con éxito.', exercise: updatedExercise.rows[0] });

    } catch (error) {
        console.error(error);
        if (req.file) fs.unlinkSync(req.file.path);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Ya existe un ejercicio con ese nombre.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al actualizar ejercicio.' });
    }
});

// Eliminar Ejercicio
app.delete('/api/admin/exercises/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        
        const oldExerciseResult = await pool.query('SELECT url_media FROM ejercicios WHERE id = $1', [id]);
        if (oldExerciseResult.rows.length > 0) {
            const oldUrlMedia = oldExerciseResult.rows[0].url_media;
            if (oldUrlMedia) {
                const oldPath = path.join(uploadsDir, path.basename(oldUrlMedia));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }
        
        const result = await pool.query('DELETE FROM ejercicios WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ejercicio no encontrado.' });
        }
        res.status(200).json({ message: 'Ejercicio eliminado con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar ejercicio.' });
    }
});

// --- 9. ENDPOINTS DE GESTIÓN DE RUTINAS (PROTEGIDOS CON isPhysioOrAdmin) ---

// Crear Rutina
app.post('/api/admin/routines', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    const { nombre, descripcion, ejercicios } = req.body;
    if (!nombre || !ejercicios || ejercicios.length === 0) {
        return res.status(400).json({ error: 'Nombre y al menos un ejercicio son obligatorios.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar transacción

        const newRoutineResult = await client.query(
            `INSERT INTO rutinas (nombre, descripcion) VALUES ($1, $2) RETURNING id`,
            [nombre, descripcion]
        );
        const rutina_id = newRoutineResult.rows[0].id;

        const insertPromises = ejercicios.map(ej => {
            return client.query(
                `INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, series, repeticiones_tiempo, orden)
                 VALUES ($1, $2, $3, $4, $5)`,
                [rutina_id, ej.ejercicio_id, ej.series, ej.repeticiones_tiempo, ej.orden]
            );
        });
        await Promise.all(insertPromises);

        await client.query('COMMIT'); 
        res.status(201).json({ message: 'Rutina creada con éxito.', rutina_id: rutina_id });

    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error(error);
        if (error.code === '23505') { 
            return res.status(400).json({ error: 'Ya existe una rutina con ese nombre.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al crear rutina.' });
    } finally {
        client.release(); 
    }
});

// Obtener todas las Rutinas
app.get('/api/admin/routines', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const routines = await pool.query('SELECT * FROM rutinas ORDER BY nombre');
        res.status(200).json(routines.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener rutinas.' });
    }
});

// Obtener una Rutina por ID (con sus ejercicios)
app.get('/api/admin/routines/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const routineResult = await pool.query('SELECT * FROM rutinas WHERE id = $1', [id]);
        if (routineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rutina no encontrada.' });
        }
        
        const exercisesResult = await pool.query(
            `SELECT e.id, e.nombre, e.descripcion, e.url_media, re.series, re.repeticiones_tiempo, re.orden
             FROM rutina_ejercicios re
             JOIN ejercicios e ON re.ejercicio_id = e.id
             WHERE re.rutina_id = $1
             ORDER BY re.orden`,
            [id]
        );
        
        const routine = routineResult.rows[0];
        routine.ejercicios = exercisesResult.rows;
        
        res.status(200).json(routine);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener rutina.' });
    }
});

// Eliminar Rutina
app.delete('/api/admin/routines/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM rutinas WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rutina no encontrada.' });
        }
        res.status(200).json({ message: 'Rutina eliminada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar rutina.' });
    }
});


// --- 10. ENDPOINTS DE ASIGNACIÓN (PROTEGIDOS CON isPhysioOrAdmin) ---

// Asignar Rutina a Paciente
app.post('/api/admin/assign-routine/:userId', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { userId } = req.params;
        const { rutina_id } = req.body;
        
        const result = await pool.query(
            "UPDATE usuarios SET rutina_asignada_id = $1 WHERE id = $2 AND role = 'paciente' RETURNING *",
            [rutina_id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.status(200).json({ message: 'Rutina asignada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Desasignar Rutina
app.delete('/api/admin/assign-routine/:userId', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            "UPDATE usuarios SET rutina_asignada_id = NULL WHERE id = $1 AND role = 'paciente' RETURNING *",
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }
        res.status(200).json({ message: 'Rutina desasignada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// --- 11. ENDPOINTS DE PACIENTE (PROTEGIDOS CON isPatient) ---

// Obtener mi rutina
app.get('/api/patient/my-routine', [verifyToken, isPatient], async (req, res) => {
    try {
        const { userId } = req.user; // Obtiene el ID del token verificado
        
        const userResult = await pool.query('SELECT rutina_asignada_id FROM usuarios WHERE id = $1', [userId]);
        const rutina_id = userResult.rows[0]?.rutina_asignada_id;
        
        if (!rutina_id) {
            return res.status(200).json({ message: 'No tienes ninguna rutina asignada.' });
        }
        
        const routineResult = await pool.query('SELECT * FROM rutinas WHERE id = $1', [rutina_id]);
        if (routineResult.rows.length === 0) {
            return res.status(404).json({ error: 'Rutina asignada no encontrada.' });
        }
        
        const exercisesResult = await pool.query(
            `SELECT e.nombre, e.url_media, re.series, re.repeticiones_tiempo
             FROM rutina_ejercicios re
             JOIN ejercicios e ON re.ejercicio_id = e.id
             WHERE re.rutina_id = $1
             ORDER BY re.orden`,
            [rutina_id]
        );
        
        const routine = routineResult.rows[0];
        routine.ejercicios = exercisesResult.rows;
        
        res.status(200).json(routine);
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// --- 12. INICIAR EL SERVIDOR ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});