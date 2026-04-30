const API_URL = "https://jeanasio.onrender.com";
// "https://jeanasio.onrender.com" para el online
// "http://127.0.0.1:8000" para local 

let paginaActual = 1;
const LIMITE_POR_PAGINA = 5;
let busquedaActual = "";

// ==========================================
// MAPA DE EMOJIS POR POKÉMON
// ==========================================
const POKEMON_EMOJIS = {
    bulbasaur: '🌿', ivysaur: '🌿🌿', venusaur: '🌳',
    charmander: '🔥', charmeleon: '🔥🔥', charizard: '🐲',
    squirtle: '💧', wartortle: '🌊', blastoise: '🛡️',
    pikachu: '⚡', raichu: '⚡⚡',
    eevee: '🐾', vaporeon: '💧💧', jolteon: '⚡⚡', flareon: '🔥🔥',
    zubat: '🦇', golbat: '🦇🩸', crobat: '🦇💨',
    gastly: '👻', haunter: '👻👻', gengar: '😈',
    dratini: '🐉', dragonair: '🐉🐉', dragonite: '🐉🐉🐉'
};

// ==========================================
// MOTOR DE RAYOS (Canvas 2D embebido)
// ==========================================
function dibujarRayos(canvas, porcentaje) {
    const ctx = canvas.getContext('2d');

    function rayo(ctx, x1, y1, x2, y2, profundidad, alpha) {
        if (profundidad === 0) return;
        const H = canvas.height;
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * ((x2 - x1) * 0.4 + 20); // Mayor dispersión horizontal
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * H * 1.8; // Mayor dispersión vertical

        // Capa exterior: azul eléctrico / cyan
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mx, my);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.6})`; // Azul claro, menor alfa
        ctx.lineWidth = profundidad * 0.5; // Más delgado
        ctx.shadowBlur = 8; // Menos glow
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();

        // Capa interior: blanco azulado brillante
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(mx, my);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(224, 242, 254, ${alpha * 0.8})`; // Blanco/cyan menos intenso
        ctx.lineWidth = profundidad * 0.25; // Más delgado
        ctx.shadowBlur = 10; // Menos glow
        ctx.shadowColor = '#7dd3fc';
        ctx.stroke();

        rayo(ctx, x1, y1, mx, my, profundidad - 1, alpha * 0.85);
        rayo(ctx, mx, my, x2, y2, profundidad - 1, alpha * 0.85);
    }

    function frame() {
        const W = canvas.width;
        const H = canvas.height;
        const xFin = Math.max(4, (porcentaje / 100) * W);

        ctx.clearRect(0, 0, W, H);
        ctx.shadowBlur = 0;

        // Fondo de aura Super Saiyan: amarillo difuminado a blanco en el centro
        const grad = ctx.createLinearGradient(0, 0, 0, H); // Gradiente vertical
        grad.addColorStop(0, 'rgba(245, 158, 11, 0.7)'); // Borde superior ambar
        grad.addColorStop(0.3, 'rgba(253, 224, 71, 0.9)'); // Amarillo brillante
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');   // Núcleo blanco
        grad.addColorStop(0.7, 'rgba(253, 224, 71, 0.9)'); // Amarillo brillante
        grad.addColorStop(1, 'rgba(245, 158, 11, 0.7)'); // Borde inferior ambar
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(0, 0, xFin, H, 10);
        ctx.fill();

        // Rayos (2 capas de intensidad para suavizar el efecto)
        for (let i = 0; i < 2; i++) {
            rayo(ctx, 2, H / 2, xFin - 2, H / 2, 4, 0.7 - i * 0.2); // Alfa base reducido a 0.7
        }

        // Chispas en el extremo
        for (let i = 0; i < 6; i++) {
            const sx = xFin + (Math.random() - 0.5) * 8;
            const sy = H / 2 + (Math.random() - 0.5) * H;
            ctx.beginPath();
            ctx.arc(sx, sy, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
            ctx.fillStyle = Math.random() > 0.5 ? '#bae6fd' : '#ffffff';
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#38bdf8';
            ctx.fill();
        }

        ctx.shadowBlur = 0;
        // Pulso: regenerar cada 110ms para el temblor eléctrico
        canvas._rayosTimer = setTimeout(() => requestAnimationFrame(frame), 110);
    }

    if (canvas._rayosTimer) clearTimeout(canvas._rayosTimer);
    frame();
}

