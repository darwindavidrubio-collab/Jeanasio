const API_URL = "https://jeanasio.onrender.com/entrenadores";

async function obtenerEntrenadores() {
    const res = await fetch(API_URL);
    const datos = await res.json();
    const contenedor = document.getElementById('lista-entrenadores');
    contenedor.innerHTML = "";

    datos.forEach(e => {
        contenedor.innerHTML += `
            <article>
                <h3>👤 ${e.nombre}</h3>
                <p style="color: var(--text-muted); margin: 5px 0;">
                    📍 ${e.ciudad} | 🏅 ${e.medalla ? 'Condecorado' : 'Sin Medallas'}
                </p>
                <p>Poder Total: <strong style="color: var(--accent)">${e.poder_total}</strong></p>
                <div style="margin-top: 15px;">
                    <button class="btn btn-edit" onclick="editarEntrenador(${e.id}, '${e.nombre}', '${e.ciudad}', ${e.medalla})">Editar</button>
                    <button class="btn btn-delete" onclick="borrarUno(${e.id})">Borrar</button>
                </div>
            </article>`;
    });
}

async function guardarEntrenador() {
    const nombre = document.getElementById('nombre').value;
    const ciudad = document.getElementById('ciudad').value;
    const medallaSeleccionada = document.querySelector('input[name="medalla_opt"]:checked').value;
    const medalla = (medallaSeleccionada === "true");

    if (!nombre || !ciudad) return alert("Por favor, llena los campos.");

    const respuesta = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, ciudad, medalla })
    });

    if (respuesta.ok) {
        obtenerEntrenadores();
        limpiarCampos();
    } else {
        const errorData = await respuesta.json();
        alert("⚠️ Error: " + (errorData.detail || "Ese nombre ya existe."));
    }
}

async function editarEntrenador(id, n, c, m) {
    document.getElementById('nombre').value = n;
    document.getElementById('ciudad').value = c;
    document.querySelector(`input[name="medalla_opt"][value="${m}"]`).checked = true;

    const btnGuardar = document.querySelector('.btn-save');
    btnGuardar.innerText = "Confirmar Edición 🔄";
    btnGuardar.style.background = "#10b981";

    btnGuardar.onclick = null;
    btnGuardar.onclick = async function () {
        const nuevoNombre = document.getElementById('nombre').value;
        const nuevaCiudad = document.getElementById('ciudad').value;
        const medallaSeleccionada = document.querySelector('input[name="medalla_opt"]:checked').value;
        const nuevaMedalla = (medallaSeleccionada === "true");

        if (!nuevoNombre || !nuevaCiudad) return alert("Campos vacíos");

        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: nuevoNombre, ciudad: nuevaCiudad, medalla: nuevaMedalla })
            });

            if (res.ok) {
                alert("✅ ¡Entrenador actualizado con éxito!");
                btnGuardar.innerText = "Guardar Entrenador";
                btnGuardar.style.background = "var(--accent)";
                btnGuardar.onclick = guardarEntrenador;
                obtenerEntrenadores();
                limpiarCampos();
            } else {
                const err = await res.json();
                alert("❌ Error al actualizar: " + (err.detail || "Datos inválidos"));
            }
        } catch (error) {
            alert("El nombre ya se encuentra registrado. ❌");
        }
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limpiarCampos() {
    document.getElementById('nombre').value = "";
    document.getElementById('ciudad').value = "";
    document.querySelector('input[name="medalla_opt"][value="true"]').checked = true;
}

async function borrarUno(id) {
    if (confirm("¿Eliminar este registro?")) {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        obtenerEntrenadores();
    }
}

async function borrarTodo() {
    if (confirm("🚨 ¡ADVERTENCIA! Se borrará toda la base de datos de Darwin.")) {
        await fetch("http://127.0.0.1:8000/eliminar-todo", { method: 'DELETE' });
        obtenerEntrenadores();
    }
}

obtenerEntrenadores();