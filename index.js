import express from "express"
import { config } from "dotenv"
import pg from "pg"
import cors from "cors"

import path from "path" // Para manejar rutas (NUEVO)
import { fileURLToPath } from "url" // Necesario para manejar __dirname (NUEVO)

config()

//NUEVO
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

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

app.post("/create", async (req, res) => {
  try {
    const { nombre, correo, telefono, password } = req.body
    console.log("Datos recibidos para crear usuario:", { nombre, correo, telefono, password: "***" })

    const result = await pool.query(
      "INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4) RETURNING id;",
      [nombre, correo, telefono, password],
    )

    console.log("Usuario creado con ID:", result.rows[0].id)

    // Responder según el tipo de solicitud
    if (req.headers["content-type"] === "application/json") {
      return res.status(201).json({ success: true, message: "Usuario creado exitosamente" })
    } else {
      return res.redirect("https://hotelituss1.vercel.app/")
    }
  } catch (error) {
    console.error("Error al crear usuario:", error)

    if (req.headers["content-type"] === "application/json") {
      return res.status(500).json({ success: false, message: "Error al crear usuario" })
    } else {
      return res.status(500).send("Error al crear usuario")
    }
  }
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

pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`)
})