// ==========================================
// 0. TOASTS Y MODALES CUSTOM
// ==========================================
function mostrarToast(mensaje, tipo = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;

    let icono = "ℹ️";
    if (tipo === "error") icono = "❌";
    else if (tipo === "warning") icono = "⚠️";
    else if (tipo === "success") icono = "✅";

    toast.innerHTML = `
        <span>${icono}</span>
        <span style="flex-grow: 1;">${mensaje}</span>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function mostrarModal(titulo, mensaje) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("custom-modal");
        const titleEl = document.getElementById("modal-title");
        const msgEl = document.getElementById("modal-message");
        const btnCancel = document.getElementById("modal-cancel");
        const btnConfirm = document.getElementById("modal-confirm");

        if (!overlay) {
            resolve(confirm(`${titulo}\n\n${mensaje}`));
            return;
        }

        titleEl.innerText = titulo;
        msgEl.innerText = mensaje;
        overlay.classList.add("active");

        const cleanup = () => {
            overlay.classList.remove("active");
            btnCancel.removeEventListener("click", onCancel);
            btnConfirm.removeEventListener("click", onConfirm);
        };

        const onCancel = () => { cleanup(); resolve(false); };
        const onConfirm = () => { cleanup(); resolve(true); };

        btnCancel.addEventListener("click", onCancel);
        btnConfirm.addEventListener("click", onConfirm);
    });
}

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

            const loginSection = document.getElementById("login-section");
            const gymSection = document.getElementById("gym-section");

            // Animación de salida login
            loginSection.classList.add("fade-out");

            setTimeout(() => {
                loginSection.style.display = "none";
                loginSection.classList.remove("fade-out");
                gymSection.style.display = "block";
                gymSection.classList.add("fade-in");

                document.getElementById("header-actions").style.display = "flex";
                errorText.innerText = "";

                cargarEntrenadores();
                cargarUsuarios();

                const audio = document.getElementById("musicaFondo");
                if (audio) {
                    audio.volume = document.getElementById("volumen-slider").value;
                    audio.play().catch(e => console.log("Audio bloqueado:", e));
                }
            }, 300);
        } else {
            errorText.innerText = "❌ Credenciales incorrectas.";
            mostrarToast("Credenciales incorrectas", "error");
        }
    } catch (error) {
        errorText.innerText = "❌ Error de servidor (Asegúrate de que Python esté corriendo).";
        mostrarToast("Error de conexión al servidor.", "error");
    }
}

function cerrarSesion() {
    const audio = document.getElementById("musicaFondo");
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }
    localStorage.removeItem("tokenVIP");

    const loginSection = document.getElementById("login-section");
    const gymSection = document.getElementById("gym-section");

    gymSection.classList.add("fade-out");
    setTimeout(() => {
        gymSection.style.display = "none";
        gymSection.classList.remove("fade-out");

        loginSection.style.display = "block";
        loginSection.classList.add("fade-in");
        setTimeout(() => loginSection.classList.remove("fade-in"), 500);

        document.getElementById("header-actions").style.display = "none";
        document.getElementById("admin-panel").style.display = "none";
        document.getElementById("login-password").value = "";
    }, 300);
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

    try {
        const respuesta = await fetch(url);
        const data = await respuesta.json();

        const entrenadores = data.entrenadores;
        const total = data.total;

        const lista = document.getElementById("lista-entrenadores");
        lista.innerHTML = "";

        if (!entrenadores || entrenadores.length === 0) {
            lista.innerHTML = "<p style='color: var(--text-muted); text-align: center; margin-top: 20px;'>No se encontraron entrenadores.</p>";
            document.getElementById("btn-prev").disabled = true;
            document.getElementById("btn-next").disabled = true;
            document.getElementById("indicador-pagina").innerText = "Página 0";
            return;
        }

        entrenadores.forEach((e, index) => {
            const nombrePokemon = e.pokemon ? e.pokemon.toLowerCase() : "pikachu";
            const spriteAnimado = `https://play.pokemonshowdown.com/sprites/ani/${nombrePokemon}.gif`;

            // Lógica de Rayos (Poder >= 9000)
            const poder = e.poder_total || 0;
            const esPoderExtremo = poder >= 9000;
            const porcentaje = Math.min((poder / 10000) * 100, 100);
            const colorBorde = esPoderExtremo ? "#c4b5fd" : "var(--accent)";
            const emojiPoder = POKEMON_EMOJIS[nombrePokemon] || '⚡';

            // Barra: canvas animado si DIOS, div normal si no
            const barraHtml = esPoderExtremo
                ? `<canvas class="progress-bar-rayos" id="rayos-${e.id}" height="14"></canvas>`
                : `<div class="progress-bar" style="width: ${porcentaje}%;"></div>`;

            lista.innerHTML += `
            <article id="card-${e.id}" class="fade-in" style="animation-delay: ${index * 0.05}s; border-left: 4px solid ${colorBorde}; background: rgba(10, 10, 18, 0.4);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;" class="card-content">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <img src="${spriteAnimado}" alt="${nombrePokemon}" style="height: 60px; image-rendering: pixelated; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));">
                        <div>
                            <h3 style="margin: 0; color: var(--text-main); font-size: 1.2rem;">${e.nombre}</h3>
                            <p style="margin: 5px 0 0 0; font-size: 0.9rem; color: var(--text-muted);">
                                🌍 ${e.ciudad} | <span class="badge ${e.medalla ? 'badge-campeon' : 'badge-novato'}">${e.medalla ? "🏅 Campeón" : "🎒 Novato"}</span>
                            </p>
                            <div style="margin-top: 8px;">
                                <span style="font-size: 0.8rem; color: ${esPoderExtremo ? '#c4b5fd' : 'var(--text-muted)'}; font-weight: ${esPoderExtremo ? '800' : 'normal'}">
                                    ${esPoderExtremo ? emojiPoder : ''} Poder: <span style="color: ${esPoderExtremo ? '#fde047' : 'inherit'}">${poder}</span> ${esPoderExtremo ? '&#x26A1; NIVEL DIOS' : ''}
                                </span>
                                <div class="progress-container">
                                    ${barraHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-actions" style="display: flex; flex-direction: column; gap: 8px; min-width: 130px;">
                        <button type="button" class="btn" style="background: rgba(6, 214, 160, 0.1); border: 1px solid var(--accent); color: var(--accent); font-size: 0.85rem; padding: 6px 10px;" onclick="prepararDuelo(${e.id}, '${e.nombre}', '${nombrePokemon}', ${poder})">⚔️ Duelo</button>
                        <button type="button" class="btn" style="background: rgba(56, 189, 248, 0.1); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.85rem; padding: 6px 10px;" onclick="entrenarEntrenador(${e.id})">⬆️ Entrenar</button>
                        <button type="button" class="btn" style="background: rgba(253, 224, 71, 0.1); border: 1px solid #fde047; color: #fde047; font-size: 0.85rem; padding: 6px 10px;" onclick="evolucionarEntrenador(${e.id}, '${nombrePokemon}')">✨ Evolucionar</button>
                        <button type="button" class="btn btn-delete" style="font-size: 0.85rem; padding: 6px 10px;" onclick="intentoEliminarEntrenador(${e.id}, ${poder})">Borrar 🗑️</button>
                    </div>
                </div>
            </article>`;

            // Inicializar canvas de rayos en el siguiente tick (DOM debe existir)
            if (esPoderExtremo) {
                setTimeout(() => {
                    const cvs = document.getElementById(`rayos-${e.id}`);
                    if (cvs) {
                        cvs.width = cvs.offsetWidth || cvs.parentElement.offsetWidth || 200;
                        dibujarRayos(cvs, porcentaje);
                    }
                }, 0);
            }
        });

        document.getElementById("indicador-pagina").innerText = `Página ${paginaActual}`;
        document.getElementById("btn-prev").disabled = paginaActual === 1;
        document.getElementById("btn-next").disabled = (paginaActual * LIMITE_POR_PAGINA) >= total;
    } catch (err) {
        console.error(err);
    }
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
        mostrarToast("Base de datos actualizada", "success");
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
        mostrarToast("Por favor completa el nombre, la ciudad y elige un Pokémon.", "warning");
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
            mostrarToast(`¡Entrenador ${nombre} registrado con éxito!`, "success");
        } else if (respuesta.status === 401) {
            mostrarToast("La sesión expiró.", "error");
            cerrarSesion();
        } else if (respuesta.status === 400) {
            const error = await respuesta.json();
            mostrarToast("⚠️ " + error.detail, "warning");
        } else {
            const error = await respuesta.json();
            mostrarToast("Error: " + (error.detail || "No se pudo registrar"), "error");
        }
    } catch (e) {
        console.error(e);
        mostrarToast("Error de conexión al servidor.", "error");
    }
}

