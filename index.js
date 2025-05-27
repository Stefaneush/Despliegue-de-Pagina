import express from "express"
import cors from "cors"
import pkg from "pg"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const { Pool } = pkg
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
    return res.status(403).json({
      error: "Acceso denegado. Se requieren permisos de administrador.",
    })
  }
  next()
}

// Función para inicializar datos de prueba
async function initializeData() {
  try {
    console.log("Inicializando datos...")

    // Crear administradores si no existen
    for (const email of adminEmails) {
      const existingAdmin = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [email])

      if (existingAdmin.rows.length === 0) {
        const hashedPassword = await bcrypt.hash("admin123", 10)
        const adminName = `Administrador ${email.split("@")[0]}`

        await pool.query("INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4)", [
          adminName,
          email,
          "+54 261 423 7890",
          hashedPassword,
        ])
        console.log(`✅ Administrador creado: ${email}`)
      } else {
        console.log(`ℹ️  Administrador ya existe: ${email}`)
      }
    }

    // Crear habitaciones de ejemplo si no existen
    const habitacionesCount = await pool.query("SELECT COUNT(*) FROM habitaciones")

    if (Number.parseInt(habitacionesCount.rows[0].count) === 0) {
      const habitacionesEjemplo = [
        { tipo: "individual", numero: 101, precio: 120.0, disponible: true },
        { tipo: "individual", numero: 102, precio: 120.0, disponible: true },
        { tipo: "individual", numero: 103, precio: 120.0, disponible: true },
        { tipo: "doble", numero: 201, precio: 180.0, disponible: true },
        { tipo: "doble", numero: 202, precio: 180.0, disponible: true },
        { tipo: "doble", numero: 203, precio: 180.0, disponible: true },
        { tipo: "suite", numero: 301, precio: 280.0, disponible: true },
        { tipo: "suite", numero: 302, precio: 280.0, disponible: true },
      ]

      for (const habitacion of habitacionesEjemplo) {
        await pool.query(
          "INSERT INTO habitaciones (tipo, numero, precio_por_noche, disponible) VALUES ($1, $2, $3, $4)",
          [habitacion.tipo, habitacion.numero, habitacion.precio, habitacion.disponible],
        )
      }
      console.log("✅ Habitaciones de ejemplo creadas")
    } else {
      console.log("ℹ️  Habitaciones ya existen en la base de datos")
    }

    console.log("✅ Inicialización completada")
  } catch (error) {
    console.error("❌ Error inicializando datos:", error)
  }
}

// RUTAS DE AUTENTICACIÓN

