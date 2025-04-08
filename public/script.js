// Esperar a que el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
  // Inicializar AOS (Animate On Scroll)
  initAOS()

  // Inicializar el mapa si existe el elemento
  initMap()

  // Configurar el modo oscuro
  setupDarkMode()

  // Configurar el botón de volver arriba
  setupBackToTop()

  // Configurar navegación suave
  setupSmoothScrolling()

  // Configurar modales
  setupModals()

  // Configurar validación de formularios
  setupFormValidation()

  // Inicializar tooltips de Bootstrap
  initTooltips()

  // Configurar animación de contadores
  setupCounterAnimation()

  // Manejar navegación responsiva
  handleResponsiveNav()

  // Detectar scroll para cambiar estilo de navbar
  handleNavbarScroll()

  // Configurar validación de campos específicos
  setupFieldValidation()

  // Gestión de sesión de usuario
  setupUserSession()
})

/**
 * Inicializa la biblioteca AOS para animaciones al hacer scroll
 */
function initAOS() {
  if (typeof AOS !== "undefined") {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    })
  } else {
    console.warn("AOS is not defined. Make sure it is properly imported.")
  }
}

/**
 * Inicializa el mapa de Leaflet si existe el elemento en la página
 */
function initMap() {
  // Coordenadas de Avenida Emilio Civit 367, Mendoza, Argentina
  const hotelLatitude = -32.88789
  const hotelLongitude = -68.855

  const mapElement = document.getElementById("map")
  if (mapElement) {
    try {
      if (typeof L !== "undefined") {
        const map = L.map("map").setView([hotelLatitude, hotelLongitude], 15)

        // Agregar capa de OpenStreetMap
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        // Agregar un marcador para el hotel
        const hotelIcon = L.icon({
          iconUrl: "https://cdn.mapmarker.io/api/v1/pin?size=50&background=%23c8a97e&icon=fa-hotel&color=%23FFFFFF",
          iconSize: [50, 50],
          iconAnchor: [25, 50],
          popupAnchor: [0, -50],
        })

        L.marker([hotelLatitude, hotelLongitude], { icon: hotelIcon })
          .addTo(map)
          .bindPopup("<strong>Hotelituss</strong><br>Avenida Emilio Civit 367<br>Mendoza, Argentina")
          .openPopup()

        // Forzar actualización del mapa después de que se cargue completamente
        setTimeout(() => {
          map.invalidateSize()
        }, 500)
      } else {
        console.warn("Leaflet (L) is not defined. Make sure it is properly imported.")
      }
    } catch (error) {
      console.error("Error al inicializar el mapa:", error)
    }
  }
}

/**
 * Configura la funcionalidad del modo oscuro
 */
function setupDarkMode() {
  const darkModeToggle = document.getElementById("darkModeToggle")

  if (darkModeToggle) {
    // Hacer visible el botón inmediatamente sin esperar ninguna condición
    darkModeToggle.style.opacity = "1"
    darkModeToggle.style.visibility = "visible"

    darkModeToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark-mode")
      const icon = this.querySelector("i")

      if (document.body.classList.contains("dark-mode")) {
        icon.classList.remove("fa-moon")
        icon.classList.add("fa-sun")
        localStorage.setItem("darkMode", "enabled")
      } else {
        icon.classList.remove("fa-sun")
        icon.classList.add("fa-moon")
        localStorage.setItem("darkMode", "disabled")
      }
    })

    // Verificar preferencia de modo oscuro guardada
    if (localStorage.getItem("darkMode") === "enabled") {
      document.body.classList.add("dark-mode")
      const icon = darkModeToggle.querySelector("i")
      if (icon) {
        icon.classList.remove("fa-moon")
        icon.classList.add("fa-sun")
      }
    }
  }
}

/**
 * Configura el botón de volver arriba
 */
function setupBackToTop() {
  const backToTopButton = document.getElementById("backToTop")

  if (backToTopButton) {
    // Mostrar/ocultar botón según la posición de scroll
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopButton.classList.add("show")
      } else {
        backToTopButton.classList.remove("show")
      }
    })

    // Acción de volver arriba al hacer clic
    backToTopButton.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    })

    // Verificar posición inicial
    if (window.scrollY > 300) {
      backToTopButton.classList.add("show")
    }
  }
}

