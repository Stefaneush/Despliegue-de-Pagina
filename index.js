import express from "express"
import { config } from "dotenv"
import pg from "pg"
import cors from "cors"
import crypto from "crypto"
import nodemailer from "nodemailer"

import path from "path" // Para manejar rutas (NUEVO)
import { fileURLToPath } from "url" // Necesario para manejar __dirname (NUEVO)

config()

//NUEVO
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const usuariosPendientes = {}

//usar cors para validar datos a traves de las paginas
app.use(
  cors({
    origin: ["https://hotelituss-test.vercel.app", "https://hotelituss1.vercel.app"], // Dominios permitidos
    methods: ["GET", "POST", "OPTIONS"], // Incluir OPTIONS para las solicitudes preflight
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true // Permitir cookies en solicitudes cross-origin si es necesario
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
app.post("/create", async (req, res) => {
  const { nombre, correo, telefono, password } = req.body

  const codigo = crypto.randomInt(100000, 999999).toString() // Código de 6 dígitos

  usuariosPendientes[correo] = { codigo, nombre, telefono, password }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "infohotelituss@gmail.com",
      pass: "pgfn jkao huuk czog",
    },
  })

  const mailOptions = {
    from: '"Hotelitus" <infohotelituss@gmail.com>',
    to: correo,
    subject: "Código de verificación - Hotelitus",
    html: `
            <h2>Hola ${nombre} 👋</h2>
            <p>Tu código de verificación es:</p>
            <h3>${codigo}</h3>
            <p>Ingresa este código en el sitio para completar tu registro.</p>
        `,
  }

  await transporter.sendMail(mailOptions)

  // Respondemos al frontend para mostrar el modal
  res.json({ success: true })
})

//Verificar codigo
app.post("/verify-code", async (req, res) => {
  const { correo, codigo } = req.body

  const usuarioPendiente = usuariosPendientes[correo]

  if (!usuarioPendiente) {
    return res.status(400).json({ success: false, message: "Usuario no encontrado o código expirado." })
  }

  if (usuarioPendiente.codigo !== codigo) {
    return res.status(401).json({ success: false, message: "Código incorrecto." })
  }

  // Código correcto, insertamos en la DB
  const { nombre, telefono, password } = usuarioPendiente

  await pool.query("INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4);", [
    nombre,
    correo,
    telefono,
    password,
  ])

  // Eliminamos de la lista temporal
  delete usuariosPendientes[correo]

  res.json({ success: true })
})

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

// Modificar la ruta de reservar para aceptar más campos
app.post("/reservar", async (req, res) => {
  const { nombre, correo, fecha_inicio, fecha_fin, habitacion_tipo, huespedes, solicitudes_especiales, estado } =
    req.body

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

    // Obtener el ID de la habitación según el tipo
    const habitacionResult = await pool.query("SELECT id FROM habitaciones WHERE tipo = $1", [habitacion_tipo])

    let habitacion_id
    if (habitacionResult.rows.length === 0) {
      // Si no existe el tipo de habitación, creamos uno
      const insertHabitacion = await pool.query(
        "INSERT INTO habitaciones (tipo, capacidad, precio) VALUES ($1, $2, $3) RETURNING id",
        [habitacion_tipo, huespedes || 2, habitacion_tipo === "suite" ? 280 : habitacion_tipo === "doble" ? 180 : 120],
      )
      habitacion_id = insertHabitacion.rows[0].id
    } else {
      habitacion_id = habitacionResult.rows[0].id
    }

    // Insertar reserva
    const reservaResult = await pool.query(
      `INSERT INTO reservas (
        usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado, 
        huespedes, solicitudes_especiales, fecha_creacion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id`,
      [usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado || "pendiente", huespedes, solicitudes_especiales],
    )

    res.status(200).json({
      success: true,
      message: "Reserva creada con éxito",
      reservaId: reservaResult.rows[0].id,
    })
  } catch (err) {
    console.error("Error al realizar la reserva:", err)
    res.status(500).json({
      success: false,
      message: "Error al realizar la reserva",
    })
  }
})

// Ruta para obtener las reservas de un usuario
app.post("/user-reservations", async (req, res) => {
  try {
    const { correo } = req.body

    if (!correo) {
      return res.status(400).json({ success: false, message: "Correo no proporcionado" })
    }

    // Primero obtenemos el ID del usuario
    const userResult = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo])

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" })
    }

    const userId = userResult.rows[0].id

    // Obtenemos las reservas del usuario
    const reservasResult = await pool.query(
      `
      SELECT r.id, r.fecha_inicio, r.fecha_fin, r.estado, r.fecha_creacion, 
             h.tipo as habitacion_tipo, r.huespedes, r.solicitudes_especiales
      FROM reservas r
      JOIN habitaciones h ON r.habitacion_id = h.id
      WHERE r.usuario_id = $1
      ORDER BY r.fecha_creacion DESC
    `,
      [userId],
    )

    res.status(200).json({
      success: true,
      reservations: reservasResult.rows,
    })
  } catch (error) {
    console.error("Error al obtener reservas del usuario:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

// Ruta para cancelar una reserva
app.post("/cancel-reservation", async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reserva no proporcionado" })
    }

    // Actualizar el estado de la reserva a 'cancelada'
    await pool.query("UPDATE reservas SET estado = 'cancelada' WHERE id = $1", [id])

    res.status(200).json({
      success: true,
      message: "Reserva cancelada con éxito",
    })
  } catch (error) {
    console.error("Error al cancelar reserva:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
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

pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

// Ruta para obtener datos del usuario
app.post("/get-user-data", async (req, res) => {
  try {
    const { correo } = req.body

    if (!correo) {
      return res.status(400).json({ success: false, message: "Correo no proporcionado" })
    }

    const result = await pool.query("SELECT id, nombre, correo, telefono FROM usuarios WHERE correo = $1", [correo])

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" })
    }

    res.status(200).json({
      success: true,
      user: result.rows[0],
    })
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

app.listen(3000)
console.log("server on port ", 3000)
