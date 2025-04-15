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

  // Configurar funcionalidad de código de verificación
  setupVerificationCode()

  // Nuevas funciones
  setupReservationForm()
  setupMyReservations()

  // Modificar el enlace "Mis reservas" en el menú desplegable
  const misReservasLink = document.querySelector('.dropdown-item[href="#"][contains(text(), "Mis reservas")]')
  if (misReservasLink) {
    misReservasLink.setAttribute("data-bs-target", "#myReservationsModal")
    misReservasLink.setAttribute("data-bs-toggle", "modal")
  }
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
      event.preventDefault()

      // Check if the form is valid
      if (this.checkValidity()) {
        // Get form data
        const formData = {
          nombre: document.getElementById("userName").value,
          correo: document.getElementById("userEmail").value,
          telefono: document.getElementById("userTelefono").value,
          password: document.getElementById("userPassword").value,
        }

        // Send data to backend
        sendVerificationCode(formData)
      }

      this.classList.add("was-validated")
    })
  }
}

// Modify the setupReservationForm function to load room types from the database
function setupReservationForm() {
  const reservationForm = document.querySelector(".reservation-form")

  if (reservationForm) {
    // Load room types from the database
    loadRoomTypes()

    reservationForm.addEventListener("submit", (e) => {
      e.preventDefault()

      // Verificar si el usuario está logueado
      const isLoggedIn = localStorage.getItem("userLoggedIn") === "true"

      if (!isLoggedIn) {
        // Mostrar modal de login si no está logueado
        alert("Debe iniciar sesión para realizar una reserva")
        if (typeof bootstrap !== "undefined") {
          const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
          loginModal.show()
        }
        return
      }

      // Obtener datos del formulario
      const checkIn = document.getElementById("checkIn").value
      const checkOut = document.getElementById("checkOut").value
      const roomType = document.getElementById("roomType").value
      const guests = document.getElementById("guests").value
      const name = document.getElementById("name").value
      const email = document.getElementById("email").value
      const specialRequests = document.getElementById("specialRequests").value

      // Crear objeto con datos de la reserva
      const reservationData = {
        fecha_inicio: checkIn,
        fecha_fin: checkOut,
        habitacion_tipo: roomType,
        huespedes: guests,
        nombre: name,
        correo: email,
        solicitudes_especiales: specialRequests,
        estado: "pendiente",
        usuario_id: localStorage.getItem("currentUserEmail") || localStorage.getItem("usuarioLogueado"),
      }

      // Enviar datos al servidor
      createReservation(reservationData)
    })
  }

  // Pre-llenar el formulario con datos del usuario si está logueado
  const isLoggedIn = localStorage.getItem("userLoggedIn") === "true"
  if (isLoggedIn) {
    const userDataStr = localStorage.getItem("currentUserData")
    if (userDataStr) {
      try {
        const userData = JSON.parse(userDataStr)
        if (document.getElementById("name")) {
          document.getElementById("name").value = userData.nombre || ""
        }
        if (document.getElementById("email")) {
          document.getElementById("email").value = userData.correo || ""
        }
      } catch (e) {
        console.error("Error al parsear datos de usuario:", e)
      }
    }
  }
}

