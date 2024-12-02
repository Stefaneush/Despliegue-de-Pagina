import express, { query } from 'express';
import {config} from "dotenv";
import pg from "pg";

config()

const app = express();

const pool = new pg.Pool({
    
    connectionString: process.env.DATABASE_URL

})

app.get('/', async (req, res) => {
    res.send("principal")
});

app.post('/create', async (req, res) => {

    const { nombre, correo, telefono } = req.body;

    const result = await pool.query("INSERT INTO usuarios (nombre, correo, telefono) VALUES ('$1', '$2', '$3'); " , [nombre, correo, telefono])
    res.send("se creo el usuario")
});

app.get('/select', async (req, res) => {
    const result = await pool.query('SELECT * FROM usuarios')
    return res.json(result.rows)
});

app.get('/update', async (req, res) => {
    const result = await pool.query("UPDATE usuarios SET nombre = 'Maurisio Hermoso', correo = 'maurisiaxd@example.com' WHERE id = 1;")
    res.send("se actualizo el usuario")
});

app.get('/delete', async (req, res) => {
    const result = await pool.query("DELETE FROM usuarios WHERE id = 3;")
    res.send("se elimino el usuario")
});

app.listen(3000)
console.log("server on port ", 3000)