function intentoEliminarEntrenador(id, poder) {
    const card = document.getElementById(`card-${id}`);
    if (poder > 7000 && card) {
        card.classList.add("interface-glitch");
        setTimeout(() => {
            card.classList.remove("interface-glitch");
            eliminarEntrenador(id);
        }, 500); // Dar tiempo al glitch antes de mostrar modal
    } else {
        eliminarEntrenador(id);
    }
}

async function eliminarEntrenador(id) {
    const confirmado = await mostrarModal("Eliminar Entrenador", "¿Estás seguro de borrar a este entrenador permanentemente?");
    if (!confirmado) return;

    try {
        const respuesta = await fetch(`${API_URL}/entrenadores/${id}`, {
            method: "DELETE",
            headers: obtenerHeadersVIP()
        });

        if (respuesta.ok) {
            mostrarToast("Entrenador eliminado", "success");
            cargarEntrenadores();
        } else if (respuesta.status === 401) {
            mostrarToast("La sesión expiró.", "error");
            cerrarSesion();
        } else {
            mostrarToast("Error: Permiso denegado.", "error");
        }
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// NUEVAS FUNCIONES: ENTRENAR Y EVOLUCIONAR
// ==========================================

async function entrenarEntrenador(id) {
    try {
        const respuesta = await fetch(`${API_URL}/entrenadores/${id}/entrenar`, {
            method: "PUT"
        });
        const data = await respuesta.json();

        if (respuesta.ok) {
            mostrarToast(data.mensaje, "success");
            cargarEntrenadores();
        } else {
            mostrarToast(data.detail, "error");
        }
    } catch (err) {
        mostrarToast("Error de conexión al entrenar", "error");
    }
}

let eeveeTargetId = null;

function evolucionarEntrenador(id, pokemonActual) {
    if (pokemonActual.toLowerCase() === "eevee") {
        eeveeTargetId = id;
        document.getElementById("eevee-modal").classList.add("active");
    } else {
        ejecutarEvolucion(id, null);
    }
}

function cerrarEeveeModal() {
    document.getElementById("eevee-modal").classList.remove("active");
    eeveeTargetId = null;
}

function confirmarEvolucionEevee(nuevaForma) {
    if (eeveeTargetId) {
        ejecutarEvolucion(eeveeTargetId, nuevaForma);
        cerrarEeveeModal();
    }
}

async function ejecutarEvolucion(id, evolucionForzada) {
    try {
        const bodyReq = evolucionForzada ? { evolucion_forzada: evolucionForzada } : {};

        const respuesta = await fetch(`${API_URL}/entrenadores/${id}/evolucionar`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bodyReq)
        });

        const data = await respuesta.json();

        if (respuesta.ok) {
            mostrarToast(data.mensaje, "success");
            cargarEntrenadores();
        } else {
            mostrarToast(data.detail, "warning");
        }
    } catch (err) {
        mostrarToast("Error de conexión al evolucionar", "error");
    }
}