// Función para cargar los tipos de habitación desde la base de datos
function loadRoomTypes() {
  const roomTypeSelect = document.getElementById("roomType")

  if (!roomTypeSelect) return

  // Mostrar indicador de carga
  roomTypeSelect.innerHTML = '<option value="">Cargando...</option>'

  fetch(`${backendBaseUrl}/room-types`)
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al cargar tipos de habitación")
      }
      return response.json()
    })
    .then((data) => {
      if (data.success && data.roomTypes.length > 0) {
        // Limpiar el select
        roomTypeSelect.innerHTML = '<option value="">Seleccionar...</option>'

        // Agregar las opciones de habitaciones
        data.roomTypes.forEach((room) => {
          const option = document.createElement("option")
          option.value = room.tipo
          option.textContent = `${getTipoHabitacion(room.tipo)} - $${room.precio_por_noche}/noche (Max: ${room.capacidad} personas)`
          option.setAttribute("data-capacity", room.capacidad)
          option.setAttribute("data-price", room.precio_por_noche)
          roomTypeSelect.appendChild(option)
        })

        // Configurar el evento de cambio para actualizar el número máximo de huéspedes
        roomTypeSelect.addEventListener("change", function () {
          const selectedOption = this.options[this.selectedIndex]
          const maxCapacity = selectedOption.getAttribute("data-capacity")
          const guestsInput = document.getElementById("guests")

          if (guestsInput && maxCapacity) {
            guestsInput.max = maxCapacity
            guestsInput.value = Math.min(guestsInput.value || 1, maxCapacity)
          }
        })
      } else {
        roomTypeSelect.innerHTML = '<option value="">No hay habitaciones disponibles</option>'
      }
    })
    .catch((error) => {
      console.error("Error al cargar tipos de habitación:", error)
      roomTypeSelect.innerHTML = '<option value="">Error al cargar habitaciones</option>'
    })
}

// Modificar la función createReservation para manejar mejor los errores y mostrar mensajes más informativos
function createReservation(data) {
  // Mostrar indicador de carga
  const submitBtn = document.querySelector('.reservation-form button[type="submit"]')
  const originalBtnText = submitBtn.innerHTML
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'
  submitBtn.disabled = true

  fetch(`${backendBaseUrl}/reservar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((errorData) => {
          throw new Error(errorData.message || "Error al crear la reserva")
        })
      }
      return response.json()
    })
    .then((result) => {
      // Restaurar botón
      submitBtn.innerHTML = originalBtnText
      submitBtn.disabled = false

      // Mostrar mensaje de éxito
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "success",
          title: "¡Reserva creada con éxito!",
          text: 'Puede ver los detalles en la sección "Mis reservas"',
          confirmButtonColor: "#c8a97e",
        })
      } else {
        alert('¡Reserva creada con éxito! Puede ver los detalles en la sección "Mis reservas"')
      }

      // Limpiar formulario
      document.querySelector(".reservation-form").reset()

      // Pre-llenar con datos del usuario nuevamente
      const userDataStr = localStorage.getItem("currentUserData")
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr)
          if (document.getElementById("name")) {
            document.getElementById("name").value = userData.nombre || ""
          }
          if (document.getElementById("email")) {
            document.getElementById("email").value = userData.correo || ""
          }
        } catch (e) {
          console.error("Error al parsear datos de usuario:", e)
        }
      }
    })
    .catch((error) => {
      console.error("Error al crear reserva:", error)

      // Restaurar botón
      submitBtn.innerHTML = originalBtnText
      submitBtn.disabled = false

      // Mostrar mensaje de error
      if (typeof Swal !== "undefined") {
        Swal.fire({
          icon: "error",
          title: "Error al crear la reserva",
          text: error.message || "Por favor, inténtelo de nuevo.",
          confirmButtonColor: "#c8a97e",
        })
      } else {
        alert("Error al crear la reserva. Por favor, inténtelo de nuevo.")
      }
    })
}

// Función para obtener las reservas del usuario actual
function getUserReservations() {
  const userEmail = localStorage.getItem("currentUserEmail") || localStorage.getItem("usuarioLogueado")

  if (!userEmail) {
    return Promise.reject("No hay usuario logueado")
  }

  return fetch(`${backendBaseUrl}/user-reservations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ correo: userEmail }),
  }).then((response) => {
    if (!response.ok) {
      throw new Error("Error al obtener reservas")
    }
    return response.json()
  })
}

// Configurar la sección "Mis reservas"
function setupMyReservations() {
  // Agregar evento al enlace "Mis reservas" en el menú desplegable
  const myReservationsLink = document.querySelector('.dropdown-item[href="#"][data-bs-target="#myReservationsModal"]')

  if (myReservationsLink) {
    myReservationsLink.addEventListener("click", (e) => {
      e.preventDefault()

      // Mostrar modal de reservas
      if (typeof bootstrap !== "undefined") {
        const myReservationsModal = new bootstrap.Modal(document.getElementById("myReservationsModal"))
        myReservationsModal.show()

        // Cargar reservas del usuario
        loadUserReservations()
      }
    })
  }
}

