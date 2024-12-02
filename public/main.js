// Función para enviar los datos del formulario
document.getElementById('userForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const nombre = document.getElementById('nombre').value;
    const correo = document.getElementById('correo').value;
    const telefono = document.getElementById('telefono').value;

    const response = await fetch('/addUser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, correo, telefono })
    });

    if (response.ok) {
        // Limpiar el formulario
        document.getElementById('userForm').reset();

        // Recargar la lista de usuarios
        loadUsers();
    } else {
        alert('Error al agregar el usuario');
    }
});

// Función para cargar la lista de usuarios
async function loadUsers() {
    const response = await fetch('/usuarios');
    const users = await response.json();

    const userList = document.getElementById('userList');
    userList.innerHTML = ''; // Limpiar la lista actual

    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `Nombre: ${user.nombre}, Correo: ${user.correo}, Teléfono: ${user.telefono}`;
        userList.appendChild(li);
    });
}

// Cargar los usuarios al cargar la página
loadUsers();