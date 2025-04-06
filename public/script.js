// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si hay elementos con texto oculto
    checkHiddenText();
    
    // Inicializar AOS (Animate On Scroll) con manejo de errores
    initAOS();
    
    // Inicializar el mapa si existe el elemento
    initMap();
    
    // Configurar el modo oscuro
    setupDarkMode();
    
    // Configurar el botón de volver arriba
    setupBackToTop();
    
    // Configurar navegación suave
    setupSmoothScrolling();
    
    // Configurar modales
    setupModals();
    
    // Configurar validación de formularios
    setupFormValidation();
    
    // Inicializar tooltips de Bootstrap
    initTooltips();
    
    // Configurar animación de contadores
    setupCounterAnimation();
    
    // Manejar navegación responsiva
    handleResponsiveNav();
    
    // Detectar scroll para cambiar estilo de navbar
    handleNavbarScroll();
    
    // Configurar funcionalidad de login/logout
    setupLoginLogout();
    
    // Configurar API de backend
    setupBackendAPI();
});

/**
 * Verifica si hay elementos con texto oculto y los hace visibles
 */
function checkHiddenText() {
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, li, label, button');
    elements.forEach(el => {
        // Verificar estilos inline
        if (el.style.color === 'transparent' || 
            el.style.visibility === 'hidden' || 
            el.style.display === 'none' || 
            el.style.opacity === '0') {
            console.warn('Elemento con texto oculto (estilo inline):', el);
            // Forzar visibilidad
            el.style.color = '';
            el.style.visibility = '';
            el.style.display = '';
            el.style.opacity = '';
        }
        
        // Verificar estilos computados
        const styles = window.getComputedStyle(el);
        if (styles.color === 'rgba(0, 0, 0, 0)' || 
            styles.color === 'transparent' ||
            styles.visibility === 'hidden' || 
            styles.display === 'none' || 
            styles.opacity === '0') {
            console.warn('Elemento con texto oculto (estilo computado):', el);
            // Forzar visibilidad con !important
            el.setAttribute('style', 'color: inherit !important; visibility: visible !important; display: block !important; opacity: 1 !important');
        }
    });
}

/**
 * Inicializa la biblioteca AOS para animaciones al hacer scroll
 */
function initAOS() {
    try {
        if (typeof AOS !== 'undefined') {
            AOS.init({
                duration: 1000,
                once: true,
                offset: 100,
                disable: 'mobile' // Desactivar en móviles si causa problemas
            });
            console.log('AOS inicializado correctamente');
        } else {
            console.warn('AOS no está definido. Verifica que la biblioteca esté cargada correctamente.');
            // Desactivar atributos data-aos para evitar problemas
            document.querySelectorAll('[data-aos]').forEach(el => {
                el.removeAttribute('data-aos');
            });
        }
    } catch (error) {
        console.error('Error al inicializar AOS:', error);
        // Desactivar animaciones si hay error
        document.querySelectorAll('[data-aos]').forEach(el => {
            el.removeAttribute('data-aos');
        });
    }
}

/**
 * Inicializa el mapa de Leaflet si existe el elemento en la página
 */
function initMap() {
    // Coordenadas de Avenida Emilio Civit 367, Mendoza, Argentina
    const hotelLatitude = -32.88789;
    const hotelLongitude = -68.855;

    const mapElement = document.getElementById('map');
    if (mapElement) {
        try {
            const map = L.map('map').setView([hotelLatitude, hotelLongitude], 15);

            // Agregar capa de OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            // Agregar un marcador para el hotel
            const hotelIcon = L.icon({
                iconUrl: 'https://cdn.mapmarker.io/api/v1/pin?size=50&background=%23c8a97e&icon=fa-hotel&color=%23FFFFFF',
                iconSize: [50, 50],
                iconAnchor: [25, 50],
                popupAnchor: [0, -50]
            });

            L.marker([hotelLatitude, hotelLongitude], { icon: hotelIcon })
                .addTo(map)
                .bindPopup('<strong>Hotelituss</strong><br>Avenida Emilio Civit 367<br>Mendoza, Argentina')
                .openPopup();
                
            // Forzar actualización del mapa después de que se cargue completamente
            setTimeout(() => {
                map.invalidateSize();
            }, 500);
        } catch (error) {
            console.error('Error al inicializar el mapa:', error);
            // Mostrar mensaje de error en el mapa
            if (mapElement) {
                mapElement.innerHTML = '<div style="padding: 20px; text-align: center;">Error al cargar el mapa. Por favor, recargue la página.</div>';
            }
        }
    }
}

