import express, { query } from 'express';
import {config} from 'dotenv';
import pg from 'pg';
import cors from 'cors';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import path from "path"; // Para manejar rutas (NUEVO)
import { fileURLToPath } from 'url'; // Necesario para manejar __dirname (NUEVO)

config()
 
//NUEVO
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();
const usuariosPendientes = {};

//usar cors para validar datos a traves de las paginas
app.use(cors());


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

//Crear usuario
app.post('/create', async (req, res) => {
    const { nombre, correo, telefono, password } = req.body;

    const codigo = crypto.randomInt(100000, 999999).toString(); // Código de 6 dígitos

    usuariosPendientes[correo] = { codigo, nombre, telefono, password };

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "infohotelituss@gmail.com",
            pass: "pgfn jkao huuk czog"
        }
    });

    const mailOptions = {
        from: '"Hotelitus" <infohotelituss@gmail.com>',
        to: correo,
        subject: 'Código de verificación - Hotelitus',
        html: `
            <h2>Hola ${nombre} 👋</h2>
            <p>Tu código de verificación es:</p>
            <h3>${codigo}</h3>
            <p>Ingresa este código en el sitio para completar tu registro.</p>
        `
    };

    await transporter.sendMail(mailOptions);

    // Respondemos al frontend para mostrar el modal
    res.json({ success: true });
});

//Verificar codigo
app.post('/verify-code', async (req, res) => {
    const { correo, codigo } = req.body;

    const usuarioPendiente = usuariosPendientes[correo];

    if (!usuarioPendiente) {
        return res.status(400).json({ success: false, message: "Usuario no encontrado o código expirado." });
    }

    if (usuarioPendiente.codigo !== codigo) {
        return res.status(401).json({ success: false, message: "Código incorrecto." });
    }

    // Código correcto, insertamos en la DB
    const { nombre, telefono, password } = usuarioPendiente;

    await pool.query(
        "INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4);",
        [nombre, correo, telefono, password]
    );

    // Eliminamos de la lista temporal
    delete usuariosPendientes[correo];

    res.json({ success: true });
});



//iniciar sesion
app.post('/sesion', async (req, res) => {
  console.log('Datos recibidos del login:', req.body);

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE correo = $1 AND contrasena = $2',
      [email, password]
    );

    console.log("Resultado de búsqueda:", result.rows);

    if (result.rows.length === 0) {
      return res.status(401).send('Correo o contraseña incorrectos');
    }

    return res.redirect('https://hotelituss1.vercel.app/?logged=true');
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).send('Error del servidor');
  }
});




app.post('/reservar', async (req, res) => {
  const { nombre, correo, fecha_inicio, fecha_fin, habitacion_tipo, estado } = req.body;

  try {
    // Buscar o crear usuario
    let usuario = await pool.query('SELECT id FROM usuarios WHERE correo = $1', [correo]);
    let usuario_id;

    if (usuario.rows.length === 0) {
      const insertUser = await pool.query(
        'INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING id',
        [nombre, correo, 'default123'] // contraseña por defecto, ideal cambiar luego
      );
      usuario_id = insertUser.rows[0].id;
    } else {
      usuario_id = usuario.rows[0].id;
    }

    // Insertar reserva
    await pool.query(
      'INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5)',
      [usuario_id, habitacion_tipo, fecha_inicio, fecha_fin, estado || 'pendiente']
    );

    res.send('<script>alert("¡Reserva realizada con éxito!"); window.location.href = "https://hotelituss1.vercel.app/";</script>');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al realizar la reserva');
  }
});


// select de reserva para comprobar
app.get('/select_reserva', async (req, res) => {
  const result = await pool.query('SELECT * FROM reservas')
  return res.json(result.rows)
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
