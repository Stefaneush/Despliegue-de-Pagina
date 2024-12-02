import express from 'express';
import { config } from "dotenv";
import pg from "pg";
import bodyParser from 'body-parser';
import cors from 'cors';

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

// Crear nuevo usuario
app.post('/usuarios', async (req, res) => {
    try {
        const { nombre, correo, telefono } = req.body;

        // Validar datos
        if (!nombre || !correo || !telefono) {
            return res.status(400).json({ error: 'Todos los campos son obligatorios' });
        }

        // Insertar usuario en la base de datos
        const result = await pool.query(
            'INSERT INTO usuarios (nombre, correo, telefono) VALUES ($1, $2, $3) RETURNING *',
            [nombre, correo, telefono]
        );

        // Responder con el usuario creado
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});



// Obtener todos los usuarios
app.get('/usuarios', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ 
            error: 'Error al obtener usuarios',
            detalle: error.message 
        });
    }
});

// Obtener usuario por ID
app.get('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ 
            error: 'Error al obtener usuario',
            detalle: error.message 
        });
    }
});

// Actualizar usuario
app.put('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, correo, telefono} = req.body;

        // Validar campos obligatorios
        if (!nombre || !correo || !telefono) {
            return res.status(400).json({ 
                error: 'Todos los campos son obligatorios' 
            });
        }

        const result = await pool.query(
            'UPDATE usuarios SET nombre = $1, correo = $2, telefono = $3 WHERE id = $4 RETURNING *',
            [nombre, correo, telefono, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ 
            error: 'Error al actualizar usuario',
            detalle: error.message 
        });
    }
});

// Eliminar usuario
app.delete('/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ 
            mensaje: 'Usuario eliminado exitosamente',
            usuarioEliminado: result.rows[0]
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ 
            error: 'Error al eliminar usuario',
            detalle: error.message 
        });
    }
});

// Manejar rutas no encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Configuración del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});

// Manejo de errores no controlados
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


app.listen(3000)
console.log("server on port ", 3000)
