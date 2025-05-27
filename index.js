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

// Access Token de prueba directamente en el código
const MERCADOPAGO_ACCESS_TOKEN = "APP_USR-4042032952455773-052221-e12625a5c331428f07fc27d2e0a5cb66-2452456537"

console.log("✅ MercadoPago configurado correctamente con Access Token de prueba")

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const usuariosPendientes = {}

// Lista de administradores predefinidos (no necesitan estar en la BD)
const ADMIN_ACCOUNTS = {
  "admin@hotelituss.com": {
    password: "admin123",
    nombre: "Administrador Principal"
  },
  "gerente@hotelituss.com": {
    password: "gerente123", 
    nombre: "Gerente General"
  },
  "administrador@hotelituss.com": {
    password: "admin456",
    nombre: "Administrador del Sistema"
  }
}

// Lista de emails de administradores
const ADMIN_EMAILS = Object.keys(ADMIN_ACCOUNTS)

// Configurar MercadoPago
const client = new MercadoPagoConfig({
  accessToken: MERCADOPAGO_ACCESS_TOKEN,
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

// Configurar transporter de nodemailer con mejor configuración
function createEmailTransporter() {
  return nodemailer.createTransporter({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
      user: "infohotelituss@gmail.com",
      pass: "pgfn jkao huuk czog", // App Password de Gmail
    },
    tls: {
      rejectUnauthorized: false
    }
  })
}

//Crear usuario - MEJORADO CON MEJOR MANEJO DE ERRORES
app.post("/create", async (req, res) => {
  try {
    const { nombre, correo, telefono, password } = req.body

    console.log("📧 Solicitud de creación de usuario:", { nombre, correo, telefono })

    // Validar datos de entrada
    if (!nombre || !correo || !telefono || !password) {
      console.log("❌ Faltan datos requeridos")
      return res.status(400).json({ 
        success: false, 
        message: "Todos los campos son requeridos" 
      })
    }

    // Verificar si es un email de administrador
    if (ADMIN_EMAILS.includes(correo.toLowerCase())) {
      console.log("❌ Intento de registro con email de administrador:", correo)
      return res.status(400).json({ 
        success: false, 
        message: "Este email está reservado para administradores. Use las credenciales de administrador para iniciar sesión directamente." 
      })
    }

    // Verificar si el usuario ya existe
    const existingUser = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo])
    if (existingUser.rows.length > 0) {
      console.log("❌ Usuario ya existe:", correo)
      return res.status(400).json({ 
        success: false, 
        message: "Ya existe una cuenta con este correo electrónico" 
      })
    }

    // Generar código de verificación
    const codigo = crypto.randomInt(100000, 999999).toString()
    console.log("🔢 Código generado:", codigo, "para", correo)

    // Guardar datos temporalmente
    usuariosPendientes[correo] = { 
      codigo, 
      nombre, 
      telefono, 
      password,
      timestamp: Date.now() // Para limpiar códigos expirados
    }

    console.log("💾 Usuario guardado temporalmente:", correo)

    // Crear transporter
    const transporter = createEmailTransporter()

    // Verificar conexión antes de enviar
    try {
      await transporter.verify()
      console.log("✅ Conexión SMTP verificada correctamente")
    } catch (verifyError) {
      console.error("❌ Error al verificar conexión SMTP:", verifyError)
      return res.status(500).json({ 
        success: false, 
        message: "Error en el servicio de email. Inténtelo más tarde." 
      })
    }

    // Configurar email
    const mailOptions = {
      from: {
        name: "Hotelituss",
        address: "infohotelituss@gmail.com"
      },
      to: correo,
      subject: "Código de verificación - Hotelituss",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #c8a97e, #8b7355); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .code { background: #fff; border: 2px dashed #c8a97e; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .code h2 { color: #c8a97e; font-size: 32px; margin: 0; letter-spacing: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏨 Hotelituss</h1>
              <p>Verificación de cuenta</p>
            </div>
            <div class="content">
              <h2>¡Hola ${nombre}! 👋</h2>
              <p>Gracias por registrarte en Hotelituss. Para completar tu registro, necesitamos verificar tu correo electrónico.</p>
              
              <div class="code">
                <p><strong>Tu código de verificación es:</strong></p>
                <h2>${codigo}</h2>
              </div>
              
              <p>Ingresa este código en el sitio web para completar tu registro.</p>
              <p><strong>Importante:</strong> Este código expira en 10 minutos por seguridad.</p>
              
              <p>Si no solicitaste este registro, puedes ignorar este email.</p>
              
              <p>¡Esperamos verte pronto en Hotelituss!</p>
            </div>
            <div class="footer">
              <p>© 2023 Hotelituss - Experiencia de lujo en Mendoza, Argentina</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hola ${nombre},
        
        Tu código de verificación para Hotelituss es: ${codigo}
        
        Ingresa este código en el sitio para completar tu registro.
        Este código expira en 10 minutos.
        
        ¡Gracias por elegir Hotelituss!
      `
    }

    console.log("📤 Enviando email a:", correo)

    // Enviar email
    const info = await transporter.sendMail(mailOptions)
    console.log("✅ Email enviado exitosamente:", info.messageId)

    // Programar limpieza del código después de 10 minutos
    setTimeout(() => {
      if (usuariosPendientes[correo] && usuariosPendientes[correo].codigo === codigo) {
        delete usuariosPendientes[correo]
        console.log("🧹 Código expirado y eliminado para:", correo)
      }
    }, 10 * 60 * 1000) // 10 minutos

    // Responder al frontend
    res.json({ 
      success: true,
      message: "Código de verificación enviado correctamente"
    })

  } catch (error) {
    console.error("💥 Error completo al crear usuario:", error)
    
    // Limpiar datos temporales en caso de error
    if (req.body.correo && usuariosPendientes[req.body.correo]) {
      delete usuariosPendientes[req.body.correo]
    }

    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor. Por favor, inténtelo de nuevo." 
    })
  }
})

//Verificar codigo - MEJORADO
app.post("/verify-code", async (req, res) => {
  try {
    const { correo, codigo } = req.body

    console.log("🔍 Verificando código para:", correo, "Código:", codigo)

    if (!correo || !codigo) {
      return res.status(400).json({ 
        success: false, 
        message: "Correo y código son requeridos" 
      })
    }

    const usuarioPendiente = usuariosPendientes[correo]

    if (!usuarioPendiente) {
      console.log("❌ Usuario no encontrado en pendientes:", correo)
      return res.status(400).json({ 
        success: false, 
        message: "Código expirado o no válido. Solicite un nuevo código." 
      })
    }

    if (usuarioPendiente.codigo !== codigo) {
      console.log("❌ Código incorrecto. Esperado:", usuarioPendiente.codigo, "Recibido:", codigo)
      return res.status(401).json({ 
        success: false, 
        message: "Código incorrecto. Verifique e inténtelo de nuevo." 
      })
    }

    console.log("✅ Código correcto, creando usuario en BD")

    // Código correcto, insertamos en la DB
    const { nombre, telefono, password } = usuarioPendiente

    const result = await pool.query(
      "INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4) RETURNING id",
      [nombre, correo, telefono, password]
    )

    console.log("✅ Usuario creado en BD con ID:", result.rows[0].id)

    // Eliminamos de la lista temporal
    delete usuariosPendientes[correo]

    res.json({ 
      success: true,
      message: "Usuario creado exitosamente"
    })

  } catch (error) {
    console.error("💥 Error al verificar código:", error)
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    })
  }
})

// Endpoint para reenviar código
app.post("/resend-code", async (req, res) => {
  try {
    const { correo } = req.body

    console.log("🔄 Solicitud de reenvío de código para:", correo)

    if (!correo) {
      return res.status(400).json({ 
        success: false, 
        message: "Correo es requerido" 
      })
    }

    const usuarioPendiente = usuariosPendientes[correo]

    if (!usuarioPendiente) {
      return res.status(400).json({ 
        success: false, 
        message: "No hay solicitud de registro pendiente para este correo" 
      })
    }

    // Generar nuevo código
    const nuevoCodigo = crypto.randomInt(100000, 999999).toString()
    usuarioPendientes[correo].codigo = nuevoCodigo
    usuarioPendientes[correo].timestamp = Date.now()

    console.log("🔢 Nuevo código generado:", nuevoCodigo)

    // Enviar nuevo código
    const transporter = createEmailTransporter()
    
    const mailOptions = {
      from: {
        name: "Hotelituss",
        address: "infohotelituss@gmail.com"
      },
      to: correo,
      subject: "Nuevo código de verificación - Hotelituss",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #c8a97e;">🏨 Hotelituss</h2>
          <h3>Nuevo código de verificación</h3>
          <p>Hola ${usuarioPendiente.nombre},</p>
          <p>Has solicitado un nuevo código de verificación:</p>
          <div style="background: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h2 style="color: #c8a97e; font-size: 32px; margin: 0; letter-spacing: 5px;">${nuevoCodigo}</h2>
          </div>
          <p>Este código expira en 10 minutos.</p>
          <p>¡Gracias por elegir Hotelituss!</p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
    console.log("✅ Nuevo código enviado exitosamente")

    // Programar limpieza
    setTimeout(() => {
      if (usuariosPendientes[correo] && usuariosPendientes[correo].codigo === nuevoCodigo) {
        delete usuariosPendientes[correo]
        console.log("🧹 Nuevo código expirado y eliminado para:", correo)
      }
    }, 10 * 60 * 1000)

    res.json({ 
      success: true,
      message: "Nuevo código enviado correctamente"
    })

  } catch (error) {
    console.error("💥 Error al reenviar código:", error)
    res.status(500).json({ 
      success: false, 
      message: "Error al reenviar código" 
    })
  }
})

//iniciar sesion - MODIFICADO PARA SOPORTAR ADMINISTRADORES PREDEFINIDOS
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

    // Verificar si es un administrador predefinido
    const adminAccount = ADMIN_ACCOUNTS[email.toLowerCase()]
    if (adminAccount) {
      if (adminAccount.password === password) {
        console.log("Login de administrador exitoso")
        
        // Para solicitudes de formulario tradicionales
        if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
          return res.redirect("https://hotelituss1.vercel.app/?logged=true&admin=true")
        }

        // Para solicitudes JSON
        return res.status(200).json({
          success: true,
          message: "Login de administrador exitoso",
          user: {
            id: 0, // ID especial para administradores
            nombre: adminAccount.nombre,
            correo: email,
            isAdmin: true
          },
        })
      } else {
        console.log("Contraseña de administrador incorrecta")
        return res.status(401).json({ message: "Credenciales de administrador incorrectas" })
      }
    }

    // Si no es administrador, buscar en la base de datos de usuarios normales
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
        isAdmin: false
      },
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ message: "Error del servidor" })
  }
})

// Función para calcular el precio total de la reserva usando precios de la base de datos
async function calcularPrecioReserva(habitacion_id, fecha_inicio, fecha_fin) {
  try {
    // Obtener el precio real de la base de datos
    const habitacionResult = await pool.query("SELECT precio_por_noche, tipo FROM habitaciones WHERE id = $1", [
      habitacion_id,
    ])

    if (habitacionResult.rows.length === 0) {
      console.error("Habitación no encontrada para cálculo de precio")
      return 0
    }

    const precioPorNoche = habitacionResult.rows[0].precio_por_noche
    const tipoHabitacion = habitacionResult.rows[0].tipo

    const fechaInicio = new Date(fecha_inicio)
    const fechaFin = new Date(fecha_fin)
    const noches = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24))

    const precioTotal = noches * precioPorNoche

    console.log(`Cálculo de precio:`)
    console.log(`- Habitación: ${tipoHabitacion} (ID: ${habitacion_id})`)
    console.log(`- Precio por noche: $${precioPorNoche} ARS`)
    console.log(`- Número de noches: ${noches}`)
    console.log(`- Precio total: $${precioTotal} ARS`)

    return precioTotal
  } catch (error) {
    console.error("Error al calcular precio:", error)
    return 0
  }
}

// Función para registrar el pago en la tabla pagos
async function registrarPago(reserva_id, monto) {
  try {
    const fechaActual = new Date().toISOString().split("T")[0] // Formato YYYY-MM-DD

    const result = await pool.query(
      "INSERT INTO pagos (reserva_id, monto, fecha_pago) VALUES ($1, $2, $3) RETURNING id",
      [reserva_id, monto, fechaActual],
    )

    console.log(`✅ Pago registrado en tabla pagos:`)
    console.log(`- ID Pago: ${result.rows[0].id}`)
    console.log(`- Reserva ID: ${reserva_id}`)
    console.log(`- Monto: $${monto} ARS`)
    console.log(`- Fecha: ${fechaActual}`)

    return result.rows[0].id
  } catch (error) {
    console.error("❌ Error al registrar pago:", error)
    throw error
  }
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

    // Calcular el precio total usando los precios reales de la base de datos
    const precioTotal = await calcularPrecioReserva(habitacion_id, fecha_inicio, fecha_fin)

    if (precioTotal === 0) {
      return res.status(400).json({ success: false, message: "Error al calcular el precio de la reserva" })
    }

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
          currency_id: "ARS", // PESOS ARGENTINOS
          unit_price: precioTotal,
        },
      ],
      payer: {
        name: nombre,
        email: correo,
      },
      back_urls: {
        success: `https://hotelituss-test.vercel.app//?payment=success&reserva_id=${reservaId}`,
        failure: `https://hotelituss-test.vercel.app//?payment=failure&reserva_id=${reservaId}`,
        pending: `https://hotelituss-test.vercel.app//?payment=pending&reserva_id=${reservaId}`,
      },
      auto_return: "approved",
      external_reference: reservaId.toString(),
      notification_url: `https://hotelitus.onrender.com/webhook-mercadopago`,
      metadata: {
        reserva_id: reservaId,
        monto: precioTotal,
      },
    }

    console.log("Creando preferencia de MercadoPago con datos:", JSON.stringify(preferenceData, null, 2))

    const result = await preference.create({ body: preferenceData })

    console.log("Preferencia creada exitosamente:", result.id)

    // Guardar el preference_id en la reserva
    await pool.query("UPDATE reservas SET preference_id = $1 WHERE id = $2", [result.id, reservaId])

    res.status(200).json({
      success: true,
      message: "Reserva creada con éxito",
      reserva_id: reservaId,
      payment_url: result.init_point, // URL para redirigir al usuario a MercadoPago
      preference_id: result.id,
      precio_total: precioTotal,
      precio_formateado: `$${precioTotal} ARS`,
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
    console.log("Webhook recibido:", req.body)
    const { type, data } = req.body

    if (type === "payment") {
      const paymentId = data.id
      console.log("Notificación de pago recibida, ID:", paymentId)

      // Aquí deberías verificar el pago con la API de MercadoPago
      // Por simplicidad en pruebas, asumimos que el pago fue exitoso
      console.log("Procesando pago:", paymentId)
    }

    res.status(200).send("OK")
  } catch (error) {
    console.error("Error en webhook:", error)
    res.status(500).send("Error")
  }
})

