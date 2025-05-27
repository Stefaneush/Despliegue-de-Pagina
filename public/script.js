document.addEventListener("DOMContentLoaded", () => {
  initAOS()
  initMap()
  setupDarkMode()
  setupBackToTop()
  setupSmoothScrolling()
  setupModals()
  setupFormValidation()
  initTooltips()
  setupCounterAnimation()
  handleResponsiveNav()
  handleNavbarScroll()
  setupFieldValidation()
  setupUserSession()
  setupVerificationCode()
  setupReservationForm()
  setupMyReservations()
  setupDateConstraints()
  setupLoginForm()
  handlePaymentReturn() // Nueva función para manejar el retorno de MercadoPago

  const misReservasLink = document.getElementById("myReservationsLink")
  if (misReservasLink) {
    misReservasLink.addEventListener("click", (e) => {
      e.preventDefault()
      const bootstrap = window.bootstrap
      if (bootstrap) {
        const myReservationsModal = new bootstrap.Modal(document.getElementById("myReservationsModal"))
        myReservationsModal.show()
        loadUserReservations()
      }
    })
  }
})

// Nueva función para manejar el retorno de MercadoPago
function handlePaymentReturn() {
  const urlParams = new URLSearchParams(window.location.search)
  const paymentStatus = urlParams.get("payment")
  const reservaId = urlParams.get("reserva_id")

  if (paymentStatus && reservaId) {
    // Actualizar el estado de la reserva en el backend
    fetch("https://hotelitus.onrender.com/payment-result", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_status: paymentStatus,
        reserva_id: reservaId,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Mostrar mensaje según el resultado del pago
          if (paymentStatus === "success") {
            showPaymentMessage("¡Pago exitoso! Su reserva ha sido confirmada.", "success")
          } else if (paymentStatus === "failure") {
            showPaymentMessage("El pago no pudo ser procesado. Su reserva ha sido cancelada.", "danger")
          } else if (paymentStatus === "pending") {
            showPaymentMessage("Su pago está pendiente de confirmación.", "warning")
          }
        }
      })
      .catch((error) => {
        console.error("Error al procesar resultado del pago:", error)
      })

    // Limpiar los parámetros de la URL
    window.history.replaceState({}, document.title, "/")
  }
}

function showPaymentMessage(message, type = "info") {
  // Crear un modal o alert para mostrar el resultado del pago
  const alertDiv = document.createElement("div")
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`
  alertDiv.style.cssText = "top: 100px; right: 20px; z-index: 9999; max-width: 400px;"
  alertDiv.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `

  document.body.appendChild(alertDiv)

  // Auto-remover después de 5 segundos
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.parentNode.removeChild(alertDiv)
    }
  }, 5000)
}

function initAOS() {
  const AOS = window.AOS
  if (AOS) {
    AOS.init({
      duration: 1000,
      once: true,
      offset: 100,
    })
  }
}

function initMap() {
  const hotelLatitude = -32.88789
  const hotelLongitude = -68.855
  const mapElement = document.getElementById("map")

  if (mapElement) {
    try {
      const L = window.L
      if (L) {
        const map = L.map("map").setView([hotelLatitude, hotelLongitude], 15)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

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

        setTimeout(() => {
          map.invalidateSize()
        }, 500)
      }
    } catch (error) {
      console.error("Error al inicializar el mapa:", error)
    }
  }
}

function setupDarkMode() {
  const darkModeToggle = document.getElementById("darkModeToggle")

  if (darkModeToggle) {
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

function setupBackToTop() {
  const backToTopButton = document.getElementById("backToTop")

  if (backToTopButton) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        backToTopButton.classList.add("show")
      } else {
        backToTopButton.classList.remove("show")
      }
    })

    backToTopButton.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    })

    if (window.scrollY > 300) {
      backToTopButton.classList.add("show")
    }
  }
}

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