/**
 * Configura la navegación suave para enlaces internos
 */
function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href")
      if (href !== "#" && document.querySelector(href)) {
        e.preventDefault()
        document.querySelector(href).scrollIntoView({
          behavior: "smooth",
        })
      }
    })
  })
}

/**
 * Configura los modales de inicio de sesión y creación de usuario
 */
function setupModals() {
  // Manejar la apertura del modal de crear usuario
  const createUserLink = document.getElementById("createUserLink")
  if (createUserLink) {
    createUserLink.addEventListener("click", (e) => {
      e.preventDefault()
      if (typeof bootstrap !== "undefined") {
        const createUserModal = new bootstrap.Modal(document.getElementById("createUserModal"))
        createUserModal.show()
      } else {
        console.warn("Bootstrap is not defined. Make sure it is properly imported.")
      }
    })
  }

  // Manejar la apertura del modal de iniciar sesión
  const loginLink = document.getElementById("loginLink")
  if (loginLink) {
    loginLink.addEventListener("click", (e) => {
      e.preventDefault()
      if (typeof bootstrap !== "undefined") {
        const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
        loginModal.show()
      } else {
        console.warn("Bootstrap is not defined. Make sure it is properly imported.")
      }
    })
  }

  // Cambiar de modal de inicio de sesión a crear usuario
  const switchToCreateUser = document.getElementById("switchToCreateUser")
  if (switchToCreateUser) {
    switchToCreateUser.addEventListener("click", (e) => {
      e.preventDefault()
      if (typeof bootstrap !== "undefined") {
        const loginModal = bootstrap.Modal.getInstance(document.getElementById("loginModal"))
        if (loginModal) {
          loginModal.hide()
          setTimeout(() => {
            const createUserModal = new bootstrap.Modal(document.getElementById("createUserModal"))
            createUserModal.show()
          }, 500)
        }
      } else {
        console.warn("Bootstrap is not defined. Make sure it is properly imported.")
      }
    })
  }

  // Cambiar de modal de crear usuario a inicio de sesión
  const switchToLogin = document.getElementById("switchToLogin")
  if (switchToLogin) {
    switchToLogin.addEventListener("click", (e) => {
      e.preventDefault()
      if (typeof bootstrap !== "undefined") {
        const createUserModal = bootstrap.Modal.getInstance(document.getElementById("createUserModal"))
        if (createUserModal) {
          createUserModal.hide()
          setTimeout(() => {
            const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
            loginModal.show()
          }, 500)
        }
      } else {
        console.warn("Bootstrap is not defined. Make sure it is properly imported.")
      }
    })
  }
}

/**
 * Configura la validación de formularios
 */
function setupFormValidation() {
  const forms = document.querySelectorAll(".needs-validation")
  Array.from(forms).forEach((form) => {
    form.addEventListener(
      "submit",
      (event) => {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }
        form.classList.add("was-validated")
      },
      false,
    )
  })

  // Validación específica para el formulario de creación de usuario
  const createUserForm = document.getElementById("createUserForm")
  if (createUserForm) {
    createUserForm.addEventListener("submit", function (event) {
      // La validación de campos específicos se maneja en setupFieldValidation()
      // Aquí solo verificamos si el formulario es válido en general
      if (!this.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }
    })
  }
}

/**
 * Configura la validación de campos específicos (nombre y teléfono)
 */
function setupFieldValidation() {
  // Validación para el campo de nombre (solo letras)
  const nombreInput = document.getElementById("userName")
  if (nombreInput) {
    // Añadir atributos de validación
    nombreInput.setAttribute("pattern", "[A-Za-zÁáÉéÍíÓóÚúÑñs]+")
    nombreInput.setAttribute("title", "Por favor ingrese solo letras")

    // Validar mientras el usuario escribe
    nombreInput.addEventListener("input", function () {
      // Permitir letras, espacios y caracteres acentuados
      this.value = this.value.replace(/[^A-Za-zÁáÉéÍíÓóÚúÑñ\s]/g, "")
    })
  }

  // Validación para el campo de teléfono (solo números)
  const telefonoInput = document.getElementById("userTelefono")
  if (telefonoInput) {
    // Añadir atributos de validación
    telefonoInput.setAttribute("pattern", "[0-9]+")
    telefonoInput.setAttribute("title", "Por favor ingrese solo números")

    // Validar mientras el usuario escribe
    telefonoInput.addEventListener("input", function () {
      // Permitir solo números
      this.value = this.value.replace(/[^0-9]/g, "")
    })
  }
}