// Endpoint para manejar el retorno de MercadoPago - ACTUALIZADO PARA REGISTRAR PAGOS
app.post("/payment-result", async (req, res) => {
  try {
    const { payment_status, reserva_id } = req.body

    console.log("Procesando resultado de pago:", { payment_status, reserva_id })

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

    console.log(`Reserva ${reserva_id} actualizada a estado: ${nuevoEstado}`)

    // Si el pago fue exitoso, registrarlo en la tabla pagos
    if (nuevoEstado === "confirmada") {
      try {
        // Obtener el monto de la reserva
        const reservaResult = await pool.query(
          `
          SELECT r.*, h.precio_por_noche 
          FROM reservas r 
          JOIN habitaciones h ON r.habitacion_id = h.id 
          WHERE r.id = $1
        `,
          [reserva_id],
        )

        if (reservaResult.rows.length > 0) {
          const reserva = reservaResult.rows[0]
          const monto = await calcularPrecioReserva(reserva.habitacion_id, reserva.fecha_inicio, reserva.fecha_fin)

          // Registrar el pago en la tabla pagos
          const pagoId = await registrarPago(reserva_id, monto)

          console.log(`✅ Pago confirmado y registrado con ID: ${pagoId}`)
        }
      } catch (error) {
        console.error("❌ Error al registrar pago, pero reserva confirmada:", error)
        // No fallar la respuesta aunque el registro del pago falle
      }
    }

    res.json({ success: true, estado: nuevoEstado })
  } catch (error) {
    console.error("Error al actualizar estado de reserva:", error)
    res.status(500).json({ success: false, message: "Error al actualizar reserva" })
  }
})

