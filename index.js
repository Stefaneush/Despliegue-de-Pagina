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

app.get('/create', async (req, res) => {
    const result = await pool.query("INSERT INTO usuarios (nombre, correo, telefono) VALUES ('Emir Pérez', 'juan@example.com', '123456789'); ")
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


app.listen(3000)
console.log("server on port ", 3000)