/**
 * Inicializa los tooltips de Bootstrap
 */
function initTooltips() {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
  if (tooltipTriggerList.length > 0) {
    try {
      if (typeof bootstrap !== "undefined") {
        const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))
      } else {
        console.warn("Bootstrap is not defined. Make sure it is properly imported.")
      }
    } catch (error) {
      console.error("Error al inicializar tooltips:", error)
    }
  }
}

/**
 * Configura la animación de contadores para números
 */
function setupCounterAnimation() {
  // Función para animar contadores
  function animateCounter(el, target) {
    let count = 0
    const speed = 2000 / target // 2 segundos para llegar al objetivo
    const counter = setInterval(() => {
      count++
      el.textContent = count
      if (count >= target) {
        clearInterval(counter)
      }
    }, speed)
  }

  // Iniciar animación cuando el elemento sea visible
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.target.classList.contains("years")) {
          const targetValue = Number.parseInt(entry.target.textContent) || 0
          if (targetValue > 0) {
            animateCounter(entry.target, targetValue)
            observer.unobserve(entry.target)
          }
        }
      })
    })

    document.querySelectorAll(".years").forEach((el) => {
      observer.observe(el)
    })
  } else {
    // Fallback para navegadores que no soportan IntersectionObserver
    document.querySelectorAll(".years").forEach((el) => {
      const targetValue = Number.parseInt(el.textContent) || 0
      if (targetValue > 0) {
        animateCounter(el, targetValue)
      }
    })
  }
}

/**
 * Maneja la navegación responsiva
 */
function handleResponsiveNav() {
  const navbarToggler = document.querySelector(".navbar-toggler")
  const navbarCollapse = document.querySelector(".navbar-collapse")

  if (navbarToggler && navbarCollapse) {
    // Cerrar menú al hacer clic en un enlace en móvil
    document.querySelectorAll(".navbar-nav .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 992) {
          try {
            if (typeof bootstrap !== "undefined") {
              const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse)
              if (bsCollapse) {
                bsCollapse.hide()
              }
            } else {
              console.warn("Bootstrap is not defined. Make sure it is properly imported.")
              navbarCollapse.classList.remove("show")
            }
          } catch (error) {
            console.error("Error al cerrar el menú móvil:", error)
            // Fallback manual si bootstrap no está disponible
            navbarCollapse.classList.remove("show")
          }
        }
      })
    })
  }
}

/**
 * Detecta cuando la navbar debe cambiar de estilo al hacer scroll y actualiza el enlace activo
 */
function handleNavbarScroll() {
  const navbar = document.querySelector(".navbar")

  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        navbar.classList.add("scrolled")
      } else {
        navbar.classList.remove("scrolled")
      }

      // Actualizar el enlace activo basado en la posición de scroll
      updateActiveNavLink()
    })

    // Aplicar clase inicial según la posición actual
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled")
    }

    // Inicializar el enlace activo
    updateActiveNavLink()
  }
}

/**
 * Actualiza el enlace activo en la navegación basado en la posición de scroll
 */
function updateActiveNavLink() {
  // Obtener todas las secciones
  const sections = document.querySelectorAll("section[id], header[id]")
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link:not(.btn)")

  // Determinar qué sección está actualmente visible
  let currentSection = ""
  const scrollPosition = window.scrollY + 200 // Offset para mejor detección

  sections.forEach((section) => {
    const sectionTop = section.offsetTop
    const sectionHeight = section.offsetHeight

    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      currentSection = section.getAttribute("id")
    }
  })

  // Actualizar la clase activa en los enlaces de navegación
  navLinks.forEach((link) => {
    link.classList.remove("active")
    const href = link.getAttribute("href")
    if (href === `#${currentSection}`) {
      link.classList.add("active")
    }
  })

  // Si estamos al principio de la página, activar el enlace de inicio
  if (window.scrollY < 100) {
    navLinks.forEach((link) => {
      link.classList.remove("active")
      if (link.getAttribute("href") === "#inicio") {
        link.classList.add("active")
      }
    })
  }
}

/**
 * Configura la gestión de sesión de usuario
 */
