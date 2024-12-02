import express, { query } from 'express';
import {config} from "dotenv";
import pg from "pg";

config()

const app = express();

const pool = new pg.Pool({
    
    connectionString: process.env.DATABASE_URL

})

app.get('/', async (req, res) => {
    const result = await pool.query("INSERT INTO usuarios (nombre, correo, telefono) VALUES ('Emir Pérez', 'juan@example.com', '123456789'); ")
});

app.get('/ping', async (req, res) => {
    const result = await pool.query('SELECT * FROM usuarios')
    return res.json(result.rows)
});


app.listen(3000)
console.log("server on port ", 3000)