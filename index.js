import express, { query } from 'express';
import {config} from "dotenv";
import pg from "pg";

config()

const app = express();

const pool = new pg.Pool({
    
    connectionString: process.env.DATABASE_URL

})

app.get('/', async (req, res) => {

    const result = await pool.query('SELECT * FROM usuarios')
    return res.json(result.rows)

    const resulta = await pool.query(
        'INSERT INTO usuarios (id, nombre, correo, telefono) VALUES (3, pepito, pepito@gmail.com, 3454323454) RETURNING *',
        [id, nombre, correo, telefono]
    );
    return res.status(201).json(resulta.rows[0]);

});

app.listen(3000)
console.log("server on port ", 3000)