// ==========================================
// MOTOR DE COMBATE 3D
// ==========================================

const POKEMON_POWER_DATA = {
    "bulbasaur": { label: "Básico" }, "ivysaur": { label: "Evolución 1" }, "venusaur": { label: "Evolución Final" },
    "charmander": { label: "Básico" }, "charmeleon": { label: "Evolución 1" }, "charizard": { label: "Evolución Final" },
    "squirtle": { label: "Básico" }, "wartortle": { label: "Evolución 1" }, "blastoise": { label: "Evolución Final" },
    "pikachu": { label: "Básico" }, "raichu": { label: "Evolución Final" },
    "eevee": { label: "Básico" }, "vaporeon": { label: "Evolución Final" }, "jolteon": { label: "Evolución Final" }, "flareon": { label: "Evolución Final" },
    "zubat": { label: "Básico" }, "golbat": { label: "Evolución 1" }, "crobat": { label: "Evolución Final" },
    "gastly": { label: "Básico" }, "haunter": { label: "Evolución 1" }, "gengar": { label: "Evolución Final" },
    "dratini": { label: "Básico" }, "dragonair": { label: "Evolución 1" }, "dragonite": { label: "Evolución Final" }
};

const POKEMON_ATAQUES = {
    "bulbasaur": ["Látigo Cepa", "Hoja Afilada"], "ivysaur": ["Polvo Veneno", "Rayo Solar"], "venusaur": ["Planta Feroz", "Rayo Solar"],
    "charmander": ["Ascuas", "Arañazo"], "charmeleon": ["Lanzallamas", "Garra Dragón"], "charizard": ["Llamarada", "Anillo Ígneo"],
    "squirtle": ["Burbuja", "Pistola Agua"], "wartortle": ["Rayo Aurora", "Mordisco"], "blastoise": ["Hidrobomba", "Cabezazo"],
    "pikachu": ["Impactrueno", "Ataque Rápido"], "raichu": ["Rayo", "Trueno"],
    "eevee": ["Placaje", "Ataque Rápido"], "vaporeon": ["Rayo Aurora", "Hidropulso"], "jolteon": ["Rayo", "Onda Trueno"], "flareon": ["Giro Fuego", "Llamarada"],
    "zubat": ["Chupavidas", "Supersónico"], "golbat": ["Mordisco", "Ataque Ala"], "crobat": ["Veneno X", "Tajo Aéreo"],
    "gastly": ["Lengüetazo", "Rayo Confuso"], "haunter": ["Puño Sombra", "Tinieblas"], "gengar": ["Bola Sombra", "Come Sueños"],
    "dratini": ["Ciclón", "Onda Trueno"], "dragonair": ["Carga Dragón", "Golpe Cuerpo"], "dragonite": ["Enfado", "Hiperrayo"]
};

let duelState = {
    entrenadorA: null,
    entrenadorB: null,
    rounds: [],
    timerId: null,
    actions: [] // Cola de acciones secuenciales
};

async function prepararDuelo(id, nombre, pokemon, poder) {
    duelState.entrenadorA = { id, nombre, pokemon, poder };

    const rival = await seleccionarRival(id);
    if (!rival) return;

    duelState.entrenadorB = rival;

    iniciarArena();
}

let rivalSelectionResolve = null;