/**
 * Configura la funcionalidad del modo oscuro
 */
function setupDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            const icon = this.querySelector('i');
            
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
                localStorage.setItem('darkMode', 'enabled');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
                localStorage.setItem('darkMode', 'disabled');
            }
        });

        // Verificar preferencia de modo oscuro guardada
        if (localStorage.getItem('darkMode') === 'enabled') {
            document.body.classList.add('dark-mode');
            const icon = darkModeToggle.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            }
        }
    }
}

/**
 * Configura el botón de volver arriba
 */
function setupBackToTop() {
    const backToTopButton = document.getElementById('backToTop');
    
    if (backToTopButton) {
        // Mostrar/ocultar botón según la posición de scroll
        window.addEventListener('scroll', function() {
            if (window.scrollY > 300) {
                backToTopButton.classList.add('show');
            } else {
                backToTopButton.classList.remove('show');
            }
        });

        // Acción de volver arriba al hacer clic
        backToTopButton.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

/**
 * Configura la navegación suave para enlaces internos
 */
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Configura los modales de inicio de sesión y creación de usuario
 */
function setupModals() {
    // Manejar la apertura del modal de crear usuario
    const createUserLink = document.getElementById('createUserLink');
    if (createUserLink) {
        createUserLink.addEventListener('click', function(e) {
            e.preventDefault();
            const createUserModal = document.getElementById('createUserModal');
            if (createUserModal) {
                const modal = new bootstrap.Modal(createUserModal);
                modal.show();
            }
        });
    }

    // Manejar la apertura del modal de iniciar sesión
    const loginLink = document.getElementById('loginLink');
    if (loginLink) {
        loginLink.addEventListener('click', function(e) {
            e.preventDefault();
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                const modal = new bootstrap.Modal(loginModal);
                modal.show();
            }
        });
    }

    // Cambiar de modal de inicio de sesión a crear usuario
    const switchToCreateUser = document.getElementById('switchToCreateUser');
    if (switchToCreateUser) {
        switchToCreateUser.addEventListener('click', function(e) {
            e.preventDefault();
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                const bsLoginModal = bootstrap.Modal.getInstance(loginModal);
                if (bsLoginModal) {
                    bsLoginModal.hide();
                    setTimeout(function() {
                        const createUserModal = document.getElementById('createUserModal');
                        if (createUserModal) {
                            const modal = new bootstrap.Modal(createUserModal);
                            modal.show();
                        }
                    }, 500);
                }
            }
        });
    }

    // Cambiar de modal de crear usuario a inicio de sesión
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
        switchToLogin.addEventListener('click', function(e) {
            e.preventDefault();
            const createUserModal = document.getElementById('createUserModal');
            if (createUserModal) {
                const bsCreateUserModal = bootstrap.Modal.getInstance(createUserModal);
                if (bsCreateUserModal) {
                    bsCreateUserModal.hide();
                    setTimeout(function() {
                        const loginModal = document.getElementById('loginModal');
                        if (loginModal) {
                            const modal = new bootstrap.Modal(loginModal);
                            modal.show();
                        }
                    }, 500);
                }
            }
        });
    }
}

/**
 * Configura la validación de formularios
 */
function setupFormValidation() {
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
}

/**
 * Inicializa los tooltips de Bootstrap
 */
function initTooltips() {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0) {
        try {
            const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
        } catch (error) {
            console.error('Error al inicializar tooltips:', error);
        }
    }
}

/**
 * Configura la animación de contadores para números
 */
function setupCounterAnimation() {
    // Función para animar contadores
    function animateCounter(el, target) {
        let count = 0;
        const speed = 2000 / target; // 2 segundos para llegar al objetivo
        const counter = setInterval(() => {
            count++;
            el.textContent = count;
            if (count >= target) {
                clearInterval(counter);
            }
        }, speed);
    }
    
    // Iniciar animación cuando el elemento sea visible
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.target.classList.contains('years')) {
                    const targetValue = parseInt(entry.target.textContent) || 0;
                    if (targetValue > 0) {
                        animateCounter(entry.target, targetValue);
                        observer.unobserve(entry.target);
                    }
                }
            });
        });
        
        document.querySelectorAll('.years').forEach(el => {
            observer.observe(el);
        });
    } else {
        // Fallback para navegadores que no soportan IntersectionObserver
        document.querySelectorAll('.years').forEach(el => {
            const targetValue = parseInt(el.textContent) || 0;
            if (targetValue > 0) {
                animateCounter(el, targetValue);
            }
        });
    }
}

