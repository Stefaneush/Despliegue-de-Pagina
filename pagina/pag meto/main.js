document.getElementById('createUserForm').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevenir recarga de la página

    // Obtener valores del formulario
    const nombre = document.getElementById('userName').value;
    const correo = document.getElementById('userEmail').value;
    const telefono = document.getElementById('userTelefono').value;

    try {
        // Enviar datos al servidor
        const response = await fetch('/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, correo, telefono })
        });

        // Manejar la respuesta del servidor
        if (response.ok) {
            const data = await response.json();
            alert('Usuario creado con éxito: ' + JSON.stringify(data));
        } else {
            const error = await response.json();
            alert('Error al crear usuario: ' + error.error);
        }
    } catch (err) {
        console.error('Error de conexión:', err);
        alert('Hubo un problema al conectar con el servidor.');
    }
});