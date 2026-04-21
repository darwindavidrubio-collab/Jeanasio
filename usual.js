const API_URL = "http://127.0.0.1:8000";
// "https://jeanasio.onrender.com" para el online
// "http://127.0.0.1:8000" para local 

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

            document.getElementById("login-section").style.display = "none";
            document.getElementById("gym-section").style.display = "block";
            document.getElementById("header-actions").style.display = "flex";

            errorText.innerText = "";
            cargarEntrenadores();
            cargarUsuarios();

            const audio = document.getElementById("musicaFondo");
            if (audio) {
                audio.volume = document.getElementById("volumen-slider").value;
                audio.play().catch(e => console.log("Audio bloqueado:", e));
            }
        } else {
            errorText.innerText = "❌ Credenciales incorrectas.";
        }
    } catch (error) {
        errorText.innerText = "❌ Error de servidor (Asegúrate de que Python esté corriendo).";
    }
}

function cerrarSesion() {
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
        slider.value = 0;
    } else {
        btnMute.innerText = "🔊";
        slider.value = audio.volume > 0 ? audio.volume : 0.5;
    }
}

// ==========================================
// 3. PANEL DE CONTROL (CRUD Y FILTROS)
// ==========================================

async function cargarEntrenadores() {
    const ciudad = document.getElementById("filtro-ciudad") ? document.getElementById("filtro-ciudad").value : "";
    const pokemon = document.getElementById("filtro-pokemon") ? document.getElementById("filtro-pokemon").value : "";
    const medalla = document.getElementById("filtro-medalla") ? document.getElementById("filtro-medalla").value : "";

    const skip = (paginaActual - 1) * LIMITE_POR_PAGINA;
    let url = `${API_URL}/entrenadores?skip=${skip}&limit=${LIMITE_POR_PAGINA}&search=${encodeURIComponent(busquedaActual)}`;

    if (ciudad) url += `&ciudad=${encodeURIComponent(ciudad)}`;
    if (pokemon) url += `&pokemon=${encodeURIComponent(pokemon)}`;
    if (medalla !== "") url += `&medalla=${medalla}`;

    const respuesta = await fetch(url);
    const data = await respuesta.json();

    const entrenadores = data.entrenadores;
    const total = data.total;

    const lista = document.getElementById("lista-entrenadores");
    lista.innerHTML = "";

    if (!entrenadores || entrenadores.length === 0) {
        lista.innerHTML = "<p style='color: var(--text-muted); text-align: center;'>No se encontraron entrenadores.</p>";
        document.getElementById("btn-prev").disabled = true;
        document.getElementById("btn-next").disabled = true;
        document.getElementById("indicador-pagina").innerText = "Página 0";
        return;
    }

    entrenadores.forEach(e => {
        const nombrePokemon = e.pokemon ? e.pokemon.toLowerCase() : "pikachu";
        const spriteAnimado = `https://play.pokemonshowdown.com/sprites/ani/${nombrePokemon}.gif`;

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
                    <button type="button" class="btn btn-delete" onclick="eliminarEntrenador(${e.id})">Borrar</button>
                </div>
            </div>
        </article>`;
    });

    document.getElementById("indicador-pagina").innerText = `Página ${paginaActual}`;
    document.getElementById("btn-prev").disabled = paginaActual === 1;
    document.getElementById("btn-next").disabled = (paginaActual * LIMITE_POR_PAGINA) >= total;
}

function cambiarPagina(direccion) {
    paginaActual += direccion;
    cargarEntrenadores();
}

async function refrescarBaseDatos() {
    const btnRefresh = document.getElementById("btn-refresh");
    const textoOriginal = btnRefresh.innerHTML;

    btnRefresh.innerHTML = "⏳ Cargando...";
    btnRefresh.disabled = true;

    paginaActual = 1;
    busquedaActual = "";

    const buscador = document.getElementById("buscador-entrenadores");
    if (buscador) buscador.value = "";

    await cargarEntrenadores();

    setTimeout(() => {
        btnRefresh.innerHTML = textoOriginal;
        btnRefresh.disabled = false;
    }, 500);
}

function buscarEntrenador() {
    busquedaActual = document.getElementById("buscador-entrenadores").value;
    paginaActual = 1;
    cargarEntrenadores();
}

async function crearEntrenador() {
    const nombre = document.getElementById("nombre").value;
    const ciudad = document.getElementById("ciudad").value;
    const pokemon = document.getElementById("pokemon").value;
    const medallaRadio = document.querySelector('input[name="medalla_opt"]:checked');
    const medalla = medallaRadio ? (medallaRadio.value === "true") : false;

    if (!nombre || !ciudad || !pokemon) {
        alert("Por favor completa el nombre, la ciudad y elige un Pokémon.");
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/entrenadores`, {
            method: "POST",
            headers: obtenerHeadersVIP(),
            body: JSON.stringify({ nombre, ciudad, medalla, pokemon })
        });

        if (respuesta.ok) {
            cargarEntrenadores();
            document.getElementById("nombre").value = "";
        } else if (respuesta.status === 401) {
            alert("🚨 La sesión expiró.");
            cerrarSesion();
        } else {
            const error = await respuesta.json();
            alert("❌ Error: " + (error.detail || "No se pudo registrar"));
        }
    } catch (e) {
        console.error(e);
    }
}

async function eliminarEntrenador(id) {
    if (!confirm("¿Estás seguro de borrar a este entrenador?")) return;

    const respuesta = await fetch(`${API_URL}/entrenadores/${id}`, {
        method: "DELETE",
        headers: obtenerHeadersVIP()
    });

    if (respuesta.ok) {
        cargarEntrenadores();
    } else if (respuesta.status === 401) {
        alert("🚨 La sesión expiró.");
        cerrarSesion();
    } else {
        alert("🚨 Error: Permiso denegado.");
    }
}

async function eliminarTodos() {
    if (!confirm("¿Estás seguro de que quieres borrar TODA la base de datos?")) return;

    const respuesta = await fetch(`${API_URL}/eliminar-todo`, {
        method: "DELETE",
        headers: obtenerHeadersVIP()
    });

    if (respuesta.ok) {
        cargarEntrenadores();
    } else if (respuesta.status === 401) {
        alert("🚨 La sesión expiró.");
        cerrarSesion();
    } else {
        alert("🚨 Error: Permiso denegado.");
    }
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
                        <button type="button" class="btn btn-delete" onclick="eliminarUsuario(${u.id})">Expulsar 🗑️</button>
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
    } else if (respuesta.status === 401) {
        cerrarSesion();
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

    // Seguridad estricta: borra el token al recargar manualmente
    window.addEventListener("beforeunload", () => {
        localStorage.removeItem("tokenVIP");
    });
};
