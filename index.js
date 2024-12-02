import express from 'express';
import { config } from "dotenv";
import pg from "pg";
import bodyParser from 'body-parser';
import cors from 'cors';
const path = require('path');

// Configuración inicial
config();
const app = express();

// Middlewares
app.use(bodyParser.json());
app.use(cors());

// Configuración de la base de datos
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});


// Rutas CRUD para usuarios

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para mostrar la página HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Ruta para insertar un nuevo usuario en la base de datos
app.post('/addUser', async (req, res) => {
    const { nombre, correo, telefono } = req.body;

    // Validar los datos
    if (!nombre || !correo || !telefono) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    try {
        // Insertar los datos del usuario en la base de datos
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, correo, telefono) VALUES ($1, $2, $3) RETURNING *',
            [nombre, correo, telefono]
        );
        
        // Enviar los datos del usuario recién creado como respuesta
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al insertar el usuario:', error);
        res.status(500).json({ error: 'Error al insertar el usuario' });
    }
});

// Ruta para obtener todos los usuarios de la base de datos
app.get('/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener los usuarios:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
});


app.listen(3000)
console.log("server on port ", 3000)