function setupModals() {
  const createUserLink = document.getElementById("createUserLink")
  if (createUserLink) {
    createUserLink.addEventListener("click", (e) => {
      e.preventDefault()
      const bootstrap = window.bootstrap
      if (bootstrap) {
        const createUserModal = new bootstrap.Modal(document.getElementById("createUserModal"))
        createUserModal.show()
      }
    })
  }

  const loginLink = document.getElementById("loginLink")
  if (loginLink) {
    loginLink.addEventListener("click", (e) => {
      e.preventDefault()
      const bootstrap = window.bootstrap
      if (bootstrap) {
        const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
        loginModal.show()
      }
    })
  }

  const switchToCreateUser = document.getElementById("switchToCreateUser")
  if (switchToCreateUser) {
    switchToCreateUser.addEventListener("click", (e) => {
      e.preventDefault()
      const bootstrap = window.bootstrap
      if (bootstrap) {
        const loginModal = bootstrap.Modal.getInstance(document.getElementById("loginModal"))
        if (loginModal) {
          loginModal.hide()
          setTimeout(() => {
            const createUserModal = new bootstrap.Modal(document.getElementById("createUserModal"))
            createUserModal.show()
          }, 500)
        }
      }
    })
  }

  const switchToLogin = document.getElementById("switchToLogin")
  if (switchToLogin) {
    switchToLogin.addEventListener("click", (e) => {
      e.preventDefault()
      const bootstrap = window.bootstrap
      if (bootstrap) {
        const createUserModal = bootstrap.Modal.getInstance(document.getElementById("createUserModal"))
        if (createUserModal) {
          createUserModal.hide()
          setTimeout(() => {
            const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
            loginModal.show()
          }, 500)
        }
      }
    })
  }
}

// Función mejorada para validación de formulario
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

  const createUserForm = document.getElementById("createUserForm")
  if (createUserForm) {
    createUserForm.addEventListener("submit", function (event) {
      event.preventDefault()

      console.log("📝 Formulario enviado")

      // Limpiar errores previos
      const errorElements = this.querySelectorAll(".is-invalid")
      errorElements.forEach((el) => el.classList.remove("is-invalid"))

      if (this.checkValidity()) {
        const formData = {
          nombre: document.getElementById("userName").value.trim(),
          correo: document.getElementById("userEmail").value.trim(),
          telefono: document.getElementById("userTelefono").value.trim(),
          password: document.getElementById("userPassword").value,
        }

        console.log("📊 Datos del formulario:", formData)

        // Validaciones adicionales
        if (!formData.nombre || !formData.correo || !formData.telefono || !formData.password) {
          alert("Por favor, complete todos los campos")
          return
        }

        if (formData.password.length < 6) {
          alert("La contraseña debe tener al menos 6 caracteres")
          return
        }

        sendVerificationCode(formData)
      } else {
        console.log("❌ Formulario inválido")
      }

      this.classList.add("was-validated")
    })
  }
}

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm")

  if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault()

      const email = document.getElementById("loginEmail").value
      const password = document.getElementById("loginPassword").value
      const errorMsg = document.getElementById("loginErrorMsg")

      if (!email || !password) {
        errorMsg.textContent = "Por favor, complete todos los campos"
        errorMsg.classList.remove("d-none")
        return
      }

      const submitBtn = this.querySelector('button[type="submit"]')
      const originalBtnText = submitBtn.innerHTML
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'
      submitBtn.disabled = true

      fetch("https://hotelitus.onrender.com/sesion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false

          if (data.success) {
            localStorage.setItem("userLoggedIn", "true")
            localStorage.setItem("usuarioLogueado", email)
            localStorage.setItem("currentUserEmail", email)

            const bootstrap = window.bootstrap
            if (bootstrap) {
              const loginModal = bootstrap.Modal.getInstance(document.getElementById("loginModal"))
              if (loginModal) {
                loginModal.hide()
              }
            }

            window.location.reload()
          } else {
            errorMsg.textContent = data.message || "Credenciales incorrectas"
            errorMsg.classList.remove("d-none")
          }
        })
        .catch((error) => {
          console.error("Error al iniciar sesión:", error)
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false
          errorMsg.textContent = "Error al conectar con el servidor. Intente nuevamente."
          errorMsg.classList.remove("d-none")
        })
    })
  }
}

