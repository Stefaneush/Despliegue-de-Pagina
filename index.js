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
app.use(cors())

// Update the /sesion endpoint to properly handle JSON requests
app.use(express.json()) // Add this line near the top with other middleware

// Servir archivos estáticos desde la carpeta 'public' (funcionamiento del css aparte del index.html)
app.use(express.static("public"))

// Middleware para analizar los datos de los formularios //NUEVO
app.use(express.urlencoded({ extended: true }))

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

app.get("/", async (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"))
})

app.post("/create", async (req, res) => {
  const { nombre, correo, telefono, password } = req.body
  const result = await pool.query(
    "INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES ($1, $2, $3, $4); ",
    [nombre, correo, telefono, password],
  )
  res.redirect("https://hotelituss1.vercel.app/") //funcion para llevar de vuelta a la pagina de inicio
  // res.send("El usuario ha sido creado exitosamente") funcion sin usar
})

// Actualizar el endpoint de sesión para manejar mejor las credenciales
app.post("/sesion", async (req, res) => {
  console.log("Datos recibidos del login:", req.body)

  // Verificar que los datos necesarios estén presentes
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ message: "Faltan datos de inicio de sesión" })
  }

  const { email, password } = req.body

  try {
    // Consulta a la base de datos
    const result = await pool.query("SELECT * FROM usuarios WHERE correo = $1", [email])

    console.log("Resultado de búsqueda:", result.rows)

    // Verificar si se encontró un usuario y si la contraseña coincide
    if (result.rows.length === 0) {
      console.log("Usuario no encontrado")
      return res.status(401).json({ message: "Credenciales incorrectas" })
    }

    const user = result.rows[0]

    // Verificar la contraseña
    if (user.contrasena !== password) {
      console.log("Contraseña incorrecta")
      return res.status(401).json({ message: "Credenciales incorrectas" })
    }

    // Login exitoso
    console.log("Login exitoso para:", email)

    // Para API requests, return JSON
    if (req.headers["content-type"] === "application/json") {
      return res.status(200).json({
        success: true,
        message: "Login exitoso",
        user: {
          id: user.id,
          nombre: user.nombre,
          correo: user.correo,
        },
      })
    }

    // Para form submissions, redirect
    return res.redirect("https://hotelituss1.vercel.app/?logged=true")
  } catch (error) {
    console.error("Error en login:", error)
    res.status(500).json({ message: "Error del servidor" })
  }
})

// Asegurarnos de que la ruta de reserva esté correctamente implementada
app.post("/reservar", async (req, res) => {
  const { nombre, correo, fecha_inicio, fecha_fin, habitacion_tipo, estado } = req.body

  try {
    // Verificar si el usuario está autenticado
    if (!correo) {
      return res.status(401).json({ success: false, message: "Usuario no autenticado" })
    }

    // Buscar usuario
    const usuario = await pool.query("SELECT id FROM usuarios WHERE correo = $1", [correo])

    if (usuario.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" })
    }

    const usuario_id = usuario.rows[0].id

    // Insertar reserva
    await pool.query(
      "INSERT INTO reservas (usuario_id, habitacion_id, fecha_inicio, fecha_fin, estado) VALUES ($1, $2, $3, $4, $5)",
      [usuario_id, habitacion_tipo, fecha_inicio, fecha_fin, estado || "pendiente"],
    )

    return res.status(200).json({ success: true, message: "Reserva realizada con éxito" })
  } catch (err) {
    console.error("Error al realizar la reserva:", err)
    return res.status(500).json({ success: false, message: "Error al realizar la reserva" })
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

pool
  .connect()
  .then(() => console.log("✅ Conexión exitosa a PostgreSQL"))
  .catch((err) => console.error("❌ Error al conectar con PostgreSQL:", err))

// Ruta para obtener datos del usuario
app.post("/get-user-data", async (req, res) => {
  try {
    const { correo } = req.body;
    
    if (!correo) {
      return res.status(400).json({ success: false, message: "Correo no proporcionado" });
    }
    
    const result = await pool.query("SELECT id, nombre, correo, telefono FROM usuarios WHERE correo = $1", [correo]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }
    
    res.status(200).json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error al obtener datos del usuario:", error);
    res.status(500).json({ success: false, message: "Error del servidor" });
  }
});

  
app.listen(3000)
console.log("server on port ", 3000)