// Modificar la función loadUserReservations para mostrar el precio de la habitación
function loadUserReservations() {
  const reservationsContainer = document.getElementById("userReservationsList")

  if (!reservationsContainer) return

  // Mostrar indicador de carga
  reservationsContainer.innerHTML = `
   <div class="text-center py-5">
     <div class="spinner-border text-primary" role="status">
       <span class="visually-hidden">Cargando...</span>
     </div>
     <p class="mt-2">Cargando sus reservas...</p>
   </div>
 `

  // Obtener reservas del usuario
  getUserReservations()
    .then((data) => {
      if (data.success && data.reservations.length > 0) {
        // Mostrar reservas
        let html = ""

        data.reservations.forEach((reserva) => {
          // Determinar clase de estado
          let statusClass = "bg-warning"
          if (reserva.estado === "confirmada") statusClass = "bg-success"
          if (reserva.estado === "cancelada") statusClass = "bg-danger"

          // Calcular el total de la estancia
          const checkIn = new Date(reserva.fecha_inicio)
          const checkOut = new Date(reserva.fecha_fin)
          const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
          const totalPrice = nights * (reserva.precio_por_noche || 0)

          html += `
           <div class="reservation-card mb-3">
             <div class="card">
               <div class="card-header d-flex justify-content-between align-items-center">
                 <h5 class="mb-0">Reserva #${reserva.id}</h5>
                 <span class="badge ${statusClass}">${reserva.estado.toUpperCase()}</span>
               </div>
               <div class="card-body">
                 <div class="row">
                   <div class="col-md-6">
                     <p><strong><i class="fas fa-calendar-alt me-2"></i>Check-in:</strong> ${formatDate(reserva.fecha_inicio)}</p>
                     <p><strong><i class="fas fa-calendar-alt me-2"></i>Check-out:</strong> ${formatDate(reserva.fecha_fin)}</p>
                     <p><strong><i class="fas fa-bed me-2"></i>Habitación:</strong> ${getTipoHabitacion(reserva.habitacion_tipo)}</p>
                   </div>
                   <div class="col-md-6">
                     <p><strong><i class="fas fa-user-friends me-2"></i>Huéspedes:</strong> ${reserva.huespedes || "No especificado"}</p>
                     <p><strong><i class="fas fa-comment-alt me-2"></i>Solicitudes:</strong> ${reserva.solicitudes_especiales || "Ninguna"}</p>
                     <p><strong><i class="fas fa-clock me-2"></i>Fecha de reserva:</strong> ${formatDate(reserva.fecha_creacion)}</p>
                   </div>
                 </div>
                 <div class="reservation-price mt-3 p-3 bg-light rounded">
                   <div class="d-flex justify-content-between align-items-center">
                     <div>
                       <p class="mb-0"><strong>Precio por noche:</strong> $${reserva.precio_por_noche || 0}</p>
                       <p class="mb-0"><strong>Noches:</strong> ${nights}</p>
                     </div>
                     <div>
                       <h5 class="mb-0 text-primary">Total: $${totalPrice}</h5>
                     </div>
                   </div>
                 </div>
                 ${
                   reserva.estado !== "cancelada"
                     ? `
                 <div class="text-end mt-3">
                   <button class="btn btn-outline-danger btn-sm cancel-reservation" data-id="${reserva.id}">
                     <i class="fas fa-times-circle me-1"></i>Cancelar reserva
                   </button>
                 </div>
                 `
                     : ""
                 }
               </div>
             </div>
           </div>
         `
        })

        reservationsContainer.innerHTML = html

        // Agregar eventos a los botones de cancelar
        document.querySelectorAll(".cancel-reservation").forEach((btn) => {
          btn.addEventListener("click", function () {
            const reservaId = this.getAttribute("data-id")
            if (confirm("¿Está seguro que desea cancelar esta reserva?")) {
              cancelReservation(reservaId)
            }
          })
        })
      } else {
        // No hay reservas
        reservationsContainer.innerHTML = `
         <div class="text-center py-5">
           <div class="service-icon mb-3">
             <i class="fas fa-calendar-times"></i>
           </div>
           <h4>No tiene reservas activas</h4>
           <p>Realice una reserva para disfrutar de nuestras instalaciones.</p>
           <a href="#reservas" class="btn btn-primary" data-bs-dismiss="modal">
             <i class="fas fa-calendar-plus me-2"></i>Hacer una reserva
           </a>
         </div>
       `
      }
    })
    .catch((error) => {
      console.error("Error al cargar reservas:", error)

      // Mostrar mensaje de error
      reservationsContainer.innerHTML = `
       <div class="text-center py-5">
         <div class="service-icon mb-3 bg-danger">
           <i class="fas fa-exclamation-triangle text-white"></i>
         </div>
         <h4>Error al cargar reservas</h4>
         <p>Ha ocurrido un error al cargar sus reservas. Por favor, inténtelo de nuevo más tarde.</p>
         <button class="btn btn-primary" onclick="loadUserReservations()">
           <i class="fas fa-sync-alt me-2"></i>Reintentar
         </button>
       </div>
     `
    })
}