function showReservationMessage(message, type = "danger") {
  const messagesDiv = document.getElementById("reservationMessages")
  if (messagesDiv) {
    messagesDiv.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
      </div>
    `

    messagesDiv.scrollIntoView({ behavior: "smooth", block: "center" })
  }
}

function setupReservationForm() {
  const reservationForm = document.getElementById("reservationForm")

  if (reservationForm) {
    reservationForm.addEventListener("submit", (e) => {
      e.preventDefault()

      const isLoggedIn = localStorage.getItem("userLoggedIn") === "true"

      if (!isLoggedIn) {
        document.getElementById("loginRequiredAlert").classList.remove("d-none")
        return
      }

      const checkIn = document.getElementById("checkIn").value
      const checkOut = document.getElementById("checkOut").value
      const roomType = document.getElementById("roomType").value
      const guests = document.getElementById("guests").value
      const name = document.getElementById("name").value
      const email = document.getElementById("email").value
      const specialRequests = document.getElementById("specialRequests").value

      const checkInDate = new Date(checkIn)
      const checkOutDate = new Date(checkOut)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (checkInDate < today) {
        showReservationMessage("La fecha de entrada no puede ser anterior a hoy")
        return
      }

      if (checkInDate >= checkOutDate) {
        showReservationMessage("La fecha de salida debe ser posterior a la fecha de entrada")
        return
      }

      if ((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24) > 30) {
        showReservationMessage("La reserva no puede ser por más de 30 días")
        return
      }

      let userId = null
      const userDataStr = localStorage.getItem("currentUserData")

      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr)
          if (userData && userData.id) {
            userId = userData.id
            console.log("ID de usuario encontrado en localStorage:", userId)
          }
        } catch (e) {
          console.error("Error al parsear datos de usuario:", e)
        }
      }

      let userEmail = email
      if (!userEmail) {
        userEmail = localStorage.getItem("currentUserEmail") || localStorage.getItem("usuarioLogueado")
        console.log("Usando correo electrónico para identificar al usuario:", userEmail)
      }

      if (!userId && !userEmail) {
        showReservationMessage("Error: No se pudo identificar al usuario. Por favor, inicie sesión nuevamente.")
        return
      }

      const submitBtn = document.querySelector('#reservationForm button[type="submit"]')
      const originalBtnText = submitBtn.innerHTML

      const reservationData = {
        usuario_id: userId,
        habitacion_id: getRoomIdByType(roomType),
        fecha_inicio: checkIn,
        fecha_fin: checkOut,
        estado: "pendiente_pago",
        nombre: name,
        correo: userEmail,
        huespedes: guests,
        solicitudes_especiales: specialRequests,
      }

      console.log("Datos completos de la reserva a enviar:", JSON.stringify(reservationData, null, 2))

      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...'
      submitBtn.disabled = true

      // Crear la reserva y obtener la URL de pago
      fetch("https://hotelitus.onrender.com/reservar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationData),
      })
        .then((response) => {
          console.log("Respuesta del servidor:", response.status)
          return response.json().then((data) => {
            if (!response.ok) {
              throw new Error(data.message || `Error al crear la reserva (${response.status})`)
            }
            return data
          })
        })
        .then((result) => {
          console.log("Resultado exitoso:", result)
          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false

          if (result.payment_url) {
            // Redirigir al usuario a MercadoPago
            showReservationMessage("Redirigiendo a la pasarela de pago...", "info")
            setTimeout(() => {
              window.location.href = result.payment_url
            }, 2000)
          } else {
            showReservationMessage("Error: No se pudo generar el enlace de pago", "danger")
          }
        })
        .catch((error) => {
          console.error("Error detallado al crear reserva:", error)

          submitBtn.innerHTML = originalBtnText
          submitBtn.disabled = false

          if (error.message.includes("no está disponible")) {
            showReservationMessage(
              "La habitación seleccionada no está disponible para las fechas indicadas. Por favor, seleccione otras fechas o tipo de habitación.",
            )
          } else if (error.message.includes("usuario")) {
            showReservationMessage("Error con la identificación del usuario. Por favor, inicie sesión nuevamente.")
          } else {
            showReservationMessage("Error al crear la reserva: " + error.message)
          }
        })
    })
  }

  const loginFromReservation = document.getElementById("loginFromReservation")
  if (loginFromReservation) {
    loginFromReservation.addEventListener("click", (e) => {
      e.preventDefault()
      const bootstrap = window.bootstrap
      if (bootstrap) {
        const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
        loginModal.show()
      }
    })
  }

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

function getRoomIdByType(type) {
  const roomTypes = {
    individual: 1,
    doble: 2,
    suite: 3,
  }

  const roomType = type ? type.toLowerCase() : ""

  if (roomTypes.hasOwnProperty(roomType)) {
    console.log(`Tipo de habitación seleccionada: ${roomType}, ID: ${roomTypes[roomType]}`)
    return roomTypes[roomType]
  } else {
    console.warn(`Tipo de habitación desconocido: ${roomType}, usando ID por defecto: 1`)
    return 1
  }
}

function setupMyReservations() {
  const myReservationsModal = document.getElementById("myReservationsModal")

  if (myReservationsModal) {
    myReservationsModal.addEventListener("show.bs.modal", () => {
      loadUserReservations()
    })
  }
}

function loadUserReservations() {
  const reservationsLoading = document.getElementById("reservationsLoading")
  const noReservationsMessage = document.getElementById("noReservationsMessage")
  const reservationsList = document.getElementById("reservationsList")
  const reservationsTableBody = document.getElementById("reservationsTableBody")

  if (!reservationsLoading || !noReservationsMessage || !reservationsList || !reservationsTableBody) {
    console.error("Elementos del modal de reservas no encontrados")
    return
  }

  reservationsLoading.classList.remove("d-none")
  noReservationsMessage.classList.add("d-none")
  reservationsList.classList.add("d-none")

  let userId = null
  let userEmail = null

  const userDataStr = localStorage.getItem("currentUserData")
  if (userDataStr) {
    try {
      const userData = JSON.parse(userDataStr)
      if (userData.id) {
        userId = userData.id
      }
      if (userData.correo) {
        userEmail = userData.correo
      }
    } catch (e) {
      console.error("Error al parsear datos de usuario en caché:", e)
    }
  }

  if (!userId && !userEmail) {
    userEmail = localStorage.getItem("currentUserEmail") || localStorage.getItem("usuarioLogueado")
  }

  if (!userId && !userEmail) {
    reservationsLoading.classList.add("d-none")
    noReservationsMessage.classList.remove("d-none")
    return
  }

  const payload = {}
  if (userId) {
    payload.usuario_id = userId
  } else {
    payload.correo = userEmail
  }

  fetch("https://hotelitus.onrender.com/user-reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Error al obtener reservas")
      }
      return response.json()
    })
    .then((data) => {
      reservationsLoading.classList.add("d-none")

      if (data.reservas && data.reservas.length > 0) {
        reservationsList.classList.remove("d-none")
        reservationsTableBody.innerHTML = ""

        data.reservas.forEach((reserva) => {
          const row = document.createElement("tr")

          const fechaInicio = new Date(reserva.fecha_inicio).toLocaleDateString()
          const fechaFin = new Date(reserva.fecha_fin).toLocaleDateString()

          let estadoClass = ""
          let estadoTexto = ""
          if (reserva.estado === "confirmada") {
            estadoClass = "bg-success"
            estadoTexto = "CONFIRMADA"
          } else if (reserva.estado === "pendiente_pago") {
            estadoClass = "bg-warning"
            estadoTexto = "PENDIENTE PAGO"
          } else if (reserva.estado === "pendiente") {
            estadoClass = "bg-info"
            estadoTexto = "PENDIENTE"
          } else if (reserva.estado === "cancelada") {
            estadoClass = "bg-danger"
            estadoTexto = "CANCELADA"
          }

          row.innerHTML = `
            <td>${fechaInicio}</td>
            <td>${fechaFin}</td>
            <td>${getTipoHabitacion(reserva.habitacion_id)}</td>
            <td>${reserva.huespedes || "-"}</td>
            <td><span class="badge ${estadoClass}">${estadoTexto}</span></td>
            <td>
              ${
                reserva.estado !== "cancelada" && reserva.estado !== "confirmada"
                  ? `<button class="btn btn-sm btn-outline-danger cancel-reservation" data-id="${reserva.id}">
                  <i class="fas fa-times-circle"></i> Cancelar
                </button>`
                  : "-"
              }
            </td>
          `

          reservationsTableBody.appendChild(row)
        })

        document.querySelectorAll(".cancel-reservation").forEach((btn) => {
          btn.addEventListener("click", function () {
            const reservaId = this.getAttribute("data-id")
            if (confirm("¿Está seguro que desea cancelar esta reserva?")) {
              cancelReservation(reservaId)
            }
          })
        })
      } else {
        noReservationsMessage.classList.remove("d-none")
      }
    })
    .catch((error) => {
      console.error("Error al cargar reservas:", error)
      reservationsLoading.classList.add("d-none")
      noReservationsMessage.classList.remove("d-none")
      noReservationsMessage.querySelector("h5").textContent = "Error al cargar reservas"
      noReservationsMessage.querySelector("p").textContent =
        "Ha ocurrido un error. Por favor, inténtelo de nuevo más tarde."
    })
}

function cancelReservation(reservaId) {
  fetch("https://hotelitus.onrender.com/cancel-reservation", {
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
        loadUserReservations()
      } else {
        alert("Error al cancelar la reserva: " + (result.message || "Error desconocido"))
      }
    })
    .catch((error) => {
      console.error("Error al cancelar reserva:", error)
      alert("Error al cancelar la reserva. Por favor, inténtelo de nuevo.")
    })
}

function getTipoHabitacion(id) {
  const tiposHabitacion = {
    1: "Habitación Individual",
    2: "Habitación Doble",
    3: "Suite Ejecutiva",
  }

  return tiposHabitacion[id] || `Habitación ${id}`
}

function setupFieldValidation() {
  const nombreInput = document.getElementById("userName")
  if (nombreInput) {
    nombreInput.setAttribute("pattern", "[A-Za-zÁáÉéÍíÓóÚúÑñs]+")
    nombreInput.setAttribute("title", "Por favor ingrese solo letras")

    nombreInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^A-Za-zÁáÉéÍíÓóÚúÑñ\s]/g, "")
    })
  }

  const telefonoInput = document.getElementById("userTelefono")
  if (telefonoInput) {
    telefonoInput.setAttribute("pattern", "[0-9]+")
    telefonoInput.setAttribute("title", "Por favor ingrese solo números")

    telefonoInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "")
    })
  }
}

function initTooltips() {
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
  if (tooltipTriggerList.length > 0) {
    try {
      const bootstrap = window.bootstrap
      if (bootstrap) {
        const tooltipList = [...tooltipTriggerList].map((tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl))
      }
    } catch (error) {
      console.error("Error al inicializar tooltips:", error)
    }
  }
}

function setupCounterAnimation() {
  function animateCounter(el, target) {
    let count = 0
    const speed = 2000 / target
    const counter = setInterval(() => {
      count++
      el.textContent = count
      if (count >= target) {
        clearInterval(counter)
      }
    }, speed)
  }

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
    document.querySelectorAll(".years").forEach((el) => {
      const targetValue = Number.parseInt(el.textContent) || 0
      if (targetValue > 0) {
        animateCounter(el, targetValue)
      }
    })
  }
}

function handleResponsiveNav() {
  const navbarToggler = document.querySelector(".navbar-toggler")
  const navbarCollapse = document.querySelector(".navbar-collapse")

  if (navbarToggler && navbarCollapse) {
    document.querySelectorAll(".navbar-nav .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 992) {
          try {
            const bootstrap = window.bootstrap
            if (bootstrap) {
              const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse)
              if (bsCollapse) {
                bsCollapse.hide()
              }
            } else {
              navbarCollapse.classList.remove("show")
            }
          } catch (error) {
            console.error("Error al cerrar el menú móvil:", error)
            navbarCollapse.classList.remove("show")
          }
        }
      })
    })
  }
}

function handleNavbarScroll() {
  const navbar = document.querySelector(".navbar")

  if (navbar) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        navbar.classList.add("scrolled")
      } else {
        navbar.classList.remove("scrolled")
      }

      updateActiveNavLink()
    })

    if (window.scrollY > 50) {
      navbar.classList.add("scrolled")
    }

    updateActiveNavLink()
  }
}

function updateActiveNavLink() {
  const sections = document.querySelectorAll("section[id], header[id]")
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link:not(.btn)")

  let currentSection = ""
  const scrollPosition = window.scrollY + 200

  sections.forEach((section) => {
    const sectionTop = section.offsetTop
    const sectionHeight = section.offsetHeight

    if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
      currentSection = section.getAttribute("id")
    }
  })

  navLinks.forEach((link) => {
    link.classList.remove("active")
    const href = link.getAttribute("href")
    if (href === `#${currentSection}`) {
      link.classList.add("active")
    }
  })

  if (window.scrollY < 100) {
    navLinks.forEach((link) => {
      link.classList.remove("active")
      if (link.getAttribute("href") === "#inicio") {
        link.classList.add("active")
      }
    })
  }
}

