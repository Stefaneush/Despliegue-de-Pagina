const express = require("express")
const cors = require("cors")
const { Pool } = require("pg")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")

const app = express()
const port = 3000

// Configuración de la base de datos PostgreSQL
const pool = new Pool({
  user: "tu_usuario",
  host: "localhost",
  database: "hotelituss",
  password: "tu_contraseña",
  port: 5432,
})

// Middleware
app.use(cors())
app.use(express.json())

// Clave secreta para JWT
const JWT_SECRET = "tu_clave_secreta_muy_segura"

// Lista de administradores predefinidos (emails)
const adminEmails = ["admin@hotelituss.com", "gerente@hotelituss.com", "superadmin@hotelituss.com"]

// Función para verificar si un usuario es administrador
function isAdmin(email) {
  return adminEmails.includes(email.toLowerCase())
}

// Middleware para verificar autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Token de acceso requerido" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Token inválido" })
    }
    req.user = user
    next()
  })
}

// Middleware para verificar si es administrador
const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user.correo)) {
    return res.status(403).json({ error: "Acceso denegado. Se requieren permisos de administrador." })
  }
  next()
}

// Inicializar datos de prueba
async function initializeData() {
  try {
    // Crear administradores si no existen
    for (const email of adminEmails) {
      const existingAdmin = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [email])

      if (existingAdmin.rows.length === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 10)
        await pool.query("INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4)", [
          `Administrador ${email.split("@")[0]}`,
          email,
          "+54 261 423 7890",
          hashedPassword,
        ])
        console.log(`Administrador creado: ${email}`)
      }
    }

    // Crear habitaciones de ejemplo si no existen
    const habitacionesExistentes = await pool.query("SELECT COUNT(*) FROM habitaciones")
    if (Number.parseInt(habitacionesExistentes.rows[0].count) === 0) {
      const habitacionesEjemplo = [
        { tipo: "individual", numero: 101, precio: 120.0, disponible: true },
        { tipo: "individual", numero: 102, precio: 120.0, disponible: true },
        { tipo: "doble", numero: 201, precio: 180.0, disponible: true },
        { tipo: "doble", numero: 202, precio: 180.0, disponible: true },
        { tipo: "suite", numero: 301, precio: 280.0, disponible: true },
        { tipo: "suite", numero: 302, precio: 280.0, disponible: true },
      ]

      for (const habitacion of habitacionesEjemplo) {
        await pool.query(
          "INSERT INTO habitaciones (tipo, numero, precio_por_noche, disponible) VALUES ($1, $2, $3, $4)",
          [habitacion.tipo, habitacion.numero, habitacion.precio, habitacion.disponible],
        )
      }
      console.log("Habitaciones de ejemplo creadas")
    }
  } catch (error) {
    console.error("Error inicializando datos:", error)
  }
}

// Rutas de autenticación

