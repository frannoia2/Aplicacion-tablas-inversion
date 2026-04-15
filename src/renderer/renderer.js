// Estado global
let perfilActual = null;

// 📌 Cargar perfiles al iniciar
document.addEventListener("DOMContentLoaded", () => {
  cargarPerfiles();

  document.getElementById("btnCrear").addEventListener("click", crearPerfil);
  document.getElementById("btnVolver").addEventListener("click", volverHome);
});
// 📌 Obtener perfiles y mostrarlos
async function cargarPerfiles() {
    const perfiles = await window.api.obtenerPerfiles();
    const lista = document.getElementById("listaPerfiles");
    lista.innerHTML = "";

    perfiles.forEach(nombre => {
        const li = document.createElement("li");
        
        li.textContent = nombre;
        li.onclick = () => seleccionarPerfil(nombre);
        lista.appendChild(li);
    });
}
// 📌 Crear perfil
async function crearPerfil() {
    const input = document.getElementById("nombrePerfil");
    const nombre = input.value.trim();

    if (!nombre) return;
    const result = await window.api.crearPerfil(nombre);

    if (!result.ok) {
        alert(result.error);
        return;
    }

    input.value = "";
    cargarPerfiles();
}
// 📌 Seleccionar perfil
async function seleccionarPerfil(nombre) {
    const data = await window.api.crearPerfil(nombre);

    perfilActual = data;
    document.getElementById("tituloPerfil").textContent = `Perfil: ${nombre}`;
    mostrarVistaPerfil();
}

// 📌 Navegación
function mostrarVistaPerfil() {
  document.getElementById("home").classList.add("hidden");
  document.getElementById("perfil").classList.remove("hidden");
}

function volverHome() {
  document.getElementById("perfil").classList.add("hidden");
  document.getElementById("home").classList.remove("hidden");
}