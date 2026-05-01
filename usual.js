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
// 2. CONTROLES DE MÚSICA Y SFX
// ==========================================

const sfxBatalla = new Audio("Musica/batalla.mp3");
sfxBatalla.loop = true;
const sfx3 = new Audio("Musica/count3.mp3");
const sfx2 = new Audio("Musica/count2.mp3");
const sfx1 = new Audio("Musica/count1.mp3");
const sfxGo = new Audio("Musica/countgo.mp3");

const todosLosAudios = [sfxBatalla, sfx3, sfx2, sfx1, sfxGo];

function cambiarVolumen(valor) {
    const audio = document.getElementById("musicaFondo");
    const btnMute = document.getElementById("btn-mute");

    if (audio) audio.volume = valor;
    todosLosAudios.forEach(a => {
        // Hacer que el GO suene un poco más fuerte (1.5x) sin exceder 1.0
        if (a === sfxGo) {
            a.volume = Math.min(valor * 1.5, 1.0);
        } else {
            a.volume = valor;
        }
    });

    if (valor == 0) {
        if (btnMute) btnMute.innerText = "🔇";
        if (audio) audio.muted = true;
        todosLosAudios.forEach(a => a.muted = true);
    } else {
        if (btnMute) btnMute.innerText = "🔊";
        if (audio) audio.muted = false;
        todosLosAudios.forEach(a => a.muted = false);
    }
}

