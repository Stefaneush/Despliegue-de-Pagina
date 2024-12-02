import express, { query } from 'express';
import {config} from "dotenv";
import pg from "pg";

config()

const app = express();

const pool = new pg.Pool({
    
    connectionString: process.env.DATABASE_URL

})

app.post('/', async (req, res) => {
    res.send("principal")
});

app.post('/create', async (req, res) => {

    const { nombre, correo, telefono } = req.body;

    const result = await pool.query("INSERT INTO usuarios (nombre, correo, telefono) VALUES ('$1', '$2', '$3'); " , [nombre, correo, telefono])
    res.send("se creo el usuario")
});

app.post('/select', async (req, res) => {
    const result = await pool.query('SELECT * FROM usuarios')
    return res.json(result.rows)
});

app.post('/update', async (req, res) => {
    const result = await pool.query("UPDATE usuarios SET nombre = 'Maurisio Hermoso', correo = 'maurisiaxd@example.com' WHERE id = 1;")
    res.send("se actualizo el usuario")
});

app.post('/delete', async (req, res) => {
    const result = await pool.query("DELETE FROM usuarios WHERE id = 3;")
    res.send("se elimino el usuario")
});

app.listen(3000)
console.log("server on port ", 3000)