// Ruta para obtener las reservas de un usuario CON INFORMACIÓN DE PAGOS
app.post("/user-reservations", async (req, res) => {
  try {
    const { usuario_id, correo } = req.body

    let query
    let params

    if (usuario_id) {
      query = `
        SELECT r.*, h.tipo as habitacion_tipo, h.precio_por_noche,
               p.id as pago_id, p.monto as monto_pagado, p.fecha_pago
        FROM reservas r
        JOIN habitaciones h ON r.habitacion_id = h.id
        LEFT JOIN pagos p ON r.id = p.reserva_id
        WHERE r.usuario_id = $1
        ORDER BY r.fecha_inicio DESC
      `
      params = [usuario_id]
    } else if (correo) {
      query = `
        SELECT r.*, h.tipo as habitacion_tipo, h.precio_por_noche,
               p.id as pago_id, p.monto as monto_pagado, p.fecha_pago
        FROM reservas r
        JOIN habitaciones h ON r.habitacion_id = h.id
        JOIN usuarios u ON r.usuario_id = u.id
        LEFT JOIN pagos p ON r.id = p.reserva_id
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

// Nueva ruta para obtener todos los pagos
app.get("/pagos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, r.fecha_inicio, r.fecha_fin, h.tipo as habitacion_tipo, u.nombre as cliente_nombre
      FROM pagos p
      JOIN reservas r ON p.reserva_id = r.id
      JOIN habitaciones h ON r.habitacion_id = h.id
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY p.fecha_pago DESC
    `)

    res.status(200).json({
      success: true,
      pagos: result.rows,
    })
  } catch (error) {
    console.error("Error al obtener pagos:", error)
    res.status(500).json({ success: false, message: "Error al obtener los pagos" })
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

// ENDPOINTS PARA ADMINISTRACIÓN - MODIFICADOS PARA USAR ADMIN_EMAILS

// Endpoint para obtener todas las reservas (solo administradores)
app.post("/admin/reservas", async (req, res) => {
  try {
    const { admin_email } = req.body

    // Verificar si es administrador
    if (!ADMIN_EMAILS.includes(admin_email?.toLowerCase())) {
      return res.status(403).json({ success: false, message: "Acceso denegado" })
    }

    const result = await pool.query(`
      SELECT 
        r.id,
        r.fecha_inicio,
        r.fecha_fin,
        r.estado,
        u.nombre as cliente_nombre,
        u.correo as cliente_correo,
        u.telefono as cliente_telefono,
        h.tipo as habitacion_tipo,
        h.precio_por_noche,
        p.monto as monto_pagado,
        p.fecha_pago
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN habitaciones h ON r.habitacion_id = h.id
      LEFT JOIN pagos p ON r.id = p.reserva_id
      ORDER BY r.fecha_inicio DESC
    `)

    res.status(200).json({
      success: true,
      reservas: result.rows,
    })
  } catch (error) {
    console.error("Error al obtener reservas para admin:", error)
    res.status(500).json({ success: false, message: "Error al obtener las reservas" })
  }
})

// Endpoint para obtener todos los huéspedes (solo administradores)
app.post("/admin/huespedes", async (req, res) => {
  try {
    const { admin_email } = req.body

    // Verificar si es administrador
    if (!ADMIN_EMAILS.includes(admin_email?.toLowerCase())) {
      return res.status(403).json({ success: false, message: "Acceso denegado" })
    }

    const result = await pool.query(`
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.telefono,
        COUNT(r.id) as total_reservas,
        MAX(r.fecha_inicio) as ultima_reserva,
        CASE 
          WHEN COUNT(r.id) > 0 THEN 'Activo'
          ELSE 'Inactivo'
        END as estado
      FROM usuarios u
      LEFT JOIN reservas r ON u.id = r.usuario_id
      GROUP BY u.id, u.nombre, u.correo, u.telefono
      ORDER BY u.nombre ASC
    `)

    res.status(200).json({
      success: true,
      huespedes: result.rows,
    })
  } catch (error) {
    console.error("Error al obtener huéspedes para admin:", error)
    res.status(500).json({ success: false, message: "Error al obtener los huéspedes" })
  }
})

// Endpoint para obtener estadísticas del dashboard (solo administradores)
app.post("/admin/estadisticas", async (req, res) => {
  try {
    const { admin_email } = req.body

    // Verificar si es administrador
    if (!ADMIN_EMAILS.includes(admin_email?.toLowerCase())) {
      return res.status(403).json({ success: false, message: "Acceso denegado" })
    }

    // Obtener estadísticas
    const totalUsuarios = await pool.query("SELECT COUNT(*) as count FROM usuarios")
    const totalReservas = await pool.query("SELECT COUNT(*) as count FROM reservas")
    const reservasActivas = await pool.query("SELECT COUNT(*) as count FROM reservas WHERE estado = 'confirmada'")
    
    // Ingresos del mes actual
    const fechaActual = new Date()
    const primerDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1)
    const ultimoDiaMes = new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 0)
    
    const ingresosMes = await pool.query(`
      SELECT COALESCE(SUM(p.monto), 0) as total
      FROM pagos p
      WHERE p.fecha_pago >= $1 AND p.fecha_pago <= $2
    `, [primerDiaMes.toISOString().split('T')[0], ultimoDiaMes.toISOString().split('T')[0]])

    res.status(200).json({
      success: true,
      estadisticas: {
        totalUsuarios: parseInt(totalUsuarios.rows[0].count),
        totalReservas: parseInt(totalReservas.rows[0].count),
        reservasActivas: parseInt(reservasActivas.rows[0].count),
        ingresosMes: parseFloat(ingresosMes.rows[0].total)
      }
    })
  } catch (error) {
    console.error("Error al obtener estadísticas para admin:", error)
    res.status(500).json({ success: false, message: "Error al obtener las estadísticas" })
  }
})

// Inicializar habitaciones si no existen - NO NECESARIO YA QUE TIENES TUS DATOS
app.get("/init-habitaciones", async (req, res) => {
  try {
    // Verificar habitaciones existentes
    const checkResult = await pool.query("SELECT * FROM habitaciones ORDER BY id")

    res.status(200).json({
      success: true,
      message: "Habitaciones existentes en la base de datos",
      habitaciones: checkResult.rows,
    })
  } catch (error) {
    console.error("Error al consultar habitaciones:", error)
    res.status(500).json({ success: false, message: "Error al consultar habitaciones" })
  }
})

// Ruta para verificar el estado del servidor
app.get("/status", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Servidor funcionando correctamente",
    mercadopago: "configurado",
    currency: "ARS",
    precios_desde_db: true,
    tabla_pagos: "habilitada",
    admin_accounts: "configuradas",
    email_service: "configurado",
    timestamp: new Date().toISOString(),
  })
})

// Limpiar códigos expirados cada hora
setInterval(() => {
  const now = Date.now()
  const expiredEmails = []
  
  for (const [email, data] of Object.entries(usuariosPendientes)) {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutos
      expiredEmails.push(email)
    }
  }
  
  expiredEmails.forEach(email => {
    delete usuariosPendientes[email]
    console.log("🧹 Código expirado eliminado para:", email)
  })
}, 60 * 60 * 1000) // Cada hora

pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

app.listen(3000)
console.log("🚀 Servidor iniciado en puerto 3000")
console.log("💳 MercadoPago configurado con Access Token de prueba")
console.log("📧 Servicio de email configurado")
console.log("👨‍💼 Cuentas de administrador configuradas:")
Object.keys(ADMIN_ACCOUNTS).forEach(email => {
  console.log(`   - ${email}`)
})