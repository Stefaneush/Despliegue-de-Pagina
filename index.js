import express from "express"
import { config } from "dotenv"
import pg from "pg"
import cors from "cors"
import crypto from "crypto"
import nodemailer from "nodemailer"
import { MercadoPagoConfig, Preference } from "mercadopago"

import path from "path"
import { fileURLToPath } from "url"

config()

// Verificar que las variables de entorno estén configuradas
if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  console.error("❌ MERCADOPAGO_ACCESS_TOKEN no está configurado en las variables de entorno")
  process.exit(1)
}

console.log("✅ MercadoPago configurado correctamente")

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const usuariosPendientes = {}

// Configurar MercadoPago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
})

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

// Función para calcular el precio total de la reserva
function calcularPrecioReserva(habitacion_id, fecha_inicio, fecha_fin) {
  const precios = {
    1: 120, // individual
    2: 180, // doble
    3: 280, // suite
  }

  const fechaInicio = new Date(fecha_inicio)
  const fechaFin = new Date(fecha_fin)
  const noches = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24))
  const precioPorNoche = precios[habitacion_id] || 120

  return noches * precioPorNoche
}

// Ruta para realizar reservas - MODIFICADA PARA MERCADOPAGO
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

    console.log("Datos de reserva recibidos:", req.body)

    let userId = usuario_id

    // Si no se proporciona usuario_id pero sí correo, buscar el usuario por correo
    if (!userId && correo) {
      console.log("Buscando usuario por correo:", correo)
      const userResult = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo])

      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id
        console.log("Usuario encontrado por correo, ID:", userId)
      } else {
        console.log("Usuario no encontrado, creando nuevo usuario con correo:", correo)
        // Si el usuario no existe, crearlo
        const newUserResult = await pool.query(
          "INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING id",
          [nombre || "Usuario", correo, "password_temporal"],
        )
        userId = newUserResult.rows[0].id
        console.log("Nuevo usuario creado, ID:", userId)
      }
    }

    if (!userId) {
      console.error("No se pudo identificar al usuario")
      return res.status(400).json({ success: false, message: "No se pudo identificar al usuario" })
    }

    // Verificar disponibilidad de la habitación para las fechas solicitadas
    console.log(
      "Verificando disponibilidad de habitación ID:",
      habitacion_id,
      "para fechas:",
      fecha_inicio,
      "a",
      fecha_fin,
    )

    // Primero verificamos que la habitación exista
    const habitacionResult = await pool.query("SELECT * FROM habitaciones WHERE id = $1", [habitacion_id])

    if (habitacionResult.rows.length === 0) {
      console.error("Habitación no encontrada")
      return res.status(400).json({ success: false, message: "La habitación seleccionada no existe" })
    }

    // Verificar si hay reservas que se solapan con las fechas solicitadas
    const reservasExistentes = await pool.query(
      `SELECT * FROM reservas 
       WHERE habitacion_id = $1 
       AND estado != 'cancelada'
       AND (
         (fecha_inicio <= $2 AND fecha_fin >= $2) OR
         (fecha_inicio <= $3 AND fecha_fin >= $3) OR
         (fecha_inicio >= $2 AND fecha_fin <= $3)
       )`,
      [habitacion_id, fecha_inicio, fecha_fin],
    )

    if (reservasExistentes.rows.length > 0) {
      console.error("Habitación no disponible para las fechas seleccionadas")
      return res.status(400).json({
        success: false,
        message:
          "La habitación seleccionada no está disponible para las fechas indicadas. Por favor, seleccione otras fechas o tipo de habitación.",
      })
    }

    // Crear la reserva con estado "pendiente_pago"
    console.log("Creando reserva con usuario_id:", userId, "habitacion_id:", habitacion_id)
    const reservaResult = await pool.query(
      "INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [userId, habitacion_id, fecha_inicio, fecha_fin, "pendiente_pago"],
    )

    const reservaId = reservaResult.rows[0].id
    console.log("Reserva creada con ID:", reservaId)

    // Calcular el precio total
    const precioTotal = calcularPrecioReserva(habitacion_id, fecha_inicio, fecha_fin)

    // Crear preferencia de MercadoPago
    const preference = new Preference(client)

    const tiposHabitacion = {
      1: "Habitación Individual",
      2: "Habitación Doble",
      3: "Suite Ejecutiva",
    }

    const preferenceData = {
      items: [
        {
          title: `Reserva ${tiposHabitacion[habitacion_id]} - Hotelituss`,
          description: `Reserva del ${fecha_inicio} al ${fecha_fin}`,
          quantity: 1,
          currency_id: "USD",
          unit_price: precioTotal,
        },
      ],
      payer: {
        name: nombre,
        email: correo,
      },
      back_urls: {
        success: `https://hotelituss1.vercel.app/?payment=success&reserva_id=${reservaId}`,
        failure: `https://hotelituss1.vercel.app/?payment=failure&reserva_id=${reservaId}`,
        pending: `https://hotelituss1.vercel.app/?payment=pending&reserva_id=${reservaId}`,
      },
      auto_return: "approved",
      external_reference: reservaId.toString(),
      notification_url: `https://hotelitus.onrender.com/webhook-mercadopago`,
    }

    const result = await preference.create({ body: preferenceData })

    // Guardar el preference_id en la reserva
    await pool.query("UPDATE reservas SET preference_id = $1 WHERE id = $2", [result.id, reservaId])

    res.status(200).json({
      success: true,
      message: "Reserva creada con éxito",
      reserva_id: reservaId,
      payment_url: result.init_point, // URL para redirigir al usuario a MercadoPago
      preference_id: result.id,
    })
  } catch (error) {
    console.error("Error detallado al crear reserva:", error)
    res.status(500).json({
      success: false,
      message: "Error al procesar la reserva",
      error: error.message,
    })
  }
})