function mutearMusica() {
    const audio = document.getElementById("musicaFondo");
    const btnMute = document.getElementById("btn-mute");
    const slider = document.getElementById("volumen-slider");

    if (!audio || !btnMute) return;

    const nuevoMuted = !audio.muted;
    audio.muted = nuevoMuted;
    todosLosAudios.forEach(a => a.muted = nuevoMuted);

    if (nuevoMuted) {
        btnMute.innerText = "🔇";
        if (slider) slider.value = 0;
    } else {
        btnMute.innerText = "🔊";
        if (slider) slider.value = audio.volume > 0 ? audio.volume : 0.5;
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
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <h3 style="margin: 0; color: var(--text-main); font-size: 1.2rem;">${e.nombre}</h3>
                                <button type="button" class="btn-scouter" onclick="abrirScouter('${e.nombre.replace(/'/g, "\\'")}', '${nombrePokemon}', ${poder}, ${e.victorias || 0}, ${e.derrotas || 0}, ${e.xp || 0}, '${e.fecha_registro || ''}')" title="Inspeccionar">🔬</button>
                            </div>
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
// ==========================================
// SCOUTER Y LEADERBOARD
// ==========================================

function abrirLeaderboard() {
    fetch(`${API_URL}/ranking`)
        .then(res => {
            if (!res.ok) throw new Error("Error en respuesta HTTP");
            return res.json();
        })
        .then(data => {
            const tbody = document.getElementById("leaderboard-body");
            tbody.innerHTML = "";
            if (!data.ranking || data.ranking.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Aún no hay entrenadores en el ranking.</td></tr>`;
            } else {
                data.ranking.forEach((e, idx) => {
                    const pokemonName = (e.pokemon || "pikachu").toLowerCase();
                    const icono = POKEMON_EMOJIS[pokemonName] || '🐾';
                    tbody.innerHTML += `
                        <tr>
                            <td>#${idx + 1}</td>
                            <td><strong>${e.nombre}</strong></td>
                            <td>${icono} ${pokemonName.toUpperCase()}</td>
                            <td style="color: #4ade80;">${e.victorias || 0}</td>
                            <td style="color: #ef4444;">${e.derrotas || 0}</td>
                            <td style="color: #facc15;">${e.xp || 0}</td>
                        </tr>
                    `;
                });
            }
            document.getElementById("leaderboard-modal").classList.add("active");
        })
        .catch(err => {
            console.error(err);
            mostrarToast("Error cargando el ranking", "error");
        });
}

function cerrarLeaderboard() {
    document.getElementById("leaderboard-modal").classList.remove("active");
}

function abrirScouter(nombre, pokemon, poder, w, l, xp, fecha) {
    document.getElementById("scouter-name").innerText = pokemon.toUpperCase();
    document.getElementById("scouter-trainer").innerText = `Entrenador: ${nombre}`;
    document.getElementById("scouter-w").innerText = w;
    document.getElementById("scouter-l").innerText = l;
    document.getElementById("scouter-xp").innerText = xp;

    if (fecha) {
        document.getElementById("scouter-date").innerText = `Registrado el: ${fecha}`;
    } else {
        document.getElementById("scouter-date").innerText = "Registrado el: Desconocido";
    }

    const sprite = document.getElementById("scouter-sprite");
    sprite.src = `https://play.pokemonshowdown.com/sprites/ani/${pokemon.toLowerCase()}.gif`;

    // Calcular stats (Max base reference = 4000)
    const atk = (poder * 0.40);
    const def = (poder * 0.35);
    const vel = (poder * 0.25);

    // Escala visual mínima (20%) para que los Pokémon básicos no se vean como un punto
    const displayAtk = 0.2 + 0.8 * Math.min(atk / 4000, 1);
    const displayDef = 0.2 + 0.8 * Math.min(def / 3500, 1);
    const displayVel = 0.2 + 0.8 * Math.min(vel / 2500, 1);
    const displayXp = 0.2 + 0.8 * Math.min(xp / 1000, 1);
    const displayW = 0.2 + 0.8 * Math.min(w / 100, 1); // 100 victorias como tope visual

    dibujarSpiderChart(displayAtk, displayDef, displayVel, displayW, displayXp);

    document.getElementById("scouter-modal").classList.add("active");
}

function cerrarScouter() {
    document.getElementById("scouter-modal").classList.remove("active");
}

function dibujarSpiderChart(atk, def, vel, w, xp) {
    const canvas = document.getElementById("scouter-canvas");
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 80;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar pentágonos de fondo
    ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
    ctx.lineWidth = 1;
    for (let j = 1; j <= 5; j++) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const r = (radius / 5) * j;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
    }

    // Ejes
    const labels = ["Ataque", "Defensa", "Velocidad", "Experiencia", "Victorias"];
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px Inter";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Labels
        const lx = cx + (radius + 20) * Math.cos(angle);
        const ly = cy + (radius + 15) * Math.sin(angle);
        ctx.fillText(labels[i], lx, ly);
    }

    // Valores reales con escala mínima aplicada previamente
    const values = [atk, def, vel, xp, w];

    // Animación simple de llenado
    let prog = 0;
    const animar = setInterval(() => {
        prog += 0.05;
        if (prog >= 1) { prog = 1; clearInterval(animar); }

        ctx.clearRect(0, 0, canvas.width, canvas.height); // limpiar redibuja todo, lo optimizo
        // Se dibuja fondo de nuevo
        ctx.strokeStyle = "rgba(56, 189, 248, 0.2)";
        for (let j = 1; j <= 5; j++) {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
                const r = (radius / 5) * j;
                const x = cx + r * Math.cos(angle);
                const y = cy + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
            const lx = cx + (radius + 20) * Math.cos(angle);
            const ly = cy + (radius + 15) * Math.sin(angle);
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.fillText(labels[i], lx, ly);
        }

        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const r = radius * values[i] * prog;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.stroke();

    }, 20);
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

    // Pausar música principal
    const audioPrincipal = document.getElementById("musicaFondo");
    if (audioPrincipal) audioPrincipal.pause();

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

    // Detener música de batalla y reanudar fondo
    sfxBatalla.pause();
    sfxBatalla.currentTime = 0;
    const audioPrincipal = document.getElementById("musicaFondo");
    if (audioPrincipal && !audioPrincipal.muted) {
        audioPrincipal.play().catch(e => console.log(e));
    }
}

async function iniciarCuentaRegresiva() {
    const overlay = document.getElementById("countdown-overlay");
    const text = document.getElementById("countdown-text");
    overlay.style.display = "flex";

    const reproducirPaso = (texto, audio, animacion) => {
        text.innerText = texto;
        // Reiniciar la animación forzando un reflow
        text.style.animation = 'none';
        text.offsetHeight;
        text.style.animation = animacion;
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.log(e));
        }
    };

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // 3
    reproducirPaso("3", sfx3, 'countAnim 0.8s ease-in-out forwards');
    await wait(1000);

    // 2
    reproducirPaso("2", sfx2, 'countAnim 0.8s ease-in-out forwards');
    await wait(1000);

    // 1
    reproducirPaso("1", sfx1, 'countAnim 0.8s ease-in-out forwards');
    await wait(1000);

    // ¡COMBATE!
    reproducirPaso("¡COMBATE!", sfxGo, 'countAnimLong 2.5s ease-in-out forwards');

    // Iniciar el soundtrack épico
    sfxBatalla.currentTime = 0;
    sfxBatalla.play().catch(e => console.log(e));

    // Esperar a que la voz termine de decir "GOOOO!" y la animación larga concluya (2.5 segundos)
    await wait(2500);

    // Arrancar la simulación visual de daño
    overlay.style.display = "none";
    reproducirCombate(duelState.actions);
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

    const getEvasionMod = (pokemon) => {
        const stats = POKEMON_POWER_DATA[pokemon];
        if (!stats) return 1.0;
        if (stats.label === "Básico") return 0.90;
        if (stats.label === "Evolución 1") return 1.05;
        if (stats.label === "Evolución Final") return 1.20;
        return 1.0;
    };

    const defA = getDefensa(a.pokemon);
    const defB = getDefensa(b.pokemon);

    const evaA = getEvasionMod(a.pokemon);
    const evaB = getEvasionMod(b.pokemon);

    duelState.actions = [];
    duelState.actions.push({ type: 'setup', hpA_max, hpB_max });

    let round = 1;
    while (hpA > 0 && hpB > 0 && round <= 20) {

        // --- TURNO DE A ---
        const ataquesA = POKEMON_ATAQUES[a.pokemon] || ["Placaje"];
        const ataqueUsadoA = ataquesA[Math.floor(Math.random() * ataquesA.length)];

        // Fórmula de Evasión: Precision = 95 * (Mod_Prec(1.0) / Mod_Evas(defensor))
        const precisionA = 95 * (1.0 / evaB);
        const hitA = (Math.random() * 100) <= precisionA;

        if (hitA) {
            const critA = 0.85 + Math.random() * 0.40;
            let dmgA = Math.floor(dmgA_base * critA * (1 - defB));
            if (dmgA < 1) dmgA = 1;

            hpB -= dmgA;
            if (hpB < 0) hpB = 0;

            duelState.actions.push({
                type: 'attack',
                attacker: 'a',
                target: 'b',
                pokemonName: a.pokemon.toUpperCase(),
                attackName: ataqueUsadoA,
                dmg: dmgA,
                hpAfter: hpB,
                isCrit: critA > 1.15,
                missed: false,
                round: round
            });
        } else {
            duelState.actions.push({
                type: 'attack',
                attacker: 'a',
                target: 'b',
                pokemonName: a.pokemon.toUpperCase(),
                attackName: ataqueUsadoA,
                dmg: 0,
                hpAfter: hpB,
                isCrit: false,
                missed: true,
                round: round
            });
        }

        if (hpB <= 0) break;

        // --- TURNO DE B ---
        const ataquesB = POKEMON_ATAQUES[b.pokemon] || ["Placaje"];
        const ataqueUsadoB = ataquesB[Math.floor(Math.random() * ataquesB.length)];

        const precisionB = 95 * (1.0 / evaA);
        const hitB = (Math.random() * 100) <= precisionB;

        if (hitB) {
            const critB = 0.85 + Math.random() * 0.40;
            let dmgB = Math.floor(dmgB_base * critB * (1 - defA));
            if (dmgB < 1) dmgB = 1;

            hpA -= dmgB;
            if (hpA < 0) hpA = 0;

            duelState.actions.push({
                type: 'attack',
                attacker: 'b',
                target: 'a',
                pokemonName: b.pokemon.toUpperCase(),
                attackName: ataqueUsadoB,
                dmg: dmgB,
                hpAfter: hpA,
                isCrit: critB > 1.15,
                missed: false,
                round: round
            });
        } else {
            duelState.actions.push({
                type: 'attack',
                attacker: 'b',
                target: 'a',
                pokemonName: b.pokemon.toUpperCase(),
                attackName: ataqueUsadoB,
                dmg: 0,
                hpAfter: hpA,
                isCrit: false,
                missed: true,
                round: round
            });
        }

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
            msgBox.style.display = "block";
            const logEl = document.getElementById("battle-log-content");
            const containerLog = document.getElementById("battle-log");

            if (action.missed) {
                msgText.innerText = `¡${action.pokemonName} usó ${action.attackName.toUpperCase()} pero falló!`;
                logEl.innerHTML += `<p>> ${action.pokemonName} intentó usar ${action.attackName} pero ${action.target.toUpperCase()} lo ESQUIVÓ 💨</p>`;

                animarGolpeBlanco(action.target, 0, false, true); // Animación DODGE!!
            } else {
                msgText.innerText = `¡${action.pokemonName} usó ${action.attackName.toUpperCase()}!`;
                logEl.innerHTML += `<p>> ${action.pokemonName} ataca a ${action.target.toUpperCase()} con ${action.attackName} (-${action.dmg} HP) ${action.isCrit ? '🔥 CRÍTICO' : ''}</p>`;

                animarGolpeBlanco(action.target, action.dmg, action.isCrit);

                const targetBar = action.target === 'a' ? hpBarA : hpBarB;
                const targetText = action.target === 'a' ? hpTextA : hpTextB;
                const maxHpTarget = action.target === 'a' ? maxA : maxB;

                const pct = (action.hpAfter / maxHpTarget) * 100;

                targetBar.parentElement.classList.remove('hp-bar-shake');
                void targetBar.parentElement.offsetWidth;
                targetBar.parentElement.classList.add('hp-bar-shake');

                targetBar.style.width = `${pct}%`;
                targetBar.style.backgroundColor = pct > 50 ? "#4ade80" : pct > 20 ? "#facc15" : "#ef4444";
                targetText.innerText = `${action.hpAfter}/${maxHpTarget}`;

                const spriteDestino = document.getElementById(`duel-sprite-${action.target}`);
                if (pct <= 40 && action.hpAfter > 0) {
                    spriteDestino.classList.add("low-hp-glow");
                } else {
                    spriteDestino.classList.remove("low-hp-glow");
                }

                if (action.isCrit) {
                    const modal = document.querySelector(".battle-modal");
                    modal.style.boxShadow = "inset 0 0 100px rgba(255,255,255,0.8)";
                    setTimeout(() => modal.style.boxShadow = "", 150);
                }
            }
            containerLog.scrollTop = containerLog.scrollHeight;
        }

        i++;
    }, 1800); // 1.8s por sub-turno para poder leer el ataque
}