// Registro de usuario
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, telefono, contrasena } = req.body

    // Verificar si el usuario ya existe
    const existingUser = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "El usuario ya existe" })
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10)

    // Crear usuario
    const result = await pool.query(
      "INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4) RETURNING id, nombre, correo, telefono",
      [nombre, correo, telefono, hashedPassword],
    )

    const user = result.rows[0]
    const token = jwt.sign({ id: user.id, correo: user.correo }, JWT_SECRET, { expiresIn: "24h" })

    res.status(201).json({
      message: "Usuario creado exitosamente",
      user: user,
      token: token,
      isAdmin: isAdmin(correo),
    })
  } catch (error) {
    console.error("Error en registro:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Login de usuario
app.post("/api/login", async (req, res) => {
  try {
    const { correo, contrasena } = req.body

    // Buscar usuario
    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo])
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }

    const user = result.rows[0]

    // Verificar contraseña
    const validPassword = await bcrypt.compare(contrasena, user.contrasena)
    if (!validPassword) {
      return res.status(401).json({ error: "Credenciales inválidas" })
    }

    // Generar token
    const token = jwt.sign({ id: user.id, correo: user.correo }, JWT_SECRET, { expiresIn: "24h" })

    res.json({
      message: "Login exitoso",
      user: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        telefono: user.telefono,
      },
      token: token,
      isAdmin: isAdmin(correo),
    })
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Rutas de habitaciones

// Obtener habitaciones disponibles
app.get("/api/habitaciones", async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tipo } = req.query

    let query = `
            SELECT h.* FROM habitaciones h 
            WHERE h.disponible = true
        `
    const params = []

    // Filtrar por disponibilidad en fechas específicas
    if (fecha_inicio && fecha_fin) {
      query += ` AND h.id NOT IN (
                SELECT r.habitacion_id FROM reservas r 
                WHERE r.estado IN ('confirmada', 'pendiente') 
                AND (r.fecha_inicio <= $${params.length + 2} AND r.fecha_fin >= $${params.length + 1})
            )`
      params.push(fecha_inicio, fecha_fin)
    }

    // Filtrar por tipo
    if (tipo) {
      query += ` AND h.tipo = $${params.length + 1}`
      params.push(tipo)
    }

    query += " ORDER BY h.numero"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo habitaciones:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Rutas de reservas

// Crear reserva
app.post("/api/reservas", authenticateToken, async (req, res) => {
  try {
    const { habitacion_id, fecha_inicio, fecha_fin, huespedes, solicitudes_especiales } = req.body
    const usuario_id = req.user.id

    // Verificar disponibilidad de la habitación
    const habitacionDisponible = await pool.query(
      `
            SELECT h.* FROM habitaciones h 
            WHERE h.id = $1 AND h.disponible = true
            AND h.id NOT IN (
                SELECT r.habitacion_id FROM reservas r 
                WHERE r.estado IN ('confirmada', 'pendiente') 
                AND (r.fecha_inicio <= $3 AND r.fecha_fin >= $2)
            )
        `,
      [habitacion_id, fecha_inicio, fecha_fin],
    )

    if (habitacionDisponible.rows.length === 0) {
      return res.status(400).json({ error: "La habitación no está disponible en las fechas seleccionadas" })
    }

    // Crear reserva
    const result = await pool.query(
      "INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [usuario_id, habitacion_id, fecha_inicio, fecha_fin, "pendiente"],
    )

    const reserva = result.rows[0]

    // Calcular monto total
    const habitacion = habitacionDisponible.rows[0]
    const fechaInicio = new Date(fecha_inicio)
    const fechaFin = new Date(fecha_fin)
    const noches = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24))
    const montoTotal = habitacion.precio_por_noche * noches

    // Crear registro de pago pendiente
    await pool.query("INSERT INTO pagos (reserva_id, monto, fecha_pago) VALUES ($1, $2, $3)", [
      reserva.id,
      montoTotal,
      new Date(),
    ])

    res.status(201).json({
      message: "Reserva creada exitosamente",
      reserva: reserva,
      monto_total: montoTotal,
      noches: noches,
    })
  } catch (error) {
    console.error("Error creando reserva:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener reservas del usuario
app.get("/api/mis-reservas", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT 
                r.*,
                h.tipo as habitacion_tipo,
                h.numero as habitacion_numero,
                h.precio_por_noche,
                p.monto as monto_total
            FROM reservas r
            JOIN habitaciones h ON r.habitacion_id = h.id
            LEFT JOIN pagos p ON r.id = p.reserva_id
            WHERE r.usuario_id = $1
            ORDER BY r.fecha_inicio DESC
        `,
      [req.user.id],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo reservas del usuario:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Rutas de administración

// Dashboard - Estadísticas generales
app.get("/api/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total de usuarios
    const totalUsuarios = await pool.query("SELECT COUNT(*) FROM usuarios")

    // Total de reservas
    const totalReservas = await pool.query("SELECT COUNT(*) FROM reservas")

    // Reservas activas (confirmadas y en fechas futuras)
    const reservasActivas = await pool.query(`
            SELECT COUNT(*) FROM reservas 
            WHERE estado = 'confirmada' AND fecha_fin >= CURRENT_DATE
        `)

    // Ingresos del mes actual
    const ingresosMes = await pool.query(`
            SELECT COALESCE(SUM(p.monto), 0) as total
            FROM pagos p
            JOIN reservas r ON p.reserva_id = r.id
            WHERE EXTRACT(MONTH FROM p.fecha_pago) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM p.fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND r.estado = 'confirmada'
        `)

    res.json({
      totalUsuarios: Number.parseInt(totalUsuarios.rows[0].count),
      totalReservas: Number.parseInt(totalReservas.rows[0].count),
      reservasActivas: Number.parseInt(reservasActivas.rows[0].count),
      ingresosMes: Number.parseFloat(ingresosMes.rows[0].total),
    })
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener todas las reservas (admin)
app.get("/api/admin/reservas", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT 
                r.*,
                u.nombre as usuario_nombre,
                u.correo as usuario_correo,
                u.telefono as usuario_telefono,
                h.tipo as habitacion_tipo,
                h.numero as habitacion_numero,
                h.precio_por_noche,
                p.monto as monto_total
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN habitaciones h ON r.habitacion_id = h.id
            LEFT JOIN pagos p ON r.id = p.reserva_id
            ORDER BY r.fecha_inicio DESC
        `)

    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo reservas:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Actualizar estado de reserva (admin)
app.put("/api/admin/reservas/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { estado } = req.body

    const result = await pool.query("UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING *", [estado, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" })
    }

    res.json({
      message: "Estado de reserva actualizado",
      reserva: result.rows[0],
    })
  } catch (error) {
    console.error("Error actualizando reserva:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener todos los usuarios (admin)
app.get("/api/admin/usuarios", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `
            SELECT 
                u.*,
                COUNT(r.id) as total_reservas,
                MAX(r.fecha_inicio) as ultima_reserva,
                CASE 
                    WHEN COUNT(r.id) > 0 THEN 'activo'
                    ELSE 'inactivo'
                END as estado
            FROM usuarios u
            LEFT JOIN reservas r ON u.id = r.usuario_id
            WHERE u.correo NOT IN (${adminEmails.map((_, i) => `$${i + 1}`).join(", ")})
            GROUP BY u.id, u.nombre, u.correo, u.telefono, u.contrasena
            ORDER BY u.nombre
        `,
      adminEmails,
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Obtener habitaciones (admin)
app.get("/api/admin/habitaciones", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM habitaciones ORDER BY numero")
    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo habitaciones:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Actualizar habitación (admin)
app.put("/api/admin/habitaciones/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { tipo, numero, precio_por_noche, disponible } = req.body

    const result = await pool.query(
      "UPDATE habitaciones SET tipo = $1, numero = $2, precio_por_noche = $3, disponible = $4 WHERE id = $5 RETURNING *",
      [tipo, numero, precio_por_noche, disponible, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Habitación no encontrada" })
    }

    res.json({
      message: "Habitación actualizada",
      habitacion: result.rows[0],
    })
  } catch (error) {
    console.error("Error actualizando habitación:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({ message: "API funcionando correctamente" })
})

// Inicializar datos y arrancar servidor
initializeData().then(() => {
  app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`)
    console.log("Credenciales de administrador:")
    adminEmails.forEach((email) => {
      console.log(`- Email: ${email}, Contraseña: admin123`)
    })
  })
})