function setupUserSession() {
  const loginLink = document.getElementById("loginLink")
  const createUserLink = document.getElementById("createUserLink")
  const userProfileDropdown = document.getElementById("userProfileDropdown")

  const urlParams = new URLSearchParams(window.location.search)
  const loggedIn = urlParams.get("logged")

  if (loggedIn === "true") {
    localStorage.setItem("userLoggedIn", "true")
    const userEmail = localStorage.getItem("usuarioLogueado")
    if (userEmail) {
      localStorage.setItem("currentUserEmail", userEmail)
    }
    window.history.replaceState({}, document.title, "/")
  }

  const isLogged = localStorage.getItem("userLoggedIn") === "true"

  if (isLogged) {
    if (loginLink) loginLink.style.display = "none"
    if (createUserLink) createUserLink.style.display = "none"
    if (userProfileDropdown) userProfileDropdown.style.display = "block"
    loadUserData()
  } else {
    if (loginLink) loginLink.style.display = "block"
    if (createUserLink) createUserLink.style.display = "block"
    if (userProfileDropdown) userProfileDropdown.style.display = "none"
  }

  const logoutLink = document.getElementById("logoutLink")
  if (logoutLink) {
    logoutLink.addEventListener("click", (e) => {
      e.preventDefault()
      localStorage.removeItem("userLoggedIn")
      localStorage.removeItem("currentUserEmail")
      localStorage.removeItem("currentUserData")
      window.location.reload()
    })
  }
}

