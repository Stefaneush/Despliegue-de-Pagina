import express, { query } from 'express';
import {config} from 'dotenv';
import pg from 'pg';
import cors from 'cors';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

import path from "path" // Para manejar rutas (NUEVO)
import { fileURLToPath } from "url" // Necesario para manejar __dirname (NUEVO)

config()

//NUEVO
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


const app = express();
const usuariosPendientes = {};

//usar cors para validar datos a traves de las paginas
app.use(
  cors({
    origin: "*", // Permitir todas las solicitudes de origen cruzado
    methods: ["GET", "POST"], // Métodos permitidos
    allowedHeaders: ["Content-Type", "Authorization"], // Cabeceras permitidas
  }),
)

// Middleware para analizar JSON y datos de formulario
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static("public"))

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

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
app.post("/sesion", async (req, res) => {
  console.log("Datos recibidos del login:", req.body)
  console.log("Headers:", req.headers)

  try {
    const { email, password } = req.body

    if (!email || !password) {
      console.log("Faltan credenciales")
      return res.status(400).json({ message: "Faltan credenciales" })
    }

    console.log(`Buscando usuario con email: ${email}`)

    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1 AND contrasena = $2", [email, password])

    console.log("Resultado de búsqueda:", result.rows.length > 0 ? "Usuario encontrado" : "Usuario no encontrado")

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" })
    }

    // Para solicitudes de formulario tradicionales
    if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
      return res.redirect("https://hotelituss1.vercel.app/?logged=true")
    }

    // Para solicitudes JSON
    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: {
        id: result.rows[0].id,
        nombre: result.rows[0].nombre,
        correo: result.rows[0].correo,
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ message: "Error del servidor" })
  }
})

app.post("/reservar", async (req, res) => {
  const { nombre, correo, fecha_inicio, fecha_fin, habitacion_tipo, estado } = req.body

  try {
    // Buscar o crear usuario
    const usuario = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo])
    let usuario_id

    if (usuario.rows.length === 0) {
      const insertUser = await pool.query(
        "INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING id",
        [nombre, correo, "default123"], // contraseña por defecto, ideal cambiar luego
      )
      usuario_id = insertUser.rows[0].id
    } else {
      usuario_id = usuario.rows[0].id
    }

    // Insertar reserva
    await pool.query(
      "INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5)",
      [usuario_id, habitacion_tipo, fecha_inicio, fecha_fin, estado || "pendiente"],
    )

    res.send(
      '<script>alert("¡Reserva realizada con éxito!"); window.location.href = "https://hotelituss1.vercel.app/";</script>',
    )
  } catch (err) {
    console.error(err)
    res.status(500).send("Error al realizar la reserva")
  }
})

// select de reserva para comprobar
app.get("/select_reserva", async (req, res) => {
  const result = await pool.query("SELECT * FROM reservas")
  return res.json(result.rows)
})

app.get("/select", async (req, res) => {
  const result = await pool.query("SELECT * FROM usuarios")
  return res.json(result.rows)
})

app.get("/update", async (req, res) => {
  const result = await pool.query("UPDATE usuarios SET nombre = 'Lautaro', correo = 'Lautaro@gmail.com' WHERE id = 18;")
  res.send("se actualizo el usuario")
})

app.get("/delete", async (req, res) => {
  const result = await pool.query("DELETE FROM usuarios;")
  res.send("se elimino el usuario")
})

// Ruta para verificar el estado del servidor
app.get("/status", (req, res) => {
  res.status(200).json({ status: "ok", message: "Servidor funcionando correctamente" })
})

































// Añadir estos endpoints al archivo backend.txt

// Endpoint para crear una reserva
app.post("/crear-reserva", async (req, res) => {
  try {
    const { 
      fecha_inicio, 
      fecha_fin, 
      habitacion_tipo, 
      huespedes, 
      solicitudes_especiales, 
      correo, 
      estado 
    } = req.body;
    
    // Validar datos
    if (!fecha_inicio || !fecha_fin || !habitacion_tipo || !correo) {
      return res.status(400).json({ 
        success: false, 
        message: "Faltan datos obligatorios para la reserva" 
      });
    }
    
    // Obtener el ID del usuario
    const userResult = await pool.query(
      "SELECT id FROM usuarios WHERE correo = $1",
      [correo]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }
    
    const usuario_id = userResult.rows[0].id;
    
    // Insertar la reserva
    const result = await pool.query(
      `INSERT INTO reservas 
       (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado, huespedes, solicitudes_especiales) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [
        usuario_id, 
        habitacion_tipo, 
        fecha_inicio, 
        fecha_fin, 
        estado || "confirmada", 
        huespedes || 1, 
        solicitudes_especiales || ""
      ]
    );
    
    res.status(201).json({ 
      success: true, 
      message: "Reserva creada con éxito", 
      reserva_id: result.rows[0].id 
    });
  } catch (error) {
    console.error("Error al crear reserva:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error del servidor al crear la reserva" 
    });
  }
});

// Endpoint para obtener las reservas de un usuario
app.post("/mis-reservas", async (req, res) => {
  try {
    const { correo } = req.body;
    
    if (!correo) {
      return res.status(400).json({ 
        success: false, 
        message: "Correo no proporcionado" 
      });
    }
    
    // Obtener el ID del usuario
    const userResult = await pool.query(
      "SELECT id FROM usuarios WHERE correo = $1",
      [correo]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }
    
    const usuario_id = userResult.rows[0].id;
    
    // Obtener las reservas del usuario
    const reservasResult = await pool.query(
      `SELECT r.id, r.habitacion_id, r.fecha_inicio, r.fecha_fin, 
              r.estado, r.huespedes, r.solicitudes_especiales, 
              r.created_at
       FROM reservas r
       WHERE r.usuario_id = $1
       ORDER BY r.fecha_inicio DESC`,
      [usuario_id]
    );
    
    res.status(200).json({ 
      success: true, 
      reservas: reservasResult.rows 
    });
  } catch (error) {
    console.error("Error al obtener reservas:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error del servidor al obtener las reservas" 
    });
  }
});

// Endpoint para cancelar una reserva
app.post("/cancelar-reserva", async (req, res) => {
  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "ID de reserva no proporcionado" 
      });
    }
    
    // Actualizar el estado de la reserva a "cancelada"
    const result = await pool.query(
      "UPDATE reservas SET estado = 'cancelada' WHERE id = $1 RETURNING id",
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Reserva no encontrada" 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      message: "Reserva cancelada con éxito" 
    });
  } catch (error) {
    console.error("Error al cancelar reserva:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error del servidor al cancelar la reserva" 
    });
  }
});









































pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

  
app.listen(3000)
console.log("server on port ", 3000)