const btn = document.getElementById("btn");
const output = document.getElementById("output");

function irPerfil(){
    document.getElementById("home").style.display = "none";
    document.getElementById("perfil").style.display = "block";
}

function volver(){
    document.getElementById("perfil").style.display = "none";
    document.getElementById("home").style.display = "block";
}

async function cargarPerfiles() {
    const perfiles = await window.parseInt.obtenerPerfiles();
    const lista = document.getElementById("listaPerfiles");

    lista.innerHTML = "";
    perfiles.forEach(nombre => {
        const li = document.createElement("li");
        
        li.textContent = nombre;
        li.onclick = () => seleccionarPerfil(nombre);
        lista.appendChild(li);
    });
}

async function crearPerfil() {
    const nombre = document.getElementById("nombrePerfil").value;

    if (!nombre) return;
    await window.api.crearPerfil(nombre);
    cargarPerfiles();
}

async function seleccionarPerfil(nombre) {
    const data = await window.api.crearPerfil(nombre);

    console.log("Perfil cargado: ", data);
}

cargarPerfiles();