// Webhook para recibir notificaciones de MercadoPago
app.post("/webhook-mercadopago", async (req, res) => {
  try {
    const { type, data } = req.body

    if (type === "payment") {
      const paymentId = data.id

      // Aquí deberías verificar el pago con la API de MercadoPago
      // Por simplicidad, asumimos que el pago fue exitoso
      console.log("Pago recibido:", paymentId)

      // Actualizar el estado de la reserva basado en el external_reference
      // En un caso real, deberías hacer una consulta a la API de MercadoPago para verificar el estado
    }

    res.status(200).send("OK")
  } catch (error) {
    console.error("Error en webhook:", error)
    res.status(500).send("Error")
  }
})

// Endpoint para manejar el retorno de MercadoPago
app.post("/payment-result", async (req, res) => {
  try {
    const { payment_status, reserva_id } = req.body

    let nuevoEstado
    if (payment_status === "success" || payment_status === "approved") {
      nuevoEstado = "confirmada"
    } else if (payment_status === "failure" || payment_status === "rejected") {
      nuevoEstado = "cancelada"
    } else {
      nuevoEstado = "pendiente"
    }

    // Actualizar el estado de la reserva
    await pool.query("UPDATE reservas SET estado = $1 WHERE id = $2", [nuevoEstado, reserva_id])

    res.json({ success: true, estado: nuevoEstado })
  } catch (error) {
    console.error("Error al actualizar estado de reserva:", error)
    res.status(500).json({ success: false, message: "Error al actualizar reserva" })
  }
})

// Ruta para obtener las reservas de un usuario
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

// Ruta para cancelar una reserva
app.post("/cancel-reservation", async (req, res) => {
  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ success: false, message: "ID de reserva no proporcionado" })
    }

    // Obtener información de la reserva
    const reservaResult = await pool.query("SELECT habitacion_id FROM reservas WHERE id = $1", [id])

    if (reservaResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Reserva no encontrada" })
    }

    const habitacionId = reservaResult.rows[0].habitacion_id

    // Actualizar estado de la reserva
    await pool.query("UPDATE reservas SET estado = 'cancelada' WHERE id = $1", [id])

    res.status(200).json({
      success: true,
      message: "Reserva cancelada con éxito",
    })
  } catch (error) {
    console.error("Error al cancelar reserva:", error)
    res.status(500).json({ success: false, message: "Error al cancelar la reserva" })
  }
})

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

// Inicializar habitaciones si no existen
app.get("/init-habitaciones", async (req, res) => {
  try {
    // Verificar si ya existen habitaciones
    const checkResult = await pool.query("SELECT COUNT(*) FROM habitaciones")

    if (Number.parseInt(checkResult.rows[0].count) > 0) {
      return res.status(200).json({ message: "Las habitaciones ya están inicializadas" })
    }

    // Crear habitaciones iniciales
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

// Ruta para verificar el estado del servidor
app.get("/status", (req, res) => {
  res.status(200).json({ status: "ok", message: "Servidor funcionando correctamente" })
})

pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

app.listen(3000)
console.log("server on port ", 3000)
