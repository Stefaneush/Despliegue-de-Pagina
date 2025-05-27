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

  const transporter = nodemailer.createTransporter({
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

// Lista de administradores predefinidos (sin cambiar la base de datos)
const ADMINISTRADORES = [
  'admin@hotelituss.com',
  'gerente@hotelituss.com',
  'administrador@hotelituss.com'
]

// Función para verificar si un usuario es administrador
function esAdministrador(correo) {
  return ADMINISTRADORES.includes(correo.toLowerCase())
}

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

    // Verificar si es un administrador con credenciales especiales
    if (esAdministrador(email)) {
      // Credenciales especiales para administradores
      if (password === 'admin123' || password === 'gerente2024') {
        console.log("Login de administrador exitoso")
        
        // Para solicitudes de formulario tradicionales
        if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
          const redirectUrl = "https://hotelituss1.vercel.app/?logged=true&admin=true"
          return res.redirect(redirectUrl)
        }

        // Para solicitudes JSON
        return res.status(200).json({
          success: true,
          message: "Login de administrador exitoso",
          user: {
            id: 999, // ID especial para admin
            nombre: "Administrador",
            correo: email,
            rol: 'administrador'
          },
          isAdmin: true
        })
      }
    }

    // Login normal para usuarios regulares
    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1 AND contrasena = $2", [email, password])

    console.log("Resultado de búsqueda:", result.rows.length > 0 ? "Usuario encontrado" : "Usuario no encontrado")

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Credenciales incorrectas" })
    }

    const usuario = result.rows[0]

    // Para solicitudes de formulario tradicionales
    if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
      const redirectUrl = "https://hotelituss1.vercel.app/?logged=true"
      return res.redirect(redirectUrl)
    }

    // Para solicitudes JSON
    return res.status(200).json({
      success: true,
      message: "Login exitoso",
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: 'usuario'
      },
      isAdmin: false
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ message: "Error del servidor" })
  }
})

// Middleware para verificar si el usuario es administrador (sin base de datos)
const verificarAdmin = async (req, res, next) => {
  try {
    const { correo } = req.body

    if (!correo) {
      return res.status(400).json({ success: false, message: "Correo no proporcionado" })
    }

    if (!esAdministrador(correo)) {
      return res.status(403).json({ success: false, message: "Acceso denegado. Se requieren permisos de administrador." })
    }

    next()
  } catch (error) {
    console.error("Error al verificar permisos de admin:", error)
    res.status(500).json({ success: false, message: "Error del servidor" })
  }
}

// Endpoints de administración

// Obtener todas las reservas (solo administradores)
app.post("/admin/reservas", verificarAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id,
        r.fecha_inicio,
        r.fecha_fin,
        r.estado,
        r.huespedes,
        r.solicitudes_especiales,
        r.fecha_reserva,
        u.nombre as usuario_nombre,
        u.correo as usuario_correo,
        u.telefono as usuario_telefono,
        h.tipo as habitacion_tipo,
        h.numero as habitacion_numero,
        h.precio_por_noche
      FROM reservas r
      JOIN usuarios u ON r.usuario_id = u.id
      JOIN habitaciones h ON r.habitacion_id = h.id
      ORDER BY r.fecha_reserva DESC
    `

    const result = await pool.query(query)

    res.status(200).json({
      success: true,
      reservas: result.rows
    })
  } catch (error) {
    console.error("Error al obtener reservas:", error)
    res.status(500).json({ success: false, message: "Error al obtener las reservas" })
  }
})

// Obtener todos los huéspedes/usuarios (solo administradores)
app.post("/admin/huespedes", verificarAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.correo,
        u.telefono,
        u.fecha_registro,
        COUNT(r.id) as total_reservas,
        MAX(r.fecha_reserva) as ultima_reserva,
        CASE 
          WHEN COUNT(r.id) > 0 THEN 'Activo'
          ELSE 'Nuevo'
        END as estado
      FROM usuarios u
      LEFT JOIN reservas r ON u.id = r.usuario_id
      GROUP BY u.id, u.nombre, u.correo, u.telefono, u.fecha_registro
      ORDER BY u.fecha_registro DESC
    `

    const result = await pool.query(query)

    res.status(200).json({
      success: true,
      huespedes: result.rows
    })
  } catch (error) {
    console.error("Error al obtener huéspedes:", error)
    res.status(500).json({ success: false, message: "Error al obtener los huéspedes" })
  }
})