async function seleccionarRival(miId) {
    try {
        const respuesta = await fetch(`${API_URL}/entrenadores`);
        const data = await respuesta.json();
        const rivales = data.entrenadores.filter(e => e.id !== miId);

        if (rivales.length === 0) {
            mostrarToast("No hay otros entrenadores en la base de datos para luchar.", "warning");
            return null;
        }

        // Mostrar el modal y construir la lista
        const modal = document.getElementById("rival-modal");
        const listaContenedor = document.getElementById("lista-rivales");
        const buscadorInput = document.getElementById("buscador-rival-modal");

        listaContenedor.innerHTML = "";
        buscadorInput.value = ""; // Limpiar buscador previo

        rivales.forEach(rival => {
            const btn = document.createElement("button");
            btn.className = "btn rival-btn";
            btn.style.textAlign = "left";
            btn.style.display = "flex";
            btn.style.justifyContent = "space-between";
            btn.style.alignItems = "center";
            btn.style.background = "var(--bg-card)";
            btn.style.border = "1px solid var(--border)";
            btn.style.padding = "10px";
            btn.style.color = "var(--text-main)"; // CORRECCIÓN: Letras blancas

            // Guardamos datos en dataset para el buscador
            btn.dataset.nombre = rival.nombre.toLowerCase();
            btn.dataset.pokemon = rival.pokemon.toLowerCase();

            const icono = POKEMON_EMOJIS[rival.pokemon.toLowerCase()] || '🐾';

            btn.innerHTML = `
                <span><strong>${rival.nombre}</strong> <span style="color:var(--text-muted);font-size:0.8rem;">(${rival.ciudad})</span></span>
                <span>${icono} ${rival.pokemon.toUpperCase()} <span style="color:var(--warning);font-size:0.8rem;">[Poder: ${rival.poder_total}]</span></span>
            `;

            btn.onclick = () => {
                // CORRECCIÓN: Resolver y cerrar limpiamente
                document.getElementById("rival-modal").classList.remove("active");
                if (rivalSelectionResolve) {
                    const resolverLocal = rivalSelectionResolve;
                    rivalSelectionResolve = null; // Limpiar global antes de resolver
                    resolverLocal({
                        id: rival.id,
                        nombre: rival.nombre,
                        pokemon: rival.pokemon.toLowerCase(),
                        poder: rival.poder_total
                    });
                }
            };

            listaContenedor.appendChild(btn);
        });

        // Lógica del buscador en tiempo real
        buscadorInput.oninput = (e) => {
            const termino = e.target.value.toLowerCase();
            const botones = listaContenedor.querySelectorAll('.rival-btn');

            botones.forEach(btn => {
                const coincideNombre = btn.dataset.nombre.includes(termino);
                const coincidePokemon = btn.dataset.pokemon.includes(termino);

                if (coincideNombre || coincidePokemon) {
                    btn.style.display = "flex";
                } else {
                    btn.style.display = "none";
                }
            });
        };

        modal.classList.add("active");

        return new Promise(resolve => {
            rivalSelectionResolve = resolve;
        });
    } catch (e) {
        mostrarToast("Error buscando rivales", "error");
        return null;
    }
}

function cerrarRivalModal() {
    document.getElementById("rival-modal").classList.remove("active");
    if (rivalSelectionResolve) {
        // Resolve con null si se cancela manualmente para abortar el duelo
        rivalSelectionResolve(null);
        rivalSelectionResolve = null;
    }
}

function iniciarArena() {
    const modal = document.getElementById("duel-modal");
    modal.classList.add("active");

    const a = duelState.entrenadorA;
    const b = duelState.entrenadorB;

    const spriteA = document.getElementById("duel-sprite-a");
    spriteA.src = `https://play.pokemonshowdown.com/sprites/ani-back/${a.pokemon}.gif`;
    spriteA.onerror = function () {
        this.src = `https://play.pokemonshowdown.com/sprites/ani/${a.pokemon}.gif`;
        this.style.transform = "scaleX(-1)";
    };

    const spriteB = document.getElementById("duel-sprite-b");
    spriteB.src = `https://play.pokemonshowdown.com/sprites/ani/${b.pokemon}.gif`;
    spriteB.style.transform = "scaleX(1)";

    document.getElementById("duel-name-a").innerText = `${a.nombre} (${a.pokemon.toUpperCase()})`;
    document.getElementById("duel-name-b").innerText = `${b.nombre} (${b.pokemon.toUpperCase()})`;

    document.getElementById("battle-log-content").innerHTML = "";
    document.getElementById("duel-winner").style.display = "none";
    document.getElementById("battle-message-box").style.display = "none";

    // Resetear glow
    document.getElementById("duel-sprite-a").classList.remove("low-hp-glow");
    document.getElementById("duel-sprite-b").classList.remove("low-hp-glow");

    simularCombate();
    iniciarCuentaRegresiva();
}

function cerrarDuelo() {
    document.getElementById("duel-modal").classList.remove("active");
    if (duelState.timerId) clearInterval(duelState.timerId);

    // Resetear sprites
    document.getElementById("duel-sprite-a").style.filter = "none";
    document.getElementById("duel-sprite-b").style.filter = "none";
    document.getElementById("duel-sprite-a").classList.remove("dead-sprite");
    document.getElementById("duel-sprite-b").classList.remove("dead-sprite");
}

function iniciarCuentaRegresiva() {
    const overlay = document.getElementById("countdown-overlay");
    const text = document.getElementById("countdown-text");
    overlay.style.display = "flex";

    let count = 3;
    text.innerText = count;

    const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
            text.innerText = count;
            text.style.animation = 'none';
            text.offsetHeight;
            text.style.animation = 'countAnim 0.8s ease-in-out';
        } else if (count === 0) {
            text.innerText = "¡COMBATE!";
            text.style.animation = 'none';
            text.offsetHeight;
            text.style.animation = 'countAnim 0.8s ease-in-out';
        } else {
            clearInterval(countInterval);
            overlay.style.display = "none";
            reproducirCombate(duelState.actions);
        }
    }, 1000);
}