function loadUserData() {
  const userEmail = localStorage.getItem("currentUserEmail") || localStorage.getItem("usuarioLogueado")

  if (!userEmail) return

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

  fetch("https://hotelitus.onrender.com/get-user-data", {
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
        localStorage.setItem("currentUserData", JSON.stringify(data.user))
        updateUserProfileUI(data.user)
      }
    })
    .catch((error) => {
      console.error("Error al cargar datos del usuario:", error)
      updateUserProfileUI({
        nombre: "Usuario",
        correo: userEmail,
      })
    })
}

function updateUserProfileUI(userData) {
  const userDisplayName = document.getElementById("userDisplayName")
  if (userDisplayName) {
    userDisplayName.textContent = userData.nombre || "Usuario"
  }

  const userFullName = document.getElementById("userFullName")
  if (userFullName) {
    userFullName.textContent = userData.nombre || "Usuario"
  }

  const userEmail = document.getElementById("userEmail")
  if (userEmail) {
    userEmail.textContent = userData.correo || ""
  }

  const userInitials = document.getElementById("userInitials")
  if (userInitials && userData.nombre) {
    const initials = userData.nombre
      .split(" ")
      .map((name) => name.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2)

    userInitials.textContent = initials || "U"
  }
}

function setupVerificationCode() {
  const verificationInputs = document.querySelectorAll(".verification-input")

  if (verificationInputs.length > 0) {
    verificationInputs.forEach((input, index) => {
      input.addEventListener("input", function () {
        if (this.value.length === 1) {
          if (index < verificationInputs.length - 1) {
            verificationInputs[index + 1].focus()
          }
        }
      })

      input.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !this.value && index > 0) {
          verificationInputs[index - 1].focus()
        }
      })
    })
  }

  const verificationForm = document.getElementById("verificationForm")
  if (verificationForm) {
    verificationForm.addEventListener("submit", (e) => {
      e.preventDefault()

      let code = ""
      verificationInputs.forEach((input) => {
        code += input.value
      })

      const userEmail = localStorage.getItem("pendingVerificationEmail")

      if (code.length === 6 && userEmail) {
        verifyCode(userEmail, code)
      } else {
        document.getElementById("verification-error").style.display = "block"
      }
    })
  }

  const resendCodeBtn = document.getElementById("resendCode")
  if (resendCodeBtn) {
    resendCodeBtn.addEventListener("click", function (e) {
      e.preventDefault()

      const userData = JSON.parse(localStorage.getItem("pendingUserData"))

      if (userData) {
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

        sendVerificationCode(userData)
      }
    })
  }
}

