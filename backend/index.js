// backend/index.js (COMPLETO Y CORREGIDO FINAL)

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const passport = require('passport'); 
const GoogleStrategy = require('passport-google-oauth20').Strategy; 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors()); 
app.use(express.json());
app.use(passport.initialize()); 

// --- 0. Configuración de Multer ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadsDir); },
    filename: (req, file, cb) => { cb(null, `${Date.now()}-${file.originalname}`); }
});
const upload = multer({ storage: storage });
app.use('/uploads', express.static(uploadsDir));

// --- 1. CONFIGURACIÓN DE SERVICIOS ---

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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

        let userResult = await pool.query('SELECT * FROM usuarios WHERE google_id = $1', [googleId]);
        let user = userResult.rows[0];
        if (user) return done(null, user);

        userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        user = userResult.rows[0];
        if (user) {
            // Email existe, lo vinculamos a Google ID
            userResult = await pool.query('UPDATE usuarios SET google_id = $1 WHERE email = $2 RETURNING *', [googleId, email]);
            return done(null, userResult.rows[0]);
        }

        // Si no existe, es un usuario 100% nuevo
        const newUserResult = await pool.query(
            `INSERT INTO usuarios (nombre_completo, email, google_id, esta_verificado, role, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [nombreCompleto, email, googleId, true, 'paciente', 'pendiente'] // Google ya verificó el email
        );
        return done(null, newUserResult.rows[0]);

    } catch (error) {
        return done(error, null);
    }
  }
));

// --- 3. Middlewares de Autenticación (verifyToken, isAdmin, etc.) ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (!token) return res.status(401).json({ error: 'Acceso denegado: No se proveyó un token.' });
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
// (Asumimos que el Admin también es Fisio)
const isPhysioOrAdmin = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'fisioterapeuta') {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado: Requiere permisos.' });
    }
};
const isPatient = (req, res, next) => {
    if (req.user.role === 'paciente') {
        next();
    } else {
        return res.status(403).json({ error: 'Acceso denegado: Requiere permisos de paciente.' });
    }
};

// --- 4. Endpoints de Autenticación (Públicos) ---
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
        
        const mailOptions = { from: process.env.EMAIL_USER, to: email, subject: 'Tu código de verificación', html: `<h1>Tu código es: ${codigo_sms}</h1>` };
        await transporter.sendMail(mailOptions);
        
        res.status(201).json({ message: 'Usuario registrado. Por favor revisa tu email para el código.', userId: newUser.rows[0].id });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') { 
            return res.status(400).json({ error: 'El email o CI ya están registrados.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
app.post('/api/auth/verify', async (req, res) => {
    try {
        const { email, codigo_sms } = req.body; 
        const user = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND codigo_sms = $2 AND codigo_expiracion > NOW()', [email, codigo_sms]);
        if (user.rows.length === 0) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }
        await pool.query('UPDATE usuarios SET esta_verificado = true, codigo_sms = NULL, codigo_expiracion = NULL WHERE email = $1', [email]);
        res.status(200).json({ message: 'Cuenta verificada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email es requerido.' });
        const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userResult.rows.length === 0) return res.status(404).json({ error: 'Error al procesar la solicitud.' });
        if (userResult.rows[0].esta_verificado) return res.status(400).json({ error: 'Esta cuenta ya está verificada.' });
        const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query('UPDATE usuarios SET codigo_sms = $1, codigo_expiracion = NOW() + INTERVAL \'3 minutes\' WHERE email = $2', [codigo_sms, email]);
        const mailOptions = { from: process.env.EMAIL_USER, to: email, subject: 'Tu nuevo código de verificación', html: `<h1>Tu nuevo código es: ${codigo_sms}</h1>` };
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Se ha enviado un nuevo código a tu email.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
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
        const token = jwt.sign({ userId: user.id, ci: user.ci, role: user.role, nombre: user.nombre_completo }, process.env.JWT_SECRET, { expiresIn: '8h' } );
        res.status(200).json({ message: 'Login exitoso', token: token, role: user.role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- 5. Endpoints de Recuperación de Contraseña ---
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (userResult.rows.length > 0) {
            if (!userResult.rows[0].password_hash) {
                return res.status(200).json({ message: 'Esta cuenta se registró con Google. No se puede resetear la contraseña.' });
            }
            const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
            await pool.query('UPDATE usuarios SET codigo_sms = $1, codigo_expiracion = NOW() + INTERVAL \'3 minutes\' WHERE email = $2', [codigo_sms, email]);
            const mailOptions = { from: process.env.EMAIL_USER, to: email, subject: 'Recuperación de tu contraseña', html: `<h1>Tu código para recuperar la contraseña es: ${codigo_sms}</h1>` };
            await transporter.sendMail(mailOptions);
        }
        res.status(200).json({ message: 'Si existe una cuenta local con este email, se ha enviado un código de recuperación.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, codigo_sms, newPassword } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE email = $1 AND codigo_sms = $2 AND codigo_expiracion > NOW()', [email, codigo_sms]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'Código inválido o expirado.' });
        }
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE usuarios SET password_hash = $1, codigo_sms = NULL, codigo_expiracion = NULL WHERE email = $2', [password_hash, email]);
        res.status(200).json({ message: 'Contraseña actualizada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});


// --- 6. Endpoints de Login con Google ---
app.get('/api/auth/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
app.get('/api/auth/google/callback', 
    passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=google-auth-failed` }),
    (req, res) => {
        if (req.user.status === 'pendiente') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?status=pending`);
        }
        if (req.user.status === 'inactivo') {
            return res.redirect(`${process.env.FRONTEND_URL}/login?status=inactive`);
        }
        const token = jwt.sign({ userId: req.user.id, ci: req.user.ci, role: req.user.role, nombre: req.user.nombre_completo }, process.env.JWT_SECRET, { expiresIn: '8h' });
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
);


// --- 7. Endpoints de Administración (Usuarios) ---
app.get('/api/admin/pending-users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre_completo, email, ci, telefono FROM usuarios WHERE status = 'pendiente'");
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.get('/api/admin/active-users', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre_completo, email, ci, telefono, status FROM usuarios WHERE role = 'paciente' AND (status = 'activo' OR status = 'inactivo')");
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.get('/api/admin/assignable-patients', [verifyToken, isAdmin], async (req, res) => {
    try {
        const users = await pool.query("SELECT id, nombre_completo, email FROM usuarios WHERE role = 'paciente' AND status = 'activo'");
        res.status(200).json(users.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.post('/api/admin/users/:id/approve', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("UPDATE usuarios SET status = 'activo' WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.status(200).json({ message: 'Usuario aprobado con éxito.', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
app.post('/api/admin/users/:id/deactivate', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query("UPDATE usuarios SET status = 'inactivo' WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado.' });
        res.status(200).json({ message: 'Usuario desactivado con éxito.', user: result.rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ... (justo después del endpoint /api/admin/users/:id/deactivate)

// ¡NUEVO! Obtener lista de pacientes QUE HAN ENVIADO reportes
app.get('/api/admin/reports/summary', [verifyToken, isAdmin], async (req, res) => {
    try {
        // Esta consulta agrupa por paciente y cuenta cuántos reportes ha enviado
        const summary = await pool.query(
            `SELECT 
                u.id, 
                u.nombre_completo, 
                u.email, 
                u.ci, 
                COUNT(r.id) as total_reportes,
                MAX(r.fecha_reporte) as ultimo_reporte
             FROM usuarios u
             JOIN reportes_paciente r ON u.id = r.paciente_id
             WHERE u.role = 'paciente'
             GROUP BY u.id
             ORDER BY ultimo_reporte DESC`
        );
        res.status(200).json(summary.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ¡NUEVO! Obtener todos los reportes de UN paciente específico
app.get('/api/admin/reports/patient/:id', [verifyToken, isAdmin], async (req, res) => {
    try {
        const { id } = req.params; // ID del paciente

        // Obtenemos los datos del paciente
        const patientResult = await pool.query('SELECT id, nombre_completo, email FROM usuarios WHERE id = $1', [id]);
        if (patientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Paciente no encontrado.' });
        }

        // Obtenemos sus reportes
        const reportsResult = await pool.query(
            `SELECT id, fecha_reporte, sintomas, comentario 
             FROM reportes_paciente
             WHERE paciente_id = $1
             ORDER BY fecha_reporte DESC`,
            [id]
        );
        
        const response = {
            paciente: patientResult.rows[0],
            reportes: reportsResult.rows
        };
        
        res.status(200).json(response);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// --- 8. Endpoints de Gestión de Ejercicios ---
app.post('/api/admin/exercises', [verifyToken, isPhysioOrAdmin, upload.single('media')], async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const url_media = req.file ? `/uploads/${req.file.filename}` : null;
        if (!nombre) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'El nombre del ejercicio es obligatorio.' });
        }
        const newExercise = await pool.query(`INSERT INTO ejercicios (nombre, descripcion, url_media) VALUES ($1, $2, $3) RETURNING *`, [nombre, descripcion, url_media]);
        res.status(201).json({ message: 'Ejercicio creado con éxito.', exercise: newExercise.rows[0] });
    } catch (error) {
        console.error(error);
        if (req.file) fs.unlinkSync(req.file.path);
        if (error.code === '23505') return res.status(400).json({ error: 'Ya existe un ejercicio con ese nombre.' });
        res.status(500).json({ error: 'Error interno del servidor al crear ejercicio.' });
    }
});
app.get('/api/admin/exercises', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const exercises = await pool.query('SELECT * FROM ejercicios ORDER BY nombre');
        res.status(200).json(exercises.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener ejercicios.' });
    }
});
app.get('/api/admin/exercises/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const exercise = await pool.query('SELECT * FROM ejercicios WHERE id = $1', [id]);
        if (exercise.rows.length === 0) return res.status(404).json({ error: 'Ejercicio no encontrado.' });
        res.status(200).json(exercise.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener ejercicio.' });
    }
});
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
        if (url_media) { 
            if (oldUrlMedia) {
                const oldPath = path.join(uploadsDir, path.basename(oldUrlMedia));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        } else if (removeMedia === 'true') { 
             if (oldUrlMedia) {
                const oldPath = path.join(uploadsDir, path.basename(oldUrlMedia));
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            url_media = null;
        } else {
            url_media = oldUrlMedia;
        }
        const updatedExercise = await pool.query( `UPDATE ejercicios SET nombre = $1, descripcion = $2, url_media = $3 WHERE id = $4 RETURNING *`, [nombre, descripcion, url_media, id] );
        res.status(200).json({ message: 'Ejercicio actualizado con éxito.', exercise: updatedExercise.rows[0] });
    } catch (error) {
        console.error(error);
        if (req.file) fs.unlinkSync(req.file.path);
        if (error.code === '23505') return res.status(400).json({ error: 'Ya existe un ejercicio con ese nombre.' });
        res.status(500).json({ error: 'Error interno del servidor al actualizar ejercicio.' });
    }
});
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
        if (result.rows.length === 0) return res.status(404).json({ error: 'Ejercicio no encontrado.' });
        res.status(200).json({ message: 'Ejercicio eliminado con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar ejercicio.' });
    }
});


// --- 9. Endpoints de Gestión de Rutinas ---
app.post('/api/admin/routines', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    const { nombre, descripcion, ejercicios } = req.body;
    if (!nombre || !ejercicios || ejercicios.length === 0) {
        return res.status(400).json({ error: 'Nombre y al menos un ejercicio son obligatorios.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const newRoutineResult = await client.query(`INSERT INTO rutinas (nombre, descripcion) VALUES ($1, $2) RETURNING id`, [nombre, descripcion]);
        const rutina_id = newRoutineResult.rows[0].id;
        const insertPromises = ejercicios.map(ej => {
            return client.query(`INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, series, repeticiones_tiempo, orden) VALUES ($1, $2, $3, $4, $5)`, [rutina_id, ej.ejercicio_id, ej.series, ej.repeticiones_tiempo, ej.orden]);
        });
        await Promise.all(insertPromises);
        await client.query('COMMIT'); 
        res.status(201).json({ message: 'Rutina creada con éxito.', rutina_id: rutina_id });
    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error(error);
        if (error.code === '23505') return res.status(400).json({ error: 'Ya existe una rutina con ese nombre.' });
        res.status(500).json({ error: 'Error interno del servidor al crear rutina.' });
    } finally {
        client.release(); 
    }
});
app.get('/api/admin/routines', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const query = `
            SELECT r.*, (SELECT JSON_AGG(ej_preview) 
                 FROM (
                     SELECT e.nombre 
                     FROM rutina_ejercicios re
                     JOIN ejercicios e ON re.ejercicio_id = e.id
                     WHERE re.rutina_id = r.id
                     ORDER BY re.orden
                 ) ej_preview
                ) as ejercicios
            FROM rutinas r
            ORDER BY r.nombre;
        `;
        const routines = await pool.query(query);
        res.status(200).json(routines.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener rutinas.' });
    }
});
app.get('/api/admin/routines/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const routineResult = await pool.query('SELECT * FROM rutinas WHERE id = $1', [id]);
        if (routineResult.rows.length === 0) return res.status(404).json({ error: 'Rutina no encontrada.' });
        const exercisesResult = await pool.query(
            `SELECT e.id, e.nombre, e.descripcion, e.url_media, re.series, re.repeticiones_tiempo, re.orden
             FROM rutina_ejercicios re
             JOIN ejercicios e ON re.ejercicio_id = e.id
             WHERE re.rutina_id = $1
             ORDER BY re.orden`, [id] );
        const routine = routineResult.rows[0];
        routine.ejercicios = exercisesResult.rows;
        res.status(200).json(routine);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al obtener rutina.' });
    }
});
app.put('/api/admin/routines/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, ejercicios } = req.body;

    if (!nombre || !ejercicios || ejercicios.length === 0) {
        return res.status(400).json({ error: 'Nombre y al menos un ejercicio son obligatorios.' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query( `UPDATE rutinas SET nombre = $1, descripcion = $2 WHERE id = $3`, [nombre, descripcion, id] );
        await client.query( `DELETE FROM rutina_ejercicios WHERE rutina_id = $1`, [id] );
        const insertPromises = ejercicios.map(ej => {
            return client.query(
                `INSERT INTO rutina_ejercicios (rutina_id, ejercicio_id, series, repeticiones_tiempo, orden)
                 VALUES ($1, $2, $3, $4, $5)`,
                [id, ej.ejercicio_id, ej.series, ej.repeticiones_tiempo, ej.orden]
            );
        });
        await Promise.all(insertPromises);
        await client.query('COMMIT');
        res.status(200).json({ message: 'Rutina actualizada con éxito.' });
    } catch (error) {
        await client.query('ROLLBACK'); 
        console.error(error);
        if (error.code === '23505') { 
            return res.status(400).json({ error: 'El nombre de la rutina o un ejercicio ya existe.' });
        }
        res.status(500).json({ error: 'Error interno del servidor al actualizar rutina.' });
    } finally {
        client.release(); 
    }
});
app.delete('/api/admin/routines/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM rutinas WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Rutina no encontrada.' });
        res.status(200).json({ message: 'Rutina eliminada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor al eliminar rutina.' });
    }
});


// --- 10. ENDPOINTS DE ASIGNACIÓN (CALENDARIO) ---

app.get('/api/admin/calendar/:paciente_id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { paciente_id } = req.params;
        const assignments = await pool.query(
            `SELECT c.id, c.fecha_asignada, r.nombre 
             FROM calendario_rutinas c
             JOIN rutinas r ON c.rutina_id = r.id
             WHERE c.paciente_id = $1
             ORDER BY c.fecha_asignada`,
            [paciente_id]
        );
        res.status(200).json(assignments.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
app.post('/api/admin/calendar/assign', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { paciente_id, rutina_id, fecha_asignada } = req.body;
        if (!paciente_id || !rutina_id || !fecha_asignada) {
            return res.status(400).json({ error: 'Faltan datos (paciente, rutina, fecha).' });
        }
        const newAssignment = await pool.query(
            `INSERT INTO calendario_rutinas (paciente_id, rutina_id, fecha_asignada)
             VALUES ($1, $2, $3)
             RETURNING id, fecha_asignada`,
            [paciente_id, rutina_id, fecha_asignada]
        );
        res.status(201).json({ message: 'Rutina asignada con éxito.', assignment: newAssignment.rows[0] });
    } catch (error) {
        console.error(error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Esta rutina ya está asignada a este paciente en esta fecha.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
app.delete('/api/admin/calendar/unassign/:id', [verifyToken, isPhysioOrAdmin], async (req, res) => {
    try {
        const { id } = req.params; // ID de la asignación
        const result = await pool.query('DELETE FROM calendario_rutinas WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asignación no encontrada.' });
        }
        res.status(200).json({ message: 'Asignación eliminada con éxito.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// --- 11. ENDPOINTS DE PACIENTE ---

// Obtiene las rutinas para HOY
app.get('/api/patient/my-routine-for-today', [verifyToken, isPatient], async (req, res) => {
    try {
        const { userId } = req.user;
        
        const query = `
            SELECT 
                r.id as rutina_id, 
                r.nombre as rutina_nombre, 
                e.id as ejercicio_id,  -- <-- ¡ESTA LÍNEA ES IMPORTANTE!
                e.nombre as ejercicio_nombre,
                e.descripcion,
                e.url_media, 
                re.series, 
                re.repeticiones_tiempo,
                re.orden
            FROM calendario_rutinas c
            JOIN rutinas r ON c.rutina_id = r.id
            JOIN rutina_ejercicios re ON re.rutina_id = r.id
            JOIN ejercicios e ON re.ejercicio_id = e.id
            WHERE 
                c.paciente_id = $1 
                AND c.fecha_asignada = CURRENT_DATE
            ORDER BY r.id, re.orden;
        `;
        
        const results = await pool.query(query, [userId]);
        
        if (results.rows.length === 0) {
            return res.status(200).json({ message: 'No tienes rutinas asignadas para hoy.' });
        }

        const rutinas = {};
        for (const row of results.rows) {
            if (!rutinas[row.rutina_id]) {
                rutinas[row.rutina_id] = {
                    id: row.rutina_id,
                    nombre: row.rutina_nombre,
                    ejercicios: []
                };
            }
            // -----------------------------------------------------------------
            // --- ¡CORRECCIÓN APLICADA AQUÍ! ---
            // Faltaba añadir el 'id' del ejercicio en el objeto.
            // -----------------------------------------------------------------
            rutinas[row.rutina_id].ejercicios.push({
                id: row.ejercicio_id, // <-- ¡ESTA LÍNEA FUE AÑADIDA!
                nombre: row.ejercicio_nombre,
                descripcion: row.descripcion,
                url_media: row.url_media,
                series: row.series,
                repeticiones_tiempo: row.repeticiones_tiempo
            });
        }
        
        res.status(200).json(Object.values(rutinas));
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// backend/index.js

// Obtener información de contacto del Fisioterapeuta (Admin)
app.get('/api/patient/contact-info', [verifyToken, isPatient], async (req, res) => {
    try {
        // Buscamos al primer usuario con rol 'admin' o 'fisioterapeuta'
        const adminResult = await pool.query(
            `SELECT nombre_completo, email, telefono 
             FROM usuarios 
             WHERE role = 'admin' OR role = 'fisioterapeuta' 
             LIMIT 1`
        );

        if (adminResult.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró información de contacto.' });
        }

        const admin = adminResult.rows[0];
        
        // Aquí podrías añadir una URL de foto si la guardaras en BD, 
        // por ahora enviaremos los datos básicos.
        res.status(200).json(admin);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});
// ... (justo después del endpoint /api/patient/my-routine-for-today)

// ¡NUEVO! Paciente envía un reporte diario
app.post('/api/patient/reports', [verifyToken, isPatient], async (req, res) => {
    const { userId } = req.user;
    const { sintomas, comentario } = req.body; // sintomas es un array de strings

    if (!sintomas || sintomas.length === 0) {
        return res.status(400).json({ error: 'Debes seleccionar al menos un síntoma.' });
    }

    try {
        // La BD se encarga de la fecha (DEFAULT CURRENT_DATE)
        // y de la unicidad (UNIQUE)
        const newReport = await pool.query(
            `INSERT INTO reportes_paciente (paciente_id, sintomas, comentario)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, sintomas, comentario]
        );
        res.status(201).json({ message: 'Informe enviado con éxito.', report: newReport.rows[0] });

    } catch (error) {
        console.error(error);
        if (error.code === '23505') { // Error de unique_violation
            return res.status(400).json({ error: 'Ya has enviado un informe hoy.' });
        }
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ... (después de app.post('/api/patient/reports', ...))

// ¡NUEVO! Obtener el informe de HOY
app.get('/api/patient/reports/today', [verifyToken, isPatient], async (req, res) => {
    const { userId } = req.user;
    try {
        const report = await pool.query(
            `SELECT * FROM reportes_paciente 
             WHERE paciente_id = $1 AND fecha_reporte = CURRENT_DATE`,
            [userId]
        );
        
        if (report.rows.length === 0) {
            return res.status(404).json({ message: 'No se encontró ningún informe para hoy.' });
        }
        res.status(200).json(report.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ¡NUEVO! Actualizar el informe de HOY
app.put('/api/patient/reports/today', [verifyToken, isPatient], async (req, res) => {
    const { userId } = req.user;
    const { sintomas, comentario } = req.body; // sintomas es un array de strings

    if (!sintomas || sintomas.length === 0) {
        return res.status(400).json({ error: 'Debes seleccionar al menos un síntoma.' });
    }

    try {
        const updatedReport = await pool.query(
            `UPDATE reportes_paciente 
             SET sintomas = $1, comentario = $2 
             WHERE paciente_id = $3 AND fecha_reporte = CURRENT_DATE
             RETURNING *`,
            [sintomas, comentario, userId]
        );
        
        if (updatedReport.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró ningún informe para actualizar.' });
        }
        res.status(200).json({ message: 'Informe actualizado con éxito.', report: updatedReport.rows[0] });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ¡NUEVO! Eliminar el informe de HOY
app.delete('/api/patient/reports/today', [verifyToken, isPatient], async (req, res) => {
    const { userId } = req.user;
    try {
        const deletedReport = await pool.query(
            `DELETE FROM reportes_paciente 
             WHERE paciente_id = $1 AND fecha_reporte = CURRENT_DATE
             RETURNING *`,
            [userId]
        );
        
        if (deletedReport.rows.length === 0) {
            return res.status(404).json({ error: 'No se encontró ningún informe para eliminar.' });
        }
        res.status(200).json({ message: 'Informe eliminado con éxito.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ... (después de app.delete('/api/patient/reports/today', ...))

// ¡NUEVO! Obtener ejercicios asignados al paciente para HOY
app.get('/api/patient/assigned-exercises/today', [verifyToken, isPatient], async (req, res) => {
    const { userId } = req.user;
    try {
        const result = await pool.query(
            `SELECT
                ae.id,
                e.nombre AS nombre_ejercicio,
                e.descripcion AS descripcion_ejercicio,
                ae.series,
                ae.repeticiones,
                ae.duracion_segundos,
                e.imagen_url
            FROM asignaciones_ejercicios ae
            JOIN ejercicios e ON ae.ejercicio_id = e.id
            WHERE ae.paciente_id = $1 AND ae.fecha_asignada = CURRENT_DATE
            ORDER BY ae.id;`, // O por un orden específico si lo necesitas
            [userId]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error al obtener ejercicios asignados de hoy:", error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ¡NUEVO! Obtener detalles de un ejercicio asignado específico
app.get('/api/patient/assigned-exercises/:exerciseId', [verifyToken, isPatient], async (req, res) => {
    const { userId } = req.user;
    const { exerciseId } = req.params;
    try {
        const result = await pool.query(
            `SELECT
                ae.id,
                e.nombre AS nombre_ejercicio,
                e.descripcion AS descripcion_ejercicio,
                ae.series,
                ae.repeticiones,
                ae.duracion_segundos,
                e.imagen_url
            FROM asignaciones_ejercicios ae
            JOIN ejercicios e ON ae.ejercicio_id = e.id
            WHERE ae.paciente_id = $1 AND ae.id = $2;`,
            [userId, exerciseId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ejercicio asignado no encontrado o no te pertenece.' });
        }
        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error("Error al obtener detalle del ejercicio asignado:", error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// --- 12. INICIAR EL SERVIDOR ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});