function simularCombate() {
    const a = duelState.entrenadorA;
    const b = duelState.entrenadorB;

    const hpA_max = Math.max(1, Math.floor(a.poder / 3));
    const hpB_max = Math.max(1, Math.floor(b.poder / 3));

    let hpA = hpA_max;
    let hpB = hpB_max;

    const dmgA_base = a.poder * 0.025;
    const dmgB_base = b.poder * 0.025;

    const getDefensa = (pokemon) => {
        const stats = POKEMON_POWER_DATA[pokemon];
        if (!stats) return 0;
        if (stats.label === "Evolución 1") return 0.10;
        if (stats.label === "Evolución Final") return 0.20;
        return 0;
    };

    const defA = getDefensa(a.pokemon);
    const defB = getDefensa(b.pokemon);

    duelState.actions = [];

    // El primer estado inicial para UI
    duelState.actions.push({ type: 'setup', hpA_max, hpB_max });

    let round = 1;
    while (hpA > 0 && hpB > 0 && round <= 20) {
        // Ataque de A hacia B
        const critA = 0.85 + Math.random() * 0.40;
        let dmgA = Math.floor(dmgA_base * critA * (1 - defB));
        if (dmgA < 1) dmgA = 1;

        hpB -= dmgA;
        if (hpB < 0) hpB = 0;

        const ataquesA = POKEMON_ATAQUES[a.pokemon] || ["Placaje"];
        const ataqueUsadoA = ataquesA[Math.floor(Math.random() * ataquesA.length)];

        duelState.actions.push({
            type: 'attack',
            attacker: 'a',
            target: 'b',
            pokemonName: a.pokemon.toUpperCase(),
            attackName: ataqueUsadoA,
            dmg: dmgA,
            hpAfter: hpB,
            isCrit: critA > 1.18,
            round: round
        });

        if (hpB <= 0) break;

        // Ataque de B hacia A
        const critB = 0.85 + Math.random() * 0.40;
        let dmgB = Math.floor(dmgB_base * critB * (1 - defA));
        if (dmgB < 1) dmgB = 1;

        hpA -= dmgB;
        if (hpA < 0) hpA = 0;

        const ataquesB = POKEMON_ATAQUES[b.pokemon] || ["Placaje"];
        const ataqueUsadoB = ataquesB[Math.floor(Math.random() * ataquesB.length)];

        duelState.actions.push({
            type: 'attack',
            attacker: 'b',
            target: 'a',
            pokemonName: b.pokemon.toUpperCase(),
            attackName: ataqueUsadoB,
            dmg: dmgB,
            hpAfter: hpA,
            isCrit: critB > 1.18,
            round: round
        });

        round++;
    }

    duelState.actions.push({
        type: 'end',
        hpA, hpB, hpA_max, hpB_max
    });
}

function reproducirCombate(actions) {
    let i = 0;
    const msgBox = document.getElementById("battle-message-box");
    const msgText = document.getElementById("battle-message-text");

    const hpBarA = document.getElementById("duel-hp-a");
    const hpBarB = document.getElementById("duel-hp-b");
    const hpTextA = document.getElementById("duel-hp-text-a");
    const hpTextB = document.getElementById("duel-hp-text-b");

    let maxA = 1;
    let maxB = 1;

    duelState.timerId = setInterval(() => {
        if (i >= actions.length) {
            clearInterval(duelState.timerId);
            msgBox.style.display = "none";
            return;
        }

        const action = actions[i];

        if (action.type === 'setup') {
            maxA = action.hpA_max;
            maxB = action.hpB_max;

            hpBarA.style.width = "100%";
            hpBarB.style.width = "100%";
            hpTextA.innerText = `${maxA}/${maxA}`;
            hpTextB.innerText = `${maxB}/${maxB}`;
            i++;
            return;
        }

        if (action.type === 'end') {
            mostrarGanador(action);
            msgBox.style.display = "none";
            clearInterval(duelState.timerId);
            return;
        }

        if (action.type === 'attack') {
            // Mostrar el mensaje tipo GBA
            msgBox.style.display = "block";
            msgText.innerText = `¡${action.pokemonName} usó ${action.attackName.toUpperCase()}!`;

            // Log de la terminal para historial
            const logEl = document.getElementById("battle-log-content");
            const containerLog = document.getElementById("battle-log");
            logEl.innerHTML += `<p>> ${action.pokemonName} ataca a ${action.target.toUpperCase()} con ${action.attackName} (-${action.dmg} HP) ${action.isCrit ? '🔥 CRÍTICO' : ''}</p>`;
            containerLog.scrollTop = containerLog.scrollHeight;

            // Animación de Daño (Blanco + Floater)
            animarGolpeBlanco(action.target, action.dmg, action.isCrit);

            // Actualizar Barra de Vida del objetivo
            const targetBar = action.target === 'a' ? hpBarA : hpBarB;
            const targetText = action.target === 'a' ? hpTextA : hpTextB;
            const maxHpTarget = action.target === 'a' ? maxA : maxB;

            const pct = (action.hpAfter / maxHpTarget) * 100;

            // Vibrar barra
            targetBar.parentElement.classList.remove('hp-bar-shake');
            void targetBar.parentElement.offsetWidth; // trigger reflow
            targetBar.parentElement.classList.add('hp-bar-shake');

            targetBar.style.width = `${pct}%`;
            targetBar.style.backgroundColor = pct > 50 ? "#4ade80" : pct > 20 ? "#facc15" : "#ef4444";
            targetText.innerText = `${action.hpAfter}/${maxHpTarget}`;

            // Glow Rojo si HP <= 40%
            const spriteDestino = document.getElementById(`duel-sprite-${action.target}`);
            if (pct <= 40 && action.hpAfter > 0) {
                spriteDestino.classList.add("low-hp-glow");
            } else {
                spriteDestino.classList.remove("low-hp-glow");
            }

            // Flash Crítico global
            if (action.isCrit) {
                const modal = document.querySelector(".battle-modal");
                modal.style.boxShadow = "inset 0 0 100px rgba(255,255,255,0.8)";
                setTimeout(() => modal.style.boxShadow = "", 150);
            }
        }

        i++;
    }, 1800); // 1.8s por sub-turno para poder leer el ataque
}

