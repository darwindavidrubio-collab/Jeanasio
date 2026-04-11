const API_URL = "https://jeanasio.onrender.com";

// ==========================================
// 1. SISTEMA DE SEGURIDAD Y AUDIO VIP
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
            localStorage.setItem("tokenVIP", datos.access_token);

            // Transición de pantalla (Flexbox para el header)
            document.getElementById("login-section").style.display = "none";
            document.getElementById("gym-section").style.display = "block";
            document.getElementById("header-actions").style.display = "flex";

            errorText.innerText = "";
            cargarEntrenadores();
            cargarUsuarios(); // Carga el Panel de Dios

            // Iniciar Música Épica
            const audio = document.getElementById("musicaFondo");
            if (audio) {
                audio.volume = document.getElementById("volumen-slider").value;
                audio.play().catch(e => console.log("Navegador bloqueó el audio:", e));
            }
        } else {
            errorText.innerText = "❌ Credenciales incorrectas.";
        }
    } catch (error) {
        errorText.innerText = "❌ Error de servidor (Asegúrate de que Python esté corriendo).";
    }
}

function cerrarSesion() {
    if (!confirm("¿Estás seguro de que quieres cerrar tu sesión y salir del gimnasio?")) return;

    // Detener la música
    const audio = document.getElementById("musicaFondo");
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    localStorage.removeItem("tokenVIP");
    document.getElementById("login-section").style.display = "block";
    document.getElementById("gym-section").style.display = "none";
    document.getElementById("header-actions").style.display = "none";
    document.getElementById("admin-panel").style.display = "none";
    document.getElementById("login-password").value = "";
}

function obtenerHeadersVIP() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("tokenVIP")}`
    };
}

// ==========================================
// 2. CONTROLES DE MÚSICA
// ==========================================

function cambiarVolumen(valor) {
    const audio = document.getElementById("musicaFondo");
    const btnMute = document.getElementById("btn-mute");

    if (audio) {
        audio.volume = valor;
        if (valor == 0) {
            btnMute.innerText = "🔇";
            audio.muted = true;
        } else {
            btnMute.innerText = "🔊";
            audio.muted = false;
        }
    }
}

function mutearMusica() {
    const audio = document.getElementById("musicaFondo");
    const btnMute = document.getElementById("btn-mute");
    const slider = document.getElementById("volumen-slider");

    if (!audio || !btnMute) return;

    audio.muted = !audio.muted;

    if (audio.muted) {
        btnMute.innerText = "🔇";
        btnMute.setAttribute("aria-label", "Activar música");
        slider.value = 0;
    } else {
        btnMute.innerText = "🔊";
        btnMute.setAttribute("aria-label", "Silenciar música");
        slider.value = audio.volume > 0 ? audio.volume : 0.5;
        if (audio.volume === 0) audio.volume = 0.5;
    }
}

// ==========================================
// 3. PANEL DE CONTROL (CRUD)
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

// ==========================================
// 4. BÓVEDA SECRETA (PANEL DE DIOS)
// ==========================================

async function cargarUsuarios() {
    const respuesta = await fetch(`${API_URL}/usuarios-panel`, { headers: obtenerHeadersVIP() });
    const panelAdmin = document.getElementById("admin-panel");

    if (respuesta.ok) {
        panelAdmin.style.display = "block";
        const usuarios = await respuesta.json();
        const lista = document.getElementById("lista-usuarios");
        lista.innerHTML = "";

        usuarios.forEach(u => {
            lista.innerHTML += `
            <article style="border-left: 5px solid #fbbf24;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; color: var(--text-main);">Usuario: ${u.username}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: var(--text-muted);">ID de Sistema: ${u.id}</p>
                    </div>
                    <div>
                        <button class="btn btn-delete" onclick="eliminarUsuario(${u.id})">Expulsar 🗑️</button>
                    </div>
                </div>
            </article>`;
        });
    } else {
        panelAdmin.style.display = "none";
    }
}

async function eliminarUsuario(id) {
    if (!confirm(`🚨 CUIDADO 🚨\n¿Estás seguro de que quieres EXPULSAR a este usuario del sistema para siempre?`)) return;

    const respuesta = await fetch(`${API_URL}/usuarios-panel/${id}`, {
        method: "DELETE",
        headers: obtenerHeadersVIP()
    });

    if (respuesta.ok) {
        alert("¡Usuario eliminado con éxito!");
        cargarUsuarios();
    } else {
        const error = await respuesta.json();
        alert(`❌ No se pudo borrar: ${error.detail}`);
    }
}

// ==========================================
// 5. INICIALIZADOR AL CARGAR LA PÁGINA
// ==========================================
window.onload = () => {
    if (localStorage.getItem("tokenVIP")) {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("gym-section").style.display = "block";
        document.getElementById("header-actions").style.display = "flex";
        cargarEntrenadores();
        cargarUsuarios();
    }
};