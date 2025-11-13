// index.js (Tu Backend)
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json()); 

// 1. Conexión a la Base de Datos (Lee tu .env)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// 2. Configuración del Email (Lee tu .env)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- PUNTO 1: REGISTRO DE USUARIOS ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { nombreCompleto, ci, telefono, email, password } = req.body;
        if (!nombreCompleto || !ci || !telefono || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const codigo_sms = Math.floor(100000 + Math.random() * 900000).toString();
        const codigo_expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

        const newUser = await pool.query(
            `INSERT INTO usuarios (nombre_completo, ci, telefono, email, password_hash, codigo_sms, codigo_expiracion)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email`,
            [nombreCompleto, ci, telefono, email, password_hash, codigo_sms, codigo_expiracion]
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Tu código de verificación',
            html: `<h1>Tu código es: ${codigo_sms}</h1>`
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email de verificación enviado a ${email}`);

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

// --- PUNTO 2: VERIFICACIÓN DE EMAIL ---
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

        res.status(200).json({ message: 'Cuenta verificada con éxito. Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


// --- PUNTO 3: LOGIN DE USUARIOS ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { ci, password } = req.body;
        const userResult = await pool.query('SELECT * FROM usuarios WHERE ci = $1', [ci]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'CI o contraseña incorrectos.' });
        }

        const user = userResult.rows[0];

        if (!user.esta_verificado) {
            return res.status(403).json({ error: 'Tu cuenta no ha sido verificada.' });
        }

        const passwordValida = await bcrypt.compare(password, user.password_hash);
        if (!passwordValida) {
            return res.status(401).json({ error: 'CI o contraseña incorrectos.' });
        }

        const token = jwt.sign(
            { userId: user.id, ci: user.ci },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } 
        );

        res.status(200).json({ message: 'Login exitoso', token: token });

    } catch (error)
        {
        console.error(error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});