// Registro de usuario
app.post("/api/register", async (req, res) => {
  try {
    const { nombre, correo, telefono, contrasena } = req.body

    // Validar datos requeridos
    if (!nombre || !correo || !telefono || !contrasena) {
      return res.status(400).json({
        error: "Todos los campos son requeridos",
      })
    }

    // Verificar si el usuario ya existe
    const existingUser = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo])

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        error: "El correo electrónico ya está registrado",
      })
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

    // Validar datos requeridos
    if (!correo || !contrasena) {
      return res.status(400).json({
        error: "Correo y contraseña son requeridos",
      })
    }

    // Buscar usuario
    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [correo])

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      })
    }

    const user = result.rows[0]

    // Verificar contraseña
    const validPassword = await bcrypt.compare(contrasena, user.contrasena)
    if (!validPassword) {
      return res.status(401).json({
        error: "Credenciales inválidas",
      })
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

// RUTAS DE HABITACIONES

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
        AND NOT (r.fecha_fin < $${params.length + 1} OR r.fecha_inicio > $${params.length + 2})
      )`
      params.push(fecha_inicio, fecha_fin)
    }

    // Filtrar por tipo
    if (tipo && tipo !== "") {
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

// Obtener tipos de habitaciones
app.get("/api/habitaciones/tipos", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT tipo, precio_por_noche FROM habitaciones ORDER BY precio_por_noche",
    )
    res.json(result.rows)
  } catch (error) {
    console.error("Error obteniendo tipos de habitaciones:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// RUTAS DE RESERVAS

// Crear reserva
app.post("/api/reservas", authenticateToken, async (req, res) => {
  try {
    const { habitacion_tipo, fecha_inicio, fecha_fin, huespedes, solicitudes_especiales } = req.body
    const usuario_id = req.user.id

    // Validar datos requeridos
    if (!habitacion_tipo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({
        error: "Tipo de habitación, fecha de inicio y fecha de fin son requeridos",
      })
    }

    // Validar fechas
    const fechaInicio = new Date(fecha_inicio)
    const fechaFin = new Date(fecha_fin)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    if (fechaInicio < hoy) {
      return res.status(400).json({
        error: "La fecha de inicio no puede ser anterior a hoy",
      })
    }

    if (fechaFin <= fechaInicio) {
      return res.status(400).json({
        error: "La fecha de fin debe ser posterior a la fecha de inicio",
      })
    }

    // Buscar habitación disponible del tipo solicitado
    const habitacionDisponible = await pool.query(
      `
      SELECT h.* FROM habitaciones h 
      WHERE h.tipo = $1 AND h.disponible = true
      AND h.id NOT IN (
        SELECT r.habitacion_id FROM reservas r 
        WHERE r.estado IN ('confirmada', 'pendiente') 
        AND NOT (r.fecha_fin < $2 OR r.fecha_inicio > $3)
      )
      ORDER BY h.numero
      LIMIT 1
    `,
      [habitacion_tipo, fecha_inicio, fecha_fin],
    )

    if (habitacionDisponible.rows.length === 0) {
      return res.status(400).json({
        error: "No hay habitaciones disponibles del tipo solicitado en las fechas seleccionadas",
      })
    }

    const habitacion = habitacionDisponible.rows[0]

    // Calcular número de noches y monto total
    const noches = Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24))
    const montoTotal = habitacion.precio_por_noche * noches

    // Crear reserva
    const reservaResult = await pool.query(
      "INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [usuario_id, habitacion.id, fecha_inicio, fecha_fin, "pendiente"],
    )

    const reserva = reservaResult.rows[0]

    // Crear registro de pago
    await pool.query("INSERT INTO pagos (reserva_id, monto, fecha_pago) VALUES ($1, $2, $3)", [
      reserva.id,
      montoTotal,
      new Date(),
    ])

    res.status(201).json({
      message: "Reserva creada exitosamente",
      reserva: {
        ...reserva,
        habitacion_numero: habitacion.numero,
        habitacion_tipo: habitacion.tipo,
        monto_total: montoTotal,
        noches: noches,
      },
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

// Cancelar reserva
app.put("/api/reservas/:id/cancelar", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Verificar que la reserva pertenece al usuario
    const reserva = await pool.query("SELECT * FROM reservas WHERE id = $1 AND usuario_id = $2", [id, req.user.id])

    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" })
    }

    // Verificar que la reserva se puede cancelar
    if (reserva.rows[0].estado === "cancelada") {
      return res.status(400).json({ error: "La reserva ya está cancelada" })
    }

    // Actualizar estado
    const result = await pool.query("UPDATE reservas SET estado = 'cancelada' WHERE id = $1 RETURNING *", [id])

    res.json({
      message: "Reserva cancelada exitosamente",
      reserva: result.rows[0],
    })
  } catch (error) {
    console.error("Error cancelando reserva:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// RUTAS DE ADMINISTRACIÓN

// Dashboard - Estadísticas generales
app.get("/api/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Total de usuarios (excluyendo administradores)
    const totalUsuarios = await pool.query(
      `
      SELECT COUNT(*) FROM usuarios 
      WHERE correo NOT IN (${adminEmails.map((_, i) => `$${i + 1}`).join(", ")})
    `,
      adminEmails,
    )

    // Total de reservas
    const totalReservas = await pool.query("SELECT COUNT(*) FROM reservas")

    // Reservas activas (confirmadas y pendientes con fechas futuras)
    const reservasActivas = await pool.query(`
      SELECT COUNT(*) FROM reservas 
      WHERE estado IN ('confirmada', 'pendiente') 
      AND fecha_fin >= CURRENT_DATE
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

    // Validar estado
    const estadosValidos = ["pendiente", "confirmada", "cancelada"]
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({
        error: "Estado inválido. Debe ser: pendiente, confirmada o cancelada",
      })
    }

    const result = await pool.query("UPDATE reservas SET estado = $1 WHERE id = $2 RETURNING *", [estado, id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Reserva no encontrada" })
    }

    res.json({
      message: "Estado de reserva actualizado exitosamente",
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
        u.id,
        u.nombre,
        u.correo,
        u.telefono,
        COUNT(r.id) as total_reservas,
        MAX(r.fecha_inicio) as ultima_reserva,
        CASE 
          WHEN COUNT(r.id) > 0 THEN 'activo'
          ELSE 'inactivo'
        END as estado
      FROM usuarios u
      LEFT JOIN reservas r ON u.id = r.usuario_id
      WHERE u.correo NOT IN (${adminEmails.map((_, i) => `$${i + 1}`).join(", ")})
      GROUP BY u.id, u.nombre, u.correo, u.telefono
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
    const result = await pool.query(`
      SELECT 
        h.*,
        COUNT(r.id) as total_reservas,
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM reservas r2 
            WHERE r2.habitacion_id = h.id 
            AND r2.estado IN ('confirmada', 'pendiente')
            AND r2.fecha_inicio <= CURRENT_DATE 
            AND r2.fecha_fin >= CURRENT_DATE
          ) THEN 'ocupada'
          WHEN h.disponible THEN 'disponible'
          ELSE 'mantenimiento'
        END as estado_actual
      FROM habitaciones h
      LEFT JOIN reservas r ON h.id = r.habitacion_id
      GROUP BY h.id, h.tipo, h.numero, h.precio_por_noche, h.disponible
      ORDER BY h.numero
    `)

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

    // Validar datos
    if (!tipo || !numero || !precio_por_noche) {
      return res.status(400).json({
        error: "Tipo, número y precio son requeridos",
      })
    }

    const result = await pool.query(
      "UPDATE habitaciones SET tipo = $1, numero = $2, precio_por_noche = $3, disponible = $4 WHERE id = $5 RETURNING *",
      [tipo, numero, precio_por_noche, disponible, id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Habitación no encontrada" })
    }

    res.json({
      message: "Habitación actualizada exitosamente",
      habitacion: result.rows[0],
    })
  } catch (error) {
    console.error("Error actualizando habitación:", error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// Ruta de prueba
app.get("/api/test", (req, res) => {
  res.json({
    message: "API funcionando correctamente",
    timestamp: new Date().toISOString(),
  })
})

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error("Error no manejado:", err)
  res.status(500).json({ error: "Error interno del servidor" })
})

// Ruta 404
app.use("*", (req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" })
})

// Inicializar datos y arrancar servidor
initializeData()
  .then(() => {
    app.listen(port, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${port}`)
      console.log("📧 Credenciales de administrador:")
      adminEmails.forEach((email) => {
        console.log(`   - Email: ${email}, Contraseña: admin123`)
      })
      console.log("🔗 Endpoints disponibles:")
      console.log("   - GET  /api/test")
      console.log("   - POST /api/register")
      console.log("   - POST /api/login")
      console.log("   - GET  /api/habitaciones")
      console.log("   - POST /api/reservas")
      console.log("   - GET  /api/admin/dashboard")
    })
  })
  .catch((error) => {
    console.error("❌ Error iniciando servidor:", error)
    process.exit(1)
  })