function setupUserSession() {
  const loginLink = document.getElementById("loginLink")
  const createUserLink = document.getElementById("createUserLink")
  const logoutBtn = document.getElementById("logoutBtn")

  // Detectar si viene de un login exitoso con ?logged=true
  const urlParams = new URLSearchParams(window.location.search)
  const loggedIn = urlParams.get("logged")

  if (loggedIn === "true") {
    localStorage.setItem("userLoggedIn", "true")
    window.history.replaceState({}, document.title, "/") // Limpiar la URL
  }

  // Mostrar u ocultar botones según estado
  const isLogged = localStorage.getItem("userLoggedIn") === "true"

  if (isLogged) {
    if (loginLink) loginLink.style.display = "none"
    if (createUserLink) createUserLink.style.display = "none"
    if (logoutBtn) logoutBtn.style.display = "inline-block"
  } else {
    if (logoutBtn) logoutBtn.style.display = "none"
  }

  // Función para cerrar sesión
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("userLoggedIn")
      window.location.reload() // Refresca la página
    })
  }
}

// URL base del backend en Render
const backendBaseUrl = "https://hotelitus.onrender.com"

// Función para crear una nueva reserva (POST)
function createReserva(data) {
  fetch(`${backendBaseUrl}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((result) => {
      console.log("✅ Reserva creada:", result)
      alert("Reserva creada con éxito.")
    })
    .catch((error) => {
      console.error("❌ Error al crear la reserva:", error)
      alert("Error al crear la reserva.")
    })
}

// Función para obtener todas las reservas (GET)
function getReservas() {
  fetch(`${backendBaseUrl}/select`)
    .then((response) => response.json())
    .then((data) => {
      console.log("📋 Reservas obtenidas:", data)
      // TODO: mostrar los datos en una tabla o lista en el DOM
    })
    .catch((error) => {
      console.error("❌ Error al obtener reservas:", error)
      alert("Error al obtener reservas.")
    })
}

// Función para actualizar una reserva (GET con query params)
function updateReserva(id, nuevoNombre) {
  fetch(`${backendBaseUrl}/update?id=${id}&nombre=${nuevoNombre}`)
    .then((response) => response.json())
    .then((result) => {
      console.log("🔄 Reserva actualizada:", result)
      alert("Reserva actualizada correctamente.")
    })
    .catch((error) => {
      console.error("❌ Error al actualizar reserva:", error)
      alert("Error al actualizar la reserva.")
    })
}

// Función para eliminar una reserva (GET con query param)
function deleteReserva(id) {
  fetch(`${backendBaseUrl}/delete?id=${id}`)
    .then((response) => response.json())
    .then((result) => {
      console.log("🗑️ Reserva eliminada:", result)
      alert("Reserva eliminada correctamente.")
    })
    .catch((error) => {
      console.error("❌ Error al eliminar reserva:", error)
      alert("Error al eliminar la reserva.")
    })
}

// Implementación mejorada del inicio de sesión con manejo de errores
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm")

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault()

      // Mostrar indicador de carga
      const submitBtn = this.querySelector('button[type="submit"]')
      const originalBtnText = submitBtn.innerHTML
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'
      submitBtn.disabled = true

      // Ocultar mensajes de error previos
      const errorMsg = document.getElementById("loginErrorMsg")
      errorMsg.classList.add("d-none")

      // Obtener datos del formulario
      const email = document.getElementById("loginEmail").value
      const password = document.getElementById("loginPassword").value

      // Usar XMLHttpRequest en lugar de fetch para mejor compatibilidad
      const xhr = new XMLHttpRequest()
      xhr.open("POST", "https://hotelitus.onrender.com/sesion", true)
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          // Restaurar botón
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false

          console.log("Status:", xhr.status)
          console.log("Response:", xhr.responseText)

          if (xhr.status === 200) {
            // Éxito - guardar estado de sesión y redirigir
            localStorage.setItem("userLoggedIn", "true")
            window.location.href = "https://hotelituss1.vercel.app/?logged=true"
          } else {
            // Mostrar mensaje de error
            errorMsg.classList.remove("d-none")
            errorMsg.textContent = "Error al iniciar sesión. Por favor, verifica tus credenciales."
          }
        }
      }

      // Enviar datos en formato de formulario
      xhr.send(`email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`)
    })
  }
})