// Función para cancelar una reserva
function cancelReservation(reservaId) {
  fetch(`${backendBaseUrl}/cancel-reservation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: reservaId }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al cancelar la reserva")
      }
      return response.json()
    })
    .then((result) => {
      if (result.success) {
        alert("Reserva cancelada con éxito")
        // Recargar reservas
        loadUserReservations()
      } else {
        alert("Error al cancelar la reserva: " + result.message)
      }
    })
    .catch((error) => {
      console.error("Error al cancelar reserva:", error)
      alert("Error al cancelar la reserva. Por favor, inténtelo de nuevo.")
    })
}

// Función auxiliar para formatear fechas
function formatDate(dateString) {
  if (!dateString) return "No especificada"

  const date = new Date(dateString)
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Función auxiliar para obtener el nombre del tipo de habitación
function getTipoHabitacion(tipo) {
  const tipos = {
    individual: "Habitación Individual",
    doble: "Habitación Doble",
    suite: "Suite Ejecutiva",
  }

  return tipos[tipo] || tipo
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
  const userProfileDropdown = document.getElementById("userProfileDropdown")

  // Detectar si viene de un login exitoso con ?logged=true
  const urlParams = new URLSearchParams(window.location.search)
  const loggedIn = urlParams.get("logged")

  if (loggedIn === "true") {
    localStorage.setItem("userLoggedIn", "true")
    // Guardar el email del usuario que se acaba de loguear
    const userEmail = localStorage.getItem("usuarioLogueado")
    if (userEmail) {
      localStorage.setItem("currentUserEmail", userEmail)
    }
    window.history.replaceState({}, document.title, "/") // Limpiar la URL
  }

  // Mostrar u ocultar elementos según estado
  const isLogged = localStorage.getItem("userLoggedIn") === "true"

  if (isLogged) {
    if (loginLink) loginLink.style.display = "none"
    if (createUserLink) createUserLink.style.display = "none"
    if (userProfileDropdown) userProfileDropdown.style.display = "block"

    // Cargar datos del usuario
    loadUserData()
  } else {
    if (loginLink) loginLink.style.display = "block"
    if (createUserLink) createUserLink.style.display = "block"
    if (userProfileDropdown) userProfileDropdown.style.display = "none"
  }

  // Función para cerrar sesión
  const logoutLink = document.getElementById("logoutLink")
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem("userLoggedIn")
      localStorage.removeItem("currentUserEmail")
      localStorage.removeItem("currentUserData")
      window.location.reload() // Refresca la página
    })
  }
}

/**
 * Carga los datos del usuario desde el backend
 */
function loadUserData() {
  const userEmail = localStorage.getItem("currentUserEmail") || localStorage.getItem("usuarioLogueado")

  if (!userEmail) return

  // Intentar cargar datos del localStorage primero (para no hacer peticiones innecesarias)
  const cachedUserData = localStorage.getItem("currentUserData")
  if (cachedUserData) {
    try {
      const userData = JSON.parse(cachedUserData)
      updateUserProfileUI(userData)
      return
    } catch (e) {
      console.error("Error al parsear datos de usuario en caché:", e)
    }
  }

  // Si no hay datos en caché o hay error, cargar desde el backend
  fetch(`${backendBaseUrl}/get-user-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ correo: userEmail }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al obtener datos del usuario")
      }
      return response.json()
    })
    .then((data) => {
      if (data && data.success) {
        // Guardar datos en localStorage para futuras cargas
        localStorage.setItem("currentUserData", JSON.stringify(data.user))
        updateUserProfileUI(data.user)
      }
    })
    .catch((error) => {
      console.error("Error al cargar datos del usuario:", error)
      // Si hay error, mostrar datos genéricos
      updateUserProfileUI({
        nombre: "Usuario",
        correo: userEmail,
      })
    })
}

