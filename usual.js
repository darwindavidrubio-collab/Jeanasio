const API_URL = "https://jeanasio.onrender.com";
// "https://jeanasio.onrender.com"  cuando quiera cambiar algo del online
// "http://127.0.0.1:8000" para el loqueri
let paginaActual = 1;
const LIMITE_POR_PAGINA = 8;
let busquedaActual = "";


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
// 3. PANEL DE CONTROL (CRUD CON POKÉAPI)
// ==========================================

async function cargarEntrenadores() {
    // Calculamos desde dónde empezar a buscar en la base de datos
    const skip = (paginaActual - 1) * LIMITE_POR_PAGINA;
    const url = `${API_URL}/entrenadores?skip=${skip}&limit=${LIMITE_POR_PAGINA}&search=${encodeURIComponent(busquedaActual)}`;

    const respuesta = await fetch(url);
    const data = await respuesta.json();

    // El backend ahora envía { total: X, entrenadores: [...] }
    const entrenadores = data.entrenadores;
    const total = data.total;

    const lista = document.getElementById("lista-entrenadores");
    lista.innerHTML = "";

    if (entrenadores.length === 0) {
        lista.innerHTML = "<p style='color: var(--text-muted); text-align: center;'>No se encontraron entrenadores.</p>";
        document.getElementById("btn-prev").disabled = true;
        document.getElementById("btn-next").disabled = true;
        document.getElementById("indicador-pagina").innerText = "Página 0";
        return;
    }

    entrenadores.forEach(e => {
        const nombrePokemon = e.pokemon ? e.pokemon.toLowerCase() : "pikachu";
        const spriteAnimado = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${nombrePokemon}.gif`;

        lista.innerHTML += `
        <article style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; margin-bottom: 15px; border-left: 4px solid var(--accent);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <img src="${spriteAnimado}" alt="${nombrePokemon}" style="height: 60px; image-rendering: pixelated; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));">
                    <div>
                        <h3 style="margin: 0; color: var(--text-main);">${e.nombre}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: var(--text-muted);">
                            🌍 ${e.ciudad} | ${e.medalla ? "🏅 Campeón" : "🎒 Novato"} | ⚡ Poder: ${e.poder_total || "Desconocido"}
                        </p>
                    </div>
                </div>
                <div>
                    <button class="btn btn-delete" onclick="eliminarEntrenador(${e.id})">Borrar</button>
                </div>
            </div>
        </article>`;
    });

    // Control dinámico de los botones de Paginación
    document.getElementById("indicador-pagina").innerText = `Página ${paginaActual}`;
    document.getElementById("btn-prev").disabled = paginaActual === 1;

    // Si la cantidad de páginas superó o igualó el total de registros, bloqueamos el botón "Siguiente"
    const totalMostradosHastaAhora = paginaActual * LIMITE_POR_PAGINA;
    document.getElementById("btn-next").disabled = totalMostradosHastaAhora >= total;
}

//  Función para cambiar de página
function cambiarPagina(direccion) {
    paginaActual += direccion;
    cargarEntrenadores();
}

async function refrescarBaseDatos() {
    const btnRefresh = document.getElementById("btn-refresh");
    const textoOriginal = btnRefresh.innerHTML;

    // 1. Feedback visual: Avisamos al usuario y bloqueamos el botón para evitar spam de clics
    btnRefresh.innerHTML = "⏳ Cargando...";
    btnRefresh.disabled = true;

    // 2. Reseteamos la vista: Borramos búsquedas activas y volvemos a la página 1 para ver lo más reciente
    paginaActual = 1;
    document.getElementById("buscador-entrenadores").value = "";
    busquedaActual = "";

    // 3. Volvemos a consumir la API
    await cargarEntrenadores();

    // 4. Restauramos el botón a su estado normal (con un pequeño retraso para que se note el efecto)
    setTimeout(() => {
        btnRefresh.innerHTML = textoOriginal;
        btnRefresh.disabled = false;
    }, 500);
}



//Función de búsqueda en tiempo real
function buscarEntrenador() {
    busquedaActual = document.getElementById("buscador-entrenadores").value;
    paginaActual = 1; // Si busco a alguien, debo reiniciar a la página 1
    cargarEntrenadores();
}

async function crearEntrenador() {
    const nombre = document.getElementById("nombre").value;
    const ciudad = document.getElementById("ciudad").value;
    const pokemon = document.getElementById("pokemon").value; // ¡NUEVO CAMPO!
    const medallaRadio = document.querySelector('input[name="medalla_opt"]:checked');
    const medalla = medallaRadio ? (medallaRadio.value === "true") : false;

    if (!nombre || !ciudad || !pokemon) {
        alert("Por favor completa el nombre, la ciudad y elige un Pokémon.");
        return;
    }

    const respuesta = await fetch(`${API_URL}/entrenadores`, {
        method: "POST",
        headers: obtenerHeadersVIP(),
        body: JSON.stringify({ nombre, ciudad, medalla, pokemon }) // ENVIAMOS EL POKÉMON
    });

    if (respuesta.ok) {
        cargarEntrenadores();
        document.getElementById("nombre").value = "";
        document.getElementById("ciudad").value = "";
        document.getElementById("pokemon").value = ""; // Limpiamos el selector
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
            <article style="border-left: 5px solid #fbbf24; background: rgba(0,0,0,0.3); padding: 10px 15px; border-radius: 8px; margin-bottom: 10px;">
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

    window.addEventListener("beforeunload", () => {
        localStorage.removeItem("tokenVIP");
    });
};