/**
 * Maneja la navegación responsiva
 */
function handleResponsiveNav() {
    const navbarToggler = document.querySelector('.navbar-toggler');
    const navbarCollapse = document.querySelector('.navbar-collapse');
    
    if (navbarToggler && navbarCollapse) {
        // Cerrar menú al hacer clic en un enlace en móvil
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth < 992) {
                    try {
                        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
                        if (bsCollapse) {
                            bsCollapse.hide();
                        }
                    } catch (error) {
                        console.error('Error al cerrar el menú móvil:', error);
                        // Fallback manual si bootstrap no está disponible
                        navbarCollapse.classList.remove('show');
                    }
                }
            });
        });
    }
}

/**
 * Detecta cuando la navbar debe cambiar de estilo al hacer scroll
 */
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
        
        // Aplicar clase inicial según la posición actual
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        }
    }
}
























/**
 * Configura la funcionalidad de login/logout
 */
function setupLoginLogout() {
    const loginBtn = document.getElementById('loginLink');
    const createUserBtn = document.getElementById('createUserLink');
    const logoutBtn = document.getElementById('logoutBtn');

    // Detectar si viene de un login exitoso con ?logged=true
    const urlParams = new URLSearchParams(window.location.search);
    const loggedIn = urlParams.get('logged');

    if (loggedIn === 'true') {
        localStorage.setItem('userLoggedIn', 'true');
        window.history.replaceState({}, document.title, "/"); // Limpiar la URL
    }

    // Mostrar u ocultar botones según estado
    const isLogged = localStorage.getItem('userLoggedIn') === 'true';

    if (isLogged) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (createUserBtn) createUserBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
    } else {
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (createUserBtn) createUserBtn.style.display = 'inline-block';
    }

    // Función para cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('userLoggedIn');
            window.location.reload(); // Refresca la página
        });
    }
}





















/**
 * Configura las funciones de API del backend
 */
function setupBackendAPI() {
    // URL base del backend en Render
    const backendBaseUrl = 'https://hotelitus.onrender.com';

    // Función para crear una nueva reserva (POST)
    window.createReserva = function(data) {
        fetch(`${backendBaseUrl}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            console.log('✅ Reserva creada:', result);
            alert('Reserva creada con éxito.');
        })
        .catch(error => {
            console.error('❌ Error al crear la reserva:', error);
            alert('Error al crear la reserva.');
        });
    }

    // Función para obtener todas las reservas (GET)
    window.getReservas = function() {
        fetch(`${backendBaseUrl}/select`)
        .then(response => response.json())
        .then(data => {
            console.log('📋 Reservas obtenidas:', data);
            // TODO: mostrar los datos en una tabla o lista en el DOM
        })
        .catch(error => {
            console.error('❌ Error al obtener reservas:', error);
            alert('Error al obtener reservas.');
        });
    }

    // Función para actualizar una reserva (GET con query params)
    window.updateReserva = function(id, nuevoNombre) {
        fetch(`${backendBaseUrl}/update?id=${id}&nombre=${nuevoNombre}`)
        .then(response => response.json())
        .then(result => {
            console.log('🔄 Reserva actualizada:', result);
            alert('Reserva actualizada correctamente.');
        })
        .catch(error => {
            console.error('❌ Error al actualizar reserva:', error);
            alert('Error al actualizar la reserva.');
        });
    }

    // Función para eliminar una reserva (GET con query param)
    window.deleteReserva = function(id) {
        fetch(`${backendBaseUrl}/delete?id=${id}`)
        .then(response => response.json())
        .then(result => {
            console.log('🗑️ Reserva eliminada:', result);
            alert('Reserva eliminada correctamente.');
        })
        .catch(error => {
            console.error('❌ Error al eliminar reserva:', error);
            alert('Error al eliminar la reserva.');
        });
    }
}
















