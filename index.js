import express from "express"
import { config } from "dotenv"
import pg from "pg"
import cors from "cors"
import crypto from "crypto"
import nodemailer from "nodemailer"
import path from "path"
import { fileURLToPath } from "url"

config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const usuariosPendientes = {}

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.post("/create", async (req, res) => {
  const { nombre, correo, telefono, password } = req.body

  const codigo = crypto.randomInt(100000, 999999).toString()

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
  res.json({ success: true })
})

app.post("/verify-code", async (req, res) => {
  const { correo, codigo } = req.body

  const usuarioPendiente = usuariosPendientes[correo]

  if (!usuarioPendiente) {
    return res.status(400).json({ success: false, message: "Usuario no encontrado o código expirado." })
  }

  if (usuarioPendiente.codigo !== codigo) {
    return res.status(401).json({ success: false, message: "Código incorrecto." })
  }

  const { nombre, telefono, password } = usuarioPendiente

  await pool.query("INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4);", [
    nombre,
    correo,
    telefono,
    password,
  ])

  delete usuariosPendientes[correo]
  res.json({ success: true })
})

app.post("/sesion", async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "Faltan credenciales" })
    }

    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1 AND contrasena = $2", [email, password])

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" })
    }

    if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
      return res.redirect("https://hotelituss1.vercel.app/?logged=true")
    }

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
  try {
    const {
      usuario_id,
      habitacion_id,
      fecha_inicio,
      fecha_fin,
      estado,
      nombre,
      correo,
      huespedes,
      solicitudes_especiales,
    } = req.body

    let userId = usuario_id

    if (!userId && correo) {
      const userResult = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo])

      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id
      } else {
        const newUserResult = await pool.query(
          "INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING id",
          [nombre, correo, "password_temporal"],
        )
        userId = newUserResult.rows[0].id
      }
    }

    if (!userId) {
      return res.status(400).json({ success: false, message: "No se pudo identificar al usuario" })
    }

    const habitacionResult = await pool.query("SELECT * FROM habitaciones WHERE id = $1 AND disponible = true", [
      habitacion_id,
    ])

    if (habitacionResult.rows.length === 0) {
      return res.status(400).json({ success: false, message: "La habitación seleccionada no está disponible" })
    }

    const reservaResult = await pool.query(
      "INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [userId, habitacion_id, fecha_inicio, fecha_fin, estado || "pendiente"],
    )

    const reservaId = reservaResult.rows[0].id

    await pool.query("UPDATE habitaciones SET disponible = false WHERE id = $1", [habitacion_id])

    res.status(200).json({
      success: true,
      message: "Reserva creada con éxito",
      reserva_id: reservaId,
    })
  } catch (error) {
    console.error("Error al crear reserva:", error)
    res.status(500).json({ success: false, message: "Error al procesar la reserva" })
  }
})

app.post("/user-reservations", async (req, res) => {
  try {
    const { usuario_id, correo } = req.body

    let query
    let params

    if (usuario_id) {
      query = `
        SELECT r.*, h.tipo as habitacion_tipo, h.precio_por_noche
        FROM reservas r
        JOIN habitaciones h ON r.habitacion_id = h.id
        WHERE r.usuario_id = $1
        ORDER BY r.fecha_inicio DESC
      `
      params = [usuario_id]
    } else if (correo) {
      query = `
        SELECT r.*, h.tipo as habitacion_tipo, h.precio_por_noche
        FROM reservas r
        JOIN habitaciones h ON r.habitacion_id = h.id
        JOIN usuarios u ON r.usuario_id = u.id
        WHERE u.correo = $1
        ORDER BY r.fecha_inicio DESC
      `
      params = [correo]
    } else {
      return res.status(400).json({ success: false, message: "Se requiere ID de usuario o correo" })
    }

    const result = await pool.query(query, params)

    res.status(200).json({
      success: true,
      reservas: result.rows,
    })
  } catch (error) {
    console.error("Error al obtener reservas:", error)
    res.status(500).json({ success: false, message: "Error al obtener las reservas" })
  }
})

app.post("/cancel-reservation", async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reserva no proporcionado" })
    }

    const reservaResult = await pool.query("SELECT habitacion_id FROM reservas WHERE id = $1", [id])

    if (reservaResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada" })
    }

    const habitacionId = reservaResult.rows[0].habitacion_id

    await pool.query("UPDATE reservas SET estado = 'cancelada' WHERE id = $1", [id])
    await pool.query("UPDATE habitaciones SET disponible = true WHERE id = $1", [habitacionId])

    res.status(200).json({
      success: true,
      message: "Reserva cancelada con éxito",
    })
  } catch (error) {
    console.error("Error al cancelar reserva:", error)
    res.status(500).json({ success: false, message: "Error al cancelar la reserva" })
  }
})

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

app.get("/init-habitaciones", async (req, res) => {
  try {
    const checkResult = await pool.query("SELECT COUNT(*) FROM habitaciones")

    if (Number.parseInt(checkResult.rows[0].count) > 0) {
      return res.status(200).json({ message: "Las habitaciones ya están inicializadas" })
    }

    await pool.query(`
      INSERT INTO habitaciones (tipo, numero, precio_por_noche, disponible) VALUES
      ('individual', 101, 120, true),
      ('individual', 102, 120, true),
      ('individual', 103, 120, true),
      ('doble', 201, 180, true),
      ('doble', 202, 180, true),
      ('doble', 203, 180, true),
      ('suite', 301, 280, true),
      ('suite', 302, 280, true)
    `)

    res.status(200).json({ success: true, message: "Habitaciones inicializadas correctamente" })
  } catch (error) {
    console.error("Error al inicializar habitaciones:", error)
    res.status(500).json({ success: false, message: "Error al inicializar habitaciones" })
  }
})

app.get("/status", (req, res) => {
  res.status(200).json({ status: "ok", message: "Servidor funcionando correctamente" })
})

pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

app.listen(3000)
console.log("Servidor ejecutándose en el puerto 3000")