// Obtener estadísticas del dashboard (solo administradores)
app.post("/admin/estadisticas", verificarAdmin, async (req, res) => {
  try {
    // Total de usuarios
    const totalUsuarios = await pool.query("SELECT COUNT(*) FROM usuarios")
    
    // Total de reservas
    const totalReservas = await pool.query("SELECT COUNT(*) FROM reservas")
    
    // Reservas activas (confirmadas y pendientes)
    const reservasActivas = await pool.query("SELECT COUNT(*) FROM reservas WHERE estado IN ('confirmada', 'pendiente', 'pendiente_pago')")
    
    // Ingresos del mes actual
    const ingresosMes = await pool.query(`
      SELECT COALESCE(SUM(h.precio_por_noche * (r.fecha_fin - r.fecha_inicio)), 0) as ingresos
      FROM reservas r
      JOIN habitaciones h ON r.habitacion_id = h.id
      WHERE EXTRACT(MONTH FROM r.fecha_reserva) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM r.fecha_reserva) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND r.estado = 'confirmada'
    `)

    res.status(200).json({
      success: true,
      estadisticas: {
        totalUsuarios: parseInt(totalUsuarios.rows[0].count),
        totalReservas: parseInt(totalReservas.rows[0].count),
        reservasActivas: parseInt(reservasActivas.rows[0].count),
        ingresosMes: parseFloat(ingresosMes.rows[0].ingresos) || 0
      }
    })
  } catch (error) {
    console.error("Error al obtener estadísticas:", error)
    res.status(500).json({ success: false, message: "Error al obtener las estadísticas" })
  }
})

// Actualizar estado de reserva (solo administradores)
app.post("/admin/actualizar-reserva", verificarAdmin, async (req, res) => {
  try {
    const { reserva_id, nuevo_estado } = req.body

    if (!reserva_id || !nuevo_estado) {
      return res.status(400).json({ success: false, message: "Faltan datos requeridos" })
    }

    await pool.query("UPDATE reservas SET estado = $1 WHERE id = $2", [nuevo_estado, reserva_id])

    res.status(200).json({
      success: true,
      message: "Estado de reserva actualizado correctamente"
    })
  } catch (error) {
    console.error("Error al actualizar reserva:", error)
    res.status(500).json({ success: false, message: "Error al actualizar la reserva" })
  }
})

// Ruta para realizar reservas - CORREGIDA
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

    console.log("Datos de reserva recibidos:", req.body);
    
    let userId = usuario_id;

    // Si no se proporciona usuario_id pero sí correo, buscar el usuario por correo
    if (!userId && correo) {
      console.log("Buscando usuario por correo:", correo);
      const userResult = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo]);

      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
        console.log("Usuario encontrado por correo, ID:", userId);
      } else {
        console.log("Usuario no encontrado, creando nuevo usuario con correo:", correo);
        // Si el usuario no existe, crearlo
        const newUserResult = await pool.query(
          "INSERT INTO usuarios (nombre, correo, contrasena) VALUES ($1, $2, $3) RETURNING id",
          [nombre || "Usuario", correo, "password_temporal"]
        );
        userId = newUserResult.rows[0].id;
        console.log("Nuevo usuario creado, ID:", userId);
      }
    }

    if (!userId) {
      console.error("No se pudo identificar al usuario");
      return res.status(400).json({ success: false, message: "No se pudo identificar al usuario" });
    }

    // Verificar disponibilidad de la habitación para las fechas solicitadas
    console.log("Verificando disponibilidad de habitación ID:", habitacion_id, "para fechas:", fecha_inicio, "a", fecha_fin);
    
    // Primero verificamos que la habitación exista
    const habitacionResult = await pool.query("SELECT * FROM habitaciones WHERE id = $1", [habitacion_id]);

    if (habitacionResult.rows.length === 0) {
      console.error("Habitación no encontrada");
      return res.status(400).json({ success: false, message: "La habitación seleccionada no existe" });
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
      [habitacion_id, fecha_inicio, fecha_fin]
    );

    if (reservasExistentes.rows.length > 0) {
      console.error("Habitación no disponible para las fechas seleccionadas");
      return res.status(400).json({ 
        success: false, 
        message: "La habitación seleccionada no está disponible para las fechas indicadas. Por favor, seleccione otras fechas o tipo de habitación." 
      });
    }

    // Crear la reserva
    console.log("Creando reserva con usuario_id:", userId, "habitacion_id:", habitacion_id);
    const reservaResult = await pool.query(
      "INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado, huespedes, solicitudes_especiales) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [userId, habitacion_id, fecha_inicio, fecha_fin, estado || "pendiente", huespedes, solicitudes_especiales]
    );

    const reservaId = reservaResult.rows[0].id;
    console.log("Reserva creada con ID:", reservaId);

    res.status(200).json({
      success: true,
      message: "Reserva creada con éxito",
      reserva_id: reservaId,
    });
  } catch (error) {
    console.error("Error detallado al crear reserva:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error al procesar la reserva", 
      error: error.message 
    });
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

    // Verificar si es administrador
    if (esAdministrador(correo)) {
      return res.status(200).json({
        success: true,
        user: {
          id: 999,
          nombre: "Administrador",
          correo: correo,
          telefono: "N/A",
          rol: "administrador"
        },
      })
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