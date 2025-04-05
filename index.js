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

// Servir archivos estáticos desde la carpeta 'public' (funcionamiento del css aparte del index.html)
app.use(express.static("public"));

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
    res.redirect('https://hotelituss1.vercel.app/'); //funcion para llevar de vuelta a la pagina de inicio
    // res.send("El usuario ha sido creado exitosamente") funcion sin usar 
});


//iniciar sesion
app.post('/sesion', async (req, res) => {

    console.log('Datos recibidos del login:', req.body); // 👈 Agregado

    const { email } = req.body;

    try {
      // Busca si el correo ingresado existe en la base de datos
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE correo = $1',
        [email]
      );
  
      console.log("Resultado de búsqueda:", result.rows);
  
      if (result.rows.length === 0) {
        // Si no hay coincidencias, muestra error
        return res.status(401).send('Correo no registrado');
      }
  
      // Si encuentra el usuario, redirige al inicio
      return res.redirect('https://hotelituss1.vercel.app/');
      
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).send('Error del servidor');
    }

    // res.redirect('https://hotelituss1.vercel.app/'); //funcion para llevar de vuelta a la pagina de inicio
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
    const result = await pool.query("DELETE FROM usuarios;")
    res.send("se elimino el usuario")
});


pool.connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch(err => console.error("❌ Error al conectar con PostgreSQL:", err));


  
app.listen(3000)
console.log("server on port ", 3000)