// Función mejorada para enviar código de verificación
function sendVerificationCode(userData) {
  const backendBaseUrl = "https://hotelitus.onrender.com"

  console.log("📤 Enviando datos de usuario:", userData)

  localStorage.setItem("pendingUserData", JSON.stringify(userData))
  localStorage.setItem("pendingVerificationEmail", userData.correo)

  // Mostrar indicador de carga
  const submitBtn = document.querySelector('#createUserForm button[type="submit"]')
  const originalBtnText = submitBtn.innerHTML
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando código...'
  submitBtn.disabled = true

  fetch(`${backendBaseUrl}/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  })
    .then((response) => {
      console.log("📥 Respuesta del servidor:", response.status)
      return response.json()
    })
    .then((result) => {
      console.log("📋 Resultado:", result)

      // Restaurar botón
      submitBtn.innerHTML = originalBtnText
      submitBtn.disabled = false

      if (result.success) {
        console.log("✅ Código enviado exitosamente")

        const bootstrap = window.bootstrap
        if (bootstrap) {
          const createUserModal = bootstrap.Modal.getInstance(document.getElementById("createUserModal"))
          if (createUserModal) {
            createUserModal.hide()
          }

          setTimeout(() => {
            const verificationModal = new bootstrap.Modal(document.getElementById("verificationModal"))
            verificationModal.show()
            document.querySelector(".verification-input").focus()
          }, 500)
        }
      } else {
        console.error("❌ Error del servidor:", result.message)
        alert(result.message || "Error al enviar el código de verificación. Por favor, inténtelo de nuevo.")
      }
    })
    .catch((error) => {
      console.error("❌ Error de red:", error)

      // Restaurar botón
      submitBtn.innerHTML = originalBtnText
      submitBtn.disabled = false

      alert("Error de conexión. Por favor, verifique su conexión a internet e inténtelo de nuevo.")
    })
}

function verifyCode(email, code) {
  const backendBaseUrl = "https://hotelitus.onrender.com"

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
        const bootstrap = window.bootstrap
        if (bootstrap) {
          const verificationModal = bootstrap.Modal.getInstance(document.getElementById("verificationModal"))
          if (verificationModal) {
            verificationModal.hide()
          }
        }

        localStorage.removeItem("pendingUserData")
        localStorage.removeItem("pendingVerificationEmail")

        alert("¡Cuenta creada con éxito! Ahora puede iniciar sesión.")

        setTimeout(() => {
          const bootstrap = window.bootstrap
          if (bootstrap) {
            const loginModal = new bootstrap.Modal(document.getElementById("loginModal"))
            loginModal.show()
          }
        }, 500)
      } else {
        document.getElementById("verification-error").style.display = "block"
      }
    })
    .catch((error) => {
      console.error("Error al verificar código:", error)
      document.getElementById("verification-error").style.display = "block"
    })
}

function setupDateConstraints() {
  const checkInInput = document.getElementById("checkIn")
  const checkOutInput = document.getElementById("checkOut")

  if (checkInInput && checkOutInput) {
    // Establecer fecha mínima como hoy
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Formatear fechas para el atributo min (YYYY-MM-DD)
    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    const todayFormatted = formatDate(today)
    const tomorrowFormatted = formatDate(tomorrow)

    checkInInput.min = todayFormatted
    checkOutInput.min = tomorrowFormatted

    // Actualizar fecha mínima de salida cuando cambia la entrada
    checkInInput.addEventListener("change", function () {
      if (this.value) {
        const nextDay = new Date(this.value)
        nextDay.setDate(nextDay.getDate() + 1)
        checkOutInput.min = formatDate(nextDay)

        // Si la fecha de salida es anterior a la nueva fecha mínima, actualizarla
        if (checkOutInput.value && new Date(checkOutInput.value) <= new Date(this.value)) {
          checkOutInput.value = formatDate(nextDay)
        }
      }
    })
  }
}

// Función para añadir mensajes de reserva en el HTML
function addReservationMessagesDiv() {
  const reservationForm = document.getElementById("reservationForm")
  if (reservationForm && !document.getElementById("reservationMessages")) {
    const messagesDiv = document.createElement("div")
    messagesDiv.id = "reservationMessages"
    messagesDiv.className = "mt-3"

    // Insertar después del botón de reserva
    const submitButton = reservationForm.querySelector('button[type="submit"]')
    if (submitButton) {
      submitButton.parentNode.insertBefore(messagesDiv, submitButton.nextSibling)
    } else {
      reservationForm.appendChild(messagesDiv)
    }
  }
}

// Ejecutar esta función al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  addReservationMessagesDiv()
})