function animarGolpeBlanco(target, dmg, isCrit) {
    const spriteContainer = document.getElementById(`sprite-container-${target}`);
    const sprite = document.getElementById(`duel-sprite-${target}`);

    // Flash Blanco
    sprite.classList.remove("white-flash");
    void sprite.offsetWidth;
    sprite.classList.add("white-flash");

    // Si es crítico sumamos el hit-glitch
    if (isCrit) {
        sprite.style.animation = 'none';
        void sprite.offsetWidth;
        sprite.style.animation = `hit-glitch 0.4s ease-out`;
    }

    // Damage Floater
    const floater = document.createElement("div");
    floater.className = "damage-floater";
    if (isCrit) floater.classList.add("crit-floater");
    floater.innerText = `-${dmg}`;

    const x = Math.random() * 40 + 20;
    const y = Math.random() * 40;
    floater.style.left = `${x}%`;
    floater.style.top = `${y}%`;

    spriteContainer.appendChild(floater);

    setTimeout(() => {
        if (spriteContainer.contains(floater)) spriteContainer.removeChild(floater);
    }, 1000);
}

function mostrarGanador(lastState) {
    const winnerDiv = document.getElementById("duel-winner");
    const textEl = document.getElementById("duel-winner-text");
    const winnerSprite = document.getElementById("winner-sprite");

    let winnerName = "";
    let winnerPokemon = "";

    if (lastState.hpA <= 0 && lastState.hpB <= 0) {
        textEl.innerText = "EMPATE ÉPICO";
        textEl.style.color = "var(--text-main)";
        winnerSprite.style.display = "none";
        document.getElementById("duel-sprite-a").classList.add("dead-sprite");
        document.getElementById("duel-sprite-b").classList.add("dead-sprite");
    } else if (lastState.hpA > lastState.hpB) {
        winnerName = duelState.entrenadorA.nombre;
        winnerPokemon = duelState.entrenadorA.pokemon;
        textEl.innerText = `${winnerName.toUpperCase()}`;
        winnerSprite.src = `https://play.pokemonshowdown.com/sprites/ani/${winnerPokemon}.gif`;
        winnerSprite.style.display = "inline-block";
        document.getElementById("duel-sprite-b").classList.add("dead-sprite");
    } else {
        winnerName = duelState.entrenadorB.nombre;
        winnerPokemon = duelState.entrenadorB.pokemon;
        textEl.innerText = `${winnerName.toUpperCase()}`;
        winnerSprite.src = `https://play.pokemonshowdown.com/sprites/ani/${winnerPokemon}.gif`;
        winnerSprite.style.display = "inline-block";
        document.getElementById("duel-sprite-a").classList.add("dead-sprite");
    }

    winnerDiv.style.display = "flex";
}



