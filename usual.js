const API_URL = "https://jeanasio.onrender.com";

// ==========================================
// 1. SISTEMA DE SEGURIDAD VIP
// ==========================================

async function iniciarSesion() {
    const user = document.getElementById("login-username").value;
    const pass = document.getElementById("login-password").value;
    const errorText = document.getElementById("login-error");

    const formData = new URLSearchParams();
    formData.append("username", user);
    formData.append("password", pass);

    try {
        const respuesta = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData
        });

        if (respuesta.ok) {
            const datos = await respuesta.json();
            localStorage.setItem("tokenVIP", datos.access_token); // Guardamos la llave

            // Transición de pantalla
            document.getElementById("login-section").style.display = "none";
            document.getElementById("gym-section").style.display = "block";
            document.getElementById("header-actions").style.display = "block";

            errorText.innerText = "";
            cargarEntrenadores(); // Cargamos los datos
        } else {
            errorText.innerText = "❌ Credenciales incorrectas.";
        }
    } catch (error) {
        errorText.innerText = "❌ Error de servidor (Asegúrate de que Python esté corriendo).";
    }
}

function cerrarSesion() {
    localStorage.removeItem("tokenVIP");
    document.getElementById("login-section").style.display = "block";
    document.getElementById("gym-section").style.display = "none";
    document.getElementById("header-actions").style.display = "none";

    // Limpiamos los inputs
    document.getElementById("login-password").value = "";
}

function obtenerHeadersVIP() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("tokenVIP")}`
    };
}

// ==========================================
// 2. PANEL DE CONTROL (CRUD)
// ==========================================

async function cargarEntrenadores() {
    const respuesta = await fetch(`${API_URL}/entrenadores`);
    const entrenadores = await respuesta.json();

    const lista = document.getElementById("lista-entrenadores");
    lista.innerHTML = "";

    if (entrenadores.length === 0) {
        lista.innerHTML = "<p style='color: var(--text-muted); text-align: center;'>No hay entrenadores registrados aún.</p>";
        return;
    }

    entrenadores.forEach(e => {
        // Creamos la tarjeta usando tus estilos
        lista.innerHTML += `
        <article>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h3 style="margin: 0; color: var(--text-main);">${e.nombre}</h3>
                    <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: var(--text-muted);">
                        🌍 ${e.ciudad} | ${e.medalla ? "🏅 Campeón" : "🎒 Novato"} | ⚡ Poder: ${e.poder_total}
                    </p>
                </div>
                <div>
                    <button class="btn btn-delete" onclick="eliminarEntrenador(${e.id})">Borrar</button>
                </div>
            </div>
        </article>`;
    });
}

async function crearEntrenador() {
    const nombre = document.getElementById("nombre").value;
    const ciudad = document.getElementById("ciudad").value;

    // Leemos el Radio Button que esté seleccionado
    const medallaRadio = document.querySelector('input[name="medalla_opt"]:checked');
    const medalla = medallaRadio ? (medallaRadio.value === "true") : false;

    if (!nombre || !ciudad) {
        alert("Por favor completa el nombre y selecciona una ciudad.");
        return;
    }

    const respuesta = await fetch(`${API_URL}/entrenadores`, {
        method: "POST",
        headers: obtenerHeadersVIP(),
        body: JSON.stringify({ nombre, ciudad, medalla })
    });

    if (respuesta.ok) {
        cargarEntrenadores();
        document.getElementById("nombre").value = "";
        document.getElementById("ciudad").value = "";
    } else {
        alert("🚨 No tienes permiso o la sesión expiró.");
        cerrarSesion();
    }
}

async function eliminarEntrenador(id) {
    const respuesta = await fetch(`${API_URL}/entrenadores/${id}`, {
        method: "DELETE",
        headers: obtenerHeadersVIP()
    });

    if (respuesta.ok) cargarEntrenadores();
    else alert("🚨 Error: Permiso denegado.");
}

async function eliminarTodos() {
    if (!confirm("¿Estás seguro de que quieres borrar TODA la base de datos?")) return;

    const respuesta = await fetch(`${API_URL}/eliminar-todo`, {
        method: "DELETE",
        headers: obtenerHeadersVIP()
    });

    if (respuesta.ok) cargarEntrenadores();
    else alert("🚨 Error: Permiso denegado.");
}

// Comprobar si ya estamos logueados al cargar la página
window.onload = () => {
    if (localStorage.getItem("tokenVIP")) {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("gym-section").style.display = "block";
        document.getElementById("header-actions").style.display = "block";
        cargarEntrenadores();
    }
};