/**
 * Actualiza la interfaz del perfil de usuario con los datos cargados
 */
function updateUserProfileUI(userData) {
  // Actualizar nombre en el botón del dropdown
  const userDisplayName = document.getElementById("userDisplayName")
  if (userDisplayName) {
    userDisplayName.textContent = userData.nombre || "Usuario"
  }

  // Actualizar datos en el menú desplegable
  const userFullName = document.getElementById("userFullName")
  if (userFullName) {
    userFullName.textContent = userData.nombre || "Usuario"
  }

  const userEmail = document.getElementById("userEmail")
  if (userEmail) {
    userEmail.textContent = userData.correo || ""
  }
}

/**
 * Configura la funcionalidad de entrada del código de verificación
 */
function setupVerificationCode() {
  const verificationInputs = document.querySelectorAll(".verification-input")

  if (verificationInputs.length > 0) {
    // Auto-focus next input when a digit is entered
    verificationInputs.forEach((input, index) => {
      input.addEventListener("input", function () {
        if (this.value.length === 1) {
          if (index < verificationInputs.length - 1) {
            verificationInputs[index + 1].focus()
          }
        }
      })

      // Handle backspace to go to previous input
      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !this.value && index > 0) {
          verificationInputs[index - 1].focus()
        }
      })
    })
  }

  // Handle verification form submission
  const verificationForm = document.getElementById("verificationForm")
  if (verificationForm) {
    verificationForm.addEventListener("submit", (e) => {
      e.preventDefault()

      // Get the code from all inputs
      let code = ""
      verificationInputs.forEach((input) => {
        code += input.value
      })

      // Get the email from the stored data
      const userEmail = localStorage.getItem("pendingVerificationEmail")

      if (code.length === 6 && userEmail) {
        verifyCode(userEmail, code)
      } else {
        document.getElementById("verification-error").style.display = "block"
      }
    })
  }

  // Handle resend code button
  const resendCodeBtn = document.getElementById("resendCode")
  if (resendCodeBtn) {
    resendCodeBtn.addEventListener("click", function (e) {
      e.preventDefault()

      // Get the stored user data
      const userData = JSON.parse(localStorage.getItem("pendingUserData"))

      if (userData) {
        // Disable the button and show countdown
        this.style.pointerEvents = "none"
        this.style.opacity = "0.5"

        const countdownEl = document.getElementById("countdown")
        countdownEl.style.display = "block"

        let seconds = 60
        countdownEl.textContent = `Podrás solicitar un nuevo código en ${seconds} segundos`

        const countdownInterval = setInterval(() => {
          seconds--
          countdownEl.textContent = `Podrás solicitar un nuevo código en ${seconds} segundos`

          if (seconds <= 0) {
            clearInterval(countdownInterval)
            this.style.pointerEvents = "auto"
            this.style.opacity = "1"
            countdownEl.style.display = "none"
          }
        }, 1000)

        // Resend the verification code
        sendVerificationCode(userData)
      }
    })
  }
}

