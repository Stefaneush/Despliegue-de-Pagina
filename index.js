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

// Configuración de CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
)

// Middleware para analizar JSON y datos de formulario
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static("public"))

// Configuración de la conexión a la base de datos
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

// Ruta principal
app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

// Crear usuario con verificación por correo
app.post("/create", async (req, res) => {
  const { nombre, correo, telefono, password } = req.body

  try {
    // Verificar si el usuario ya existe
    const userExists = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo])

    if (userExists.rows.length > 0) {
      return res.status(400).json({ success: false, message: "El correo ya está registrado" })
    }

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
  } catch (error) {
    console.error("Error al crear usuario:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

// Verificar código de registro
app.post("/verify-code", async (req, res) => {
  const { correo, codigo } = req.body

  const usuarioPendiente = usuariosPendientes[correo]

  if (!usuarioPendiente) {
    return res.status(400).json({ success: false, message: "Usuario no encontrado o código expirado." })
  }

  if (usuarioPendiente.codigo !== codigo) {
    return res.status(401).json({ success: false, message: "Código incorrecto." })
  }

  try {
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
  } catch (error) {
    console.error("Error al verificar código:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

// Iniciar sesión
app.post("/sesion", async (req, res) => {
  console.log("Datos recibidos del login:", req.body)

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

// Obtener habitaciones disponibles
app.get("/habitaciones-disponibles", async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, capacidad } = req.query

    let query = `
      SELECT h.id, h.tipo, h.numero, h.precio_por_noche, h.capacidad
      FROM habitaciones h
      WHERE h.disponible = true
    `

    const queryParams = []

    // Si se proporcionan fechas, filtrar habitaciones no reservadas en ese período
    if (fecha_inicio && fecha_fin) {
      query += `
        AND h.id NOT IN (
          SELECT r.habitacion_id
          FROM reservas r
          WHERE (r.fecha_inicio <= $1 AND r.fecha_fin >= $2)
          AND r.estado != 'cancelada'
        )
      `
      queryParams.push(fecha_fin, fecha_inicio)
    }

    // Si se proporciona capacidad, filtrar por capacidad mínima
    if (capacidad) {
      query += ` AND h.capacidad >= $${queryParams.length + 1}`
      queryParams.push(Number.parseInt(capacidad))
    }

    query += ` ORDER BY h.precio_por_noche ASC`

    const result = await pool.query(query, queryParams)

    res.status(200).json({
      success: true,
      habitaciones: result.rows,
    })
  } catch (error) {
    console.error("Error al obtener habitaciones disponibles:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

// Crear reserva
app.post("/reservar", async (req, res) => {
  const { nombre, correo, fecha_inicio, fecha_fin, habitacion_tipo, huespedes, solicitudes_especiales, estado } =
    req.body

  try {
    // Iniciar transacción
    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Buscar o crear usuario
      let usuario_id
      const usuario = await client.query("SELECT id FROM usuarios WHERE correo = $1", [correo])

      if (usuario.rows.length === 0) {
        const insertUser = await client.query(
          "INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING id",
          [nombre, correo, "default123"], // contraseña por defecto
        )
        usuario_id = insertUser.rows[0].id
      } else {
        usuario_id = usuario.rows[0].id
      }

      // Obtener habitación según el tipo
      let habitacion_id
      const habitacionResult = await client.query(
        "SELECT id FROM habitaciones WHERE tipo = $1 AND disponible = true LIMIT 1",
        [habitacion_tipo],
      )

      if (habitacionResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(400).json({
          success: false,
          message: "No hay habitaciones disponibles del tipo seleccionado",
        })
      } else {
        habitacion_id = habitacionResult.rows[0].id
      }

      // Verificar disponibilidad en las fechas seleccionadas
      const disponibilidadResult = await client.query(
        `
        SELECT COUNT(*) FROM reservas 
        WHERE habitacion_id = $1 
        AND estado != 'cancelada'
        AND (
          (fecha_inicio <= $2 AND fecha_fin >= $2) OR
          (fecha_inicio <= $3 AND fecha_fin >= $3) OR
          (fecha_inicio >= $2 AND fecha_fin <= $3)
        )
      `,
        [habitacion_id, fecha_inicio, fecha_fin],
      )

      if (Number.parseInt(disponibilidadResult.rows[0].count) > 0) {
        await client.query("ROLLBACK")
        return res.status(400).json({
          success: false,
          message: "La habitación no está disponible en las fechas seleccionadas",
        })
      }

      // Insertar reserva
      const reservaResult = await client.query(
        `INSERT INTO reservas (
          usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado
        ) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado || "pendiente"],
      )

      const reserva_id = reservaResult.rows[0].id

      // Calcular el monto total de la reserva
      const habitacionInfo = await client.query("SELECT precio_por_noche FROM habitaciones WHERE id = $1", [
        habitacion_id,
      ])

      const precio_por_noche = Number.parseFloat(habitacionInfo.rows[0].precio_por_noche)
      const fecha_inicio_obj = new Date(fecha_inicio)
      const fecha_fin_obj = new Date(fecha_fin)
      const dias = Math.ceil((fecha_fin_obj - fecha_inicio_obj) / (1000 * 60 * 60 * 24))
      const monto_total = precio_por_noche * dias

      // Crear registro de pago pendiente
      await client.query("INSERT INTO pagos (reserva_id, monto, fecha_pago) VALUES ($1, $2, NULL)", [
        reserva_id,
        monto_total,
      ])

      await client.query("COMMIT")

      res.status(200).json({
        success: true,
        message: "Reserva creada con éxito",
        reservaId: reserva_id,
        montoTotal: monto_total,
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    console.error("Error al realizar la reserva:", err)
    res.status(500).json({
      success: false,
      message: "Error al realizar la reserva",
    })
  }
})

// Obtener reservas de un usuario
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

    // Obtenemos las reservas del usuario con información de habitación y pagos
    const reservasResult = await pool.query(
      `
      SELECT 
        r.id, r.fecha_inicio, r.fecha_fin, r.estado, 
        h.tipo as habitacion_tipo, h.numero as habitacion_numero, h.precio_por_noche,
        p.monto as monto_total, p.fecha_pago
      FROM reservas r
      JOIN habitaciones h ON r.habitacion_id = h.id
      LEFT JOIN pagos p ON p.reserva_id = r.id
      WHERE r.usuario_id = $1
      ORDER BY r.fecha_inicio DESC
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

// Cancelar reserva
app.post("/cancel-reservation", async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reserva no proporcionado" })
    }

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Verificar si la reserva existe y no está ya cancelada
      const reservaResult = await client.query("SELECT estado FROM reservas WHERE id = $1", [id])

      if (reservaResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({ success: false, message: "Reserva no encontrada" })
      }

      if (reservaResult.rows[0].estado === "cancelada") {
        await client.query("ROLLBACK")
        return res.status(400).json({ success: false, message: "La reserva ya está cancelada" })
      }

      // Actualizar el estado de la reserva a 'cancelada'
      await client.query("UPDATE reservas SET estado = 'cancelada' WHERE id = $1", [id])

      // Actualizar el pago si existe
      await client.query("UPDATE pagos SET fecha_pago = NULL WHERE reserva_id = $1 AND fecha_pago IS NULL", [id])

      await client.query("COMMIT")

      res.status(200).json({
        success: true,
        message: "Reserva cancelada con éxito",
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error al cancelar reserva:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

// Registrar pago de reserva
app.post("/registrar-pago", async (req, res) => {
  try {
    const { reserva_id, monto } = req.body

    if (!reserva_id || !monto) {
      return res.status(400).json({
        success: false,
        message: "Faltan datos requeridos (reserva_id, monto)",
      })
    }

    const client = await pool.connect()

    try {
      await client.query("BEGIN")

      // Verificar si la reserva existe y no está cancelada
      const reservaResult = await client.query("SELECT estado FROM reservas WHERE id = $1", [reserva_id])

      if (reservaResult.rows.length === 0) {
        await client.query("ROLLBACK")
        return res.status(404).json({ success: false, message: "Reserva no encontrada" })
      }

      if (reservaResult.rows[0].estado === "cancelada") {
        await client.query("ROLLBACK")
        return res.status(400).json({ success: false, message: "No se puede pagar una reserva cancelada" })
      }

      // Actualizar el pago
      const pagoResult = await client.query(
        "UPDATE pagos SET fecha_pago = CURRENT_DATE WHERE reserva_id = $1 RETURNING id",
        [reserva_id],
      )

      if (pagoResult.rows.length === 0) {
        // Si no existe un registro de pago, crearlo
        await client.query("INSERT INTO pagos (reserva_id, monto, fecha_pago) VALUES ($1, $2, CURRENT_DATE)", [
          reserva_id,
          monto,
        ])
      }

      // Actualizar el estado de la reserva a 'confirmada'
      await client.query("UPDATE reservas SET estado = 'confirmada' WHERE id = $1", [reserva_id])

      await client.query("COMMIT")

      res.status(200).json({
        success: true,
        message: "Pago registrado con éxito",
      })
    } catch (err) {
      await client.query("ROLLBACK")
      throw err
    } finally {
      client.release()
    }
  } catch (error) {
    console.error("Error al registrar pago:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

// Obtener datos del usuario
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

// Rutas para administración y depuración
app.get("/select_reserva", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, h.tipo as habitacion_tipo, u.nombre as usuario_nombre, p.monto, p.fecha_pago
      FROM reservas r
      JOIN habitaciones h ON r.habitacion_id = h.id
      JOIN usuarios u ON r.usuario_id = u.id
      LEFT JOIN pagos p ON p.reserva_id = r.id
    `)
    return res.json(result.rows)
  } catch (error) {
    console.error("Error al obtener reservas:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

app.get("/select", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM usuarios")
    return res.json(result.rows)
  } catch (error) {
    console.error("Error al obtener usuarios:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
})

// Verificar estado del servidor
app.get("/status", (req, res) => {
  res.status(200).json({ status: "ok", message: "Servidor funcionando correctamente" })
})

// Iniciar el servidor
pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

app.listen(3000)
console.log("server on port ", 3000)