function animarGolpeBlanco(target, dmg, isCrit, isMiss = false) {
    const spriteContainer = document.getElementById(`sprite-container-${target}`);
    const sprite = document.getElementById(`duel-sprite-${target}`);

    if (!isMiss) {
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
    }

    // Damage Floater
    const floater = document.createElement("div");
    floater.className = "damage-floater";

    if (isMiss) {
        floater.innerText = "DODGE!!";
        floater.style.color = "#38bdf8"; // Cyan
        floater.style.textShadow = "0 0 5px #38bdf8";
        floater.style.fontSize = "1.5rem";
    } else {
        if (isCrit) floater.classList.add("crit-floater");
        floater.innerText = `-${dmg}`;
    }

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
    let resultPayload = {};

    if (lastState.hpA <= 0 && lastState.hpB <= 0) {
        textEl.innerText = "EMPATE ÉPICO";
        textEl.style.color = "var(--text-main)";
        winnerSprite.style.display = "none";
        document.getElementById("duel-sprite-a").classList.add("dead-sprite");
        document.getElementById("duel-sprite-b").classList.add("dead-sprite");

        resultPayload = {
            empate: true,
            id_a: duelState.entrenadorA.id,
            id_b: duelState.entrenadorB.id
        };
    } else if (lastState.hpA > lastState.hpB) {
        winnerName = duelState.entrenadorA.nombre;
        winnerPokemon = duelState.entrenadorA.pokemon;
        textEl.innerText = `${winnerName.toUpperCase()}`;
        winnerSprite.src = `https://play.pokemonshowdown.com/sprites/ani/${winnerPokemon}.gif`;
        winnerSprite.style.display = "inline-block";
        document.getElementById("duel-sprite-b").classList.add("dead-sprite");

        resultPayload = {
            id_ganador: duelState.entrenadorA.id,
            id_perdedor: duelState.entrenadorB.id,
            empate: false
        };
    } else {
        winnerName = duelState.entrenadorB.nombre;
        winnerPokemon = duelState.entrenadorB.pokemon;
        textEl.innerText = `${winnerName.toUpperCase()}`;
        winnerSprite.src = `https://play.pokemonshowdown.com/sprites/ani/${winnerPokemon}.gif`;
        winnerSprite.style.display = "inline-block";
        document.getElementById("duel-sprite-a").classList.add("dead-sprite");

        resultPayload = {
            id_ganador: duelState.entrenadorB.id,
            id_perdedor: duelState.entrenadorA.id,
            empate: false
        };
    }

    winnerDiv.style.display = "flex";

    // Sincronizar con Backend silenciosamente
    fetch(`${API_URL}/resultado-combate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultPayload)
    }).then(() => {
        cargarEntrenadores(); // Refrescar base de datos silenciosamente en la interfaz
    }).catch(e => console.error("Error al registrar resultado", e));
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