async function eliminarTodos() {
    const confirmado = await mostrarModal("Borrar Todos", "🚨 ATENCIÓN 🚨\n¿Estás completamente seguro de que quieres borrar TODA la base de datos de entrenadores? Esta acción no se puede deshacer.");
    if (!confirmado) return;

    try {
        const respuesta = await fetch(`${API_URL}/eliminar-todo`, {
            method: "DELETE",
            headers: obtenerHeadersVIP()
        });

        if (respuesta.ok) {
            mostrarToast("¡Todos los entrenadores han sido eliminados!", "success");
            cargarEntrenadores();
        } else if (respuesta.status === 401) {
            mostrarToast("La sesión expiró.", "error");
            cerrarSesion();
        } else {
            mostrarToast("Error: Permiso denegado.", "error");
        }
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// 4. BÓVEDA SECRETA (PANEL DE DIOS)
// ==========================================

async function cargarUsuarios() {
    try {
        const respuesta = await fetch(`${API_URL}/usuarios-panel`, { headers: obtenerHeadersVIP() });
        const panelAdmin = document.getElementById("admin-panel");

        if (respuesta.ok) {
            panelAdmin.style.display = "block";
            const usuarios = await respuesta.json();
            const lista = document.getElementById("lista-usuarios");
            lista.innerHTML = "";

            usuarios.forEach((u, index) => {
                const animDelay = index * 0.1;
                lista.innerHTML += `
                <article class="fade-in" style="animation-delay: ${animDelay}s; border-left: 4px solid var(--warning); background: rgba(20, 15, 5, 0.4); margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;" class="card-content">
                        <div>
                            <h3 style="margin: 0; color: var(--warning); font-size: 1.1rem;">Usuario: ${u.username}</h3>
                            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: var(--text-muted);">ID de Sistema: ${u.id}</p>
                        </div>
                        <div class="card-actions">
                            <button type="button" class="btn btn-delete" style="border: 1px solid var(--danger);" onclick="eliminarUsuario(${u.id})">Expulsar 🗑️</button>
                        </div>
                    </div>
                </article>`;
            });
        } else {
            panelAdmin.style.display = "none";
        }
    } catch (e) {
        console.error(e);
    }
}

async function eliminarUsuario(id) {
    const confirmado = await mostrarModal("Expulsar Usuario", "🚨 CUIDADO 🚨\n¿Estás seguro de que quieres EXPULSAR a este usuario del sistema para siempre?");
    if (!confirmado) return;

    try {
        const respuesta = await fetch(`${API_URL}/usuarios-panel/${id}`, {
            method: "DELETE",
            headers: obtenerHeadersVIP()
        });

        if (respuesta.ok) {
            mostrarToast("¡Usuario eliminado con éxito!", "success");
            cargarUsuarios();
        } else if (respuesta.status === 401) {
            cerrarSesion();
        } else {
            const error = await respuesta.json();
            mostrarToast(`No se pudo borrar: ${error.detail}`, "error");
        }
    } catch (e) {
        console.error(e);
    }
}

// ==========================================
// 5. COMPONENTES UI CUSTOM (SELECTS Y PASSWORD)
// ==========================================
function togglePassword() {
    const passInput = document.getElementById('login-password');
    const eyeIcon = document.getElementById('eye-icon');

    if (passInput.type === 'password') {
        passInput.type = 'text';
        eyeIcon.innerHTML = `
            <path d="M2 12s5-6 10-6 10 6 10 6-5 6-10 6-10-6-10-6z" />
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path d="M12 6v-3 M8.5 6.5l-2-2.5 M15.5 6.5l2-2.5 M5.5 8l-2.5-2 M18.5 8l2.5-2 M3 10.5l-2.5-1.5 M21 10.5l2.5-1.5" />
        `;
    } else {
        passInput.type = 'password';
        eyeIcon.innerHTML = `
            <path d="M2 12s5 6 10 6 10-6 10-6" />
            <path d="M12 18v3 M8.5 17.5l-2 2.5 M15.5 17.5l2 2.5 M5.5 16l-2.5 2 M18.5 16l2.5 2 M3 13.5l-2.5 1.5 M21 13.5l2.5 1.5" />
        `;
    }
}

function initCustomSelects() {
    const selects = document.querySelectorAll('.select-moderno');

    selects.forEach(select => {
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-wrapper')) return;

        select.style.display = 'none';

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';

        const triggerText = document.createElement('span');
        triggerText.innerText = select.options[select.selectedIndex]?.text || "Seleccionar...";
        trigger.appendChild(triggerText);

        const arrow = document.createElement('div');
        arrow.className = 'custom-arrow';
        trigger.appendChild(arrow);

        wrapper.appendChild(trigger);

        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'custom-options';

        Array.from(select.children).forEach(child => {
            if (child.tagName === 'OPTGROUP') {
                const optgroup = document.createElement('div');
                optgroup.className = 'custom-optgroup';
                optgroup.innerText = child.label;
                optionsContainer.appendChild(optgroup);

                Array.from(child.children).forEach(option => {
                    createCustomOption(option, select, triggerText, wrapper, optionsContainer);
                });
            } else if (child.tagName === 'OPTION') {
                createCustomOption(child, select, triggerText, wrapper, optionsContainer);
            }
        });

        wrapper.appendChild(optionsContainer);
        select.parentNode.insertBefore(wrapper, select.nextSibling);

        trigger.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = wrapper.classList.contains('open');
            document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
            if (!isOpen) wrapper.classList.add('open');
        });
    });

    document.addEventListener('click', function () {
        document.querySelectorAll('.custom-select-wrapper').forEach(w => w.classList.remove('open'));
    });
}

function createCustomOption(option, select, triggerText, wrapper, optionsContainer) {
    if (option.disabled && option.value === '') return;

    const customOption = document.createElement('div');
    customOption.className = 'custom-option';
    customOption.innerText = option.text;
    customOption.dataset.value = option.value;

    if (option.selected) customOption.classList.add('selected');

    customOption.addEventListener('click', function (e) {
        e.stopPropagation();
        triggerText.innerText = this.innerText;
        select.value = this.dataset.value;
        select.dispatchEvent(new Event('change'));

        Array.from(optionsContainer.querySelectorAll('.custom-option')).forEach(o => o.classList.remove('selected'));
        this.classList.add('selected');
        wrapper.classList.remove('open');
    });

    optionsContainer.appendChild(customOption);
}

// ==========================================
// 6. INICIALIZADOR AL CARGAR LA PÁGINA
// ==========================================
window.onload = () => {
    initCustomSelects(); // Inicializar UI Custom

    if (localStorage.getItem("tokenVIP")) {
        const loginSection = document.getElementById("login-section");
        const gymSection = document.getElementById("gym-section");

        loginSection.style.display = "none";
        gymSection.style.display = "block";
        document.getElementById("header-actions").style.display = "flex";

        cargarEntrenadores();
        cargarUsuarios();
    }

    // Seguridad estricta: borra el token al recargar manualmente
    window.addEventListener("beforeunload", () => {
        localStorage.removeItem("tokenVIP");
    });
};
