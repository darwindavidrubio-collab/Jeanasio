const API_URL = "http://127.0.0.1:8000";
// "https://jeanasio.onrender.com" para el online
// "http://127.0.0.1:8000" para local 

let paginaActual = 1;
const LIMITE_POR_PAGINA = 8;
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
            <article class="fade-in" style="animation-delay: ${index * 0.05}s; border-left: 4px solid ${colorBorde}; background: rgba(10, 10, 18, 0.4);">
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
                    <div class="card-actions">
                        <button type="button" class="btn btn-delete" onclick="eliminarEntrenador(${e.id})">Borrar 🗑️</button>
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
            // AQUÍ ATRAPAMOS EL ERROR 400 (DUPLICADO) DE MAIN.PY
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
