import express, { query } from 'express';
import {config} from 'dotenv';
import pg from 'pg';

import path from "path"; // Para manejar rutas (NUEVO)
import { fileURLToPath } from 'url'; // Necesario para manejar __dirname (NUEVO)

config()
 
//NUEVO
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

// Middleware para analizar los datos de los formularios //NUEVO
app.use(express.urlencoded({ extended: true }));

const pool = new pg.Pool({
    
    connectionString: process.env.DATABASE_URL

})

app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/create', async (req, res) => {

    const { nombre, correo, telefono } = req.body;

    const result = await pool.query("INSERT INTO usuarios (nombre, correo, telefono) VALUES ($1, $2, $3); " , [nombre, correo, telefono])
    res.send("El usuario ha sido creado exitosamente")
});

app.get('/select', async (req, res) => {
    const result = await pool.query('SELECT * FROM usuarios')
    return res.json(result.rows)
});

app.get('/update', async (req, res) => {
    const result = await pool.query("UPDATE usuarios SET nombre = 'Lautaro', correo = 'Lautaro@gmail.com' WHERE id = 18;")
    res.send("se actualizo el usuario")
});

app.get('/delete', async (req, res) => {
    const result = await pool.query("DELETE FROM usuarios WHERE id = 18;")
    res.send("se elimino el usuario")
});


pool.connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch(err => console.error("❌ Error al conectar con PostgreSQL:", err));


app.listen(3000)
console.log("server on port ", 3000)