/**
 * Envía el código de verificación al correo electrónico del usuario
 * @param {Object} userData - Datos del usuario incluyendo nombre, correo, teléfono y contraseña
 */
function sendVerificationCode(userData) {
  // Backend URL
  const backendBaseUrl = "https://hotelitus.onrender.com"

  // Store user data for later use
  localStorage.setItem("pendingUserData", JSON.stringify(userData))
  localStorage.setItem("pendingVerificationEmail", userData.correo)

  // Send request to backend
  fetch(`${backendBaseUrl}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        // Show verification modal
        if (typeof bootstrap !== "undefined") {
          // Hide create user modal if it's open
          const createUserModal = bootstrap.Modal.getInstance(document.getElementById("createUserModal"))
          if (createUserModal) {
            createUserModal.hide()
          }

          // Show verification modal
          setTimeout(() => {
            const verificationModal = new bootstrap.Modal(document.getElementById("verificationModal"))
            verificationModal.show()

            // Focus on first input
            document.querySelector(".verification-input").focus()
          }, 500)
        }
      } else {
        alert("Error al enviar el código de verificación. Por favor, inténtelo de nuevo.")
      }
    })
    .catch((error) => {
      console.error("Error al enviar datos:", error)
      alert("Error al enviar el código de verificación. Por favor, inténtelo de nuevo.")
    })
}

/**
 * Verifica el código ingresado por el usuario
 * @param {string} email - Correo electrónico del usuario
 * @param {string} code - Código de verificación ingresado por el usuario
 */
function verifyCode(email, code) {
  // Backend URL
  const backendBaseUrl = "https://hotelitus.onrender.com"

  // Send verification request
  fetch(`${backendBaseUrl}/verify-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ correo: email, codigo: code }),
  })
    .then((response) => response.json())
    .then((result) => {
      if (result.success) {
        // Hide verification modal
        if (typeof bootstrap !== "undefined") {
          const verificationModal = bootstrap.Modal.getInstance(document.getElementById("verificationModal"))
          if (verificationModal) {
            verificationModal.hide()
          }
        }

        // Clear stored data
        localStorage.removeItem("pendingUserData")
        localStorage.removeItem("pendingVerificationEmail")

        // Show success message and redirect to login
        alert("¡Cuenta creada con éxito! Ahora puede iniciar sesión.")

        // Show login modal
        setTimeout(() => {
          if (typeof bootstrap !== "undefined") {
            const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
            loginModal.show()
          }
        }, 500)
      } else {
        // Show error message
        document.getElementById("verification-error").style.display = "block"
      }
    })
    .catch((error) => {
      console.error("Error al verificar código:", error)
      document.getElementById("verification-error").style.display = "block"
    })
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
      if (errorMsg) {
        errorMsg.classList.add("d-none")
      }

      // Obtener datos del formulario
      const email = document.getElementById("loginEmail").value
      const password = document.getElementById("loginPassword").value

      // Usar fetch para enviar los datos al backend
      fetch(`${backendBaseUrl}/sesion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`)
          }
          return response.json()
        })
        .then((data) => {
          // Éxito - guardar estado de sesión y email del usuario
          localStorage.setItem("userLoggedIn", "true")
          localStorage.setItem("usuarioLogueado", email)

          // CAMBIO AQUÍ: Mantener al usuario en la misma página con parámetro logged=true
          window.location.href = window.location.origin + "/?logged=true"
        })
        .catch((error) => {
          console.error("Error en inicio de sesión:", error)

          // Mostrar mensaje de error
          if (errorMsg) {
            errorMsg.classList.remove("d-none")
            errorMsg.textContent = "Error al iniciar sesión. Por favor, verifica tus credenciales."
          }

          // Restaurar botón
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false
        })
    })
  }
})
